import { db } from "@/lib/db";
import { requireStaff } from "@/lib/session";
import { PageHeader, Panel, Pill, inputCls } from "@/components/admin/ui";
import { SubmitButton } from "@/components/admin/SubmitButton";
import { saveCoupon } from "@/app/admin/actions/catalog";

export const metadata = { title: "Coupons" };

export default async function Coupons() {
  await requireStaff();
  const coupons = await db.coupon.findMany({ orderBy: { createdAt: "desc" } });
  const Form = ({ c }: { c?: (typeof coupons)[number] }) => (
    <form action={saveCoupon} className="flex flex-wrap items-end gap-2 text-sm">
      {c && <input type="hidden" name="id" value={c.id} />}
      <label>Code<input name="code" defaultValue={c?.code} required className={`${inputCls} block w-36 uppercase`} /></label>
      <label>Type<select name="type" defaultValue={c?.type ?? "PERCENT"} className={`${inputCls} block`}><option value="PERCENT">% off</option><option value="FLAT">₹ flat</option></select></label>
      <label>Value<input name="value" type="number" step="0.01" defaultValue={c?.value.toString()} required className={`${inputCls} block w-24`} /></label>
      <label>Max discount ₹<input name="maxDiscount" type="number" defaultValue={c?.maxDiscount?.toString() ?? ""} className={`${inputCls} block w-28`} /></label>
      <label>Min order ₹<input name="minOrder" type="number" defaultValue={c?.minOrder.toString() ?? "0"} className={`${inputCls} block w-28`} /></label>
      <label>Expires<input name="expiresAt" type="date" defaultValue={c?.expiresAt?.toISOString().slice(0, 10) ?? ""} className={`${inputCls} block`} /></label>
      <label>Total uses<input name="usageLimit" type="number" defaultValue={c?.usageLimit ?? ""} className={`${inputCls} block w-24`} /></label>
      <label>Per customer<input name="perCustomerLimit" type="number" defaultValue={c?.perCustomerLimit ?? 1} className={`${inputCls} block w-24`} /></label>
      <label className="flex h-10 items-center gap-1"><input type="checkbox" name="isActive" defaultChecked={c?.isActive ?? true} className="accent-primary" /> Active</label>
      <SubmitButton>{c ? "Save" : "Create"}</SubmitButton>
      {c && <Pill tone="green">Used {c.usedCount}×</Pill>}
    </form>
  );
  return (
    <>
      <PageHeader title="Coupons" description="No coupons are created by default. Coupons apply to the item subtotal; the payment & handling fee is then calculated on the discounted subtotal." />
      <div className="space-y-4">
        {coupons.map((c) => (
          <Panel key={c.id}>
            <Form c={c} />
          </Panel>
        ))}
        <Panel title="New coupon">
          <Form />
        </Panel>
      </div>
    </>
  );
}
