import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { confirmOrder } from "@/lib/orders";
import { verifyCheckoutSignature } from "@/lib/razorpay";
import { currentUser } from "@/lib/session";

const schema = z.object({
  razorpay_order_id: z.string().min(5).max(60),
  razorpay_payment_id: z.string().min(5).max(60),
  razorpay_signature: z.string().min(10).max(200),
});

/** Client-side callback after Checkout. Signature verified on the server; webhook remains the source of truth. */
export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "login" }, { status: 401 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid" }, { status: 400 });
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = parsed.data;
  if (!verifyCheckoutSignature(razorpay_order_id, razorpay_payment_id, razorpay_signature)) {
    return NextResponse.json({ error: "signature" }, { status: 400 });
  }
  const order = await db.order.findFirst({ where: { razorpayOrderId: razorpay_order_id, userId: user.id } });
  if (!order) return NextResponse.json({ error: "not_found" }, { status: 404 });
  await confirmOrder(order.id, razorpay_payment_id);
  return NextResponse.json({ ok: true, orderNumber: order.orderNumber });
}
