import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { getDelivery } from "@/lib/settings";
import { shiprocketConfigured } from "@/lib/shiprocket";
import { L, PageHeader, Panel, Pill, inputCls } from "@/components/admin/ui";
import { SubmitButton } from "@/components/admin/SubmitButton";
import { addRegion, removeRegion, saveDelivery } from "@/app/admin/actions/settings";

export const metadata = { title: "Delivery settings" };

export default async function DeliveryPage({ searchParams }: { searchParams: Promise<{ msg?: string; err?: string }> }) {
  await requireAdmin();
  const [d, regions, sp] = await Promise.all([getDelivery(), db.serviceableRegion.findMany({ orderBy: [{ state: "asc" }, { pincodePrefix: "asc" }] }), searchParams]);
  const num = (k: keyof typeof d, label: string, hint?: string) => (
    <L label={label} hint={hint}>
      <input name={k} type="number" min="0" defaultValue={d[k]} className={`${inputCls} w-full`} />
    </L>
  );
  return (
    <>
      <PageHeader title="Delivery settings" />
      {sp.msg && <p className="mb-4 rounded-xl bg-primary-light p-3 text-sm text-primary-dark">{sp.msg}</p>}
      {sp.err && <p className="mb-4 rounded-xl bg-[#fdecea] p-3 text-sm text-danger">{sp.err}</p>}
      <form action={saveDelivery}>
        <Panel title="Delivery estimates & windows" className="mb-6">
          <div className="grid gap-4 md:grid-cols-4">
            {num("ownStockMinDays", "Own stock: min days")}
            {num("ownStockMaxDays", "Own stock: max days")}
            {num("supplierMinDays", "Supplier direct: min days")}
            {num("supplierMaxDays", "Supplier direct: max days")}
            {num("surfaceExtraDays", "Extra days for surface-only items")}
            {num("replacementWindowHours", "Report problem within (hours)")}
            {num("reviewRequestDelayDays", "Review request after delivery (days)")}
            {num("paymentWindowMinutes", "Payment retry window (minutes)")}
          </div>
          <div className="mt-4">
            <SubmitButton>Save</SubmitButton>
          </div>
        </Panel>
      </form>
      <Panel title="Serviceable regions for supplier-direct items">
        <p className="mb-3 text-sm text-muted">
          Own-stock pincode checks use Shiprocket ({shiprocketConfigured() ? <Pill tone="green">connected</Pill> : <Pill tone="red">not connected</Pill>}). For supplier-direct products the checker answers “available” only for the states or pincode prefixes listed here. With an empty list it answers “cannot confirm”.
        </p>
        <ul className="mb-4 flex flex-wrap gap-2">
          {regions.map((r) => (
            <li key={r.id} className="flex items-center gap-1 rounded-full bg-primary-light px-3 py-1 text-sm">
              {r.state ?? `PIN ${r.pincodePrefix}*`}
              <form action={removeRegion}>
                <input type="hidden" name="id" value={r.id} />
                <button className="ml-1 text-danger" aria-label="Remove">×</button>
              </form>
            </li>
          ))}
          {!regions.length && <li className="text-sm text-muted">No regions yet.</li>}
        </ul>
        <form action={addRegion} className="flex flex-wrap gap-2">
          <input name="state" placeholder="State (e.g. Maharashtra)" className={inputCls} />
          <span className="self-center text-sm text-muted">or</span>
          <input name="pincodePrefix" placeholder="Pincode prefix (e.g. 41)" className={inputCls} />
          <SubmitButton>Add</SubmitButton>
        </form>
      </Panel>
    </>
  );
}
