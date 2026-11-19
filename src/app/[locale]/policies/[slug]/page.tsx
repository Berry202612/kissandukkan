import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { db } from "@/lib/db";
import { tr } from "@/lib/utils";
import { Breadcrumbs } from "@/components/store/Breadcrumbs";
import { RichPage } from "@/components/store/RichPage";

export const revalidate = 600;

type Props = { params: Promise<{ locale: string; slug: string }> };
const getPage = (slug: string) => db.page.findFirst({ where: { slug, isPolicy: true } });

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const p = await getPage(slug);
  if (!p) return {};
  return { title: tr(p, "title", locale), description: tr(p, "summary", locale).slice(0, 160), alternates: { canonical: `/${locale}/policies/${slug}`, languages: { en: `/en/policies/${slug}`, hi: `/hi/policies/${slug}` } } };
}

export default async function PolicyPage({ params }: Props) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const p = await getPage(slug);
  if (!p) notFound();
  const t = await getTranslations("policy");
  return (
    <>
      <Breadcrumbs items={[{ name: t("policies") }, { name: tr(p, "title", locale) }]} />
      <RichPage title={tr(p, "title", locale)} summary={tr(p, "summary", locale)} html={tr(p, "body", locale)} updatedAt={p.updatedAt} illustration="leaf" />
    </>
  );
}
