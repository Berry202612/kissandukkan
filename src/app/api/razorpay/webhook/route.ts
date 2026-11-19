import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { confirmOrder, markPaymentFailed } from "@/lib/orders";
import { verifyWebhookSignature } from "@/lib/razorpay";

export const dynamic = "force-dynamic";

type Payload = {
  event: string;
  payload: {
    payment?: { entity: { id: string; order_id: string; amount: number; error_description?: string } };
    refund?: { entity: { id: string; payment_id: string; amount: number; status: string } };
  };
};

/** Source of truth for payment state. Idempotent via x-razorpay-event-id. */
export async function POST(req: Request) {
  const raw = await req.text();
  const sig = req.headers.get("x-razorpay-signature") ?? "";
  if (!verifyWebhookSignature(raw, sig)) return NextResponse.json({ error: "signature" }, { status: 400 });
  const eventId = req.headers.get("x-razorpay-event-id") ?? "";
  const body = JSON.parse(raw) as Payload;

  if (eventId) {
    try {
      await db.paymentEvent.create({ data: { id: eventId, type: body.event, payload: body as unknown as Prisma.InputJsonValue } });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") return NextResponse.json({ ok: true, duplicate: true });
      throw e;
    }
  }

  try {
    if (body.event === "payment.captured" && body.payload.payment) {
      const p = body.payload.payment.entity;
      const order = await db.order.findUnique({ where: { razorpayOrderId: p.order_id } });
      if (order && Math.round(Number(order.total) * 100) === p.amount) await confirmOrder(order.id, p.id);
      else if (order) console.error(`[webhook] amount mismatch for ${order.orderNumber}: ${p.amount}`);
    } else if (body.event === "payment.failed" && body.payload.payment) {
      const p = body.payload.payment.entity;
      await markPaymentFailed(p.order_id, p.error_description ?? "failed");
    } else if (body.event === "refund.processed" && body.payload.refund) {
      const r = body.payload.refund.entity;
      await db.refund.updateMany({ where: { razorpayRefundId: r.id }, data: { status: "processed" } });
    }
  } catch (e) {
    console.error("[webhook]", e);
    if (eventId) await db.paymentEvent.delete({ where: { id: eventId } }).catch(() => {});
    return NextResponse.json({ error: "processing" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
