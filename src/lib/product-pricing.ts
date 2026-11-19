import "server-only";
import { db } from "./db";
import { computeSellingPrice } from "./pricing";
import { getPricing } from "./settings";
import { toNum } from "./utils";

/**
 * Cost price of a variant = preferred supplier's price (if any supplier listing exists), else the stored cost.
 * Selling price = min(MRP, round(cost × (1 + markup%))). Writes price history when anything changed.
 */
export async function repriceVariant(variantId: string, reason: string) {
  const pricing = await getPricing();
  const v = await db.productVariant.findUniqueOrThrow({
    where: { id: variantId },
    include: { supplierListings: { orderBy: [{ isPreferred: "desc" }, { supplierPrice: "asc" }] } },
  });
  const preferred = v.supplierListings[0];
  const cost = preferred ? toNum(preferred.supplierPrice) : toNum(v.costPrice);
  const { sellingPrice, marginFlag } = computeSellingPrice(cost, toNum(v.mrp), pricing.markupPercent);
  const changed = toNum(v.costPrice) !== cost || toNum(v.sellingPrice) !== sellingPrice;
  await db.productVariant.update({ where: { id: v.id }, data: { costPrice: cost, sellingPrice } });
  if (changed) await db.priceHistory.create({ data: { variantId: v.id, mrp: v.mrp, costPrice: cost, sellingPrice, reason } });
  return { marginFlag, sellingPrice, cost };
}

export async function repriceProduct(productId: string, reason: string) {
  const variants = await db.productVariant.findMany({ where: { productId }, select: { id: true } });
  let flag = false;
  for (const v of variants) {
    const r = await repriceVariant(v.id, reason);
    flag ||= r.marginFlag;
  }
  await db.product.update({ where: { id: productId }, data: { marginFlag: flag } });
}

export async function repriceAll(reason: string) {
  const products = await db.product.findMany({ select: { id: true } });
  for (const p of products) await repriceProduct(p.id, reason);
  return products.length;
}

/** Match active ingredients against the admin-maintained restricted list. */
export async function checkRestricted(ingredients: string[], technicalContent = "") {
  const list = await db.restrictedIngredient.findMany();
  if (!list.length) return null;
  const hay = [...ingredients, technicalContent].join(" ").toLowerCase();
  const hit = list.find((r) => hay.includes(r.name.toLowerCase()));
  return hit ? `${hit.name} – ${hit.status}${hit.states.length ? ` (${hit.states.join(", ")})` : ""}` : null;
}
