import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { reviewableProducts } from "@/lib/reviews";
import { tr } from "@/lib/utils";
import { OrderList } from "@/components/store/OrderList";
import { Card } from "@/components/ui/form";

export default async function AccountOverview({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const u = await requireUser();
  const t = await getTranslations("account");
  const [orders, toReview, addressCount, wishCount] = await Promise.all([
    db.order.findMany({ where: { userId: u.id }, orderBy: { createdAt: "desc" }, take: 5, select: { orderNumber: true, createdAt: true, status: true, total: true, _count: { select: { items: true } } } }),
    reviewableProducts(u.id),
    db.address.count({ where: { userId: u.id } }),
    db.wishlistItem.count({ where: { userId: u.id } }),
  ]);
  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-3">
        <Link href="/account/orders" className="card p-4 hover:shadow-lift">
          <p className="text-sm text-muted">{t("orders")}</p>
          <p className="font-heading text-2xl font-bold">{orders.length}</p>
        </Link>
        <Link href="/account/wishlist" className="card p-4 hover:shadow-lift">
          <p className="text-sm text-muted">{t("wishlist")}</p>
          <p className="font-heading text-2xl font-bold">{wishCount}</p>
        </Link>
        <Link href="/account/addresses" className="card p-4 hover:shadow-lift">
          <p className="text-sm text-muted">{t("addresses")}</p>
          <p className="font-heading text-2xl font-bold">{addressCount}</p>
        </Link>
      </div>
      <Card className="p-5">
        <h2 className="font-heading text-xl font-bold">{t("recentOrders")}</h2>
        {orders.length ? <OrderList orders={orders} /> : <p className="mt-2 text-muted">{t("noOrders")}</p>}
      </Card>
      {toReview.length > 0 && (
        <Card className="p-5">
          <h2 className="font-heading text-xl font-bold">{t("toReview")}</h2>
          <ul className="mt-3 space-y-2">
            {toReview.slice(0, 5).map((p) => (
              <li key={p.productId} className="flex items-center justify-between gap-3">
                <span className="text-sm font-medium">{tr(p, "name", locale)}</span>
                <Link href={`/account/reviews/new?product=${p.productSlug}`} className="link shrink-0 text-sm">
                  {t("writeReview")}
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
