import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { db } from "@/lib/db";
import { tr } from "@/lib/utils";
import { Breadcrumbs } from "@/components/store/Breadcrumbs";
import { RichPage } from "@/components/store/RichPage";

export const revalidate = 600;

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "about" });
  return { title: t("title"), alternates: { canonical: `/${locale}/about`, languages: { en: "/en/about", hi: "/hi/about" } } };
}

export default async function AboutPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const p = await db.page.findUnique({ where: { slug: "about-us" } });
  if (!p) notFound();
  return (
    <>
      <Breadcrumbs items={[{ name: tr(p, "title", locale) }]} />
      <RichPage title={tr(p, "title", locale)} summary={tr(p, "summary", locale)} html={tr(p, "body", locale)} illustration="wheel" showToc={false} />
    </>
  );
}
