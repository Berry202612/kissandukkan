import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { db } from "@/lib/db";
import { Breadcrumbs } from "@/components/store/Breadcrumbs";
import { Illustration } from "@/components/brand/Illustration";

export const revalidate = 300;

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "listing" });
  return { title: t("brandsTitle"), alternates: { canonical: `/${locale}/brands`, languages: { en: "/en/brands", hi: "/hi/brands" } } };
}

export default async function BrandsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("listing");
  const th = await getTranslations("home");
  const brands = await db.brand.findMany({ where: { isActive: true, products: { some: { status: "PUBLISHED" } } }, orderBy: { name: "asc" } });
  return (
    <>
      <Breadcrumbs items={[{ name: t("brandsTitle") }]} />
      <div className="container mt-4">
        <h1 className="font-heading text-3xl font-bold">{t("brandsTitle")}</h1>
        {brands.length ? (
          <div className="mt-6 flex flex-wrap gap-2">
            {brands.map((b) => (
              <Link key={b.id} href={`/brand/${b.slug}`} className="inline-flex min-h-[48px] items-center rounded-xl border border-line bg-white px-5 font-bold text-primary-dark hover:border-primary hover:bg-primary-light">
                {b.name}
              </Link>
            ))}
          </div>
        ) : (
          <div className="card mt-6 flex flex-col items-center p-10 text-center">
            <Illustration name="seed-packet" className="h-20 w-20" />
            <p className="mt-3 text-muted">{th("noProducts")}</p>
          </div>
        )}
      </div>
    </>
  );
}
