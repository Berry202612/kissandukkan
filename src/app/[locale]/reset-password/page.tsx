import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { AuthShell } from "@/components/store/AuthShell";
import { ResetForm } from "@/components/store/AuthForms";
import { Notice } from "@/components/ui/form";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "auth" });
  return { title: t("resetTitle"), robots: { index: false } };
}

export default async function ResetPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ token?: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { token } = await searchParams;
  const t = await getTranslations("auth");
  return (
    <AuthShell title={t("resetTitle")}>
      {token ? (
        <ResetForm token={token} />
      ) : (
        <Notice tone="error">
          {t("resetInvalid")}{" "}
          <Link href="/forgot-password" className="font-semibold underline">
            {t("forgot")}
          </Link>
        </Notice>
      )}
    </AuthShell>
  );
}
