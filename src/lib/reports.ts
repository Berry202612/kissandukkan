import "server-only";
import { db } from "./db";
import { getPricing } from "./settings";
import { estimatePaymentGatewayFee } from "./pricing";
import { toNum } from "./utils";

export type Row = { key: string; orders: number; revenue: number; cost: number; fees: number; shipping: number; refunds: number; net: number };

const PAID = ["CAPTURED", "PARTIALLY_REFUNDED", "REFUNDED"] as const;

/** Profit model: revenue (order total) − refunds − product cost − Razorpay fee (est.) − shipping cost (we use the shipping fee charged as a proxy for courier cost). */
export async function profitReport(from: Date, to: Date, groupBy: "day" | "month" | "category" | "product" | "supplier") {
  const pricing = await getPricing();
  const orders = await db.order.findMany({
    where: { paymentStatus: { in: [...PAID] }, paidAt: { gte: from, lte: to } },
    include: {
      items: { include: { procurement: { include: { supplier: { select: { name: true } } } }, variant: { select: { product: { select: { category: { select: { name_en: true } } } } } } } },
    },
  });
  const map = new Map<string, Row>();
  const add = (key: string, d: Omit<Row, "key" | "net" | "orders">, orderCount = 0) => {
    const r = map.get(key) ?? { key, orders: 0, revenue: 0, cost: 0, fees: 0, shipping: 0, refunds: 0, net: 0 };
    r.orders += orderCount;
    r.revenue += d.revenue;
    r.cost += d.cost;
    r.fees += d.fees;
    r.shipping += d.shipping;
    r.refunds += d.refunds;
    r.net = r.revenue - r.refunds - r.cost - r.fees - r.shipping;
    map.set(key, r);
  };
  for (const o of orders) {
    const total = toNum(o.total);
    const fees = o.paymentMethod === "RAZORPAY" ? estimatePaymentGatewayFee(total, pricing.razorpayFeePercent, pricing.razorpayGstPercent) : 0;
    const shipping = toNum(o.shippingFee);
    const refunds = toNum(o.refundedAmount);
    const paid = o.paidAt ?? o.createdAt;
    const ist = new Date(paid.getTime() + 5.5 * 3600 * 1000).toISOString();
    if (groupBy === "day" || groupBy === "month") {
      const key = groupBy === "day" ? ist.slice(0, 10) : ist.slice(0, 7);
      add(key, { revenue: total, cost: o.items.reduce((s, i) => s + toNum(i.costPrice) * i.quantity, 0), fees, shipping, refunds }, 1);
    } else {
      // Allocate order-level amounts to items by line value share.
      const lines = o.items.reduce((s, i) => s + toNum(i.lineTotal), 0) || 1;
      for (const i of o.items) {
        const share = toNum(i.lineTotal) / lines;
        const key = groupBy === "category" ? i.variant.product.category.name_en : groupBy === "product" ? `${i.name_en} (${i.packLabel})` : i.fulfilledBy === "OWN_STOCK" ? "Own stock" : (i.procurement?.supplier?.name ?? "Unassigned supplier");
        add(key, { revenue: total * share, cost: toNum(i.costPrice) * i.quantity, fees: fees * share, shipping: shipping * share, refunds: refunds * share }, 0);
        const r = map.get(key)!;
        r.orders += 1; // number of order lines for item-level groupings
      }
    }
  }
  return [...map.values()].sort((a, b) => (groupBy === "day" || groupBy === "month" ? a.key.localeCompare(b.key) : b.revenue - a.revenue));
}

export async function summary(from: Date) {
  const rows = await profitReport(from, new Date(), "day");
  return rows.reduce((s, r) => ({ orders: s.orders + r.orders, revenue: s.revenue + r.revenue - r.refunds, net: s.net + r.net }), { orders: 0, revenue: 0, net: 0 });
}
