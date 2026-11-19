import "server-only";
import { Prisma } from "@prisma/client";
import { db } from "./db";
import { toNum } from "./utils";

/**
 * PUBLIC catalogue queries.
 * Every select here is an explicit allow-list. costPrice, supplierListings, suppliers,
 * margin flags and restricted flags are NEVER selected. tests/supplier-leak.test.ts enforces this.
 */

export const publicVariantSelect = {
  id: true,
  packSize: true,
  unit: true,
  mrp: true,
  sellingPrice: true,
  sku: true,
  weightGrams: true,
  sortOrder: true,
} satisfies Prisma.ProductVariantSelect;

export const publicCardSelect = {
  id: true,
  slug: true,
  name_en: true,
  name_hi: true,
  images: true,
  imageStatus: true,
  fulfilledBy: true,
  isOrganic: true,
  ratingAvg: true,
  ratingCount: true,
  brand: { select: { name: true, slug: true } },
  category: { select: { slug: true, name_en: true, name_hi: true } },
  variants: { where: { isActive: true }, select: publicVariantSelect, orderBy: { sortOrder: "asc" } },
} satisfies Prisma.ProductSelect;

export const publicProductSelect = {
  ...publicCardSelect,
  shortDescription_en: true,
  shortDescription_hi: true,
  description_en: true,
  description_hi: true,
  keyFeatures_en: true,
  keyFeatures_hi: true,
  technicalContent: true,
  formulation: true,
  targetPests: true,
  dosage_en: true,
  dosage_hi: true,
  dosePerAcre: true,
  dosePerLitre: true,
  doseUnit: true,
  howToUse_en: true,
  howToUse_hi: true,
  safety_en: true,
  safety_hi: true,
  compatibility: true,
  manufacturerName: true,
  manufacturerAddress: true,
  countryOfOrigin: true,
  minShelfLifeMonths: true,
  batchNo: true,
  expiryDate: true,
  licenceType: true,
  surfaceOnly: true,
  updatedAt: true,
  subCategory: { select: { slug: true, name_en: true, name_hi: true } },
  crops: { select: { crop: { select: { slug: true, name_en: true, name_hi: true } } } },
} satisfies Prisma.ProductSelect;

export type PublicCard = Prisma.ProductGetPayload<{ select: typeof publicCardSelect }> & { availability: Record<string, boolean> };
export type PublicProduct = Prisma.ProductGetPayload<{ select: typeof publicProductSelect }> & { availability: Record<string, boolean> };

/** Availability per variant – computed server-side, only a boolean leaves the server. */
async function availabilityFor(products: { id: string; fulfilledBy: string; variants: { id: string }[] }[]) {
  const variantIds = products.flatMap((p) => p.variants.map((v) => v.id));
  if (!variantIds.length) return {} as Record<string, boolean>;
  const rows = await db.productVariant.findMany({
    where: { id: { in: variantIds } },
    select: {
      id: true,
      stock: true,
      product: { select: { fulfilledBy: true } },
      supplierListings: { select: { inStockAtSupplier: true } },
    },
  });
  const out: Record<string, boolean> = {};
  for (const r of rows) {
    out[r.id] =
      r.product.fulfilledBy === "OWN_STOCK" ? r.stock > 0 : r.supplierListings.some((l) => l.inStockAtSupplier);
  }
  return out;
}

export async function withAvailability<T extends { id: string; fulfilledBy: string; variants: { id: string }[] }>(items: T[]) {
  const av = await availabilityFor(items);
  return items.map((p) => ({ ...p, availability: Object.fromEntries(p.variants.map((v) => [v.id, av[v.id] ?? false])) }));
}

export const PUBLISHED: Prisma.ProductWhereInput = { status: "PUBLISHED" };

export type ListingFilters = {
  q?: string;
  category?: string;
  sub?: string[];
  brand?: string[];
  crop?: string[];
  minPrice?: number;
  maxPrice?: number;
  pack?: string[];
  organic?: boolean;
  inStock?: boolean;
  fast?: boolean;
  sort?: "relevance" | "price_asc" | "price_desc" | "newest" | "rating";
  page?: number;
};

export const PAGE_SIZE = 24;

export function buildWhere(f: ListingFilters): Prisma.ProductWhereInput {
  const and: Prisma.ProductWhereInput[] = [PUBLISHED];
  if (f.category) and.push({ category: { slug: f.category } });
  if (f.sub?.length) and.push({ subCategory: { slug: { in: f.sub } } });
  if (f.brand?.length) and.push({ brand: { slug: { in: f.brand } } });
  if (f.crop?.length) and.push({ crops: { some: { crop: { slug: { in: f.crop } } } } });
  if (f.organic) and.push({ isOrganic: true });
  if (f.fast) and.push({ fulfilledBy: "OWN_STOCK" });
  if (f.pack?.length) and.push({ variants: { some: { isActive: true, OR: f.pack.map((p) => { const [packSize, unit] = p.split("|"); return { packSize, unit }; }) } } });
  if (f.minPrice != null || f.maxPrice != null) {
    and.push({
      variants: {
        some: {
          isActive: true,
          sellingPrice: { ...(f.minPrice != null ? { gte: f.minPrice } : {}), ...(f.maxPrice != null ? { lte: f.maxPrice } : {}) },
        },
      },
    });
  }
  if (f.inStock) {
    and.push({
      OR: [
        { fulfilledBy: "OWN_STOCK", variants: { some: { isActive: true, stock: { gt: 0 } } } },
        { fulfilledBy: "SUPPLIER_DIRECT", variants: { some: { isActive: true, supplierListings: { some: { inStockAtSupplier: true } } } } },
      ],
    });
  }
  if (f.q?.trim()) {
    const q = f.q.trim();
    and.push({
      OR: [
        { name_en: { contains: q, mode: "insensitive" } },
        { name_hi: { contains: q, mode: "insensitive" } },
        { technicalContent: { contains: q, mode: "insensitive" } },
        { brand: { name: { contains: q, mode: "insensitive" } } },
        { targetPests: { has: q.toLowerCase() } },
        { category: { name_en: { contains: q, mode: "insensitive" } } },
      ],
    });
  }
  return { AND: and };
}

