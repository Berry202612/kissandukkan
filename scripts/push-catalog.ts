/**
 * Copy the product catalogue from the local database to another database (e.g. Neon for Vercel).
 *
 *   1. Put the target connection string in .env.neon.local (gitignored):
 *        TARGET_DATABASE_URL="postgresql://...neon.tech/neondb?sslmode=require"
 *   2. npm run push-catalog
 *
 * Copies brands, categories, sub-categories, crops, suppliers, products, variants, crop links,
 * supplier listings, price history and import records. Taxonomy is matched by slug, so the seed
 * rows already on the target are reused. Rows that already exist on the target (same slug / sku /
 * name) are left untouched, so running it twice is safe. Customers, orders and reviews are NOT copied.
 */
import { readFileSync, existsSync } from "node:fs";
import { PrismaClient } from "@prisma/client";

function targetUrl() {
  if (process.env.TARGET_DATABASE_URL) return process.env.TARGET_DATABASE_URL;
  const f = ".env.neon.local";
  if (existsSync(f)) {
    const m = readFileSync(f, "utf8").match(/^TARGET_DATABASE_URL\s*=\s*"?([^"\r\n]+)"?/m);
    if (m) return m[1];
  }
  throw new Error("Set TARGET_DATABASE_URL in .env.neon.local");
}

const src = new PrismaClient();
const url = targetUrl();
const dst = new PrismaClient({ datasources: { db: { url } } });

type Row = Record<string, unknown> & { id: string };

/** Insert rows the target lacks (matched on `key`); return localId → targetId. */
async function sync<T extends Row>(label: string, rows: T[], key: keyof T, existing: { id: string; k: unknown }[], insert: (rows: T[]) => Promise<unknown>) {
  const byKey = new Map(existing.map((e) => [String(e.k), e.id]));
  const map = new Map<string, string>();
  const fresh: T[] = [];
  for (const r of rows) {
    const hit = byKey.get(String(r[key]));
    if (hit) map.set(r.id, hit);
    else {
      map.set(r.id, r.id);
      fresh.push(r);
    }
  }
  for (let i = 0; i < fresh.length; i += 200) await insert(fresh.slice(i, i + 200));
  console.log(`${label.padEnd(18)} ${fresh.length} added, ${rows.length - fresh.length} already there`);
  return map;
}

const req = (m: Map<string, string>, id: string) => m.get(id) ?? id;
const opt = (m: Map<string, string>, id: string | null) => (id ? req(m, id) : null);

async function main() {
  console.log(`Target: ${url.replace(/\/\/[^@]+@/, "//***@").split("?")[0]}`);
  await dst.$queryRaw`SELECT 1`;

  const brands = await sync("Brands", await src.brand.findMany(), "slug", (await dst.brand.findMany({ select: { id: true, slug: true } })).map((x) => ({ id: x.id, k: x.slug })), (d) => dst.brand.createMany({ data: d, skipDuplicates: true }));
  const cats = await sync("Categories", await src.category.findMany(), "slug", (await dst.category.findMany({ select: { id: true, slug: true } })).map((x) => ({ id: x.id, k: x.slug })), (d) => dst.category.createMany({ data: d, skipDuplicates: true }));
  const subs = await sync(
    "Sub-categories",
    (await src.subCategory.findMany()).map((s) => ({ ...s, categoryId: req(cats, s.categoryId) })),
    "slug",
    (await dst.subCategory.findMany({ select: { id: true, slug: true } })).map((x) => ({ id: x.id, k: x.slug })),
    (d) => dst.subCategory.createMany({ data: d, skipDuplicates: true }),
  );
  const crops = await sync("Crops", await src.crop.findMany(), "slug", (await dst.crop.findMany({ select: { id: true, slug: true } })).map((x) => ({ id: x.id, k: x.slug })), (d) => dst.crop.createMany({ data: d, skipDuplicates: true }));
  const suppliers = await sync("Suppliers", await src.supplier.findMany(), "name", (await dst.supplier.findMany({ select: { id: true, name: true } })).map((x) => ({ id: x.id, k: x.name })), (d) => dst.supplier.createMany({ data: d, skipDuplicates: true }));

  const products = await sync(
    "Products",
    (await src.product.findMany()).map((p) => ({ ...p, brandId: opt(brands, p.brandId), categoryId: req(cats, p.categoryId), subCategoryId: opt(subs, p.subCategoryId) })),
    "slug",
    (await dst.product.findMany({ select: { id: true, slug: true } })).map((x) => ({ id: x.id, k: x.slug })),
    (d) => dst.product.createMany({ data: d as never, skipDuplicates: true }),
  );
  const variants = await sync(
    "Variants",
    (await src.productVariant.findMany()).map((v) => ({ ...v, productId: req(products, v.productId) })),
    "sku",
    (await dst.productVariant.findMany({ select: { id: true, sku: true } })).map((x) => ({ id: x.id, k: x.sku })),
    (d) => dst.productVariant.createMany({ data: d as never, skipDuplicates: true }),
  );

  const links = (await src.productCrop.findMany()).map((l) => ({ ...l, productId: req(products, l.productId), cropId: req(crops, l.cropId) }));
  const r1 = await dst.productCrop.createMany({ data: links, skipDuplicates: true });
  console.log(`${"Crop links".padEnd(18)} ${r1.count} added`);

  const listings = (await src.supplierListing.findMany()).map((l) => ({ ...l, supplierId: req(suppliers, l.supplierId), variantId: req(variants, l.variantId) }));
  let n = 0;
  for (let i = 0; i < listings.length; i += 200) n += (await dst.supplierListing.createMany({ data: listings.slice(i, i + 200) as never, skipDuplicates: true })).count;
  console.log(`${"Supplier listings".padEnd(18)} ${n} added`);

  const history = (await src.priceHistory.findMany()).map((h) => ({ ...h, variantId: req(variants, h.variantId) }));
  n = 0;
  for (let i = 0; i < history.length; i += 200) n += (await dst.priceHistory.createMany({ data: history.slice(i, i + 200) as never, skipDuplicates: true })).count;
  console.log(`${"Price history".padEnd(18)} ${n} added`);

  const imports = (await src.importItem.findMany()).map((x) => ({ ...x, productId: opt(products, x.productId) }));
  n = 0;
  for (let i = 0; i < imports.length; i += 200) n += (await dst.importItem.createMany({ data: imports.slice(i, i + 200) as never, skipDuplicates: true })).count;
  console.log(`${"Import records".padEnd(18)} ${n} added`);

  const [p, v] = await Promise.all([dst.product.count({ where: { status: "PUBLISHED" } }), dst.productVariant.count()]);
  console.log(`\nTarget now has ${p} published products and ${v} variants.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => Promise.all([src.$disconnect(), dst.$disconnect()]));
