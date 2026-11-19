import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { db } from "@/lib/db";
import { tr } from "@/lib/utils";
import { Breadcrumbs } from "@/components/store/Breadcrumbs";
import { Listing, type SP } from "@/components/store/Listing";

const CREATIVES = new Set(["seeds", "crop-nutrition", "crop-protection", "plant-growth-regulators", "organic-farming", "irrigation", "farm-tools-equipment", "gardening-nursery", "animal-husbandry", "protection-gear-farm-supplies"]);

type Props = { params: Promise<{ locale: string; slug: string }>; searchParams: Promise<SP> };

const getCategory = (slug: string) => db.category.findFirst({ where: { slug, isActive: true } });

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const c = await getCategory(slug);
  if (!c) return {};
  return {
    title: tr(c, "name", locale),
    description: tr(c, "description", locale) || undefined,
    alternates: { canonical: `/${locale}/category/${slug}`, languages: { en: `/en/category/${slug}`, hi: `/hi/category/${slug}` } },
  };
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const c = await getCategory(slug);
  if (!c) notFound();
  const name = tr(c, "name", locale);
  return (
    <>
      <Breadcrumbs items={[{ name }]} />
      <Listing basePath={`/category/${slug}`} sp={await searchParams} fixed={{ category: slug }} title={name} intro={tr(c, "description", locale)} seoText={tr(c, "seoText", locale)} banner={CREATIVES.has(slug) ? `/creatives/category-${slug}.svg` : undefined} />
    </>
  );
}
