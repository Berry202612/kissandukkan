import "server-only";
import { OrderStatus, Prisma } from "@prisma/client";
import { db } from "./db";
import { quoteCart, type CartInput } from "./quote";
import { getDelivery, getPricing } from "./settings";
import { nextInvoiceNumber, nextOrderNumber } from "./counters";
import { createRazorpayOrder, refundPayment } from "./razorpay";
import { itemsTable, sendTemplate, trackUrl } from "./email";
import { formatINR, toNum } from "./utils";

export class OrderError extends Error {
  constructor(public code: string) {
    super(code);
  }
}

export async function createOrder(opts: {
  userId: string;
  cart: CartInput;
  addressId: string;
  couponCode?: string | null;
  locale: "en" | "hi";
  method: "RAZORPAY" | "COD";
}) {
  await expirePendingOrders();
  const [pricing, delivery] = await Promise.all([getPricing(), getDelivery()]);
  if (opts.method === "COD" && !pricing.codEnabled) throw new OrderError("cod_disabled");

  const address = await db.address.findFirst({ where: { id: opts.addressId, userId: opts.userId } });
  if (!address) throw new OrderError("address");

  const q = await quoteCart(opts.cart, { couponCode: opts.couponCode, userId: opts.userId, cod: opts.method === "COD" });
  const lines = q.lines.filter((l) => l.available);
  if (!lines.length) throw new OrderError("empty");
  if (q.lines.some((l) => !l.available) || q.unavailable.length) throw new OrderError("unavailable");
  if (opts.couponCode && q.couponError) throw new OrderError(`coupon_${q.couponError}`);
  if (opts.method === "COD" && q.total > pricing.codLimit) throw new OrderError("cod_limit");

  // Private snapshot: cost + preferred supplier (never sent to the client).
  const variants = await db.productVariant.findMany({
    where: { id: { in: lines.map((l) => l.variantId) } },
    select: { id: true, costPrice: true, supplierListings: { where: { isPreferred: true }, select: { supplierId: true }, take: 1 } },
  });

  const user = await db.user.findUniqueOrThrow({ where: { id: opts.userId }, select: { email: true } });
  const order = await db.$transaction(async (tx) => {
    const orderNumber = await nextOrderNumber(tx);
    return tx.order.create({
      data: {
        orderNumber,
        userId: opts.userId,
        locale: opts.locale,
        paymentMethod: opts.method,
        status: opts.method === "COD" ? "PLACED" : "PAYMENT_PENDING",
        shippingAddress: {
          name: address.name,
          phone: address.phone,
          email: user.email,
          line1: address.line1,
          line2: address.line2,
          landmark: address.landmark,
          city: address.city,
          district: address.district,
          state: address.state,
          pincode: address.pincode,
        },
        subtotal: q.subtotal,
        discount: q.discount,
        shippingFee: q.shippingFee,
        handlingFee: q.handlingFee,
        codFee: q.codFee,
        total: q.total,
        taxBreakup: q.taxBreakup,
        couponCode: q.couponCode,
        paymentExpiresAt: new Date(Date.now() + delivery.paymentWindowMinutes * 60 * 1000),
        items: {
          create: lines.map((l) => {
            const v = variants.find((x) => x.id === l.variantId)!;
            return {
              variantId: l.variantId,
              productId: l.productId,
              productSlug: l.slug,
              name_en: l.name_en,
              name_hi: l.name_hi,
              packLabel: l.packLabel,
              hsnCode: l.hsnCode,
              gstRate: l.gstRate,
              mrp: l.mrp,
              unitPrice: l.unitPrice,
              quantity: l.qty,
              lineTotal: l.lineTotal,
              costPrice: v.costPrice,
              fulfilledBy: l.fulfilledBy,
              etaMinDays: l.etaMinDays,
              etaMaxDays: l.etaMaxDays,
              procurement:
                l.fulfilledBy === "SUPPLIER_DIRECT"
                  ? { create: { supplierId: v.supplierListings[0]?.supplierId ?? null } }
                  : undefined,
            };
          }),
        },
        events: { create: { status: opts.method === "COD" ? "PLACED" : "PAYMENT_PENDING" } },
      },
    });
  });

  if (opts.method === "COD") {
    await confirmOrder(order.id, null);
    return { order, razorpayOrder: null };
  }
  const rp = await createRazorpayOrder(q.total, order.orderNumber, { orderNumber: order.orderNumber });
  await db.order.update({ where: { id: order.id }, data: { razorpayOrderId: rp.id } });
  return { order, razorpayOrder: rp };
}

