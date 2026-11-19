/**
 * Shared import pipeline – used by `npm run import` (scripts/import) and Admin → Import queue.
 * Raw records contain FACTS ONLY (see scripts/scrape). Approving creates a DRAFT product with
 * original generated copy, variants and a private supplier listing.
 */
import { Prisma, PrismaClient } from "@prisma/client";
import { z } from "zod";
import { computeSellingPrice } from "./pricing";
import { generateCopy } from "./content-gen";
import { slugify } from "./utils";

export const rawRecordSchema = z.object({
  sourceSite: z.string().min(2),
  sourceUrl: z.string().url(),
  name: z.string().min(2),
  brand: z.string().optional().default(""),
  category: z.string().min(2), // our category slug
  subCategory: z.string().optional().default(""), // our sub-category slug
  technicalContent: z.string().optional().default(""),
  activeIngredients: z.array(z.string()).optional().default([]),
  formulation: z.string().optional().default(""),
  packs: z
    .array(z.object({ size: z.string(), unit: z.string(), mrp: z.number().positive().nullable().optional(), price: z.number().positive(), inStock: z.boolean().optional().default(true) }))
    .min(1),
  crops: z.array(z.string()).optional().default([]),
  pests: z.array(z.string()).optional().default([]),
  dosage: z.string().optional().default(""),
  manufacturer: z.string().optional().default(""),
});
export type RawRecord = z.infer<typeof rawRecordSchema>;

const UNITS: Record<string, string> = { ml: "ml", l: "L", ltr: "L", litre: "L", liter: "L", g: "g", gm: "g", gms: "g", kg: "kg", pc: "pcs", pcs: "pcs", piece: "pcs", packet: "packet", pkt: "packet", m: "m", set: "set" };
export const normUnit = (u: string) => UNITS[u.toLowerCase().trim()] ?? "pcs";
const weightOf = (size: string, unit: string) => {
  const n = Number(size) || 1;
  if (unit === "kg" || unit === "L") return Math.round(n * 1000 + 100);
  if (unit === "g" || unit === "ml") return Math.round(n + 60);
  return 500;
};

async function restrictedHit(db: PrismaClient | Prisma.TransactionClient, rec: RawRecord) {
  const list = await db.restrictedIngredient.findMany();
  const hay = [...rec.activeIngredients, rec.technicalContent, rec.name].join(" ").toLowerCase();
  const hit = list.find((r) => hay.includes(r.name.toLowerCase()));
  return hit ? `${hit.name} – ${hit.status}` : null;
}

/** Queue raw records. Existing products from the same source get a price-change entry instead. */
export async function queueRecords(db: PrismaClient, records: unknown[]) {
  let queued = 0;
  let invalid = 0;
  for (const r of records) {
    const parsed = rawRecordSchema.safeParse(r);
    if (!parsed.success) {
      invalid++;
      continue;
    }
    const rec = parsed.data;
    const flag = await restrictedHit(db, rec);
    const existing = await db.importItem.findUnique({ where: { sourceUrl: rec.sourceUrl } });
    let priceChange: Prisma.InputJsonValue | undefined;
    if (existing?.productId) {
      const variants = await db.productVariant.findMany({ where: { productId: existing.productId }, select: { id: true, packSize: true, unit: true, mrp: true, costPrice: true } });
      const changes = rec.packs
        .map((p) => {
          const v = variants.find((x) => x.packSize === p.size && x.unit === normUnit(p.unit));
          return v && (Number(v.costPrice) !== p.price || (p.mrp != null && Number(v.mrp) !== p.mrp)) ? { variantId: v.id, pack: `${p.size} ${normUnit(p.unit)}`, oldCost: Number(v.costPrice), newCost: p.price, oldMrp: Number(v.mrp), newMrp: p.mrp } : null;
        })
        .filter(Boolean);
      if (changes.length) priceChange = changes as Prisma.InputJsonValue;
    }
    await db.importItem.upsert({
      where: { sourceUrl: rec.sourceUrl },
      create: { sourceUrl: rec.sourceUrl, sourceSite: rec.sourceSite, raw: rec as unknown as Prisma.InputJsonValue, flagged: Boolean(flag), flagReason: flag },
      update: {
        raw: rec as unknown as Prisma.InputJsonValue,
        flagged: Boolean(flag),
        flagReason: flag,
        priceChange: priceChange ?? Prisma.DbNull,
        status: existing?.productId ? (priceChange ? "PENDING" : existing.status) : existing?.status === "REJECTED" ? "REJECTED" : "PENDING",
      },
    });
    queued++;
  }
  return { queued, invalid };
}

async function ensureSupplier(db: Prisma.TransactionClient, site: string) {
  const name = site.includes("agribegri") ? "AgriBegri" : site.includes("kisanshop") ? "KisanShop" : site;
  return db.supplier.upsert({ where: { name }, create: { name, type: "ONLINE_STORE", website: `https://${site.replace(/^https?:\/\//, "")}` }, update: {} });
}

