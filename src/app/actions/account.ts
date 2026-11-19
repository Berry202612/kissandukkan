"use server";

import { z } from "zod";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { getDelivery } from "@/lib/settings";
import { canReview, recomputeRating } from "@/lib/reviews";
import { hitLimit } from "@/lib/rate-limit";
import { refundOrder } from "@/lib/orders";
import type { ActionResult } from "./public";
import { addressSchema, passwordRule } from "@/lib/validators";

export async function saveAddress(_: unknown, fd: FormData): Promise<ActionResult & { id?: string }> {
  const u = await requireUser();
  const parsed = addressSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { ok: false, fieldErrors: parsed.error.flatten().fieldErrors };
  const { id, ...data } = parsed.data;
  const count = await db.address.count({ where: { userId: u.id } });
  if (!id && count >= 20) return { ok: false, error: "limit" };
  const isDefault = data.isDefault || count === 0;
  if (isDefault) await db.address.updateMany({ where: { userId: u.id }, data: { isDefault: false } });
  const row = id
    ? await db.address.update({ where: { id, userId: u.id }, data: { ...data, isDefault } })
    : await db.address.create({ data: { ...data, isDefault, userId: u.id } });
  revalidatePath("/[locale]/account/addresses", "page");
  return { ok: true, id: row.id };
}

export async function deleteAddress(id: string) {
  const u = await requireUser();
  await db.address.deleteMany({ where: { id, userId: u.id } });
  revalidatePath("/[locale]/account/addresses", "page");
}

export async function setDefaultAddress(id: string) {
  const u = await requireUser();
  await db.address.updateMany({ where: { userId: u.id }, data: { isDefault: false } });
  await db.address.updateMany({ where: { id, userId: u.id }, data: { isDefault: true } });
  revalidatePath("/[locale]/account/addresses", "page");
}

const profileSchema = z.object({
  name: z.string().trim().min(2).max(80),
  locale: z.enum(["en", "hi"]),
  emailOptIn: z.preprocess((v) => v === "on", z.boolean()),
  orderUpdatesOptIn: z.preprocess((v) => v === "on", z.boolean()),
});

export async function saveProfile(_: unknown, fd: FormData): Promise<ActionResult> {
  const u = await requireUser();
  const parsed = profileSchema.safeParse({ name: fd.get("name"), locale: fd.get("locale"), emailOptIn: fd.get("emailOptIn"), orderUpdatesOptIn: fd.get("orderUpdatesOptIn") });
  if (!parsed.success) return { ok: false, fieldErrors: parsed.error.flatten().fieldErrors };
  await db.user.update({ where: { id: u.id }, data: parsed.data });
  return { ok: true };
}

export async function changePassword(_: unknown, fd: FormData): Promise<ActionResult> {
  const u = await requireUser();
  const parsed = z.object({ current: z.string().min(1), next: passwordRule, confirm: z.string() }).safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { ok: false, error: "rule" };
  if (parsed.data.next !== parsed.data.confirm) return { ok: false, error: "mismatch" };
  if (await hitLimit(`pwchange:${u.id}`, 5)) return { ok: false, error: "rate" };
  const row = await db.user.findUniqueOrThrow({ where: { id: u.id } });
  if (!(await bcrypt.compare(parsed.data.current, row.passwordHash))) return { ok: false, error: "wrong" };
  await db.user.update({ where: { id: u.id }, data: { passwordHash: await bcrypt.hash(parsed.data.next, 12) } });
  return { ok: true };
}

export async function cancelOrder(orderNumber: string): Promise<ActionResult> {
  const u = await requireUser();
  const order = await db.order.findFirst({ where: { orderNumber, userId: u.id }, include: { items: true, shipments: true } });
  if (!order) return { ok: false, error: "not_found" };
  const cancellable = ["PAYMENT_PENDING", "PLACED", "CONFIRMED", "PACKED", "ORDERED_FROM_SUPPLIER"].includes(order.status) && order.shipments.every((s) => !s.awb);
  if (!cancellable) return { ok: false, error: "not_cancellable" };
  await db.$transaction(async (tx) => {
    await tx.order.update({
      where: { id: order.id },
      data: { status: "CANCELLED", cancelReason: "Cancelled by customer", events: { create: { status: "CANCELLED", note: "Cancelled by customer" + (order.paymentStatus === "CAPTURED" ? " – refund to be processed" : "") } } },
    });
    if (order.paymentStatus === "CAPTURED") {
      for (const it of order.items) if (it.fulfilledBy === "OWN_STOCK") await tx.productVariant.update({ where: { id: it.variantId }, data: { stock: { increment: it.quantity } } });
    }
  });
  if (order.paymentStatus === "CAPTURED") {
    try {
      await refundOrder(order.id, Number(order.total), "Cancelled by customer before shipping", u.id);
    } catch (e) {
      console.error("[cancel] auto-refund failed – admin must refund manually", e);
      await db.orderEvent.create({ data: { orderId: order.id, status: "CANCELLED", note: "Automatic refund failed – refund pending from admin" } });
    }
  }
  revalidatePath("/[locale]/account/orders", "layout");
  return { ok: true };
}

