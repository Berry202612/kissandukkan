import Link from "next/link";
import { CheckCircle2, XCircle } from "lucide-react";
import { db } from "@/lib/db";
import { canViewCosts, requireStaff } from "@/lib/session";
import { summary } from "@/lib/reports";
import { launchChecklist } from "@/lib/launch";
import { getLaunch } from "@/lib/settings";
import { expirePendingOrders } from "@/lib/orders";
import { formatINR } from "@/lib/utils";
import { PageHeader, Panel, Stat } from "@/components/admin/ui";
import { SubmitButton } from "@/components/admin/SubmitButton";
import { saveLaunch } from "@/app/admin/actions/settings";

export const metadata = { title: "Dashboard" };

export default async function Dashboard() {
  const u = await requireStaff();
  await expirePendingOrders();
  const costs = canViewCosts(u);
  const startOfDay = new Date(new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" }) + "T00:00:00+05:30");
  const [today, d7, d30, pendingProcurement, pendingShipments, returns, lowStockRows, checklist, launch, pendingReviews, openTickets] = await Promise.all([
    summary(startOfDay),
    summary(new Date(Date.now() - 7 * 86400000)),
    summary(new Date(Date.now() - 30 * 86400000)),
    db.procurementItem.count({ where: { status: "TO_ORDER", orderItem: { order: { status: { notIn: ["CANCELLED", "REFUNDED", "PAYMENT_PENDING"] }, OR: [{ paymentStatus: "CAPTURED" }, { paymentMethod: "COD" }] } } } }),
    db.order.count({ where: { status: { in: ["CONFIRMED", "PACKED", "ORDERED_FROM_SUPPLIER"] }, items: { some: { shipmentId: null } } } }),
    db.returnRequest.count({ where: { status: "REQUESTED" } }),
    db.productVariant.findMany({ where: { isActive: true, product: { fulfilledBy: "OWN_STOCK", status: "PUBLISHED" } }, select: { stock: true, lowStockAt: true } }),
    u.role === "ADMIN" ? launchChecklist() : Promise.resolve([]),
    getLaunch(),
    db.review.count({ where: { status: "PENDING" } }),
    db.ticket.count({ where: { status: "OPEN" } }),
  ]);
  const lowStock = lowStockRows.filter((v) => v.stock <= v.lowStockAt).length;
  const done = checklist.filter((c) => c.ok).length;

  return (
    <>
      <PageHeader title="Dashboard" description={`Namaste ${u.name ?? ""}.`} />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Stat label="Today – revenue" value={formatINR(today.revenue)} hint={`${today.orders} paid orders${costs ? ` · net ${formatINR(today.net)}` : ""}`} />
        <Stat label="Last 7 days" value={formatINR(d7.revenue)} hint={`${d7.orders} orders${costs ? ` · net ${formatINR(d7.net)}` : ""}`} />
        <Stat label="Last 30 days" value={formatINR(d30.revenue)} hint={`${d30.orders} orders${costs ? ` · net ${formatINR(d30.net)}` : ""}`} href={u.role === "ADMIN" ? "/admin/reports" : undefined} />
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
        <Stat label="To order from suppliers" value={pendingProcurement} tone={pendingProcurement ? "warn" : "default"} href="/admin/orders?proc=todo" />
        <Stat label="Orders awaiting shipment" value={pendingShipments} tone={pendingShipments ? "warn" : "default"} href="/admin/orders?ship=pending" />
        <Stat label="Replacement requests" value={returns} tone={returns ? "warn" : "default"} href="/admin/returns" />
        <Stat label="Low own-stock" value={lowStock} tone={lowStock ? "warn" : "default"} href="/admin/products?fulfil=OWN_STOCK" />
        <Stat label="Reviews to moderate" value={pendingReviews} href="/admin/reviews" />
        <Stat label="Open tickets" value={openTickets} href="/admin/inbox" />
      </div>

      {u.role === "ADMIN" && (
        <Panel title={`Launch readiness – ${done}/${checklist.length}`} className="mt-6">
          <ul className="grid gap-2 md:grid-cols-2">
            {checklist.map((c) => (
              <li key={c.label} className="flex items-start gap-2 rounded-xl bg-cream p-3 text-sm">
                {c.ok ? <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-success" /> : <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-danger" />}
                <span>
                  {c.href ? <Link href={c.href} className="font-semibold hover:underline">{c.label}</Link> : <span className="font-semibold">{c.label}</span>}
                  {c.detail && <span className="block text-xs text-muted">{c.detail}</span>}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-4 rounded-xl border border-accent bg-accent-light p-3 text-sm">
            Razorpay&apos;s website review usually requires a contact phone number and a physical address on the Contact page, plus live policy pages (terms, privacy, refund, shipping). Fill Business Details before applying.
          </p>
          <form action={saveLaunch} className="mt-4 flex flex-wrap items-center gap-4 text-sm">
            <label className="flex items-center gap-2"><input type="checkbox" name="policiesLegalReviewed" defaultChecked={launch.policiesLegalReviewed} className="h-4 w-4 accent-primary" /> Lawyer/CA signed off all policies</label>
            <label className="flex items-center gap-2"><input type="checkbox" name="taxTableVerified" defaultChecked={launch.taxTableVerified} className="h-4 w-4 accent-primary" /> CA verified the tax table</label>
            <label className="flex items-center gap-2"><input type="checkbox" name="razorpayWebsiteReviewed" defaultChecked={launch.razorpayWebsiteReviewed} className="h-4 w-4 accent-primary" /> Razorpay website review passed</label>
            <SubmitButton>Save</SubmitButton>
          </form>
        </Panel>
      )}
    </>
  );
}
