"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { audit, requireAdmin, requireStaff } from "@/lib/session";
import { approveImport, queueRecords } from "@/lib/importer";
import { getPricing } from "@/lib/settings";
import { parseCsv } from "@/lib/csv";
import { repriceProduct } from "@/lib/product-pricing";
import { recomputeRating } from "@/lib/reviews";
import { slugify } from "@/lib/utils";

const back = (fd: FormData, fallback: string) => {
  const b = String(fd.get("back") ?? "");
  return b.startsWith("/admin") ? b : fallback;
};

// ── Import queue ───────────────────────────────────────────
export async function approveImportAction(fd: FormData) {
  const u = await requireStaff("view_costs");
  const id = String(fd.get("id"));
  const pricing = await getPricing();
  let err = "";
  try {
    const r = await approveImport(db, id, pricing.markupPercent);
    if (r.repriceNeeded && r.productId) await repriceProduct(r.productId, "Supplier price update approved");
    await audit(u.id, "approve", "import", id);
  } catch (e) {
    err = e instanceof Error ? e.message : "Failed";
  }
  revalidatePath("/admin/import");
  if (err) redirect(`/admin/import?err=${encodeURIComponent(err)}`);
}

export async function rejectImportAction(fd: FormData) {
  const u = await requireStaff();
  const id = String(fd.get("id"));
  await db.importItem.update({ where: { id }, data: { status: "REJECTED" } });
  await audit(u.id, "reject", "import", id);
  revalidatePath("/admin/import");
}

/** CSV upload → import queue. Columns: sourceSite,sourceUrl,name,brand,category,subCategory,technicalContent,formulation,packs,crops,pests,dosage
 *  packs = "250|ml|450|430;500|ml|820|790" (size|unit|mrp|supplierPrice) */
export async function uploadImportCsv(fd: FormData) {
  const u = await requireStaff("view_costs");
  const file = fd.get("file");
  if (!(file instanceof File) || file.size > 5 * 1024 * 1024) redirect("/admin/import?err=Upload%20a%20CSV%20under%205%20MB");
  const rows = parseCsv(await (file as File).text());
  const records = rows.map((r) => ({
    sourceSite: r.sourceSite || "manual",
    sourceUrl: r.sourceUrl,
    name: r.name,
    brand: r.brand,
    category: r.category,
    subCategory: r.subCategory,
    technicalContent: r.technicalContent,
    formulation: r.formulation,
    activeIngredients: (r.activeIngredients ?? "").split(";").map((s) => s.trim()).filter(Boolean),
    packs: (r.packs ?? "")
      .split(";")
      .filter(Boolean)
      .map((p) => {
        const [size, unit, mrp, price] = p.split("|");
        return { size: size?.trim(), unit: unit?.trim(), mrp: Number(mrp), price: Number(price) };
      }),
    crops: (r.crops ?? "").split(";").map((s) => s.trim()).filter(Boolean),
    pests: (r.pests ?? "").split(";").map((s) => s.trim()).filter(Boolean),
    dosage: r.dosage,
  }));
  const res = await queueRecords(db, records);
  await audit(u.id, "csvImport", "import", undefined, res);
  redirect(`/admin/import?msg=${encodeURIComponent(`${res.queued} queued, ${res.invalid} invalid rows skipped`)}`);
}

// ── Taxonomy ───────────────────────────────────────────
const catSchema = z.object({
  id: z.string().optional(),
  slug: z.string().trim().min(2).max(60),
  name_en: z.string().trim().min(2).max(80),
  name_hi: z.string().trim().min(1).max(80),
  description_en: z.string().max(600).default(""),
  description_hi: z.string().max(600).default(""),
  seoText_en: z.string().max(3000).default(""),
  seoText_hi: z.string().max(3000).default(""),
  illustration: z.string().max(30).default("leaf"),
  sortOrder: z.coerce.number().int().default(0),
  isActive: z.preprocess((v) => v === "on", z.boolean()),
});