/** Retry: create a fresh Razorpay order for a still-pending order inside its payment window. */
export async function retryPayment(orderNumber: string, userId: string) {
  await expirePendingOrders();
  const order = await db.order.findFirst({ where: { orderNumber, userId } });
  if (!order || order.status !== "PAYMENT_PENDING") throw new OrderError("not_pending");
  const rp = await createRazorpayOrder(toNum(order.total), order.orderNumber, { orderNumber: order.orderNumber });
  await db.order.update({ where: { id: order.id }, data: { razorpayOrderId: rp.id } });
  return { order, razorpayOrder: rp };
}

/**
 * Idempotent: marks payment captured, assigns invoice number, decrements own stock,
 * bumps coupon usage and sends the confirmation email exactly once.
 */
export async function confirmOrder(orderId: string, paymentId: string | null) {
  const result = await db.$transaction(async (tx) => {
    const order = await tx.order.findUnique({ where: { id: orderId }, include: { items: true } });
    if (!order) return null;
    const alreadyDone = order.paymentMethod === "RAZORPAY" ? order.paymentStatus === "CAPTURED" || order.paymentStatus.includes("REFUND") : order.invoiceNumber != null;
    if (alreadyDone) return null;
    if (order.status === "CANCELLED" && order.paymentMethod === "RAZORPAY") {
      // Paid after auto-cancel: re-open so the customer is not charged without an order.
      await tx.orderEvent.create({ data: { orderId, status: "CONFIRMED", note: "Payment received after payment window – order re-opened" } });
    }
    const notes: string[] = [];
    for (const it of order.items) {
      if (it.fulfilledBy !== "OWN_STOCK") continue;
      const r = await tx.productVariant.updateMany({ where: { id: it.variantId, stock: { gte: it.quantity } }, data: { stock: { decrement: it.quantity } } });
      if (r.count === 0) notes.push(`Stock shortfall for ${it.name_en} (${it.packLabel})`);
    }
    if (order.couponCode) await tx.coupon.updateMany({ where: { code: order.couponCode }, data: { usedCount: { increment: 1 } } });
    const invoiceNumber = await nextInvoiceNumber(tx);
    const updated = await tx.order.update({
      where: { id: orderId },
      data: {
        status: "CONFIRMED",
        paymentStatus: order.paymentMethod === "RAZORPAY" ? "CAPTURED" : "PENDING",
        razorpayPaymentId: paymentId ?? undefined,
        paidAt: order.paymentMethod === "RAZORPAY" ? new Date() : null,
        invoiceNumber,
        invoicedAt: new Date(),
        cancelReason: null,
        notes: notes.length ? [order.notes, ...notes].filter(Boolean).join("\n") : order.notes,
        events: { create: { status: "CONFIRMED", note: order.paymentMethod === "RAZORPAY" ? "Payment received" : "Cash on delivery order" } },
      },
      include: { items: true, user: { select: { name: true, email: true, orderUpdatesOptIn: true } } },
    });
    return updated;
  });
  if (result) {
    const loc = result.locale;
    const minD = Math.min(...result.items.map((i) => i.etaMinDays));
    const maxD = Math.max(...result.items.map((i) => i.etaMaxDays));
    await sendTemplate(
      "order_confirmation",
      loc,
      result.user.email,
      {
        name: result.user.name,
        orderNumber: result.orderNumber,
        total: formatINR(result.total, { decimals: true }),
        eta: loc === "hi" ? `${minD}–${maxD} दिन` : `${minD}–${maxD} days`,
        trackUrl: trackUrl(loc, result.orderNumber),
        items: itemsTable(
          result.items.map((i) => ({ name: `${loc === "hi" ? i.name_hi : i.name_en} (${i.packLabel})`, qty: i.quantity, price: formatINR(i.lineTotal) })),
          loc,
        ),
      },
      ["items"],
    );
  }
  return result;
}

export async function markPaymentFailed(razorpayOrderId: string, reason: string) {
  const order = await db.order.findUnique({ where: { razorpayOrderId } });
  if (!order || order.paymentStatus !== "PENDING") return;
  await db.orderEvent.create({ data: { orderId: order.id, status: "PAYMENT_PENDING", note: `Payment attempt failed: ${reason}`.slice(0, 300) } });
}

/** Auto-cancel unpaid orders after the payment window. Runs from cron and lazily on order actions. */
export async function expirePendingOrders() {
  const stale = await db.order.findMany({
    where: { status: "PAYMENT_PENDING", paymentExpiresAt: { lt: new Date() } },
    select: { id: true },
    take: 200,
  });
  for (const o of stale) {
    await db.order.update({
      where: { id: o.id },
      data: { status: "CANCELLED", paymentStatus: "FAILED", cancelReason: "Payment not completed in time", events: { create: { status: "CANCELLED", note: "Payment not completed within the payment window" } } },
    });
  }
  return stale.length;
}