/** Lowest active selling price of a product (for sorting in JS – prices live on variants). */
export function minPrice(p: { variants: { sellingPrice: unknown }[] }) {
  return p.variants.length ? Math.min(...p.variants.map((v) => toNum(v.sellingPrice))) : 0;
}

export async function listProducts(f: ListingFilters) {
  const where = buildWhere(f);
  const page = Math.max(1, f.page ?? 1);
  const sort = f.sort ?? "relevance";
  const total = await db.product.count({ where });

  // Price sort needs variant prices: fetch ids+prices for the filtered set, sort, then page.
  if (sort === "price_asc" || sort === "price_desc") {
    const all = await db.product.findMany({ where, select: { id: true, variants: { where: { isActive: true }, select: { sellingPrice: true } } } });
    all.sort((a, b) => (sort === "price_asc" ? minPrice(a) - minPrice(b) : minPrice(b) - minPrice(a)));
    const ids = all.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map((p) => p.id);
    const rows = await db.product.findMany({ where: { id: { in: ids } }, select: publicCardSelect });
    const ordered = ids.map((id) => rows.find((r) => r.id === id)!).filter(Boolean);
    return { items: (await withAvailability(ordered)) as PublicCard[], total, page, pages: Math.ceil(total / PAGE_SIZE) };
  }

  const orderBy: Prisma.ProductOrderByWithRelationInput[] =
    sort === "newest"
      ? [{ publishedAt: "desc" }]
      : sort === "rating"
        ? [{ ratingAvg: { sort: "desc", nulls: "last" } }, { ratingCount: "desc" }]
        : [{ isFeatured: "desc" }, { name_en: "asc" }];
  const rows = await db.product.findMany({ where, select: publicCardSelect, orderBy, skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE });
  return { items: (await withAvailability(rows)) as PublicCard[], total, page, pages: Math.ceil(total / PAGE_SIZE) };
}

export async function getProductBySlug(slug: string) {
  const p = await db.product.findFirst({ where: { slug, ...PUBLISHED }, select: publicProductSelect });
  if (!p) return null;
  const [withAv] = await withAvailability([p]);
  return withAv as PublicProduct;
}

export async function getCards(where: Prisma.ProductWhereInput, take = 8, orderBy: Prisma.ProductOrderByWithRelationInput = { publishedAt: "desc" }) {
  const rows = await db.product.findMany({ where: { AND: [PUBLISHED, where] }, select: publicCardSelect, take, orderBy });
  return (await withAvailability(rows)) as PublicCard[];
}

/** Facets for a listing (brands, sub-categories, crops, pack sizes present in the result). */
export async function getFacets(f: ListingFilters) {
  const base = buildWhere({ q: f.q, category: f.category });
  const rows = await db.product.findMany({
    where: base,
    select: {
      brand: { select: { slug: true, name: true } },
      subCategory: { select: { slug: true, name_en: true, name_hi: true } },
      crops: { select: { crop: { select: { slug: true, name_en: true, name_hi: true } } } },
      variants: { where: { isActive: true }, select: { packSize: true, unit: true } },
      isOrganic: true,
    },
  });
  const brands = new Map<string, string>();
  const subs = new Map<string, { name_en: string; name_hi: string }>();
  const crops = new Map<string, { name_en: string; name_hi: string }>();
  const packs = new Set<string>();
  for (const r of rows) {
    if (r.brand) brands.set(r.brand.slug, r.brand.name);
    if (r.subCategory) subs.set(r.subCategory.slug, r.subCategory);
    r.crops.forEach((c) => crops.set(c.crop.slug, c.crop));
    r.variants.forEach((v) => packs.add(`${v.packSize}|${v.unit}`));
  }
  return {
    brands: [...brands].map(([slug, name]) => ({ slug, name })).sort((a, b) => a.name.localeCompare(b.name)),
    subs: [...subs].map(([slug, n]) => ({ slug, ...n })),
    crops: [...crops].map(([slug, n]) => ({ slug, ...n })),
    packs: [...packs].slice(0, 30),
    hasOrganic: rows.some((r) => r.isOrganic),
  };
}

export const getNavCategories = () =>
  db.category.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
    select: {
      slug: true,
      name_en: true,
      name_hi: true,
      illustration: true,
      subCategories: { where: { isActive: true }, orderBy: { sortOrder: "asc" }, select: { slug: true, name_en: true, name_hi: true } },
    },
  });
