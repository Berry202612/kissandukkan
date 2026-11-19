"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { audit, requireAdmin, requireStaff } from "@/lib/session";
import { OrderError, refundOrder, setOrderStatus, syncOrderFromShipments } from "@/lib/orders";
import { assignAwb, createShiprocketOrder, generateLabel, requestPickup, shiprocketConfigured } from "@/lib/shiprocket";
import { getBusiness } from "@/lib/settings";
import { toNum } from "@/lib/utils";

const go = (orderId: string, msg?: string, err?: string) => {
  revalidatePath(`/admin/orders/${orderId}`);
  const q = err ? `?err=${encodeURIComponent(err)}` : msg ? `?msg=${encodeURIComponent(msg)}` : "";
  redirect(`/admin/orders/${orderId}${q}`);
};

export async function updateOrderStatus(fd: FormData) {
  const u = await requireStaff();
  const orderId = String(fd.get("orderId"));
  const status = z.enum(["PLACED", "CONFIRMED", "PACKED", "ORDERED_FROM_SUPPLIER", "SHIPPED", "OUT_FOR_DELIVERY", "DELIVERED", "CANCELLED", "REPLACEMENT"]).parse(fd.get("status"));
  const note = String(fd.get("note") ?? "").slice(0, 300) || undefined;
  const order = await db.order.findUniqueOrThrow({ where: { id: orderId }, include: { items: true } });
  if (order.status === "PAYMENT_PENDING") go(orderId, undefined, "Order is not paid yet.");
  await setOrderStatus(orderId, status, note);
  if (status === "CANCELLED" && order.paymentStatus === "CAPTURED") {
    for (const it of order.items) if (it.fulfilledBy === "OWN_STOCK") await db.productVariant.update({ where: { id: it.variantId }, data: { stock: { increment: it.quantity } } });
  }
  await audit(u.id, `status:${status}`, "order", orderId);
  go(orderId, `Status set to ${status}${status === "CANCELLED" && order.paymentStatus === "CAPTURED" ? " – remember to refund" : ""}`);
}

export async function updateProcurement(fd: FormData) {
  const u = await requireStaff();
  const d = z
    .object({
      id: z.string(),
      orderId: z.string(),
      supplierId: z.string().optional(),
      supplierOrderId: z.string().max(80).optional(),
      amountPaid: z.preprocess((v) => (v === "" ? null : v), z.coerce.number().min(0).nullable()),
      supplierTracking: z.string().max(80).optional(),
      status: z.enum(["TO_ORDER", "ORDERED_FROM_SUPPLIER", "SUPPLIER_SHIPPED", "DELIVERED"]),
    })
    .parse(Object.fromEntries(fd));
  await db.procurementItem.update({
    where: { id: d.id },
    data: { supplierId: d.supplierId || null, supplierOrderId: d.supplierOrderId || null, amountPaid: d.amountPaid, supplierTracking: d.supplierTracking || null, status: d.status },
  });
  const order = await db.order.findUniqueOrThrow({ where: { id: d.orderId } });
  if (d.status === "ORDERED_FROM_SUPPLIER" && ["CONFIRMED", "PLACED"].includes(order.status)) await setOrderStatus(order.id, "ORDERED_FROM_SUPPLIER");
  await audit(u.id, "procurement", "orderItem", d.id, { status: d.status });
  go(d.orderId, "Procurement updated");
}

/** Own-stock items → Shiprocket order, AWB, label, pickup. */
export async function shipWithShiprocket(fd: FormData) {
  const u = await requireStaff();
  const orderId = String(fd.get("orderId"));
  if (!shiprocketConfigured()) go(orderId, undefined, "Shiprocket is not connected (set SHIPROCKET_EMAIL / SHIPROCKET_PASSWORD).");
  const b = await getBusiness();
  if (!b.shiprocketPickupLocation) go(orderId, undefined, "Set the Shiprocket pickup location name in Business Details.");
  const order = await db.order.findUniqueOrThrow({ where: { id: orderId }, include: { items: { include: { variant: { select: { sku: true, weightGrams: true } } } }, user: { select: { email: true } } } });
  const items = order.items.filter((i) => i.fulfilledBy === "OWN_STOCK" && !i.shipmentId);
  if (!items.length) go(orderId, undefined, "No unshipped own-stock items.");
  const addr = order.shippingAddress as Record<string, string>;
  let errMsg: string | undefined;
  try {
    const sr = await createShiprocketOrder({
      orderNumber: `${order.orderNumber}-${Date.now().toString(36).slice(-4)}`,
      orderDate: order.createdAt,
      pickupLocation: b.shiprocketPickupLocation,
      address: { name: addr.name, phone: addr.phone, line1: addr.line1, line2: addr.line2, city: addr.city, state: addr.state, pincode: addr.pincode, email: order.user.email },
      items: items.map((i) => ({ name: `${i.name_en} ${i.packLabel}`, sku: i.variant.sku, units: i.quantity, sellingPrice: toNum(i.unitPrice), hsn: i.hsnCode })),
      subTotal: items.reduce((s, i) => s + toNum(i.lineTotal), 0),
      weightKg: items.reduce((s, i) => s + i.variant.weightGrams * i.quantity, 0) / 1000,
    });
    const shipmentId = String(sr.shipment_id);
    const awb = await assignAwb(shipmentId);
    const label = await generateLabel(shipmentId).catch(() => null);
    await requestPickup(shipmentId).catch(() => null);
    const awbCode = awb.response?.data?.awb_code ?? null;
    const shipment = await db.shipment.create({
      data: {
        orderId,
        route: "OWN_STOCK",
        shiprocketOrderId: String(sr.order_id),
        shiprocketShipmentId: shipmentId,
        awb: awbCode,
        courierName: awb.response?.data?.courier_name ?? null,
        labelUrl: label?.label_url ?? null,
        trackingUrl: awbCode ? `https://shiprocket.co/tracking/${awbCode}` : null,
        status: "CREATED",
        events: { create: { status: "Shipment created" } },
      },
    });
    await db.orderItem.updateMany({ where: { id: { in: items.map((i) => i.id) } }, data: { shipmentId: shipment.id } });
    if (["CONFIRMED", "PLACED"].includes(order.status)) await setOrderStatus(orderId, "PACKED");
    await audit(u.id, "shiprocket", "order", orderId, { shipmentId });
  } catch (e) {
    errMsg = e instanceof Error ? e.message : "Shiprocket error";
  }
  go(orderId, errMsg ? undefined : "Shipment created in Shiprocket", errMsg);
}

