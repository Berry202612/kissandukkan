import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { PageHeader, Panel, inputCls } from "@/components/admin/ui";
import { SubmitButton } from "@/components/admin/SubmitButton";
import { saveEmailTemplate } from "@/app/admin/actions/settings";

export const metadata = { title: "Email templates" };

export default async function Emails({ searchParams }: { searchParams: Promise<{ msg?: string }> }) {
  await requireAdmin();
  const [templates, sp] = await Promise.all([db.emailTemplate.findMany({ orderBy: [{ key: "asc" }, { locale: "asc" }] }), searchParams]);
  return (
    <>
      <PageHeader title="Email templates" description="Sent through Resend. Placeholders such as {{name}}, {{orderNumber}}, {{total}}, {{items}}, {{trackUrl}}, {{reviewUrl}}, {{resetUrl}} are filled automatically. Emails never contain supplier information." />
      {sp.msg && <p className="mb-4 rounded-xl bg-primary-light p-3 text-sm text-primary-dark">{sp.msg}</p>}
      <div className="space-y-4">
        {templates.map((t) => (
          <Panel key={t.id} title={`${t.key} · ${t.locale.toUpperCase()}`}>
            <form action={saveEmailTemplate} className="space-y-2">
              <input type="hidden" name="id" value={t.id} />
              <input name="subject" defaultValue={t.subject} className={`${inputCls} w-full`} aria-label="Subject" />
              <textarea name="body" defaultValue={t.body} className={`${inputCls} h-40 w-full py-2 font-mono text-xs`} aria-label="Body HTML" />
              <SubmitButton>Save</SubmitButton>
            </form>
          </Panel>
        ))}
      </div>
    </>
  );
}
