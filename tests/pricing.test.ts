import { describe, expect, it } from "vitest";
import { computeHandlingFee, computeSellingPrice, computeShipping, couponDiscount, discountBadge, splitGst } from "../src/lib/pricing";

const rules = {
  markupPercent: 1,
  handlingFeePercent: 2,
  handlingFeeMin: 10,
  handlingFeeMax: 200,
  freeShippingThreshold: 999,
  shippingMode: "FLAT" as const,
  flatShippingFee: 79,
  weightRates: [
    { upToGrams: 1000, fee: 59 },
    { upToGrams: 3000, fee: 89 },
  ],
  extraPerKgAboveMax: 20,
};

describe("selling price", () => {
  it("is cost × 1.01 rounded to ₹1", () => {
    expect(computeSellingPrice(430, 600, 1)).toEqual({ sellingPrice: 434, marginFlag: false });
    expect(computeSellingPrice(99.4, 200, 1)).toEqual({ sellingPrice: 100, marginFlag: false });
  });
  it("never exceeds MRP and flags the margin", () => {
    expect(computeSellingPrice(600, 600, 1)).toEqual({ sellingPrice: 600, marginFlag: true });
    expect(computeSellingPrice(700, 650, 1).sellingPrice).toBeLessThanOrEqual(650);
  });
  it("holds for many random inputs", () => {
    for (let i = 0; i < 2000; i++) {
      const mrp = Math.round(Math.random() * 5000) + 1;
      const cost = Math.random() * mrp * 1.2;
      expect(computeSellingPrice(cost, mrp, Math.random() * 10).sellingPrice).toBeLessThanOrEqual(mrp);
    }
  });
});

describe("discount badge", () => {
  it("is hidden under 3%", () => {
    expect(discountBadge(100, 98)).toBeNull();
    expect(discountBadge(100, 97)).toBe(3);
    expect(discountBadge(100, 100)).toBeNull();
    expect(discountBadge(100, 120)).toBeNull();
  });
});

describe("payment & handling fee", () => {
  it("is 2% with min/max caps", () => {
    expect(computeHandlingFee(1000, rules)).toBe(20);
    expect(computeHandlingFee(100, rules)).toBe(10);
    expect(computeHandlingFee(50000, rules)).toBe(200);
    expect(computeHandlingFee(0, rules)).toBe(0);
  });
});

describe("shipping", () => {
  it("is free at or above the threshold", () => {
    expect(computeShipping(999, 500, rules)).toBe(0);
    expect(computeShipping(998, 500, rules)).toBe(79);
  });
  it("supports weight slabs", () => {
    const w = { ...rules, shippingMode: "WEIGHT" as const };
    expect(computeShipping(100, 800, w)).toBe(59);
    expect(computeShipping(100, 2500, w)).toBe(89);
    expect(computeShipping(100, 5200, w)).toBe(89 + 3 * 20);
  });
});

describe("GST split (inclusive prices)", () => {
  it("splits gross into taxable + tax", () => {
    const r = splitGst(118, 18);
    expect(r.taxable).toBe(100);
    expect(r.tax).toBe(18);
  });
});

describe("coupons", () => {
  it("respects min order and max discount", () => {
    expect(couponDiscount(500, { type: "PERCENT", value: 10, maxDiscount: 30, minOrder: 600 })).toBe(0);
    expect(couponDiscount(1000, { type: "PERCENT", value: 10, maxDiscount: 30, minOrder: 600 })).toBe(30);
    expect(couponDiscount(100, { type: "FLAT", value: 150, maxDiscount: null, minOrder: 0 })).toBe(100);
  });
});
