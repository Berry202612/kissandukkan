"use server";

import crypto from "crypto";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { audit, requireAdmin, requireStaff } from "@/lib/session";
import { saveSetting, getPricing } from "@/lib/settings";
import { repriceAll } from "@/lib/product-pricing";
import { sanitizeHtml } from "@/lib/content";
import { passwordRule } from "@/lib/validators";
import { slugify } from "@/lib/utils";

const done = (path: string, msg = "Saved", err?: string) => {
  revalidatePath(path);
  revalidatePath("/[locale]", "layout");
  redirect(`${path}?${err ? `err=${encodeURIComponent(err)}` : `msg=${encodeURIComponent(msg)}`}`);
};

export async function saveBusiness(fd: FormData) {
  const u = await requireAdmin();
  let err: string | undefined;
  try {
    await saveSetting("business", Object.fromEntries(fd));
    await audit(u.id, "update", "settings", "business");
  } catch (e) {
    err = e instanceof z.ZodError ? e.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ") : "Could not save";
  }
  done("/admin/settings/business", "Business details saved", err);
}

export async function savePricing(fd: FormData) {
  const u = await requireAdmin();
  const before = await getPricing();
  const raw = Object.fromEntries(fd) as Record<string, unknown>;
  raw.codEnabled = fd.get("codEnabled") === "on";
  raw.weightRates = String(fd.get("weightRates") ?? "")
    .split(/\r?\n/)
    .map((l) => l.split(/[:=,]/).map((x) => x.trim()))
    .filter((p) => p.length === 2 && p[0] && p[1])
    .map(([g, f]) => ({ upToGrams: Number(g), fee: Number(f) }));
  let err: string | undefined;
  let msg = "Pricing saved";
  try {
    const saved = await saveSetting("pricing", raw);
    if (saved.markupPercent !== before.markupPercent) {
      const n = await repriceAll(`Markup changed ${before.markupPercent}% → ${saved.markupPercent}%`);
      msg += ` · ${n} products repriced`;
    }
    await audit(u.id, "update", "settings", "pricing");
  } catch (e) {
    err = e instanceof z.ZodError ? e.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ") : "Could not save";
  }
  done("/admin/settings/pricing", msg, err);
}

export async function saveDelivery(fd: FormData) {
  const u = await requireAdmin();
  await saveSetting("delivery", Object.fromEntries(fd));
  await audit(u.id, "update", "settings", "delivery");
  done("/admin/settings/delivery");
}

export async function saveLaunch(fd: FormData) {
  const u = await requireAdmin();
  await saveSetting("launch", { policiesLegalReviewed: fd.get("policiesLegalReviewed") === "on", taxTableVerified: fd.get("taxTableVerified") === "on", razorpayWebsiteReviewed: fd.get("razorpayWebsiteReviewed") === "on" });
  await audit(u.id, "update", "settings", "launch");
  done("/admin");
}

export async function addRegion(fd: FormData) {
  const u = await requireAdmin();
  const state = String(fd.get("state") ?? "").trim();
  const prefix = String(fd.get("pincodePrefix") ?? "").trim();
  if (!state && !/^[1-9][0-9]{0,5}$/.test(prefix)) done("/admin/settings/delivery", "", "Enter a state or a pincode prefix (1–6 digits)");
  await db.serviceableRegion.create({ data: { state: state || null, pincodePrefix: prefix || null } });
  await audit(u.id, "create", "serviceableRegion", state || prefix);
  done("/admin/settings/delivery", "Region added");
}

export async function removeRegion(fd: FormData) {
  const u = await requireAdmin();
  const id = String(fd.get("id"));
  await db.serviceableRegion.delete({ where: { id } });
  await audit(u.id, "delete", "serviceableRegion", id);
  done("/admin/settings/delivery", "Region removed");
}

export async function saveTaxRule(fd: FormData) {
  const u = await requireAdmin();
  const d = z
    .object({ id: z.string(), hsnCode: z.string().trim().regex(/^\d{4,8}$/, "HSN must be 4–8 digits"), gstRate: z.coerce.number().min(0).max(28), verified: z.preprocess((v) => v === "on", z.boolean()) })
    .safeParse(Object.fromEntries(fd));
  if (!d.success) done("/admin/settings/tax", "", d.error.issues[0].message);
  const { id, ...data } = d.data!;
  await db.taxRule.update({ where: { id }, data: { ...data, note: data.verified ? "Verified" : "Verify with your CA before launch" } });
  await audit(u.id, "update", "taxRule", id, data);
  done("/admin/settings/tax");
}

