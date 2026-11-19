import "server-only";
import crypto from "crypto";

const API = "https://api.razorpay.com/v1";

function creds() {
  const id = process.env.RAZORPAY_KEY_ID;
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!id || !secret) throw new Error("Razorpay keys are not configured");
  return { id, secret, auth: "Basic " + Buffer.from(`${id}:${secret}`).toString("base64") };
}

export const razorpayConfigured = () => Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);
export const razorpayLive = () => (process.env.RAZORPAY_KEY_ID ?? "").startsWith("rzp_live_");

async function call<T>(path: string, body?: object, method = "POST"): Promise<T> {
  const { auth } = creds();
  const res = await fetch(`${API}${path}`, {
    method,
    headers: { Authorization: auth, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });
  const json = await res.json();
  if (!res.ok) throw new Error(`Razorpay ${path} failed: ${json?.error?.description ?? res.status}`);
  return json as T;
}

/** amount in rupees → paise */
export function createRazorpayOrder(amountRupees: number, receipt: string, notes: Record<string, string>) {
  return call<{ id: string; amount: number; currency: string; status: string }>("/orders", {
    amount: Math.round(amountRupees * 100),
    currency: "INR",
    receipt,
    notes,
  });
}

export function refundPayment(paymentId: string, amountRupees: number, notes: Record<string, string>) {
  return call<{ id: string; status: string; amount: number }>(`/payments/${paymentId}/refund`, {
    amount: Math.round(amountRupees * 100),
    speed: "normal",
    notes,
  });
}

export function fetchPayment(paymentId: string) {
  return call<{ id: string; order_id: string; status: string; amount: number; method: string }>(`/payments/${paymentId}`, undefined, "GET");
}

function safeEqual(a: string, b: string) {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && crypto.timingSafeEqual(ab, bb);
}

export function verifyCheckoutSignature(orderId: string, paymentId: string, signature: string) {
  const { secret } = creds();
  const expected = crypto.createHmac("sha256", secret).update(`${orderId}|${paymentId}`).digest("hex");
  return safeEqual(expected, signature);
}

export function verifyWebhookSignature(rawBody: string, signature: string) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret || !signature) return false;
  const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  return safeEqual(expected, signature);
}
