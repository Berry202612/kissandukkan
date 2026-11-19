import { getTranslations, setRequestLocale } from "next-intl/server";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { expirePendingOrders } from "@/lib/orders";
import { OrderList } from "@/components/store/OrderList";
import { Card } from "@/components/ui/form";

export default async function OrdersPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const u = await requireUser();
  await expirePendingOrders();
  const t = await getTranslations("account");
  const orders = await db.order.findMany({ where: { userId: u.id }, orderBy: { createdAt: "desc" }, take: 100, select: { orderNumber: true, createdAt: true, status: true, total: true, _count: { select: { items: true } } } });
  return (
    <Card className="p-5">
      <h1 className="font-heading text-2xl font-bold">{t("orders")}</h1>
      {orders.length ? <OrderList orders={orders} /> : <p className="mt-2 text-muted">{t("noOrders")}</p>}
    </Card>
  );
}
