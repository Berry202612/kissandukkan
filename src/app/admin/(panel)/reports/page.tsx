import { requireAdmin } from "@/lib/session";
import { profitReport } from "@/lib/reports";
import { formatINR } from "@/lib/utils";
import { FilterBar, PageHeader, Panel, Table, Td, btnCls, btnOutlineCls, inputCls } from "@/components/admin/ui";
import { ReportChart } from "@/components/admin/ReportChart";

export const metadata = { title: "Reports" };

const GROUPS = ["day", "month", "category", "product", "supplier"] as const;

export default async function Reports({ searchParams }: { searchParams: Promise<{ from?: string; to?: string; by?: string }> }) {
  await requireAdmin();
  const sp = await searchParams;
  const to = sp.to ? new Date(`${sp.to}T23:59:59+05:30`) : new Date();
  const from = sp.from ? new Date(`${sp.from}T00:00:00+05:30`) : new Date(Date.now() - 30 * 86400000);
  const by = (GROUPS.includes(sp.by as (typeof GROUPS)[number]) ? sp.by : "day") as (typeof GROUPS)[number];
  const rows = await profitReport(from, to, by);
  const tot = rows.reduce((s, r) => ({ revenue: s.revenue + r.revenue, cost: s.cost + r.cost, fees: s.fees + r.fees, shipping: s.shipping + r.shipping, refunds: s.refunds + r.refunds, net: s.net + r.net }), { revenue: 0, cost: 0, fees: 0, shipping: 0, refunds: 0, net: 0 });
  const qs = new URLSearchParams({ type: "profit", from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10), by }).toString();
  return (
    <>
      <PageHeader
        title="Reports"
        description="Paid orders only. Net = revenue − refunds − product cost − Razorpay fee (estimated from settings) − shipping (fee charged used as a proxy for courier cost)."
        actions={<a href={`/admin/reports/export?${qs}`} className={btnOutlineCls}>Export CSV</a>}
      />
      <FilterBar>
        <label className="text-sm">From <input type="date" name="from" defaultValue={from.toISOString().slice(0, 10)} className={inputCls} /></label>
        <label className="text-sm">To <input type="date" name="to" defaultValue={to.toISOString().slice(0, 10)} className={inputCls} /></label>
        <select name="by" defaultValue={by} className={inputCls}>
          {GROUPS.map((g) => <option key={g} value={g}>By {g}</option>)}
        </select>
        <button className={btnCls}>Run</button>
      </FilterBar>
      {(by === "day" || by === "month") && (
        <Panel className="mb-6">
          <ReportChart data={rows.map((r) => ({ key: r.key, revenue: Math.round(r.revenue - r.refunds), net: Math.round(r.net) }))} />
        </Panel>
      )}
      <Table head={[by, by === "day" || by === "month" ? "Orders" : "Lines", "Revenue", "Refunds", "Cost", "Razorpay fees", "Shipping", "Net"]} empty="No paid orders in this period.">
        {rows.map((r) => (
          <tr key={r.key}>
            <Td className="font-semibold">{r.key}</Td>
            <Td>{r.orders}</Td>
            <Td>{formatINR(r.revenue)}</Td>
            <Td>{formatINR(r.refunds)}</Td>
            <Td>{formatINR(r.cost)}</Td>
            <Td>{formatINR(r.fees)}</Td>
            <Td>{formatINR(r.shipping)}</Td>
            <Td className={r.net < 0 ? "font-bold text-danger" : "font-bold text-success"}>{formatINR(r.net)}</Td>
          </tr>
        ))}
        {rows.length > 0 && (
          <tr className="bg-primary-light font-bold">
            <Td>Total</Td>
            <Td>{""}</Td>
            <Td>{formatINR(tot.revenue)}</Td>
            <Td>{formatINR(tot.refunds)}</Td>
            <Td>{formatINR(tot.cost)}</Td>
            <Td>{formatINR(tot.fees)}</Td>
            <Td>{formatINR(tot.shipping)}</Td>
            <Td>{formatINR(tot.net)}</Td>
          </tr>
        )}
      </Table>
    </>
  );
}
