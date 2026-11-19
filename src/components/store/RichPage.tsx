import { getLocale, getTranslations } from "next-intl/server";
import { renderTokens, sanitizeHtml, withToc } from "@/lib/content";
import { Illustration } from "@/components/brand/Illustration";

export async function RichPage({ title, summary, html, updatedAt, illustration = "sprout", showToc = true }: { title: string; summary?: string; html: string; updatedAt?: Date; illustration?: string; showToc?: boolean }) {
  const locale = (await getLocale()) as "en" | "hi";
  const t = await getTranslations("policy");
  const rendered = sanitizeHtml(await renderTokens(html, locale));
  const summaryText = summary ? (await renderTokens(summary, locale)).replace(/<[^>]+>/g, "").replace(/&amp;/g, "&") : "";
  const { body, toc } = withToc(rendered);
  const fmt = new Intl.DateTimeFormat(locale === "hi" ? "hi-IN" : "en-IN", { dateStyle: "long", timeZone: "Asia/Kolkata" });
  return (
    <div className="container mt-4">
      <div className="relative overflow-hidden rounded-3xl bg-primary-light px-6 py-8 md:px-10">
        <Illustration name={illustration} className="pointer-events-none absolute -bottom-4 right-4 h-32 w-32 text-primary/15" />
        <h1 className="font-heading text-3xl font-bold md:text-4xl">{title}</h1>
        {updatedAt && <p className="mt-2 text-sm text-muted">{t("lastUpdated", { date: fmt.format(updatedAt) })}</p>}
      </div>
      <div className={showToc && toc.length > 2 ? "mt-6 grid gap-8 lg:grid-cols-[260px_1fr]" : "mt-6"}>
        {showToc && toc.length > 2 && (
          <nav className="card h-fit p-5 lg:sticky lg:top-40" aria-label={t("contents")}>
            <p className="font-heading text-base font-bold text-primary-dark">{t("contents")}</p>
            <ol className="mt-2 space-y-1.5 text-sm">
              {toc.map((i) => (
                <li key={i.id}>
                  <a href={`#${i.id}`} className="hover:text-primary hover:underline">
                    {i.text}
                  </a>
                </li>
              ))}
            </ol>
          </nav>
        )}
        <div className="min-w-0">
          {summaryText && (
            <div className="mb-6 rounded-2xl border-l-4 border-accent bg-white p-5 shadow-soft">
              <p className="font-heading text-lg font-bold text-primary-dark">{t("summary")}</p>
              <p className="mt-1 leading-relaxed">{summaryText}</p>
            </div>
          )}
          <article className="prose prose-lg max-w-3xl prose-headings:scroll-mt-40 prose-a:font-semibold" dangerouslySetInnerHTML={{ __html: body }} />
        </div>
      </div>
    </div>
  );
}
