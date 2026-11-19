"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { audit, canViewCosts, requireStaff } from "@/lib/session";
import { checkRestricted, repriceAll, repriceProduct, repriceVariant } from "@/lib/product-pricing";
import { slugify } from "@/lib/utils";

const lines = (v: FormDataEntryValue | null) =>
  String(v ?? "")
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);
const list = (v: FormDataEntryValue | null) =>
  String(v ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
const optNum = (v: FormDataEntryValue | null) => {
  const s = String(v ?? "").trim();
  return s === "" ? null : Number(s);
};

const productSchema = z.object({
  name_en: z.string().trim().min(2).max(200),
  name_hi: z.string().trim().max(200),
  slug: z.string().trim().max(200),
  brandId: z.string().nullable(),
  categoryId: z.string().min(1),
  subCategoryId: z.string().nullable(),
  shortDescription_en: z.string().max(500),
  shortDescription_hi: z.string().max(500),
  description_en: z.string().max(10000),
  description_hi: z.string().max(10000),
  dosage_en: z.string().max(3000),
  dosage_hi: z.string().max(3000),
  howToUse_en: z.string().max(5000),
  howToUse_hi: z.string().max(5000),
  safety_en: z.string().max(5000),
  safety_hi: z.string().max(5000),
  technicalContent: z.string().max(300),
  formulation: z.string().max(100),
  compatibility: z.string().max(1000),
  manufacturerName: z.string().max(200),
  manufacturerAddress: z.string().max(500),
  countryOfOrigin: z.string().max(80),
  hsnCode: z.string().max(12).nullable(),
  gstRate: z.number().min(0).max(28).nullable(),
  minShelfLifeMonths: z.number().int().min(0).max(120).nullable(),
  batchNo: z.string().max(60).nullable(),
  expiryDate: z.date().nullable(),
  licenceType: z.enum(["PESTICIDE", "FERTILIZER", "SEED", "NONE"]),
  fulfilledBy: z.enum(["OWN_STOCK", "SUPPLIER_DIRECT"]),
  imageStatus: z.enum(["NONE", "CATEGORY_FALLBACK", "DISTRIBUTOR", "OWN_PHOTO"]),
  dosePerAcre: z.number().min(0).nullable(),
  dosePerLitre: z.number().min(0).nullable(),
  doseUnit: z.string().max(10).nullable(),
  isOrganic: z.boolean(),
  surfaceOnly: z.boolean(),
  isFeatured: z.boolean(),
  isOrganicPick: z.boolean(),
  hiReviewed: z.boolean(),
  mrpVerified: z.boolean(),
});

export async function saveProduct(fd: FormData) {
  const u = await requireStaff();
  const id = String(fd.get("id") ?? "") || null;
  const s = (k: string) => String(fd.get(k) ?? "").trim();
  const n = (k: string) => (s(k) ? s(k) : null);
  const data = productSchema.parse({
    name_en: s("name_en"),
    name_hi: s("name_hi"),
    slug: s("slug") || slugify(s("name_en")),
    brandId: n("brandId"),
    categoryId: s("categoryId"),
    subCategoryId: n("subCategoryId"),
    shortDescription_en: s("shortDescription_en"),
    shortDescription_hi: s("shortDescription_hi"),
    description_en: s("description_en"),
    description_hi: s("description_hi"),
    dosage_en: s("dosage_en"),
    dosage_hi: s("dosage_hi"),
    howToUse_en: s("howToUse_en"),
    howToUse_hi: s("howToUse_hi"),
    safety_en: s("safety_en"),
    safety_hi: s("safety_hi"),
    technicalContent: s("technicalContent"),
    formulation: s("formulation"),
    compatibility: s("compatibility"),
    manufacturerName: s("manufacturerName"),
    manufacturerAddress: s("manufacturerAddress"),
    countryOfOrigin: s("countryOfOrigin") || "India",
    hsnCode: n("hsnCode"),
    gstRate: optNum(fd.get("gstRate")),
    minShelfLifeMonths: optNum(fd.get("minShelfLifeMonths")),
    batchNo: n("batchNo"),
    expiryDate: s("expiryDate") ? new Date(s("expiryDate")) : null,
    licenceType: s("licenceType") || "NONE",
    fulfilledBy: s("fulfilledBy") || "SUPPLIER_DIRECT",
    imageStatus: s("imageStatus") || "NONE",
    dosePerAcre: optNum(fd.get("dosePerAcre")),
    dosePerLitre: optNum(fd.get("dosePerLitre")),
    doseUnit: n("doseUnit"),
    isOrganic: fd.get("isOrganic") === "on",
    surfaceOnly: fd.get("surfaceOnly") === "on",
    isFeatured: fd.get("isFeatured") === "on",
    isOrganicPick: fd.get("isOrganicPick") === "on",
    hiReviewed: fd.get("hiReviewed") === "on",
    mrpVerified: fd.get("mrpVerified") === "on",
  });
  const activeIngredients = list(fd.get("activeIngredients"));
  const targetPests = list(fd.get("targetPests"));
  const cropIds = fd.getAll("cropIds").map(String);
  const restricted = await checkRestricted(activeIngredients, data.technicalContent);
  const payload = {
    ...data,
    slug: slugify(data.slug),
    keyFeatures_en: lines(fd.get("keyFeatures_en")),
    keyFeatures_hi: lines(fd.get("keyFeatures_hi")),
    activeIngredients,
    targetPests,
    restrictedFlag: Boolean(restricted),
    restrictedReason: restricted,
  };
  let productId = id;
  try {
    if (id) {
      await db.product.update({ where: { id }, data: { ...payload, crops: { deleteMany: {}, create: cropIds.map((cropId) => ({ cropId })) } } });
    } else {
      const p = await db.product.create({ data: { ...payload, status: "DRAFT", crops: { create: cropIds.map((cropId) => ({ cropId })) } } });
      productId = p.id;
    }
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") throw new Error("Slug already used by another product");
    throw e;
  }
  if (restricted) await db.product.update({ where: { id: productId! }, data: { status: "DRAFT" } });
  await audit(u.id, id ? "update" : "create", "product", productId!);
  revalidatePath("/[locale]", "layout");
  if (!id) redirect(`/admin/products/${productId}`);
  revalidatePath(`/admin/products/${productId}`);
}

export async function setProductStatus(ids: string[], status: "DRAFT" | "PUBLISHED" | "ARCHIVED") {
  const u = await requireStaff();
  const errors: string[] = [];
  for (const id of ids) {
    const p = await db.product.findUnique({ where: { id }, include: { variants: { where: { isActive: true } } } });
    if (!p) continue;
    if (status === "PUBLISHED") {
      if (p.restrictedFlag) {
        errors.push(`${p.name_en}: restricted ingredient – cannot publish`);
        continue;
      }
      if (!p.mrpVerified) {
        errors.push(`${p.name_en}: MRP not verified from the pack`);
        continue;
      }
      if (!p.variants.length) {
        errors.push(`${p.name_en}: no active pack size`);
        continue;
      }
      if (p.variants.some((v) => Number(v.sellingPrice) > Number(v.mrp))) {
        errors.push(`${p.name_en}: price above MRP`);
        continue;
      }
    }
    await db.product.update({ where: { id }, data: { status, publishedAt: status === "PUBLISHED" ? (p.publishedAt ?? new Date()) : p.publishedAt } });
    await audit(u.id, `status:${status}`, "product", id);
  }
  revalidatePath("/[locale]", "layout");
  revalidatePath("/admin/products");
  return { ok: errors.length === 0, errors };
}

export async function setProductStatusForm(fd: FormData) {
  const ids = fd.getAll("ids").map(String).filter(Boolean);
  const status = String(fd.get("status")) as "DRAFT" | "PUBLISHED" | "ARCHIVED";
  const r = await setProductStatus(ids, status);
  const back = String(fd.get("back") ?? "/admin/products");
  redirect(r.errors.length ? `${back}${back.includes("?") ? "&" : "?"}err=${encodeURIComponent(r.errors.join(" | ").slice(0, 600))}` : back);
}

const variantSchema = z.object({
  productId: z.string(),
  id: z.string().optional(),
  packSize: z.string().trim().min(1).max(20),
  unit: z.enum(["ml", "L", "g", "kg", "pcs", "packet", "m", "set"]),
  mrp: z.coerce.number().positive(),
  costPrice: z.coerce.number().min(0),
  stock: z.coerce.number().int().min(0).default(0),
  lowStockAt: z.coerce.number().int().min(0).default(5),
  sku: z.string().trim().min(2).max(60),
  weightGrams: z.coerce.number().int().min(1).max(100000),
  sortOrder: z.coerce.number().int().default(0),
  isActive: z.preprocess((v) => v === "on", z.boolean()),
});

export async function saveVariant(fd: FormData) {
  const u = await requireStaff();
  const costsAllowed = canViewCosts(u);
  const d = variantSchema.parse({ ...Object.fromEntries(fd), costPrice: costsAllowed ? fd.get("costPrice") : 0 });
  const { id, productId, ...rest } = d;
  if (!id && !costsAllowed) throw new Error("Creating a pack size needs the cost-price permission");
  const { costPrice, ...noCost } = rest;
  const v = id
    ? await db.productVariant.update({ where: { id }, data: costsAllowed ? { ...rest } : noCost })
    : await db.productVariant.create({ data: { ...rest, costPrice, sellingPrice: Math.min(d.mrp, costPrice), productId } });
  await repriceVariant(v.id, id ? "Variant edited" : "Variant created");
  await repriceProduct(productId, "Variant change");
  await audit(u.id, id ? "update" : "create", "variant", v.id, { canViewCosts: canViewCosts(u) });
  revalidatePath(`/admin/products/${productId}`);
  revalidatePath("/[locale]", "layout");
}

export async function deleteVariant(fd: FormData) {
  const u = await requireStaff();
  const id = String(fd.get("id"));
  const v = await db.productVariant.findUniqueOrThrow({ where: { id }, include: { _count: { select: { orderItems: true } } } });
  if (v._count.orderItems > 0) await db.productVariant.update({ where: { id }, data: { isActive: false } });
  else await db.productVariant.delete({ where: { id } });
  await audit(u.id, "delete", "variant", id);
  revalidatePath(`/admin/products/${v.productId}`);
}

export async function saveImages(productId: string, images: string[], imageStatus: "NONE" | "CATEGORY_FALLBACK" | "DISTRIBUTOR" | "OWN_PHOTO") {
  const u = await requireStaff();
  const clean = images.filter((i) => /^https:\/\/[\w.-]+\.public\.blob\.vercel-storage\.com\//.test(i)).slice(0, 10);
  await db.product.update({ where: { id: productId }, data: { images: clean, imageStatus: clean.length ? (imageStatus === "NONE" || imageStatus === "CATEGORY_FALLBACK" ? "DISTRIBUTOR" : imageStatus) : "CATEGORY_FALLBACK" } });
  await audit(u.id, "images", "product", productId);
  revalidatePath(`/admin/products/${productId}`);
  revalidatePath("/[locale]", "layout");
}

const listingSchema = z.object({
  variantId: z.string(),
  supplierId: z.string(),
  supplierProductUrl: z.string().url().or(z.literal("")).optional(),
  supplierPrice: z.coerce.number().positive(),
  inStockAtSupplier: z.preprocess((v) => v === "on", z.boolean()),
  isPreferred: z.preprocess((v) => v === "on", z.boolean()),
});

export async function saveSupplierListing(fd: FormData) {
  const u = await requireStaff("view_costs");
  const d = listingSchema.parse(Object.fromEntries(fd));
  if (d.isPreferred) await db.supplierListing.updateMany({ where: { variantId: d.variantId }, data: { isPreferred: false } });
  await db.supplierListing.upsert({
    where: { supplierId_variantId: { supplierId: d.supplierId, variantId: d.variantId } },
    create: { ...d, supplierProductUrl: d.supplierProductUrl || null, lastCheckedAt: new Date() },
    update: { ...d, supplierProductUrl: d.supplierProductUrl || null, lastCheckedAt: new Date() },
  });
  const v = await db.productVariant.findUniqueOrThrow({ where: { id: d.variantId }, select: { productId: true } });
  await repriceVariant(d.variantId, "Supplier price updated");
  await repriceProduct(v.productId, "Supplier price updated");
  await audit(u.id, "upsert", "supplierListing", d.variantId);
  revalidatePath(`/admin/products/${v.productId}`);
  revalidatePath("/[locale]", "layout");
}

export async function deleteSupplierListing(fd: FormData) {
  const u = await requireStaff("view_costs");
  const id = String(fd.get("id"));
  const l = await db.supplierListing.delete({ where: { id }, include: { variant: { select: { productId: true } } } });
  await repriceProduct(l.variant.productId, "Supplier listing removed");
  await audit(u.id, "delete", "supplierListing", id);
  revalidatePath(`/admin/products/${l.variant.productId}`);
}

export async function repriceEverything() {
  const u = await requireStaff();
  const n = await repriceAll("Global markup changed");
  await audit(u.id, "repriceAll", "product", undefined, { count: n });
  revalidatePath("/[locale]", "layout");
  return n;
}

export async function deleteProduct(fd: FormData) {
  const u = await requireStaff();
  const id = String(fd.get("id"));
  const used = await db.orderItem.count({ where: { productId: id } });
  if (used) await db.product.update({ where: { id }, data: { status: "ARCHIVED" } });
  else await db.product.delete({ where: { id } });
  await audit(u.id, used ? "archive" : "delete", "product", id);
  revalidatePath("/[locale]", "layout");
  redirect("/admin/products");
}
