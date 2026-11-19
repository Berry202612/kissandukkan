import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Info } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { db } from "@/lib/db";
import { siteUrl, tr } from "@/lib/utils";
import { sanitizeHtml } from "@/lib/content";
import { Breadcrumbs } from "@/components/store/Breadcrumbs";
import { Illustration } from "@/components/brand/Illustration";
import { JsonLd } from "@/components/store/JsonLd";

export const revalidate = 600;

type Props = { params: Promise<{ locale: string; slug: string }> };
const getArticle = (slug: string) => db.article.findFirst({ where: { slug, isPublished: true, publishedAt: { lte: new Date() } } });

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const a = await getArticle(slug);
  if (!a) return {};
  return {
    title: tr(a, "title", locale),
    description: tr(a, "excerpt", locale).slice(0, 160),
    alternates: { canonical: `/${locale}/kisan-gyan/${slug}`, languages: { en: `/en/kisan-gyan/${slug}`, hi: `/hi/kisan-gyan/${slug}` } },
    openGraph: { type: "article", publishedTime: a.publishedAt?.toISOString() },
  };
}

export default async function ArticlePage({ params }: Props) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const a = await getArticle(slug);
  if (!a) notFound();
  const t = await getTranslations("gyan");
  const cats = await db.category.findMany({ where: { slug: { in: a.categorySlugs }, isActive: true } });
  const fmt = new Intl.DateTimeFormat(locale === "hi" ? "hi-IN" : "en-IN", { dateStyle: "long", timeZone: "Asia/Kolkata" });
  const title = tr(a, "title", locale);
  const ld = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: title,
    datePublished: a.publishedAt?.toISOString(),
    dateModified: a.updatedAt.toISOString(),
    author: { "@type": "Organization", name: a.author },
    publisher: { "@type": "Organization", name: "KissanDukkan", logo: { "@type": "ImageObject", url: siteUrl("/logo.svg") } },
    inLanguage: locale === "hi" ? "hi-IN" : "en-IN",
    mainEntityOfPage: siteUrl(`/${locale}/kisan-gyan/${slug}`),
  };
  return (
    <>
      <Breadcrumbs items={[{ name: t("title"), href: "/kisan-gyan" }, { name: title }]} />
      <article className="container mt-4 max-w-3xl">
        <div className="flex items-start gap-4">
          <span className="hidden h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-primary-light sm:flex">
            <Illustration name={a.illustration} className="h-12 w-12" />
          </span>
          <div>
            <h1 className="font-heading text-3xl font-bold leading-tight md:text-4xl">{title}</h1>
            <p className="mt-2 text-sm text-muted">
              {t("by", { author: locale === "hi" ? "किसान दुकान एग्री टीम" : a.author })}
              {a.publishedAt ? ` · ${t("published", { date: fmt.format(a.publishedAt) })}` : ""}
            </p>
          </div>
        </div>
        <p className="mt-6 flex gap-2 rounded-xl border border-accent/50 bg-accent-light p-4 text-sm text-[#6b4f00]">
          <Info className="h-5 w-5 shrink-0" /> {t("note")}
        </p>
        <div className="prose prose-lg mt-6 max-w-none" dangerouslySetInnerHTML={{ __html: sanitizeHtml(tr(a, "body", locale)) }} />
        {cats.length > 0 && (
          <div className="card mt-10 p-5">
            <p className="font-heading text-lg font-bold">{t("related")}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {cats.map((c) => (
                <Link key={c.id} href={`/category/${c.slug}`} className="inline-flex min-h-[44px] items-center rounded-xl bg-primary px-4 font-semibold text-white hover:bg-primary-dark">
                  {tr(c, "name", locale)} →
                </Link>
              ))}
            </div>
          </div>
        )}
      </article>
      <JsonLd data={ld} />
    </>
  );
}