const returnSchema = z.object({
  orderNumber: z.string().max(30),
  type: z.enum(["REPLACEMENT", "RETURN"]),
  reason: z.enum(["damaged", "wrong", "expired", "missing", "defective"]),
  details: z.string().trim().min(10).max(2000),
  media: z.array(z.string().url().max(500)).min(1).max(5),
  itemIds: z.array(z.string()).min(1).max(50),
});

export async function requestReturn(input: unknown): Promise<ActionResult> {
  const u = await requireUser();
  const parsed = returnSchema.safeParse(input);
  if (!parsed.success) return { ok: false, fieldErrors: parsed.error.flatten().fieldErrors };
  const d = parsed.data;
  const order = await db.order.findFirst({ where: { orderNumber: d.orderNumber, userId: u.id }, include: { items: { select: { id: true } } } });
  if (!order || order.status !== "DELIVERED" || !order.deliveredAt) return { ok: false, error: "not_eligible" };
  const delivery = await getDelivery();
  if (Date.now() - order.deliveredAt.getTime() > delivery.replacementWindowHours * 3600 * 1000) return { ok: false, error: "window" };
  const valid = new Set(order.items.map((i) => i.id));
  if (!d.itemIds.every((i) => valid.has(i))) return { ok: false, error: "invalid" };
  if (!d.media.every((m) => /\.public\.blob\.vercel-storage\.com\//.test(m))) return { ok: false, error: "invalid" };
  await db.returnRequest.create({ data: { orderId: order.id, userId: u.id, type: d.type, reason: d.reason, details: d.details, media: d.media, itemIds: d.itemIds } });
  return { ok: true };
}

const reviewSchema = z.object({
  productId: z.string().cuid(),
  rating: z.coerce.number().int().min(1).max(5),
  title: z.string().trim().max(100).optional().default(""),
  body: z.string().trim().min(10).max(3000),
  photos: z.array(z.string().url().regex(/\.public\.blob\.vercel-storage\.com\//)).max(4).default([]),
});

export async function submitReview(input: unknown): Promise<ActionResult> {
  const u = await requireUser();
  const parsed = reviewSchema.safeParse(input);
  if (!parsed.success) return { ok: false, fieldErrors: parsed.error.flatten().fieldErrors };
  const orderId = await canReview(u.id, parsed.data.productId);
  if (!orderId) return { ok: false, error: "not_eligible" };
  const existing = await db.review.findUnique({ where: { productId_userId: { productId: parsed.data.productId, userId: u.id } } });
  if (existing) return { ok: false, error: "already" };
  await db.review.create({ data: { ...parsed.data, title: parsed.data.title || null, userId: u.id, orderId } });
  await recomputeRating(parsed.data.productId);
  return { ok: true };
}

export async function createTicket(_: unknown, fd: FormData): Promise<ActionResult & { id?: string }> {
  const u = await requireUser();
  const parsed = z
    .object({ subject: z.string().trim().min(3).max(120), message: z.string().trim().min(5).max(4000), orderNumber: z.string().trim().max(30).optional().default("") })
    .safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { ok: false, fieldErrors: parsed.error.flatten().fieldErrors };
  if (await hitLimit(`ticket:${u.id}`, 10)) return { ok: false, error: "rate" };
  const t = await db.ticket.create({
    data: { userId: u.id, subject: parsed.data.subject, orderNumber: parsed.data.orderNumber || null, messages: { create: { body: parsed.data.message } } },
  });
  return { ok: true, id: t.id };
}

export async function replyTicket(_: unknown, fd: FormData): Promise<ActionResult> {
  const u = await requireUser();
  const parsed = z.object({ ticketId: z.string(), message: z.string().trim().min(1).max(4000) }).safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { ok: false, error: "invalid" };
  const t = await db.ticket.findFirst({ where: { id: parsed.data.ticketId, userId: u.id } });
  if (!t) return { ok: false, error: "not_found" };
  await db.ticket.update({ where: { id: t.id }, data: { status: "OPEN", messages: { create: { body: parsed.data.message } } } });
  revalidatePath("/[locale]/account/tickets/[id]", "page");
  return { ok: true };
}
