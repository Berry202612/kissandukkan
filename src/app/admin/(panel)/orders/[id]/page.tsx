import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { canViewCosts, requireStaff } from "@/lib/session";
import { nextStatuses } from "@/lib/orders";
import { getPricing } from "@/lib/settings";
import { estimatePaymentGatewayFee } from "@/lib/pricing";
import { shiprocketConfigured } from "@/lib/shiprocket";
import { formatINR, toNum } from "@/lib/utils";
import { PageHeader, Panel, Pill, Table, Td, btnOutlineCls, inputCls } from "@/components/admin/ui";
import { SubmitButton } from "@/components/admin/SubmitButton";
import { addManualShipment, refundAction, setNotes, shipWithShiprocket, updateOrderStatus, updateProcurement, updateShipment } from "@/app/admin/actions/orders";

export const metadata = { title: "Order" };

export default async function AdminOrder({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ msg?: string; err?: string }> }) {
  const u = await requireStaff();
  const costs = canViewCosts(u);
  const { id } = await params;
  const { msg, err } = await searchParams;
  const [order, suppliers, pricing] = await Promise.all([
    db.order.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, name: true, email: true, mobile: true } },
        items: {
          include: {
            procurement: { include: { supplier: { select: { name: true } } } },
            variant: { select: { sku: true, supplierListings: { where: { isPreferred: true }, include: { supplier: { select: { id: true, name: true } } }, take: 1 } } },
          },
        },
        events: { orderBy: { createdAt: "asc" } },
        shipments: { include: { events: { orderBy: { occurredAt: "desc" } }, items: { select: { id: true } } } },
        refunds: { orderBy: { createdAt: "desc" } },
        returns: true,
      },
    }),
    db.supplier.findMany({ where: { isActive: true }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    getPricing(),
  ]);
  if (!order) notFound();
  const addr = order.shippingAddress as Record<string, string | null>;
  const unshipped = order.items.filter((i) => !i.shipmentId);
  const ownUnshipped = unshipped.filter((i) => i.fulfilledBy === "OWN_STOCK");
  const cost = order.items.reduce((s, i) => s + toNum(i.costPrice) * i.quantity, 0);
  const rpFee = order.paymentMethod === "RAZORPAY" ? estimatePaymentGatewayFee(toNum(order.total), pricing.razorpayFeePercent, pricing.razorpayGstPercent) : 0;
  const net = toNum(order.total) - toNum(order.refundedAmount) - cost - rpFee;
  const refundable = toNum(order.total) - toNum(order.refundedAmount);

  return (
    <>
      <PageHeader
        title={order.orderNumber}
        description={`${order.createdAt.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })} · ${order.paymentMethod} · ${order.paymentStatus}${order.razorpayPaymentId ? ` · ${order.razorpayPaymentId}` : ""}`}
        actions={
          <>
            <Pill tone={order.status === "DELIVERED" ? "green" : order.status === "CANCELLED" ? "red" : "gold"}>{order.status}</Pill>
            {order.invoiceNumber && <a href={`/api/invoice/${order.orderNumber}`} className={btnOutlineCls}>Invoice {order.invoiceNumber}</a>}
          </>
        }
      />
      {msg && <p className="mb-4 rounded-xl bg-primary-light p-3 text-sm text-primary-dark">{msg}</p>}
      {err && <p className="mb-4 rounded-xl bg-[#fdecea] p-3 text-sm text-danger">{err}</p>}

      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <Panel title="Items & procurement">
            <div className="space-y-4">
              {order.items.map((i) => {
                const pref = i.variant.supplierListings[0];
                return (
                  <div key={i.id} className="rounded-2xl border border-line p-4">
                    <div className="flex flex-wrap justify-between gap-2 text-sm">
                      <span>
                        <strong>{i.name_en}</strong> · {i.packLabel} × {i.quantity} · SKU {i.variant.sku}
                        <span className="block text-xs text-muted">
                          {i.fulfilledBy === "OWN_STOCK" ? "Own stock (Shiprocket)" : "Supplier direct"} · ETA {i.etaMinDays}–{i.etaMaxDays} days · {i.shipmentId ? "Shipped" : "Not shipped"}
                        </span>
                      </span>
                      <span className="text-right">
                        {formatINR(i.lineTotal)}
                        {costs && <span className="block text-xs text-muted">cost {formatINR(toNum(i.costPrice) * i.quantity, { decimals: true })}</span>}
                      </span>
                    </div>
                    {i.procurement && costs && (
                      <form action={updateProcurement} className="mt-3 grid gap-2 rounded-xl bg-cream p-3 text-xs sm:grid-cols-3 lg:grid-cols-6">
                        <input type="hidden" name="id" value={i.procurement.id} />
                        <input type="hidden" name="orderId" value={order.id} />
                        <label className="font-semibold">Supplier
                          <select name="supplierId" defaultValue={i.procurement.supplierId ?? pref?.supplier.id ?? ""} className={`${inputCls} mt-1 w-full`}>
                            <option value="">—</option>
                            {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                          </select>
                        </label>
                        <label className="font-semibold">Supplier order ID<input name="supplierOrderId" defaultValue={i.procurement.supplierOrderId ?? ""} className={`${inputCls} mt-1 w-full`} /></label>
                        <label className="font-semibold">Amount paid ₹<input name="amountPaid" type="number" step="0.01" defaultValue={i.procurement.amountPaid?.toString() ?? ""} className={`${inputCls} mt-1 w-full`} /></label>
                        <label className="font-semibold">Supplier tracking<input name="supplierTracking" defaultValue={i.procurement.supplierTracking ?? ""} className={`${inputCls} mt-1 w-full`} /></label>
                        <label className="font-semibold">Status
                          <select name="status" defaultValue={i.procurement.status} className={`${inputCls} mt-1 w-full`}>
                            <option value="TO_ORDER">To order</option>
                            <option value="ORDERED_FROM_SUPPLIER">Ordered from supplier</option>
                            <option value="SUPPLIER_SHIPPED">Supplier shipped</option>
                            <option value="DELIVERED">Delivered</option>
                          </select>
                        </label>
                        <div className="flex items-end gap-2">
                          <SubmitButton>Save</SubmitButton>
                          {pref?.supplierProductUrl && (
                            <a href={pref.supplierProductUrl} target="_blank" rel="noopener noreferrer" className="text-primary underline">Open supplier page ↗</a>
                          )}
                        </div>
                        <p className="sm:col-span-3 lg:col-span-6 text-muted">Preferred supplier: {pref ? `${pref.supplier.name} @ ${formatINR(pref.supplierPrice, { decimals: true })}` : "none set"}</p>
                      </form>
                    )}
                  </div>
                );
              })}
            </div>
          </Panel>

          <Panel title="Shipments">
            {order.shipments.length === 0 && <p className="text-sm text-muted">No shipments yet.</p>}
            <div className="space-y-3">
              {order.shipments.map((s) => (
                <div key={s.id} className="rounded-2xl border border-line p-4 text-sm">
                  <p className="font-semibold">
                    {s.route === "OWN_STOCK" ? "Own stock" : "Supplier direct"} · {s.courierName ?? "Courier pending"} {s.awb ? `· AWB ${s.awb}` : ""} · <Pill>{s.status}</Pill>
                  </p>
                  <p className="text-xs text-muted">{s.items.length} item(s){s.labelUrl && <> · <a href={s.labelUrl} target="_blank" rel="noopener noreferrer" className="underline">Label</a></>}{s.trackingUrl && <> · <a href={s.trackingUrl} target="_blank" rel="noopener noreferrer" className="underline">Tracking</a></>}</p>
                  <form action={updateShipment} className="mt-2 flex flex-wrap gap-2">
                    <input type="hidden" name="id" value={s.id} />
                    <input type="hidden" name="orderId" value={order.id} />
                    <select name="status" defaultValue={s.status} className={inputCls}>
                      {["CREATED", "PICKED_UP", "IN_TRANSIT", "OUT_FOR_DELIVERY", "DELIVERED", "RTO", "CANCELLED"].map((x) => <option key={x}>{x}</option>)}
                    </select>
                    <input name="location" placeholder="Location (optional)" className={inputCls} />
                    <input name="note" placeholder="Note shown on tracking page" className={`${inputCls} w-64`} />
                    <SubmitButton>Add update</SubmitButton>
                  </form>
                  {s.events.length > 0 && (
                    <ul className="mt-2 space-y-0.5 text-xs text-muted">
                      {s.events.slice(0, 6).map((e) => <li key={e.id}>{e.occurredAt.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })} – {e.status}{e.location ? ` · ${e.location}` : ""}{e.note ? ` · ${e.note}` : ""}</li>)}
                    </ul>
                  )}
                </div>
              ))}
            </div>
            {order.paymentStatus !== "PENDING" || order.paymentMethod === "COD" ? (
              <div className="mt-4 grid gap-4 lg:grid-cols-2">
                {ownUnshipped.length > 0 && (
                  <form action={shipWithShiprocket} className="rounded-2xl border border-dashed border-line p-4 text-sm">
                    <input type="hidden" name="orderId" value={order.id} />
                    <p className="font-semibold">Ship own-stock items via Shiprocket</p>
                    <p className="mb-2 text-xs text-muted">{ownUnshipped.map((i) => `${i.name_en} ${i.packLabel} ×${i.quantity}`).join(", ")}</p>
                    {!shiprocketConfigured() && <p className="mb-2 text-xs text-danger">Shiprocket credentials not set.</p>}
                    <SubmitButton>Create shipment, AWB & label</SubmitButton>
                  </form>
                )}
                {unshipped.length > 0 && (
                  <form action={addManualShipment} className="rounded-2xl border border-dashed border-line p-4 text-sm">
                    <input type="hidden" name="orderId" value={order.id} />
                    <p className="font-semibold">Add shipment manually (supplier-direct)</p>
                    {unshipped.map((i) => (
                      <label key={i.id} className="flex items-center gap-2 text-xs">
                        <input type="checkbox" name="itemIds" value={i.id} defaultChecked={i.fulfilledBy === "SUPPLIER_DIRECT"} className="accent-primary" /> {i.name_en} {i.packLabel} ×{i.quantity}
                      </label>
                    ))}
                    <div className="mt-2 flex flex-wrap gap-2">
                      <select name="route" defaultValue="SUPPLIER_DIRECT" className={inputCls}><option value="SUPPLIER_DIRECT">Supplier direct</option><option value="OWN_STOCK">Own stock (manual)</option></select>
                      <input name="courierName" placeholder="Courier" required className={inputCls} />
                      <input name="awb" placeholder="AWB / tracking no." required className={inputCls} />
                      <input name="trackingUrl" placeholder="Courier tracking URL" className={`${inputCls} w-64`} />
                      <SubmitButton>Add shipment</SubmitButton>
                    </div>
                  </form>
                )}
              </div>
            ) : (
              <p className="mt-3 text-sm text-muted">Awaiting payment – shipping is disabled.</p>
            )}
          </Panel>

          <Panel title="Timeline">
            <ul className="space-y-1 text-sm">
              {order.events.map((e) => (
                <li key={e.id}>
                  <span className="text-muted">{e.createdAt.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}</span> – <strong>{e.status}</strong>
                  {e.note ? ` · ${e.note}` : ""}
                </li>
              ))}
            </ul>
            {nextStatuses(order.status).length > 0 && order.status !== "PAYMENT_PENDING" && (
              <form action={updateOrderStatus} className="mt-3 flex flex-wrap gap-2">
                <input type="hidden" name="orderId" value={order.id} />
                <select name="status" className={inputCls}>{nextStatuses(order.status).map((s) => <option key={s}>{s}</option>)}</select>
                <input name="note" placeholder="Internal note (optional)" className={`${inputCls} w-64`} />
                <SubmitButton confirm="Update order status? Shipped / delivered statuses email the customer.">Update status</SubmitButton>
              </form>
            )}
          </Panel>
        </div>

        <div className="space-y-6">
          <Panel title="Customer">
            <p className="text-sm font-semibold">{addr.name}</p>
            <p className="text-sm">{[addr.line1, addr.line2, addr.landmark, addr.city, addr.district, addr.state, addr.pincode].filter(Boolean).join(", ")}</p>
            <p className="text-sm">{addr.phone}</p>
            <p className="mt-2 text-xs text-muted">
              Account: <Link href={`/admin/customers?q=${encodeURIComponent(order.user.email ?? order.user.mobile ?? "")}`} className="underline">{order.user.name}</Link> · {order.user.email ?? order.user.mobile}
            </p>
          </Panel>
          <Panel title="Money">
            <dl className="space-y-1 text-sm">
              <div className="flex justify-between"><dt>Subtotal</dt><dd>{formatINR(order.subtotal)}</dd></div>
              {toNum(order.discount) > 0 && <div className="flex justify-between"><dt>Discount ({order.couponCode})</dt><dd>−{formatINR(order.discount)}</dd></div>}
              <div className="flex justify-between"><dt>Shipping</dt><dd>{formatINR(order.shippingFee)}</dd></div>
              <div className="flex justify-between"><dt>Payment & Handling Fee</dt><dd>{formatINR(order.handlingFee)}</dd></div>
              {toNum(order.codFee) > 0 && <div className="flex justify-between"><dt>COD fee</dt><dd>{formatINR(order.codFee)}</dd></div>}
              <div className="flex justify-between border-t border-line pt-1 font-bold"><dt>Total</dt><dd>{formatINR(order.total, { decimals: true })}</dd></div>
              {toNum(order.refundedAmount) > 0 && <div className="flex justify-between text-danger"><dt>Refunded</dt><dd>−{formatINR(order.refundedAmount, { decimals: true })}</dd></div>}
              {costs && (
                <>
                  <div className="flex justify-between text-muted"><dt>Product cost</dt><dd>−{formatINR(cost, { decimals: true })}</dd></div>
                  <div className="flex justify-between text-muted"><dt>Razorpay fee (est.)</dt><dd>−{formatINR(rpFee, { decimals: true })}</dd></div>
                  <div className="flex justify-between font-semibold"><dt>Net (before courier cost)</dt><dd className={net < 0 ? "text-danger" : "text-success"}>{formatINR(net, { decimals: true })}</dd></div>
                </>
              )}
            </dl>
          </Panel>
          {u.role === "ADMIN" && order.paymentMethod === "RAZORPAY" && order.razorpayPaymentId && refundable > 0.009 && (
            <Panel title="Refund (Razorpay)">
              <form action={refundAction} className="space-y-2 text-sm">
                <input type="hidden" name="orderId" value={order.id} />
                <input name="amount" type="number" step="0.01" min="1" max={refundable.toFixed(2)} defaultValue={refundable.toFixed(2)} className={`${inputCls} w-full`} aria-label="Amount" />
                <input name="reason" placeholder="Reason" className={`${inputCls} w-full`} />
                <SubmitButton confirm="Send this refund to Razorpay? This cannot be undone.">Refund</SubmitButton>
                <p className="text-xs text-muted">Refundable balance: {formatINR(refundable, { decimals: true })}. Partial refunds supported.</p>
              </form>
              {order.refunds.length > 0 && (
                <ul className="mt-3 space-y-1 text-xs">
                  {order.refunds.map((r) => <li key={r.id}>{r.createdAt.toLocaleDateString("en-IN")} · {formatINR(r.amount, { decimals: true })} · {r.status} · {r.reason}</li>)}
                </ul>
              )}
            </Panel>
          )}
          {order.returns.length > 0 && (
            <Panel title="Return / replacement requests">
              {order.returns.map((r) => (
                <p key={r.id} className="text-sm">{r.type} · {r.reason} · <Pill>{r.status}</Pill> <Link href="/admin/returns" className="underline">Open queue</Link></p>
              ))}
            </Panel>
          )}
          <Panel title="Internal notes">
            <form action={setNotes} className="space-y-2">
              <input type="hidden" name="orderId" value={order.id} />
              <textarea name="notes" defaultValue={order.notes ?? ""} className={`${inputCls} h-28 w-full py-2`} />
              <SubmitButton>Save notes</SubmitButton>
            </form>
          </Panel>
        </div>
      </div>
      <Table head={["Tax rate", "Taxable", "GST"]} empty="">
        {(order.taxBreakup as { rate: number; taxable: number; tax: number }[]).map((r) => (
          <tr key={r.rate}><Td>{r.rate}%</Td><Td>{formatINR(r.taxable, { decimals: true })}</Td><Td>{formatINR(r.tax, { decimals: true })}</Td></tr>
        ))}
      </Table>
    </>
  );
}
