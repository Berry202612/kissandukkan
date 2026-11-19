import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { db } from "@/lib/db";
import { Breadcrumbs } from "@/components/store/Breadcrumbs";
import { Listing, type SP } from "@/components/store/Listing";

type Props = { params: Promise<{ locale: string; slug: string }>; searchParams: Promise<SP> };
const getBrand = (slug: string) => db.brand.findFirst({ where: { slug, isActive: true } });

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const b = await getBrand(slug);
  if (!b) return {};
  return { title: b.name, alternates: { canonical: `/${locale}/brand/${slug}`, languages: { en: `/en/brand/${slug}`, hi: `/hi/brand/${slug}` } } };
}

export default async function BrandPage({ params, searchParams }: Props) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const b = await getBrand(slug);
  if (!b) notFound();
  const t = await getTranslations("nav");
  return (
    <>
      <Breadcrumbs items={[{ name: t("shopByBrand"), href: "/brands" }, { name: b.name }]} />
      <Listing basePath={`/brand/${slug}`} sp={await searchParams} fixed={{ brand: [slug] }} title={b.name} hide={["brand"]} />
    </>
  );
}
