import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { PageHeader, Pill, Table, Td, inputCls } from "@/components/admin/ui";
import { SubmitButton } from "@/components/admin/SubmitButton";
import { saveTaxRule } from "@/app/admin/actions/settings";

export const metadata = { title: "Tax settings" };

export default async function TaxPage({ searchParams }: { searchParams: Promise<{ msg?: string; err?: string }> }) {
  await requireAdmin();
  const [rules, sp] = await Promise.all([db.taxRule.findMany({ orderBy: { label: "asc" } }), searchParams]);
  return (
    <>
      <PageHeader title="Tax settings (HSN / GST)" description="Pre-filled with commonly used values as a starting point only. Every row must be verified with your Chartered Accountant before launch – rates differ by exact product (e.g. bio-fertilizers, micronutrients, specific tools). Products can override HSN and GST individually." />
      {sp.msg && <p className="mb-4 rounded-xl bg-primary-light p-3 text-sm text-primary-dark">{sp.msg}</p>}
      {sp.err && <p className="mb-4 rounded-xl bg-[#fdecea] p-3 text-sm text-danger">{sp.err}</p>}
      <Table head={["Category", "HSN", "GST %", "Status", ""]}>
        {rules.map((r) => (
          <tr key={r.id}>
            <Td className="font-semibold">{r.label}<span className="block text-xs font-normal text-muted">{r.categorySlug}</span></Td>
            <Td colSpan={4}>
              <form action={saveTaxRule} className="flex flex-wrap items-center gap-2">
                <input type="hidden" name="id" value={r.id} />
                <input name="hsnCode" defaultValue={r.hsnCode} className={`${inputCls} w-28`} aria-label="HSN" />
                <input name="gstRate" type="number" step="0.01" defaultValue={r.gstRate.toString()} className={`${inputCls} w-24`} aria-label="GST %" />
                <label className="flex items-center gap-1 text-sm"><input type="checkbox" name="verified" defaultChecked={r.verified} className="accent-primary" /> Verified by CA</label>
                {r.verified ? <Pill tone="green">Verified</Pill> : <Pill tone="gold">{r.note}</Pill>}
                <SubmitButton>Save</SubmitButton>
              </form>
            </Td>
          </tr>
        ))}
      </Table>
    </>
  );
}