export async function saveCategory(fd: FormData) {
  const u = await requireStaff();
  const { id, ...d } = catSchema.parse(Object.fromEntries(fd));
  const data = { ...d, slug: slugify(d.slug) };
  if (id) await db.category.update({ where: { id }, data });
  else await db.category.create({ data });
  await audit(u.id, id ? "update" : "create", "category", id);
  revalidatePath("/[locale]", "layout");
  revalidatePath("/admin/taxonomy");
}

export async function saveSubCategory(fd: FormData) {
  const u = await requireStaff();
  const d = z
    .object({ id: z.string().optional(), categoryId: z.string(), slug: z.string().trim().min(2), name_en: z.string().trim().min(2), name_hi: z.string().trim().min(1), sortOrder: z.coerce.number().int().default(0), isActive: z.preprocess((v) => v === "on", z.boolean()) })
    .parse(Object.fromEntries(fd));
  const { id, ...data } = { ...d, slug: slugify(d.slug) };
  if (id) await db.subCategory.update({ where: { id }, data });
  else await db.subCategory.create({ data });
  await audit(u.id, id ? "update" : "create", "subCategory", id);
  revalidatePath("/admin/taxonomy");
  revalidatePath("/[locale]", "layout");
}

export async function saveCrop(fd: FormData) {
  const u = await requireStaff();
  const d = z
    .object({ id: z.string().optional(), slug: z.string().trim().min(2), name_en: z.string().trim().min(2), name_hi: z.string().trim().min(1), seoText_en: z.string().default(""), seoText_hi: z.string().default(""), sortOrder: z.coerce.number().int().default(0), isActive: z.preprocess((v) => v === "on", z.boolean()) })
    .parse(Object.fromEntries(fd));
  const { id, ...data } = { ...d, slug: slugify(d.slug) };
  if (id) await db.crop.update({ where: { id }, data });
  else await db.crop.create({ data });
  await audit(u.id, id ? "update" : "create", "crop", id);
  revalidatePath("/admin/taxonomy");
  revalidatePath("/[locale]", "layout");
}

export async function saveBrand(fd: FormData) {
  const u = await requireStaff();
  const d = z.object({ id: z.string().optional(), name: z.string().trim().min(1).max(80), isActive: z.preprocess((v) => v === "on", z.boolean()) }).parse(Object.fromEntries(fd));
  const { id, ...data } = d;
  if (id) await db.brand.update({ where: { id }, data: { ...data, slug: slugify(data.name) } });
  else await db.brand.create({ data: { ...data, slug: slugify(data.name) } });
  await audit(u.id, id ? "update" : "create", "brand", id);
  revalidatePath("/admin/taxonomy");
  revalidatePath("/[locale]", "layout");
}

// ── Suppliers & restricted ingredients ──────────────────────
export async function saveSupplier(fd: FormData) {
  const u = await requireStaff("view_costs");
  const d = z
    .object({
      id: z.string().optional(),
      name: z.string().trim().min(2).max(80),
      type: z.enum(["ONLINE_STORE", "DISTRIBUTOR", "BRAND"]),
      website: z.string().trim().max(200).optional(),
      contactName: z.string().trim().max(80).optional(),
      phone: z.string().trim().max(20).optional(),
      email: z.string().trim().max(120).optional(),
      notes: z.string().max(2000).optional(),
      isActive: z.preprocess((v) => v === "on", z.boolean()),
    })
    .parse(Object.fromEntries(fd));
  const { id, ...data } = d;
  if (id) await db.supplier.update({ where: { id }, data });
  else await db.supplier.create({ data });
  await audit(u.id, id ? "update" : "create", "supplier", id);
  revalidatePath("/admin/suppliers");
}

