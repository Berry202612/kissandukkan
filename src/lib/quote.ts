import "server-only";
import { db } from "./db";
import { getDelivery, getPricing } from "./settings";
import { computeHandlingFee, computeShipping, couponDiscount, splitGst } from "./pricing";
import { toNum } from "./utils";
import { resolveTax } from "./tax";

export type CartInput = { variantId: string; qty: number }[];

export type QuoteLine = {
  variantId: string;
  productId: string;
  slug: string;
  name_en: string;
  name_hi: string;
  image: string | null;
  categorySlug: string;
  packLabel: string;
  mrp: number;
  unitPrice: number;
  qty: number;
  lineTotal: number;
  weightGrams: number;
  fulfilledBy: "OWN_STOCK" | "SUPPLIER_DIRECT";
  etaMinDays: number;
  etaMaxDays: number;
  available: boolean;
  maxQty: number;
  hsnCode: string;
  gstRate: number;
};

export type Quote = {
  lines: QuoteLine[];
  unavailable: string[];
  subtotal: number;
  discount: number;
  couponCode: string | null;
  couponError: string | null;
  shippingFee: number;
  handlingFee: number;
  handlingFeePercent: number;
  codFee: number;
  total: number;
  freeShippingThreshold: number;
  amountToFreeShipping: number;
  taxBreakup: { rate: number; taxable: number; tax: number }[];
};

const MAX_QTY = 50;

export async function quoteCart(
  input: CartInput,
  opts: { couponCode?: string | null; userId?: string | null; cod?: boolean } = {},
): Promise<Quote> {
  const [pricing, delivery] = await Promise.all([getPricing(), getDelivery()]);
  const clean = input
    .filter((i) => typeof i.variantId === "string" && Number.isInteger(i.qty) && i.qty > 0)
    .slice(0, 100);
  const variants = await db.productVariant.findMany({
    where: { id: { in: clean.map((c) => c.variantId) }, isActive: true, product: { status: "PUBLISHED" } },
    select: {
      id: true,
      packSize: true,
      unit: true,
      mrp: true,
      sellingPrice: true,
      stock: true,
      weightGrams: true,
      supplierListings: { select: { inStockAtSupplier: true } },
      product: {
        select: {
          id: true,
          slug: true,
          name_en: true,
          name_hi: true,
          images: true,
          fulfilledBy: true,
          surfaceOnly: true,
          hsnCode: true,
          gstRate: true,
          category: { select: { slug: true } },
        },
      },
    },
  });

  const lines: QuoteLine[] = [];
  const unavailable: string[] = [];
  for (const item of clean) {
    const v = variants.find((x) => x.id === item.variantId);
    if (!v) {
      unavailable.push(item.variantId);
      continue;
    }
    const own = v.product.fulfilledBy === "OWN_STOCK";
    const available = own ? v.stock > 0 : v.supplierListings.some((l) => l.inStockAtSupplier);
    const maxQty = own ? Math.min(v.stock, MAX_QTY) : MAX_QTY;
    const qty = Math.min(item.qty, Math.max(maxQty, 0));
    const unitPrice = Math.min(toNum(v.sellingPrice), toNum(v.mrp)); // never above MRP
    const extra = v.product.surfaceOnly ? delivery.surfaceExtraDays : 0;
    const tax = await resolveTax(v.product.category.slug, v.product.hsnCode, v.product.gstRate);
    lines.push({
      variantId: v.id,
      productId: v.product.id,
      slug: v.product.slug,
      name_en: v.product.name_en,
      name_hi: v.product.name_hi,
      image: v.product.images[0] ?? null,
      categorySlug: v.product.category.slug,
      packLabel: `${v.packSize} ${v.unit}`,
      mrp: toNum(v.mrp),
      unitPrice,
      qty: available ? qty : 0,
      lineTotal: available ? unitPrice * qty : 0,
      weightGrams: v.weightGrams * qty,
      fulfilledBy: v.product.fulfilledBy,
      etaMinDays: (own ? delivery.ownStockMinDays : delivery.supplierMinDays) + extra,
      etaMaxDays: (own ? delivery.ownStockMaxDays : delivery.supplierMaxDays) + extra,
      available: available && qty > 0,
      maxQty,
      hsnCode: tax.hsnCode,
      gstRate: tax.gstRate,
    });
  }

  const sellable = lines.filter((l) => l.available);
  const subtotal = sellable.reduce((s, l) => s + l.lineTotal, 0);

  let discount = 0;
  let couponCode: string | null = null;
  let couponError: string | null = null;
  if (opts.couponCode?.trim()) {
    const code = opts.couponCode.trim().toUpperCase();
    const c = await db.coupon.findUnique({ where: { code } });
    if (!c || !c.isActive) couponError = "invalid";
    else if (c.expiresAt && c.expiresAt < new Date()) couponError = "expired";
    else if (c.usageLimit != null && c.usedCount >= c.usageLimit) couponError = "used_up";
    else if (subtotal < toNum(c.minOrder)) couponError = "min_order";
    else {
      if (opts.userId) {
        const used = await db.order.count({
          where: { userId: opts.userId, couponCode: code, paymentStatus: { in: ["CAPTURED", "PARTIALLY_REFUNDED", "REFUNDED"] } },
        });
        if (used >= c.perCustomerLimit) couponError = "per_customer";
      }
      if (!couponError) {
        discount = couponDiscount(subtotal, {
          type: c.type,
          value: toNum(c.value),
          maxDiscount: c.maxDiscount == null ? null : toNum(c.maxDiscount),
          minOrder: toNum(c.minOrder),
        });
        couponCode = code;
      }
    }
  }

  const afterDiscount = subtotal - discount;
  const weight = sellable.reduce((s, l) => s + l.weightGrams, 0);
  const shippingFee = computeShipping(afterDiscount, weight, pricing);
  const handlingFee = computeHandlingFee(afterDiscount, pricing);
  const codFee = opts.cod && pricing.codEnabled ? pricing.codFee : 0;
  const total = afterDiscount + shippingFee + handlingFee + codFee;

  // GST breakup (all prices GST-inclusive). Discount is apportioned across lines.
  const byRate = new Map<number, number>();
  for (const l of sellable) {
    const share = subtotal > 0 ? l.lineTotal - (discount * l.lineTotal) / subtotal : 0;
    byRate.set(l.gstRate, (byRate.get(l.gstRate) ?? 0) + share);
  }
  const serviceGross = shippingFee + handlingFee + codFee;
  if (serviceGross > 0) byRate.set(pricing.serviceGstRate, (byRate.get(pricing.serviceGstRate) ?? 0) + serviceGross);
  const taxBreakup = [...byRate].map(([rate, gross]) => ({ rate, ...splitGst(gross, rate) })).sort((a, b) => a.rate - b.rate);

  return {
    lines,
    unavailable,
    subtotal,
    discount,
    couponCode,
    couponError,
    shippingFee,
    handlingFee,
    handlingFeePercent: pricing.handlingFeePercent,
    codFee,
    total,
    freeShippingThreshold: pricing.freeShippingThreshold,
    amountToFreeShipping: Math.max(0, pricing.freeShippingThreshold - afterDiscount),
    taxBreakup,
  };
}
