import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Breadcrumbs } from "@/components/store/Breadcrumbs";
import { ContactForm } from "@/components/store/ContactForm";
import { Illustration } from "@/components/brand/Illustration";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "bulk" });
  return { title: t("title"), alternates: { canonical: `/${locale}/bulk-enquiry`, languages: { en: "/en/bulk-enquiry", hi: "/hi/bulk-enquiry" } } };
}

export default async function BulkPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("bulk");
  return (
    <>
      <Breadcrumbs items={[{ name: t("title") }]} />
      <div className="container mt-4 grid gap-6 lg:grid-cols-[1fr_1.4fr]">
        <div className="relative overflow-hidden rounded-3xl bg-soil p-8 text-white">
          <Illustration name="sack" className="absolute -bottom-4 -right-4 h-40 w-40 text-white/20" />
          <h1 className="font-heading text-3xl font-bold text-white">{t("title")}</h1>
          <p className="mt-3 max-w-md text-white/90">{t("intro")}</p>
        </div>
        <div className="card p-6">
          <ContactForm kind="BULK" />
        </div>
      </div>
    </>
  );
}