export async function saveRestricted(fd: FormData) {
  const u = await requireAdmin();
  const d = z
    .object({ name: z.string().trim().toLowerCase().min(3).max(80), status: z.enum(["BANNED", "RESTRICTED", "STATE_RESTRICTED"]), states: z.string().default(""), notification: z.string().max(300).default("") })
    .parse(Object.fromEntries(fd));
  const states = d.states.split(",").map((s) => s.trim()).filter(Boolean);
  await db.restrictedIngredient.upsert({ where: { name: d.name }, create: { ...d, states }, update: { status: d.status, states, notification: d.notification } });
  // Re-flag products containing this ingredient
  const hits = await db.product.findMany({ where: { OR: [{ activeIngredients: { has: d.name } }, { technicalContent: { contains: d.name, mode: "insensitive" } }] }, select: { id: true } });
  await db.product.updateMany({ where: { id: { in: hits.map((h) => h.id) } }, data: { restrictedFlag: true, restrictedReason: `${d.name} – ${d.status}`, status: "DRAFT" } });
  await audit(u.id, "upsert", "restrictedIngredient", d.name, { flaggedProducts: hits.length });
  revalidatePath("/admin/restricted");
  revalidatePath("/[locale]", "layout");
}

export async function deleteRestricted(fd: FormData) {
  const u = await requireAdmin();
  const id = String(fd.get("id"));
  await db.restrictedIngredient.delete({ where: { id } });
  await audit(u.id, "delete", "restrictedIngredient", id);
  revalidatePath("/admin/restricted");
}

// ── Coupons ───────────────────────────────────────────
export async function saveCoupon(fd: FormData) {
  const u = await requireStaff();
  const d = z
    .object({
      id: z.string().optional(),
      code: z.string().trim().toUpperCase().regex(/^[A-Z0-9_-]{3,30}$/),
      type: z.enum(["PERCENT", "FLAT"]),
      value: z.coerce.number().positive(),
      maxDiscount: z.preprocess((v) => (v === "" ? null : v), z.coerce.number().positive().nullable()),
      minOrder: z.coerce.number().min(0).default(0),
      expiresAt: z.preprocess((v) => (v ? new Date(String(v)) : null), z.date().nullable()),
      usageLimit: z.preprocess((v) => (v === "" ? null : v), z.coerce.number().int().positive().nullable()),
      perCustomerLimit: z.coerce.number().int().min(1).default(1),
      isActive: z.preprocess((v) => v === "on", z.boolean()),
    })
    .parse(Object.fromEntries(fd));
  if (d.type === "PERCENT" && d.value > 90) throw new Error("Percent coupon above 90% not allowed");
  const { id, ...data } = d;
  if (id) await db.coupon.update({ where: { id }, data });
  else await db.coupon.create({ data });
  await audit(u.id, id ? "update" : "create", "coupon", d.code);
  revalidatePath("/admin/coupons");
}

// ── Reviews & Q&A ───────────────────────────────────────
export async function moderateReview(fd: FormData) {
  const u = await requireStaff();
  const id = String(fd.get("id"));
  const status = z.enum(["PUBLISHED", "HIDDEN", "PENDING"]).parse(fd.get("status"));
  const reply = String(fd.get("adminReply") ?? "").trim().slice(0, 1500);
  // Admin never edits the customer's text – only status and an optional team reply.
  const r = await db.review.update({ where: { id }, data: { status, adminReply: reply || null } });
  await recomputeRating(r.productId);
  await audit(u.id, `review:${status}`, "review", id);
  revalidatePath("/admin/reviews");
  revalidatePath("/[locale]", "layout");
}

export async function answerQuestion(fd: FormData) {
  const u = await requireStaff();
  const id = String(fd.get("id"));
  const answer = String(fd.get("answer") ?? "").trim().slice(0, 2000);
  const publish = fd.get("publish") === "on";
  await db.question.update({ where: { id }, data: { answer: answer || null, answeredAt: answer ? new Date() : null, isPublished: publish && Boolean(answer) } });
  await audit(u.id, "answer", "question", id);
  revalidatePath("/admin/reviews");
  revalidatePath("/[locale]", "layout");
}

export async function backTo(fd: FormData) {
  redirect(back(fd, "/admin"));
}
