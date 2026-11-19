import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getNavCategories } from "@/lib/catalog";
import { tr } from "@/lib/utils";
import { Illustration } from "@/components/brand/Illustration";
import { Breadcrumbs } from "@/components/store/Breadcrumbs";

export const revalidate = 300;

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "listing" });
  return { title: t("categoriesTitle"), alternates: { canonical: `/${locale}/categories`, languages: { en: "/en/categories", hi: "/hi/categories" } } };
}

export default async function CategoriesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("listing");
  const cats = await getNavCategories();
  return (
    <>
      <Breadcrumbs items={[{ name: t("categoriesTitle") }]} />
      <div className="container mt-4">
        <h1 className="font-heading text-3xl font-bold">{t("categoriesTitle")}</h1>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {cats.map((c) => (
            <div key={c.slug} className="card p-5">
              <Link href={`/category/${c.slug}`} className="flex items-center gap-3">
                <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-light">
                  <Illustration name={c.illustration} className="h-9 w-9" strokeWidth={3.5} />
                </span>
                <span className="font-heading text-lg font-bold text-primary-dark hover:underline">{tr(c, "name", locale)}</span>
              </Link>
              {c.subCategories.length > 0 && (
                <ul className="mt-3 flex flex-wrap gap-2">
                  {c.subCategories.map((s) => (
                    <li key={s.slug}>
                      <Link href={`/category/${c.slug}?sub=${s.slug}`} className="inline-flex min-h-[36px] items-center rounded-lg bg-cream px-3 text-sm hover:bg-primary-light">
                        {tr(s, "name", locale)}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
