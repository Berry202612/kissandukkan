import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ChevronDown } from "lucide-react";
import { db } from "@/lib/db";
import { tr } from "@/lib/utils";
import { Breadcrumbs } from "@/components/store/Breadcrumbs";
import { JsonLd } from "@/components/store/JsonLd";
import { renderTokens, sanitizeHtml } from "@/lib/content";

export const revalidate = 600;

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "faq" });
  return { title: t("title"), alternates: { canonical: `/${locale}/faq`, languages: { en: "/en/faq", hi: "/hi/faq" } } };
}

const GROUPS = ["ordering", "delivery", "payment", "replacement", "product", "genuine"] as const;

export default async function FaqPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("faq");
  const faqs = await db.faq.findMany({ where: { isActive: true }, orderBy: [{ group: "asc" }, { sortOrder: "asc" }] });
  const rendered = await Promise.all(faqs.map(async (f) => ({ ...f, q: tr(f, "question", locale), a: sanitizeHtml(await renderTokens(tr(f, "answer", locale), locale as "en" | "hi")) })));
  const ld = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: rendered.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a.replace(/<[^>]+>/g, "") } })),
  };
  return (
    <>
      <Breadcrumbs items={[{ name: t("title") }]} />
      <div className="container mt-4 max-w-4xl">
        <h1 className="font-heading text-3xl font-bold">{t("title")}</h1>
        <nav className="mt-4 flex flex-wrap gap-2">
          {GROUPS.filter((g) => rendered.some((f) => f.group === g)).map((g) => (
            <a key={g} href={`#${g}`} className="chip min-h-[36px] hover:bg-accent-light">
              {t(`groups.${g}`)}
            </a>
          ))}
        </nav>
        {GROUPS.map((g) => {
          const items = rendered.filter((f) => f.group === g);
          if (!items.length) return null;
          return (
            <section key={g} id={g} className="mt-8 scroll-mt-40">
              <h2 className="section-title">{t(`groups.${g}`)}</h2>
              <div className="mt-3 space-y-2">
                {items.map((f) => (
                  <details key={f.id} className="card group p-0">
                    <summary className="flex min-h-[56px] cursor-pointer list-none items-center justify-between gap-3 px-5 py-3 font-semibold">
                      {f.q}
                      <ChevronDown className="h-5 w-5 shrink-0 text-primary transition group-open:rotate-180" />
                    </summary>
                    <div className="prose max-w-none px-5 pb-4" dangerouslySetInnerHTML={{ __html: f.a }} />
                  </details>
                ))}
              </div>
            </section>
          );
        })}
      </div>
      {rendered.length > 0 && <JsonLd data={ld} />}
    </>
  );
}
