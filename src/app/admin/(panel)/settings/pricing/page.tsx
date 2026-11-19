import { requireAdmin } from "@/lib/session";
import { getPricing } from "@/lib/settings";
import { razorpayConfigured, razorpayLive } from "@/lib/razorpay";
import { L, PageHeader, Panel, Pill, inputCls } from "@/components/admin/ui";
import { SubmitButton } from "@/components/admin/SubmitButton";
import { savePricing } from "@/app/admin/actions/settings";

export const metadata = { title: "Pricing & payments" };

export default async function PricingPage({ searchParams }: { searchParams: Promise<{ msg?: string; err?: string }> }) {
  await requireAdmin();
  const [p, sp] = await Promise.all([getPricing(), searchParams]);
  const num = (k: keyof typeof p, label: string, hint?: string, step = "1") => (
    <L label={label} hint={hint}>
      <input name={k} type="number" step={step} min="0" defaultValue={String(p[k])} className={`${inputCls} w-full`} />
    </L>
  );
  return (
    <>
      <PageHeader title="Pricing & payments" description="Changing the markup reprices every product (selling price is always capped at MRP and recorded in price history)." />
      {sp.msg && <p className="mb-4 rounded-xl bg-primary-light p-3 text-sm text-primary-dark">{sp.msg}</p>}
      {sp.err && <p className="mb-4 rounded-xl bg-[#fdecea] p-3 text-sm text-danger">{sp.err}</p>}
      <form action={savePricing} className="space-y-6">
        <Panel title="Markup">
          <div className="grid gap-4 md:grid-cols-3">{num("markupPercent", "Markup on cost price (%)", "Selling price = cost × (1 + markup), rounded to ₹1, never above MRP", "0.01")}</div>
        </Panel>
        <Panel title="Payment & Handling Fee (shown as a separate line in cart, checkout and invoice)">
          <div className="grid gap-4 md:grid-cols-3">
            {num("handlingFeePercent", "Fee (% of subtotal)", undefined, "0.01")}
            {num("handlingFeeMin", "Minimum ₹")}
            {num("handlingFeeMax", "Maximum ₹")}
          </div>
        </Panel>
        <Panel title="Shipping charged to customer">
          <div className="grid gap-4 md:grid-cols-3">
            {num("freeShippingThreshold", "Free shipping above ₹")}
            <L label="Mode">
              <select name="shippingMode" defaultValue={p.shippingMode} className={`${inputCls} w-full`}>
                <option value="FLAT">Flat fee</option>
                <option value="WEIGHT">Weight slabs</option>
              </select>
            </L>
            {num("flatShippingFee", "Flat fee ₹")}
            <L label="Weight slabs (grams:fee, one per line)" className="md:col-span-2">
              <textarea name="weightRates" defaultValue={p.weightRates.map((r) => `${r.upToGrams}:${r.fee}`).join("\n")} className={`${inputCls} h-28 w-full py-2`} />
            </L>
            {num("extraPerKgAboveMax", "Extra ₹ per kg above the last slab")}
          </div>
        </Panel>
        <Panel title="Cash on delivery (off at launch)">
          <div className="grid gap-4 md:grid-cols-3">
            <label className="flex items-center gap-2 text-sm font-semibold">
              <input type="checkbox" name="codEnabled" defaultChecked={p.codEnabled} className="h-5 w-5 accent-primary" /> Enable COD
            </label>
            {num("codLimit", "COD order limit ₹")}
            {num("codFee", "COD fee ₹")}
          </div>
        </Panel>
        <Panel title="Cost assumptions (for margin & profit reports)">
          <div className="grid gap-4 md:grid-cols-3">
            {num("razorpayFeePercent", "Razorpay fee %", undefined, "0.01")}
            {num("razorpayGstPercent", "GST on Razorpay fee %", undefined, "0.01")}
            {num("serviceGstRate", "GST rate on shipping & handling fee %", "Verify with your CA", "0.01")}
          </div>
          <p className="mt-3 text-sm">
            Razorpay: {razorpayConfigured() ? <Pill tone={razorpayLive() ? "green" : "gold"}>{razorpayLive() ? "LIVE keys" : "TEST keys"}</Pill> : <Pill tone="red">Not configured</Pill>}
          </p>
        </Panel>
        <SubmitButton confirm="Save pricing? If the markup changed, all products will be repriced.">Save pricing</SubmitButton>
      </form>
    </>
  );
}
