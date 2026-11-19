import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { db } from "@/lib/db";
import { tr } from "@/lib/utils";
import { Breadcrumbs } from "@/components/store/Breadcrumbs";
import { Illustration } from "@/components/brand/Illustration";

export const revalidate = 600;

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "gyan" });
  return { title: t("title"), description: t("subtitle"), alternates: { canonical: `/${locale}/kisan-gyan`, languages: { en: "/en/kisan-gyan", hi: "/hi/kisan-gyan" } } };
}

export default async function GyanPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("gyan");
  const articles = await db.article.findMany({ where: { isPublished: true, publishedAt: { lte: new Date() } }, orderBy: { publishedAt: "desc" } });
  const fmt = new Intl.DateTimeFormat(locale === "hi" ? "hi-IN" : "en-IN", { dateStyle: "medium", timeZone: "Asia/Kolkata" });
  return (
    <>
      <Breadcrumbs items={[{ name: t("title") }]} />
      <div className="container mt-4">
        <div className="relative overflow-hidden rounded-3xl bg-soil px-6 py-10 text-white md:px-10">
          <Illustration name="wheat" className="absolute -bottom-6 right-6 h-40 w-40 text-white/20" />
          <h1 className="font-heading text-4xl font-bold text-white">{t("title")}</h1>
          <p className="mt-2 max-w-xl text-white/90">{t("subtitle")}</p>
        </div>
        {articles.length ? (
          <div className="mt-8 grid gap-5 md:grid-cols-2">
            {articles.map((a) => (
              <Link key={a.id} href={`/kisan-gyan/${a.slug}`} className="card group flex gap-5 p-6 hover:shadow-lift">
                <span className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-primary-light">
                  <Illustration name={a.illustration} className="h-12 w-12" />
                </span>
                <span>
                  <span className="block font-heading text-xl font-bold leading-snug text-primary-dark group-hover:underline">{tr(a, "title", locale)}</span>
                  <span className="mt-2 line-clamp-3 block text-sm text-muted">{tr(a, "excerpt", locale)}</span>
                  {a.publishedAt && <span className="mt-2 block text-xs text-muted">{t("published", { date: fmt.format(a.publishedAt) })}</span>}
                </span>
              </Link>
            ))}
          </div>
        ) : (
          <p className="mt-8 text-muted">{t("empty")}</p>
        )}
      </div>
    </>
  );
}
