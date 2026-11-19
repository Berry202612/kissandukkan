import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { db } from "@/lib/db";
import { currentUser } from "@/lib/session";
import { getPricing } from "@/lib/settings";
import { razorpayConfigured } from "@/lib/razorpay";
import { CheckoutClient } from "@/components/store/CheckoutClient";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "checkout" });
  return { title: t("title"), robots: { index: false } };
}

export default async function CheckoutPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ retry?: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { retry } = await searchParams;
  const user = await currentUser();
  if (!user) redirect({ href: `/login?next=${encodeURIComponent(`/${locale}/checkout`)}`, locale });
  const [addresses, pricing] = await Promise.all([
    db.address.findMany({ where: { userId: user!.id }, orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }] }),
    getPricing(),
  ]);
  return (
    <CheckoutClient
      addresses={addresses.map((a) => ({ id: a.id, name: a.name, phone: a.phone, line1: a.line1, line2: a.line2, city: a.city, state: a.state, pincode: a.pincode, isDefault: a.isDefault }))}
      codEnabled={pricing.codEnabled}
      onlineEnabled={razorpayConfigured()}
      retryOrderNumber={retry ?? null}
      user={{ name: user!.name ?? "", email: user!.email ?? "" }}
    />
  );
}
