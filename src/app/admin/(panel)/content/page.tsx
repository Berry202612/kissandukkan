import Link from "next/link";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/session";
import { illustrationKeys } from "@/components/brand/Illustration";
import { PageHeader, Panel, Pill, Table, Td, btnCls, inputCls } from "@/components/admin/ui";
import { SubmitButton } from "@/components/admin/SubmitButton";
import { saveBanner, saveFaq } from "@/app/admin/actions/settings";

export const metadata = { title: "Content" };

export default async function Content({ searchParams }: { searchParams: Promise<{ msg?: string; err?: string }> }) {
  await requireStaff();
  const [banners, pages, faqs, articles, sp] = await Promise.all([
    db.banner.findMany({ orderBy: { sortOrder: "asc" } }),
    db.page.findMany({ orderBy: [{ isPolicy: "asc" }, { sortOrder: "asc" }] }),
    db.faq.findMany({ orderBy: [{ group: "asc" }, { sortOrder: "asc" }] }),
    db.article.findMany({ orderBy: { createdAt: "desc" } }),
    searchParams,
  ]);
  const BannerForm = ({ b }: { b?: (typeof banners)[number] }) => (
    <form action={saveBanner} className="grid gap-2 md:grid-cols-4">
      {b && <input type="hidden" name="id" value={b.id} />}
      <input name="title_en" defaultValue={b?.title_en} placeholder="Title EN" required className={inputCls} />
      <input name="title_hi" defaultValue={b?.title_hi} placeholder="Title HI" required className={inputCls} />
      <input name="subtitle_en" defaultValue={b?.subtitle_en} placeholder="Subtitle EN" className={inputCls} />
      <input name="subtitle_hi" defaultValue={b?.subtitle_hi} placeholder="Subtitle HI" className={inputCls} />
      <input name="ctaLabel_en" defaultValue={b?.ctaLabel_en} placeholder="Button EN" required className={inputCls} />
      <input name="ctaLabel_hi" defaultValue={b?.ctaLabel_hi} placeholder="Button HI" required className={inputCls} />
      <input name="ctaHref" defaultValue={b?.ctaHref} placeholder="/category/seeds" required className={inputCls} />
      <div className="flex gap-2">
        <select name="illustration" defaultValue={b?.illustration ?? "field"} className={inputCls}>{illustrationKeys.map((k) => <option key={k}>{k}</option>)}</select>
        <select name="theme" defaultValue={b?.theme ?? "green"} className={inputCls}><option>green</option><option>gold</option><option>soil</option></select>
      </div>
      <input name="sortOrder" type="number" defaultValue={b?.sortOrder ?? 0} className={inputCls} aria-label="Sort" />
      <label className="flex items-center gap-1 text-sm"><input type="checkbox" name="isActive" defaultChecked={b?.isActive ?? true} className="accent-primary" /> Active</label>
      <SubmitButton>{b ? "Save" : "Add banner"}</SubmitButton>
    </form>
  );
  const FaqForm = ({ f }: { f?: (typeof faqs)[number] }) => (
    <form action={saveFaq} className="grid gap-2 md:grid-cols-2">
      {f && <input type="hidden" name="id" value={f.id} />}
      <select name="group" defaultValue={f?.group ?? "ordering"} className={inputCls}>{["ordering", "delivery", "payment", "replacement", "product", "genuine"].map((g) => <option key={g}>{g}</option>)}</select>
      <input name="sortOrder" type="number" defaultValue={f?.sortOrder ?? 0} className={inputCls} aria-label="Sort" />
      <input name="question_en" defaultValue={f?.question_en} placeholder="Question EN" required className={inputCls} />
      <input name="question_hi" defaultValue={f?.question_hi} placeholder="Question HI" required className={inputCls} />
      <textarea name="answer_en" defaultValue={f?.answer_en} placeholder="Answer EN (HTML allowed)" required className={`${inputCls} h-24 py-2`} />
      <textarea name="answer_hi" defaultValue={f?.answer_hi} placeholder="Answer HI" required className={`${inputCls} h-24 py-2`} />
      <div className="flex flex-wrap items-center gap-3 md:col-span-2">
        <label className="flex items-center gap-1 text-sm"><input type="checkbox" name="hiReviewed" defaultChecked={f?.hiReviewed} className="accent-primary" /> Hindi reviewed</label>
        <label className="flex items-center gap-1 text-sm"><input type="checkbox" name="isActive" defaultChecked={f?.isActive ?? true} className="accent-primary" /> Active</label>
        <SubmitButton>{f ? "Save" : "Add FAQ"}</SubmitButton>
      </div>
    </form>
  );
  return (
    <>
      <PageHeader title="Content" description="Homepage banners, policy & about pages, FAQ and Kisan Gyan articles – all in English and Hindi." />
      {sp.msg && <p className="mb-4 rounded-xl bg-primary-light p-3 text-sm text-primary-dark">{sp.msg}</p>}
      {sp.err && <p className="mb-4 rounded-xl bg-[#fdecea] p-3 text-sm text-danger">{sp.err}</p>}
      <div className="space-y-6">
        <Panel title="Pages & policies">
          <Table head={["Page", "Type", "Hindi", "Legal review", "Updated"]}>
            {pages.map((p) => (
              <tr key={p.id}>
                <Td><Link href={`/admin/content/pages/${p.id}`} className="font-semibold text-primary-dark underline">{p.title_en}</Link></Td>
                <Td>{p.isPolicy ? "Policy" : "Page"}</Td>
                <Td>{p.hiReviewed ? <Pill tone="green">Reviewed</Pill> : <Pill tone="gold">Not reviewed</Pill>}</Td>
                <Td>{p.isPolicy ? (p.legalReviewed ? <Pill tone="green">Reviewed</Pill> : <Pill tone="gold">Lawyer/CA review pending</Pill>) : "—"}</Td>
                <Td>{p.updatedAt.toLocaleDateString("en-IN")}</Td>
              </tr>
            ))}
          </Table>
        </Panel>
        <Panel title="Kisan Gyan articles" actions={<Link href="/admin/content/articles/new" className={btnCls}>+ New article</Link>}>
          <Table head={["Article", "Status", "Hindi", "Published"]}>
            {articles.map((a) => (
              <tr key={a.id}>
                <Td><Link href={`/admin/content/articles/${a.id}`} className="font-semibold text-primary-dark underline">{a.title_en}</Link></Td>
                <Td>{a.isPublished ? <Pill tone="green">Published</Pill> : <Pill>Draft</Pill>}</Td>
                <Td>{a.hiReviewed ? <Pill tone="green">Reviewed</Pill> : <Pill tone="gold">Not reviewed</Pill>}</Td>
                <Td>{a.publishedAt?.toLocaleDateString("en-IN") ?? "—"}</Td>
              </tr>
            ))}
          </Table>
        </Panel>
        <Panel title="Homepage banners">
          <div className="space-y-4">
            {banners.map((b) => (
              <div key={b.id} className="rounded-2xl border border-line p-3"><BannerForm b={b} /></div>
            ))}
            <div className="rounded-2xl border border-dashed border-line p-3"><BannerForm /></div>
          </div>
        </Panel>
        <Panel title={`FAQ (${faqs.length})`}>
          <div className="space-y-3">
            {faqs.map((f) => (
              <details key={f.id} className="rounded-2xl border border-line p-3">
                <summary className="cursor-pointer text-sm font-semibold">[{f.group}] {f.question_en} {!f.hiReviewed && <Pill tone="gold">HI</Pill>}</summary>
                <div className="mt-3"><FaqForm f={f} /></div>
              </details>
            ))}
            <div className="rounded-2xl border border-dashed border-line p-3"><FaqForm /></div>
          </div>
        </Panel>
      </div>
    </>
  );
}
