"use server";

import { z } from "zod";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { hitLimit } from "@/lib/rate-limit";
import { sendTemplate } from "@/lib/email";
import { getBusiness } from "@/lib/settings";
import { currentUser } from "@/lib/session";

export type ActionResult = { ok: boolean; error?: string; fieldErrors?: Record<string, string[]> };

async function clientKey(prefix: string) {
  const h = await headers();
  const ip = (h.get("x-forwarded-for") ?? "").split(",")[0].trim() || h.get("x-real-ip") || "unknown";
  return `${prefix}:${ip}`;
}

const newsletterSchema = z.object({ email: z.string().trim().toLowerCase().email().max(160), locale: z.enum(["en", "hi"]) });

export async function subscribeNewsletter(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const parsed = newsletterSchema.safeParse({ email: fd.get("email"), locale: fd.get("locale") });
  if (!parsed.success) return { ok: false, error: "invalid" };
  if (await hitLimit(await clientKey("newsletter"), 10)) return { ok: false, error: "rate" };
  await db.newsletterSubscriber.upsert({ where: { email: parsed.data.email }, create: parsed.data, update: { locale: parsed.data.locale } });
  return { ok: true };
}

const contactSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().toLowerCase().email().max(160),
  phone: z.string().trim().max(20).optional().default(""),
  subject: z.string().trim().min(3).max(120),
  message: z.string().trim().min(10).max(4000),
  kind: z.enum(["CONTACT", "BULK"]).default("CONTACT"),
  organisation: z.string().trim().max(120).optional().default(""),
  pincode: z.string().trim().max(6).optional().default(""),
  website: z.string().max(0).optional().default(""), // honeypot
});

export async function sendContact(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const parsed = contactSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { ok: false, fieldErrors: parsed.error.flatten().fieldErrors };
  if (parsed.data.website) return { ok: true };
  if (await hitLimit(await clientKey("contact"), 5)) return { ok: false, error: "rate" };
  const d = parsed.data;
  await db.contactMessage.create({
    data: { name: d.name, email: d.email, phone: d.phone || null, subject: d.subject, message: d.message, kind: d.kind, meta: d.kind === "BULK" ? { organisation: d.organisation, pincode: d.pincode } : undefined },
  });
  const b = await getBusiness();
  if (b.supportEmail) {
    await sendTemplate("contact_notification", "en", b.supportEmail, {
      kind: d.kind === "BULK" ? "bulk enquiry" : "contact",
      name: d.name,
      email: d.email,
      phone: d.phone,
      subject: d.subject,
      message: d.kind === "BULK" ? `${d.message}\n\nOrganisation: ${d.organisation}\nPincode: ${d.pincode}` : d.message,
    });
  }
  return { ok: true };
}

const questionSchema = z.object({ productId: z.string().cuid(), body: z.string().trim().min(5).max(600) });

export async function askQuestion(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const u = await currentUser();
  if (!u) return { ok: false, error: "login" };
  const parsed = questionSchema.safeParse({ productId: fd.get("productId"), body: fd.get("body") });
  if (!parsed.success) return { ok: false, error: "invalid" };
  if (await hitLimit(`question:${u.id}`, 10)) return { ok: false, error: "rate" };
  const p = await db.product.findFirst({ where: { id: parsed.data.productId, status: "PUBLISHED" }, select: { id: true } });
  if (!p) return { ok: false, error: "invalid" };
  await db.question.create({ data: { productId: p.id, userId: u.id, body: parsed.data.body } });
  return { ok: true };
}

export async function toggleWishlist(productId: string): Promise<{ ok: boolean; saved?: boolean; error?: string }> {
  const u = await currentUser();
  if (!u) return { ok: false, error: "login" };
  if (!z.string().cuid().safeParse(productId).success) return { ok: false, error: "invalid" };
  const existing = await db.wishlistItem.findUnique({ where: { userId_productId: { userId: u.id, productId } } });
  if (existing) {
    await db.wishlistItem.delete({ where: { userId_productId: { userId: u.id, productId } } });
    return { ok: true, saved: false };
  }
  const p = await db.product.findFirst({ where: { id: productId, status: "PUBLISHED" }, select: { id: true } });
  if (!p) return { ok: false, error: "invalid" };
  await db.wishlistItem.create({ data: { userId: u.id, productId } });
  return { ok: true, saved: true };
}
