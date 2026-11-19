import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Breadcrumbs } from "@/components/store/Breadcrumbs";
import { Listing, type SP } from "@/components/store/Listing";

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<SP> };

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "common" });
  return { title: t("search"), robots: { index: false, follow: true } };
}

export default async function SearchPage({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const sp = await searchParams;
  const t = await getTranslations("listing");
  const q = (Array.isArray(sp.q) ? sp.q[0] : sp.q)?.slice(0, 80) ?? "";
  const category = Array.isArray(sp.category) ? sp.category[0] : sp.category;
  const title = q ? t("searchTitle", { q }) : t("searchEmptyTitle");
  return (
    <>
      <Breadcrumbs items={[{ name: title }]} />
      <Listing basePath="/search" sp={sp} fixed={category ? { category } : {}} title={title} />
    </>
  );
}
