import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { db } from "@/lib/db";
import { tr } from "@/lib/utils";
import { Breadcrumbs } from "@/components/store/Breadcrumbs";
import { Listing, type SP } from "@/components/store/Listing";

type Props = { params: Promise<{ locale: string; slug: string }>; searchParams: Promise<SP> };
const getCrop = (slug: string) => db.crop.findFirst({ where: { slug, isActive: true } });

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const c = await getCrop(slug);
  if (!c) return {};
  return { title: tr(c, "name", locale), alternates: { canonical: `/${locale}/crop/${slug}`, languages: { en: `/en/crop/${slug}`, hi: `/hi/crop/${slug}` } } };
}

export default async function CropPage({ params, searchParams }: Props) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const c = await getCrop(slug);
  if (!c) notFound();
  const t = await getTranslations("nav");
  const name = tr(c, "name", locale);
  return (
    <>
      <Breadcrumbs items={[{ name: t("shopByCrop"), href: "/crops" }, { name }]} />
      <Listing basePath={`/crop/${slug}`} sp={await searchParams} fixed={{ crop: [slug] }} title={name} seoText={tr(c, "seoText", locale)} hide={["crop"]} />
    </>
  );
}