/** Approve a queued record → DRAFT product (or apply an approved price change). */
export async function approveImport(db: PrismaClient, importId: string, markupPercent: number) {
  const item = await db.importItem.findUniqueOrThrow({ where: { id: importId } });
  const rec = rawRecordSchema.parse(item.raw);

  // Price update for an already imported product
  if (item.productId) {
    await db.$transaction(async (tx) => {
      const supplier = await ensureSupplier(tx, item.sourceSite);
      for (const p of rec.packs) {
        const v = await tx.productVariant.findFirst({ where: { productId: item.productId!, packSize: p.size, unit: normUnit(p.unit) } });
        if (!v) continue;
        if (p.mrp != null) await tx.productVariant.update({ where: { id: v.id }, data: { mrp: p.mrp } });
        await tx.supplierListing.upsert({
          where: { supplierId_variantId: { supplierId: supplier.id, variantId: v.id } },
          create: { supplierId: supplier.id, variantId: v.id, supplierPrice: p.price, supplierProductUrl: rec.sourceUrl, inStockAtSupplier: p.inStock, isPreferred: true },
          update: { supplierPrice: p.price, inStockAtSupplier: p.inStock, lastCheckedAt: new Date() },
        });
      }
      await tx.importItem.update({ where: { id: item.id }, data: { status: "APPROVED", priceChange: Prisma.DbNull } });
    });
    return { productId: item.productId, repriceNeeded: true };
  }

  if (item.flagged) throw new Error(`Flagged: ${item.flagReason}. Review manually before importing.`);
  const category = await db.category.findUnique({ where: { slug: rec.category } });
  if (!category) throw new Error(`Unknown category "${rec.category}"`);
  const sub = rec.subCategory ? await db.subCategory.findUnique({ where: { slug: rec.subCategory } }) : null;
  const copy = generateCopy({ name: rec.name, brand: rec.brand, category: rec.category, subCategory: rec.subCategory, technicalContent: rec.technicalContent, formulation: rec.formulation, crops: rec.crops, pests: rec.pests, dosage: rec.dosage });
  const crops = await db.crop.findMany({ where: { slug: { in: rec.crops.map((c) => slugify(c)) } } });

  const productId = await db.$transaction(async (tx) => {
    const brand = rec.brand ? await tx.brand.upsert({ where: { name: rec.brand }, create: { name: rec.brand, slug: slugify(rec.brand) }, update: {} }) : null;
    const supplier = await ensureSupplier(tx, item.sourceSite);
    const withBrand = rec.brand && !rec.name.toLowerCase().startsWith(rec.brand.toLowerCase()) ? `${rec.brand} ${rec.name}` : rec.name;
    let slug = slugify(withBrand).slice(0, 90).replace(/-+$/, "");
    if (await tx.product.findUnique({ where: { slug } })) slug = `${slug}-${item.id.slice(-5)}`;
    let marginFlag = false;
    const product = await tx.product.create({
      data: {
        slug,
        name_en: rec.name,
        name_hi: rec.name, // to be translated / reviewed by a native speaker
        brandId: brand?.id,
        categoryId: category.id,
        subCategoryId: sub?.id,
        technicalContent: rec.technicalContent,
        activeIngredients: rec.activeIngredients.map((a) => a.toLowerCase()),
        formulation: rec.formulation,
        targetPests: rec.pests.map((p) => p.toLowerCase()),
        manufacturerName: rec.manufacturer || rec.brand,
        status: "DRAFT",
        hiReviewed: false,
        imageStatus: "CATEGORY_FALLBACK",
        mrpVerified: rec.packs.every((p) => p.mrp != null),
        fulfilledBy: "SUPPLIER_DIRECT",
        minShelfLifeMonths: ["crop-protection", "crop-nutrition", "seeds", "plant-growth-regulators"].includes(rec.category) ? 6 : null,
        ...copy,
        crops: { create: crops.map((c) => ({ cropId: c.id })) },
      },
    });
    for (const [i, p] of rec.packs.entries()) {
      const unit = normUnit(p.unit);
      // Missing MRP: provisional MRP = supplier price (keeps selling price ≤ it) and product is blocked until verified.
      const mrp = p.mrp ?? p.price;
      const { sellingPrice, marginFlag: mf } = computeSellingPrice(p.price, mrp, markupPercent);
      marginFlag ||= mf;
      const v = await tx.productVariant.create({
        data: {
          productId: product.id,
          packSize: p.size,
          unit,
          mrp,
          costPrice: p.price,
          sellingPrice,
          sku: `KD-${product.id.slice(-6).toUpperCase()}-${i + 1}`,
          weightGrams: weightOf(p.size, unit),
          sortOrder: i,
        },
      });
      await tx.supplierListing.create({ data: { supplierId: supplier.id, variantId: v.id, supplierPrice: p.price, supplierProductUrl: rec.sourceUrl, inStockAtSupplier: p.inStock, isPreferred: true } });
      await tx.priceHistory.create({ data: { variantId: v.id, mrp, costPrice: p.price, sellingPrice, reason: "Imported" } });
    }
    if (marginFlag) await tx.product.update({ where: { id: product.id }, data: { marginFlag } });
    await tx.importItem.update({ where: { id: item.id }, data: { status: "APPROVED", productId: product.id } });
    return product.id;
  });
  return { productId, repriceNeeded: false };
}