export async function saveEmailTemplate(fd: FormData) {
  const u = await requireAdmin();
  const d = z.object({ id: z.string(), subject: z.string().min(3).max(200), body: z.string().min(10).max(20000) }).parse(Object.fromEntries(fd));
  await db.emailTemplate.update({ where: { id: d.id }, data: { subject: d.subject, body: sanitizeHtml(d.body) } });
  await audit(u.id, "update", "emailTemplate", d.id);
  done("/admin/emails");
}

// ── Customers ──────────────────────────────────
export async function setBlocked(fd: FormData) {
  const u = await requireStaff();
  const id = String(fd.get("id"));
  const blocked = fd.get("blocked") === "1";
  const target = await db.user.findUniqueOrThrow({ where: { id } });
  if (target.role !== "CUSTOMER") done("/admin/customers", "", "Use Staff settings for staff accounts");
  await db.user.update({ where: { id }, data: { isBlocked: blocked } });
  await audit(u.id, blocked ? "block" : "unblock", "user", id);
  done("/admin/customers", blocked ? "Customer blocked" : "Customer unblocked");
}

// ── Staff ──────────────────────────────────
export async function createStaff(fd: FormData) {
  const u = await requireAdmin();
  const d = z
    .object({ name: z.string().trim().min(2), email: z.string().trim().toLowerCase().email(), password: passwordRule, role: z.enum(["STAFF", "ADMIN"]), viewCosts: z.preprocess((v) => v === "on", z.boolean()) })
    .safeParse(Object.fromEntries(fd));
  if (!d.success) done("/admin/staff", "", "Check name, email and password (min 8, letter + number)");
  const v = d.data!;
  if (await db.user.findUnique({ where: { email: v.email } })) done("/admin/staff", "", "Email already registered");
  await db.user.create({ data: { name: v.name, email: v.email, role: v.role, permissions: v.viewCosts ? ["view_costs"] : [], passwordHash: await bcrypt.hash(v.password, 12) } });
  await audit(u.id, "create", "staff", v.email, { role: v.role });
  done("/admin/staff", "Staff account created");
}

export async function updateStaff(fd: FormData) {
  const u = await requireAdmin();
  const id = String(fd.get("id"));
  const role = z.enum(["STAFF", "ADMIN", "CUSTOMER"]).parse(fd.get("role"));
  if (id === u.id && role !== "ADMIN") done("/admin/staff", "", "You cannot remove your own admin role");
  await db.user.update({ where: { id }, data: { role, permissions: fd.get("viewCosts") === "on" ? ["view_costs"] : [], isBlocked: fd.get("isBlocked") === "on" } });
  await audit(u.id, "update", "staff", id, { role });
  done("/admin/staff", "Updated");
}

export async function resetStaffPassword(fd: FormData) {
  const u = await requireAdmin();
  const id = String(fd.get("id"));
  const temp = crypto.randomBytes(9).toString("base64url") + "7a";
  await db.user.update({ where: { id }, data: { passwordHash: await bcrypt.hash(temp, 12) } });
  await audit(u.id, "resetPassword", "staff", id);
  done("/admin/staff", `Temporary password (shown once): ${temp}`);
}

// ── Inbox & tickets ─────────────────────────────
export async function markMessageRead(fd: FormData) {
  await requireStaff();
  await db.contactMessage.update({ where: { id: String(fd.get("id")) }, data: { isRead: true } });
  done("/admin/inbox");
}

export async function staffReplyTicket(fd: FormData) {
  const u = await requireStaff();
  const id = String(fd.get("ticketId"));
  const body = String(fd.get("body") ?? "").trim().slice(0, 4000);
  const close = fd.get("close") === "on";
  if (body) await db.ticketMessage.create({ data: { ticketId: id, body, fromStaff: true } });
  await db.ticket.update({ where: { id }, data: { status: close ? "CLOSED" : body ? "ANSWERED" : undefined } });
  await audit(u.id, "reply", "ticket", id);
  done("/admin/inbox", "Reply sent");
}