/** Supplier-direct (or manual) shipment: courier + AWB entered by admin. */
export async function addManualShipment(fd: FormData) {
  const u = await requireStaff();
  const d = z
    .object({ orderId: z.string(), courierName: z.string().trim().min(2).max(60), awb: z.string().trim().min(3).max(60), trackingUrl: z.string().trim().url().or(z.literal("")).optional(), route: z.enum(["OWN_STOCK", "SUPPLIER_DIRECT"]) })
    .parse(Object.fromEntries(fd));
  const itemIds = fd.getAll("itemIds").map(String);
  if (!itemIds.length) go(d.orderId, undefined, "Select at least one item");
  const shipment = await db.shipment.create({
    data: { orderId: d.orderId, route: d.route, courierName: d.courierName, awb: d.awb, trackingUrl: d.trackingUrl || null, status: "IN_TRANSIT", events: { create: { status: "Shipped", note: `${d.courierName} AWB ${d.awb}` } } },
  });
  await db.orderItem.updateMany({ where: { id: { in: itemIds }, orderId: d.orderId }, data: { shipmentId: shipment.id } });
  await db.procurementItem.updateMany({ where: { orderItemId: { in: itemIds } }, data: { status: "SUPPLIER_SHIPPED", supplierTracking: d.awb } });
  const order = await db.order.findUniqueOrThrow({ where: { id: d.orderId } });
  if (!["SHIPPED", "OUT_FOR_DELIVERY", "DELIVERED"].includes(order.status)) await setOrderStatus(d.orderId, "SHIPPED");
  await audit(u.id, "manualShipment", "order", d.orderId, { awb: d.awb });
  go(d.orderId, "Shipment added");
}

export async function updateShipment(fd: FormData) {
  const u = await requireStaff();
  const d = z
    .object({ id: z.string(), orderId: z.string(), status: z.enum(["CREATED", "PICKED_UP", "IN_TRANSIT", "OUT_FOR_DELIVERY", "DELIVERED", "RTO", "CANCELLED"]), note: z.string().max(200).optional(), location: z.string().max(80).optional() })
    .parse(Object.fromEntries(fd));
  await db.shipment.update({ where: { id: d.id }, data: { status: d.status, events: { create: { status: d.status.replace(/_/g, " ").toLowerCase(), note: d.note || null, location: d.location || null } } } });
  if (d.status === "DELIVERED") await db.procurementItem.updateMany({ where: { orderItem: { shipmentId: d.id } }, data: { status: "DELIVERED" } });
  await syncOrderFromShipments(d.orderId);
  await audit(u.id, `shipment:${d.status}`, "shipment", d.id);
  go(d.orderId, "Shipment updated");
}

export async function refundAction(fd: FormData) {
  const u = await requireAdmin();
  const orderId = String(fd.get("orderId"));
  const amount = Number(fd.get("amount"));
  const reason = String(fd.get("reason") ?? "").slice(0, 200) || "Refund";
  let err: string | undefined;
  try {
    await refundOrder(orderId, amount, reason, u.id);
    await audit(u.id, "refund", "order", orderId, { amount });
  } catch (e) {
    err = e instanceof OrderError ? (e.code === "refund_amount" ? "Amount exceeds the refundable balance" : "No captured online payment to refund") : e instanceof Error ? e.message : "Refund failed";
  }
  go(orderId, err ? undefined : "Refund initiated with Razorpay", err);
}

export async function decideReturn(fd: FormData) {
  const u = await requireStaff();
  const d = z.object({ id: z.string(), status: z.enum(["APPROVED", "REJECTED", "COMPLETED"]), adminNote: z.string().max(500).optional() }).parse(Object.fromEntries(fd));
  const r = await db.returnRequest.update({ where: { id: d.id }, data: { status: d.status, adminNote: d.adminNote || null } });
  if (d.status === "APPROVED") await setOrderStatus(r.orderId, "REPLACEMENT", `Return/replacement request approved`);
  await audit(u.id, `return:${d.status}`, "returnRequest", d.id);
  revalidatePath("/admin/returns");
  redirect("/admin/returns");
}

export async function setNotes(fd: FormData) {
  const u = await requireStaff();
  const orderId = String(fd.get("orderId"));
  await db.order.update({ where: { id: orderId }, data: { notes: String(fd.get("notes") ?? "").slice(0, 2000) } });
  await audit(u.id, "notes", "order", orderId);
  go(orderId, "Notes saved");
}
