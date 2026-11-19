/** Pure pricing rules – shared by server code, import scripts and tests. */

export type PricingRules = {
  markupPercent: number;
  handlingFeePercent: number;
  handlingFeeMin: number;
  handlingFeeMax: number;
  freeShippingThreshold: number;
  shippingMode: "FLAT" | "WEIGHT";
  flatShippingFee: number;
  weightRates: { upToGrams: number; fee: number }[];
  extraPerKgAboveMax: number;
};

const r2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Selling price = cost × (1 + markup%), rounded to the nearest ₹1.
 * HARD RULE: never above MRP. If the computed price exceeds MRP it is capped and flagged.
 */
export function computeSellingPrice(cost: number, mrp: number, markupPercent: number) {
  const computed = Math.round(cost * (1 + markupPercent / 100));
  if (computed > mrp) return { sellingPrice: r2(mrp), marginFlag: true };
  return { sellingPrice: computed, marginFlag: false };
}

/** Honest discount badge: only when ≥ 3% off the real MRP. */
export function discountBadge(mrp: number, price: number): number | null {
  if (mrp <= 0 || price >= mrp) return null;
  const pct = Math.floor(((mrp - price) / mrp) * 100);
  return pct >= 3 ? pct : null;
}

export function computeHandlingFee(subtotal: number, rules: Pick<PricingRules, "handlingFeePercent" | "handlingFeeMin" | "handlingFeeMax">) {
  if (subtotal <= 0 || rules.handlingFeePercent <= 0) return 0;
  const raw = (subtotal * rules.handlingFeePercent) / 100;
  const capped = Math.min(Math.max(raw, rules.handlingFeeMin), rules.handlingFeeMax || Infinity);
  return Math.round(capped);
}

export function computeShipping(subtotal: number, weightGrams: number, rules: PricingRules) {
  if (subtotal <= 0) return 0;
  if (subtotal >= rules.freeShippingThreshold) return 0;
  if (rules.shippingMode === "FLAT") return rules.flatShippingFee;
  const rates = [...rules.weightRates].sort((a, b) => a.upToGrams - b.upToGrams);
  const slab = rates.find((r) => weightGrams <= r.upToGrams);
  if (slab) return slab.fee;
  const last = rates[rates.length - 1];
  if (!last) return rules.flatShippingFee;
  const extraKg = Math.ceil((weightGrams - last.upToGrams) / 1000);
  return last.fee + extraKg * rules.extraPerKgAboveMax;
}

/** Prices are GST-inclusive. Split a gross amount into taxable value + tax. */
export function splitGst(gross: number, rate: number) {
  const taxable = r2(gross / (1 + rate / 100));
  return { taxable, tax: r2(gross - taxable) };
}

export function couponDiscount(
  subtotal: number,
  coupon: { type: "PERCENT" | "FLAT"; value: number; maxDiscount: number | null; minOrder: number },
) {
  if (subtotal < coupon.minOrder) return 0;
  let d = coupon.type === "PERCENT" ? (subtotal * coupon.value) / 100 : coupon.value;
  if (coupon.maxDiscount != null) d = Math.min(d, coupon.maxDiscount);
  return Math.round(Math.min(d, subtotal));
}

export function estimatePaymentGatewayFee(total: number, feePercent: number, gstPercent: number) {
  return r2(((total * feePercent) / 100) * (1 + gstPercent / 100));
}