// ── Content (CMS) ───────────────────────────────
export async function saveBanner(fd: FormData) {
  const u = await requireStaff();
  const d = z
    .object({
      id: z.string().optional(),
      title_en: z.string().min(2).max(120),
      title_hi: z.string().min(1).max(120),
      subtitle_en: z.string().max(240),
      subtitle_hi: z.string().max(240),
      ctaLabel_en: z.string().min(1).max(40),
      ctaLabel_hi: z.string().min(1).max(40),
      ctaHref: z.string().regex(/^\/[\w\-/?=&]*$/, "Internal path like /category/seeds"),
      illustration: z.string().max(30),
      theme: z.enum(["green", "gold", "soil"]),
      sortOrder: z.coerce.number().int().default(0),
      isActive: z.preprocess((v) => v === "on", z.boolean()),
    })
    .safeParse(Object.fromEntries(fd));
  if (!d.success) done("/admin/content", "", d.error.issues[0].message);
  const { id, ...data } = d.data!;
  if (id) await db.banner.update({ where: { id }, data });
  else await db.banner.create({ data });
  await audit(u.id, id ? "update" : "create", "banner", id);
  done("/admin/content", "Banner saved");
}

export async function savePage(fd: FormData) {
  const u = await requireStaff();
  const d = z
    .object({
      id: z.string(),
      title_en: z.string().min(2),
      title_hi: z.string().min(1),
      summary_en: z.string().max(1000),
      summary_hi: z.string().max(1000),
      body_en: z.string().min(10),
      body_hi: z.string().min(10),
      hiReviewed: z.preprocess((v) => v === "on", z.boolean()),
      legalReviewed: z.preprocess((v) => v === "on", z.boolean()),
    })
    .parse(Object.fromEntries(fd));
  const { id, ...data } = d;
  await db.page.update({ where: { id }, data: { ...data, body_en: sanitizeHtml(data.body_en), body_hi: sanitizeHtml(data.body_hi) } });
  await audit(u.id, "update", "page", id);
  done(`/admin/content/pages/${id}`, "Page saved");
}

export async function saveFaq(fd: FormData) {
  const u = await requireStaff();
  const d = z
    .object({
      id: z.string().optional(),
      group: z.enum(["ordering", "delivery", "payment", "replacement", "product", "genuine"]),
      question_en: z.string().min(5),
      question_hi: z.string().min(2),
      answer_en: z.string().min(5),
      answer_hi: z.string().min(2),
      sortOrder: z.coerce.number().int().default(0),
      hiReviewed: z.preprocess((v) => v === "on", z.boolean()),
      isActive: z.preprocess((v) => v === "on", z.boolean()),
    })
    .parse(Object.fromEntries(fd));
  const { id, ...data } = { ...d, answer_en: sanitizeHtml(d.answer_en), answer_hi: sanitizeHtml(d.answer_hi) };
  if (id) await db.faq.update({ where: { id }, data });
  else await db.faq.create({ data });
  await audit(u.id, id ? "update" : "create", "faq", id);
  done("/admin/content", "FAQ saved");
}

export async function saveArticle(fd: FormData) {
  const u = await requireStaff();
  const d = z
    .object({
      id: z.string().optional(),
      slug: z.string().min(3),
      title_en: z.string().min(3),
      title_hi: z.string().min(2),
      excerpt_en: z.string().min(10).max(400),
      excerpt_hi: z.string().min(5).max(400),
      body_en: z.string().min(50),
      body_hi: z.string().min(50),
      illustration: z.string().max(30),
      categorySlugs: z.string().default(""),
      hiReviewed: z.preprocess((v) => v === "on", z.boolean()),
      isPublished: z.preprocess((v) => v === "on", z.boolean()),
    })
    .parse(Object.fromEntries(fd));
  const { id, categorySlugs, ...rest } = d;
  const existing = id ? await db.article.findUnique({ where: { id } }) : null;
  const data = {
    ...rest,
    slug: slugify(rest.slug),
    body_en: sanitizeHtml(rest.body_en),
    body_hi: sanitizeHtml(rest.body_hi),
    categorySlugs: categorySlugs.split(",").map((s) => s.trim()).filter(Boolean),
    // Real publish date: set once, the first time it is published. Never backdated.
    publishedAt: rest.isPublished ? (existing?.publishedAt ?? new Date()) : existing?.publishedAt ?? null,
  };
  const a = id ? await db.article.update({ where: { id }, data }) : await db.article.create({ data });
  await audit(u.id, id ? "update" : "create", "article", a.id);
  done(`/admin/content/articles/${a.id}`, "Article saved");
}
