import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { getDelivery } from "@/lib/settings";
import { tr } from "@/lib/utils";
import { ReturnForm } from "@/components/store/ReturnForm";
import { Card, Notice } from "@/components/ui/form";

export default async function ReturnPage({ params }: { params: Promise<{ locale: string; orderNumber: string }> }) {
  const { locale, orderNumber } = await params;
  setRequestLocale(locale);
  const u = await requireUser();
  const order = await db.order.findFirst({ where: { orderNumber, userId: u.id }, include: { items: { select: { id: true, name_en: true, name_hi: true, packLabel: true, quantity: true } } } });
  if (!order) notFound();
  const [t, d] = await Promise.all([getTranslations("account"), getDelivery()]);
  const ok = order.status === "DELIVERED" && order.deliveredAt && Date.now() - order.deliveredAt.getTime() < d.replacementWindowHours * 3600 * 1000;
  return (
    <Card className="p-5">
      <h1 className="font-heading text-2xl font-bold">{t("returnTitle", { orderNumber })}</h1>
      {ok ? (
        <div className="mt-5">
          <ReturnForm orderNumber={orderNumber} items={order.items.map((i) => ({ id: i.id, label: `${tr(i, "name", locale)} (${i.packLabel}) × ${i.quantity}` }))} />
        </div>
      ) : (
        <Notice tone="warn" className="mt-4">
          {t("returnWindowOver", { hours: d.replacementWindowHours })}
        </Notice>
      )}
    </Card>
  );
}
