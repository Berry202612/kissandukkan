import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Badge } from "@/components/ui/form";
import { formatINR } from "@/lib/utils";

type O = { orderNumber: string; createdAt: Date; status: string; total: unknown; _count: { items: number } };

export async function OrderList({ orders }: { orders: O[] }) {
  const t = await getTranslations();
  const locale = await getLocale();
  const fmt = new Intl.DateTimeFormat(locale === "hi" ? "hi-IN" : "en-IN", { dateStyle: "medium", timeZone: "Asia/Kolkata" });
  const tone = (s: string) => (s === "DELIVERED" ? "green" : s === "CANCELLED" || s === "REFUNDED" ? "red" : s === "PAYMENT_PENDING" ? "gold" : "soil");
  return (
    <ul className="divide-y divide-line">
      {orders.map((o) => (
        <li key={o.orderNumber}>
          <Link href={`/account/orders/${o.orderNumber}`} className="flex flex-wrap items-center justify-between gap-2 py-3 hover:bg-cream">
            <span>
              <span className="block font-semibold">{o.orderNumber}</span>
              <span className="text-sm text-muted">
                {t("account.placedOn", { date: fmt.format(o.createdAt) })} · {t("account.items", { count: o._count.items })}
              </span>
            </span>
            <span className="flex items-center gap-3">
              <Badge tone={tone(o.status)}>{t(`orderStatus.${o.status}` as "orderStatus.PLACED")}</Badge>
              <span className="font-bold">{formatINR(o.total)}</span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