const STATUS_FLOW: OrderStatus[] = ["PLACED", "CONFIRMED", "PACKED", "ORDERED_FROM_SUPPLIER", "SHIPPED", "OUT_FOR_DELIVERY", "DELIVERED"];

export async function setOrderStatus(orderId: string, status: OrderStatus, note?: string) {
  const order = await db.order.update({
    where: { id: orderId },
    data: {
      status,
      deliveredAt: status === "DELIVERED" ? new Date() : undefined,
      events: { create: { status, note } },
    },
    include: { user: { select: { name: true, email: true } }, shipments: true, items: true },
  });
  const loc = order.locale;
  if (status === "SHIPPED") {
    const s = order.shipments.find((x) => x.awb);
    await sendTemplate("shipped", loc, order.user.email, {
      name: order.user.name,
      orderNumber: order.orderNumber,
      courier: s?.courierName ?? "-",
      awb: s?.awb ?? "-",
      trackUrl: trackUrl(loc, order.orderNumber),
      items: itemsTable(order.items.map((i) => ({ name: loc === "hi" ? i.name_hi : i.name_en, qty: i.quantity, price: formatINR(i.lineTotal) })), loc),
    }, ["items"]);
  }
  if (status === "DELIVERED") {
    const d = await getDelivery();
    await sendTemplate("delivered", loc, order.user.email, { name: order.user.name, orderNumber: order.orderNumber, windowHours: String(d.replacementWindowHours) });
  }
  return order;
}

export function nextStatuses(current: OrderStatus): OrderStatus[] {
  if (["CANCELLED", "REFUNDED"].includes(current)) return [];
  const idx = STATUS_FLOW.indexOf(current);
  const forward = idx >= 0 ? STATUS_FLOW.slice(idx + 1) : [];
  return [...forward, "CANCELLED", "REPLACEMENT"];
}

/** Recompute order status once every shipment of an order is delivered. */
export async function syncOrderFromShipments(orderId: string) {
  const order = await db.order.findUnique({ where: { id: orderId }, include: { shipments: true, items: true } });
  if (!order || order.status === "DELIVERED" || order.status === "CANCELLED") return;
  const allItemsShipped = order.items.every((i) => i.shipmentId);
  const sts = order.shipments.map((s) => s.status);
  if (allItemsShipped && sts.length && sts.every((s) => s === "DELIVERED")) await setOrderStatus(orderId, "DELIVERED");
  else if (sts.some((s) => s === "OUT_FOR_DELIVERY") && order.status !== "OUT_FOR_DELIVERY") await setOrderStatus(orderId, "OUT_FOR_DELIVERY");
  else if (sts.some((s) => ["PICKED_UP", "IN_TRANSIT"].includes(s)) && !["SHIPPED", "OUT_FOR_DELIVERY"].includes(order.status)) await setOrderStatus(orderId, "SHIPPED");
}

export async function refundOrder(orderId: string, amount: number, reason: string, byUserId: string) {
  const order = await db.order.findUniqueOrThrow({ where: { id: orderId } });
  const remaining = toNum(order.total) - toNum(order.refundedAmount);
  if (amount <= 0 || amount > remaining + 0.001) throw new OrderError("refund_amount");
  if (order.paymentMethod !== "RAZORPAY" || !order.razorpayPaymentId) throw new OrderError("refund_no_payment");
  const rf = await refundPayment(order.razorpayPaymentId, amount, { orderNumber: order.orderNumber, reason: reason.slice(0, 200) });
  const newRefunded = toNum(order.refundedAmount) + amount;
  const full = newRefunded >= toNum(order.total) - 0.001;
  await db.$transaction([
    db.refund.create({ data: { orderId, amount, razorpayRefundId: rf.id, status: rf.status, reason, createdById: byUserId } }),
    db.order.update({
      where: { id: orderId },
      data: {
        refundedAmount: newRefunded,
        paymentStatus: full ? "REFUNDED" : "PARTIALLY_REFUNDED",
        status: full ? "REFUNDED" : undefined,
        events: { create: { status: full ? "REFUNDED" : order.status, note: `Refund of ${formatINR(amount, { decimals: true })} initiated` } },
      },
    }),
  ]);
}

export const customerOrderInclude = {
  items: {
    select: {
      id: true,
      productId: true,
      productSlug: true,
      name_en: true,
      name_hi: true,
      packLabel: true,
      mrp: true,
      unitPrice: true,
      quantity: true,
      lineTotal: true,
      fulfilledBy: true,
      etaMinDays: true,
      etaMaxDays: true,
      shipmentId: true,
      variantId: true,
    },
  },
  events: { orderBy: { createdAt: "asc" } },
  shipments: { include: { events: { orderBy: { occurredAt: "asc" } } } },
  returns: true,
} satisfies Prisma.OrderInclude;
