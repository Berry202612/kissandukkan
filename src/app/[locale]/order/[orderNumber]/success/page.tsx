import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { db } from "@/lib/db";
import { currentUser } from "@/lib/session";
import { redirect } from "@/i18n/navigation";
import { OrderSuccessClient } from "@/components/store/OrderSuccessClient";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { robots: { index: false } };

export default async function SuccessPage({ params }: { params: Promise<{ locale: string; orderNumber: string }> }) {
  const { locale, orderNumber } = await params;
  setRequestLocale(locale);
  const u = await currentUser();
  if (!u) redirect({ href: "/login", locale });
  const order = await db.order.findFirst({ where: { orderNumber, userId: u!.id }, select: { orderNumber: true, status: true } });
  if (!order) notFound();
  const t = await getTranslations("checkout");
  return (
    <OrderSuccessClient
      orderNumber={order.orderNumber}
      initialConfirmed={!["PAYMENT_PENDING", "CANCELLED"].includes(order.status)}
      labels={{ title: t("successTitle"), text: t("successText", { orderNumber: order.orderNumber }), pending: t("successPending"), view: t("viewOrder"), cont: t("continue") }}
    />
  );
}
