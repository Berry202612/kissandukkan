import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { db } from "@/lib/db";
import { tr } from "@/lib/utils";
import { Illustration } from "@/components/brand/Illustration";
import { Breadcrumbs } from "@/components/store/Breadcrumbs";

export const revalidate = 300;

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "listing" });
  return { title: t("cropsTitle"), alternates: { canonical: `/${locale}/crops`, languages: { en: "/en/crops", hi: "/hi/crops" } } };
}

export default async function CropsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("listing");
  const crops = await db.crop.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } });
  return (
    <>
      <Breadcrumbs items={[{ name: t("cropsTitle") }]} />
      <div className="container mt-4">
        <h1 className="font-heading text-3xl font-bold">{t("cropsTitle")}</h1>
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {crops.map((c) => (
            <Link key={c.id} href={`/crop/${c.slug}`} className="card flex flex-col items-center gap-2 p-5 text-center hover:shadow-lift">
              <Illustration name={c.slug} className="h-12 w-12 text-soil" />
              <span className="font-semibold">{tr(c, "name", locale)}</span>
            </Link>
          ))}
        </div>
      </div>
    </>
  );
}
