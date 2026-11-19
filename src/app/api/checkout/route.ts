import { NextResponse } from "next/server";
import { z } from "zod";
import { createOrder, OrderError, retryPayment } from "@/lib/orders";
import { razorpayConfigured } from "@/lib/razorpay";
import { currentUser } from "@/lib/session";

const schema = z.object({
  items: z.array(z.object({ variantId: z.string().min(1).max(40), qty: z.number().int().min(1).max(50) })).min(1).max(100),
  addressId: z.string().min(1).max(40),
  coupon: z.string().trim().max(40).nullable().optional(),
  method: z.enum(["RAZORPAY", "COD"]).default("RAZORPAY"),
  locale: z.enum(["en", "hi"]).default("en"),
  retryOrderNumber: z.string().max(30).optional(),
});

export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "login" }, { status: 401 });
  const body = await req.json().catch(() => null);

  // Retry payment for an existing pending order
  if (body?.retryOrderNumber && typeof body.retryOrderNumber === "string") {
    if (!razorpayConfigured()) return NextResponse.json({ error: "payment_not_configured" }, { status: 503 });
    try {
      const { order, razorpayOrder } = await retryPayment(body.retryOrderNumber, user.id);
      return NextResponse.json({ orderNumber: order.orderNumber, razorpay: { orderId: razorpayOrder.id, amount: razorpayOrder.amount, keyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID } });
    } catch (e) {
      return NextResponse.json({ error: e instanceof OrderError ? e.code : "server" }, { status: 400 });
    }
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "invalid" }, { status: 400 });
  if (parsed.data.method === "RAZORPAY" && !razorpayConfigured()) return NextResponse.json({ error: "payment_not_configured" }, { status: 503 });
  try {
    const { order, razorpayOrder } = await createOrder({
      userId: user.id,
      cart: parsed.data.items,
      addressId: parsed.data.addressId,
      couponCode: parsed.data.coupon,
      locale: parsed.data.locale,
      method: parsed.data.method,
    });
    return NextResponse.json({
      orderNumber: order.orderNumber,
      razorpay: razorpayOrder ? { orderId: razorpayOrder.id, amount: razorpayOrder.amount, keyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID } : null,
    });
  } catch (e) {
    if (e instanceof OrderError) return NextResponse.json({ error: e.code }, { status: 400 });
    console.error("[checkout]", e);
    return NextResponse.json({ error: "server" }, { status: 500 });
  }
}
