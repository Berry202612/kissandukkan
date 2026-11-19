import { db } from "@/lib/db";
import { requireStaff } from "@/lib/session";
import { PageHeader, Panel, Pill, inputCls } from "@/components/admin/ui";
import { SubmitButton } from "@/components/admin/SubmitButton";
import { saveSupplier } from "@/app/admin/actions/catalog";

export const metadata = { title: "Suppliers" };

export default async function Suppliers() {
  await requireStaff("view_costs");
  const suppliers = await db.supplier.findMany({ orderBy: { name: "asc" }, include: { _count: { select: { listings: true, procurements: true } } } });
  const Form = ({ s }: { s?: (typeof suppliers)[number] }) => (
    <form action={saveSupplier} className="grid gap-2 md:grid-cols-4">
      {s && <input type="hidden" name="id" value={s.id} />}
      <input name="name" defaultValue={s?.name} placeholder="Name" required className={inputCls} />
      <select name="type" defaultValue={s?.type ?? "DISTRIBUTOR"} className={inputCls}>
        <option value="ONLINE_STORE">Online store</option>
        <option value="DISTRIBUTOR">Distributor</option>
        <option value="BRAND">Brand / company</option>
      </select>
      <input name="website" defaultValue={s?.website ?? ""} placeholder="Website" className={inputCls} />
      <input name="contactName" defaultValue={s?.contactName ?? ""} placeholder="Contact person" className={inputCls} />
      <input name="phone" defaultValue={s?.phone ?? ""} placeholder="Phone" className={inputCls} />
      <input name="email" defaultValue={s?.email ?? ""} placeholder="Email" className={inputCls} />
      <input name="notes" defaultValue={s?.notes ?? ""} placeholder="Notes (terms, credit, GST…)" className={`${inputCls} md:col-span-2`} />
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="isActive" defaultChecked={s?.isActive ?? true} className="accent-primary" /> Active</label>
      <SubmitButton>{s ? "Save" : "Add supplier"}</SubmitButton>
    </form>
  );
  return (
    <>
      <PageHeader title="Suppliers" description="PRIVATE. Supplier names, links and prices are never shown to customers, in emails, invoices, page source or structured data." />
      <div className="space-y-4">
        {suppliers.map((s) => (
          <Panel key={s.id} title={s.name} actions={<span className="flex gap-2"><Pill>{s.type}</Pill><Pill tone="green">{s._count.listings} listings</Pill><Pill tone="soil">{s._count.procurements} order items</Pill></span>}>
            <Form s={s} />
          </Panel>
        ))}
        <Panel title="New supplier">
          <Form />
        </Panel>
      </div>
    </>
  );
}
