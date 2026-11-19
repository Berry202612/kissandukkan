import { illustrationKeys } from "@/components/brand/Illustration";
import { L, Panel, inputCls } from "./ui";
import { SubmitButton } from "./SubmitButton";
import { saveArticle } from "@/app/admin/actions/settings";

type A = { id: string; slug: string; title_en: string; title_hi: string; excerpt_en: string; excerpt_hi: string; body_en: string; body_hi: string; illustration: string; categorySlugs: string[]; hiReviewed: boolean; isPublished: boolean; publishedAt: Date | null };

export function ArticleForm({ a }: { a?: A }) {
  return (
    <form action={saveArticle} className="space-y-4">
      {a && <input type="hidden" name="id" value={a.id} />}
      <Panel>
        <div className="grid gap-3 md:grid-cols-3">
          <L label="Slug"><input name="slug" defaultValue={a?.slug} required className={`${inputCls} w-full`} /></L>
          <L label="Illustration"><select name="illustration" defaultValue={a?.illustration ?? "sprout"} className={`${inputCls} w-full`}>{illustrationKeys.map((k) => <option key={k}>{k}</option>)}</select></L>
          <L label="Related category slugs (comma separated)"><input name="categorySlugs" defaultValue={a?.categorySlugs.join(", ")} className={`${inputCls} w-full`} /></L>
        </div>
      </Panel>
      <div className="grid gap-4 lg:grid-cols-2">
        {(["en", "hi"] as const).map((l) => (
          <Panel key={l} title={l === "en" ? "English" : "Hindi"}>
            <div className="space-y-3" lang={l}>
              <L label="Title"><input name={`title_${l}`} defaultValue={a?.[`title_${l}`]} required className={`${inputCls} w-full`} /></L>
              <L label="Excerpt"><textarea name={`excerpt_${l}`} defaultValue={a?.[`excerpt_${l}`]} required className={`${inputCls} h-20 w-full py-2`} /></L>
              <L label="Body (HTML)"><textarea name={`body_${l}`} defaultValue={a?.[`body_${l}`]} required className={`${inputCls} h-[420px] w-full py-2 font-mono text-xs`} /></L>
            </div>
          </Panel>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" name="hiReviewed" defaultChecked={a?.hiReviewed} className="h-5 w-5 accent-primary" /> Hindi reviewed</label>
        <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" name="isPublished" defaultChecked={a?.isPublished} className="h-5 w-5 accent-primary" /> Published {a?.publishedAt ? `(since ${a.publishedAt.toLocaleDateString("en-IN")})` : "(publish date is set to today when first published)"}</label>
        <SubmitButton>Save article</SubmitButton>
      </div>
    </form>
  );
}
