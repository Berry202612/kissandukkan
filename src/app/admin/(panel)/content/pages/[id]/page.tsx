import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/session";
import { L, PageHeader, Panel, btnOutlineCls, inputCls } from "@/components/admin/ui";
import { SubmitButton } from "@/components/admin/SubmitButton";
import { savePage } from "@/app/admin/actions/settings";

export const metadata = { title: "Edit page" };

export default async function EditPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ msg?: string }> }) {
  await requireStaff();
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const p = await db.page.findUnique({ where: { id } });
  if (!p) notFound();
  const href = p.slug === "about-us" ? "/en/about" : `/en/policies/${p.slug}`;
  return (
    <>
      <PageHeader title={p.title_en} description="HTML is sanitised on save. Tokens like {{legalName}}, {{supportEmail}}, {{grievanceBlock}}, {{contactBlock}}, {{entityBlock}}, {{licenceBlock}}, {{freeShippingThreshold}}, {{handlingFeePercent}} are filled from Business Details & settings; empty values render nothing." actions={<a href={href} target="_blank" className={btnOutlineCls}>View ↗</a>} />
      {sp.msg && <p className="mb-4 rounded-xl bg-primary-light p-3 text-sm text-primary-dark">{sp.msg}</p>}
      <form action={savePage} className="space-y-4">
        <input type="hidden" name="id" value={p.id} />
        <div className="grid gap-4 lg:grid-cols-2">
          {(["en", "hi"] as const).map((l) => (
            <Panel key={l} title={l === "en" ? "English" : "Hindi"}>
              <div className="space-y-3" lang={l}>
                <L label="Title"><input name={`title_${l}`} defaultValue={p[`title_${l}`]} className={`${inputCls} w-full`} required /></L>
                <L label="Summary (plain language, shown at top)"><textarea name={`summary_${l}`} defaultValue={p[`summary_${l}`]} className={`${inputCls} h-24 w-full py-2`} /></L>
                <L label="Body (HTML: h2, h3, p, ul, ol, li, strong, a, table)"><textarea name={`body_${l}`} defaultValue={p[`body_${l}`]} className={`${inputCls} h-[420px] w-full py-2 font-mono text-xs`} required /></L>
              </div>
            </Panel>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" name="hiReviewed" defaultChecked={p.hiReviewed} className="h-5 w-5 accent-primary" /> Hindi reviewed by a native speaker</label>
          {p.isPolicy && <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" name="legalReviewed" defaultChecked={p.legalReviewed} className="h-5 w-5 accent-primary" /> Reviewed by lawyer / CA</label>}
          <SubmitButton>Save page</SubmitButton>
        </div>
      </form>
    </>
  );
}
