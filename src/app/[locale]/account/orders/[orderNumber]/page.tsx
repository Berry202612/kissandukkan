import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Download } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { customerOrderInclude, expirePendingOrders } from "@/lib/orders";
import { getDelivery, getPricing } from "@/lib/settings";
import { formatINR, toNum, tr } from "@/lib/utils";
import { OrderTimeline } from "@/components/store/OrderTimeline";
import { OrderActions } from "@/components/store/OrderActions";
import { Badge, Card } from "@/components/ui/form";

export default async function OrderDetail({ params }: { params: Promise<{ locale: string; orderNumber: string }> }) {
  const { locale, orderNumber } = await params;
  setRequestLocale(locale);
  const u = await requireUser();
  await expirePendingOrders();
  const order = await db.order.findFirst({ where: { orderNumber, userId: u.id }, include: customerOrderInclude });
  if (!order) notFound();
  const [t, to, tc, delivery, pricing] = await Promise.all([getTranslations("account"), getTranslations("orderStatus"), getTranslations("cart"), getDelivery(), getPricing()]);
  const addr = order.shippingAddress as Record<string, string | null>;
  const fmt = new Intl.DateTimeFormat(locale === "hi" ? "hi-IN" : "en-IN", { dateStyle: "medium", timeZone: "Asia/Kolkata" });
  const cancellable = ["PAYMENT_PENDING", "PLACED", "CONFIRMED", "PACKED", "ORDERED_FROM_SUPPLIER"].includes(order.status) && order.shipments.every((s) => !s.awb);
  const withinWindow = order.status === "DELIVERED" && order.deliveredAt && Date.now() - order.deliveredAt.getTime() < delivery.replacementWindowHours * 3600 * 1000;
  const gst = (order.taxBreakup as { tax: number }[]).reduce((s, r) => s + r.tax, 0);

  return (
    <div className="space-y-5">
      <Card className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm text-muted">{t("order")}</p>
            <h1 className="font-heading text-2xl font-bold">{order.orderNumber}</h1>
            <p className="text-sm text-muted">{t("placedOn", { date: fmt.format(order.createdAt) })}</p>
          </div>
          <Badge tone={order.status === "DELIVERED" ? "green" : order.status === "CANCELLED" ? "red" : "gold"} className="text-sm">
            {to(order.status)}
          </Badge>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {order.invoiceNumber && (
            <a href={`/api/invoice/${order.orderNumber}`} className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border-2 border-primary px-4 text-sm font-semibold text-primary hover:bg-primary-light">
              <Download className="h-4 w-4" /> {t("invoice")}
            </a>
          )}
          <OrderActions
            orderNumber={order.orderNumber}
            cancellable={cancellable}
            pending={order.status === "PAYMENT_PENDING"}
            reorderItems={order.items.map((i) => ({ variantId: i.variantId, qty: i.quantity }))}
          />
          {withinWindow && (
            <Link href={`/account/orders/${order.orderNumber}/return`} className="inline-flex min-h-[44px] items-center rounded-xl bg-accent px-4 text-sm font-semibold text-ink hover:bg-accent-dark">
              {t("requestReplacement")}
            </Link>
          )}
        </div>
        {order.returns.length > 0 && (
          <ul className="mt-4 space-y-1 text-sm">
            {order.returns.map((r) => (
              <li key={r.id} className="rounded-xl bg-cream p-3">
                {r.type === "REPLACEMENT" ? t("replacement") : t("return")} · {t(`reasons.${r.reason}` as "reasons.damaged")} · <strong>{t(`returnStatus.${r.status}`)}</strong>
                {r.adminNote && <span className="block text-muted">{r.adminNote}</span>}
              </li>
            ))}
          </ul>
        )}
      </Card>

      <div className="grid gap-5 xl:grid-cols-[1fr_340px]">
        <Card className="p-5">
          <ul className="divide-y divide-line">
            {order.items.map((i) => (
              <li key={i.id} className="flex justify-between gap-3 py-3 text-sm">
                <span>
                  <Link href={`/product/${i.productSlug}`} className="font-semibold hover:text-primary">
                    {tr(i, "name", locale)}
                  </Link>
                  <span className="block text-muted">
                    {i.packLabel} × {i.quantity}
                  </span>
                </span>
                <span className="font-semibold">{formatINR(i.lineTotal)}</span>
              </li>
            ))}
          </ul>
          <div className="mt-6">
            <OrderTimeline events={order.events} shipments={order.shipments} items={order.items.map((i) => ({ ...i }))} placedAt={order.createdAt} />
          </div>
        </Card>
        <div className="space-y-5">
          <Card className="p-5 text-sm">
            <dl className="space-y-2">
              <div className="flex justify-between"><dt>{tc("subtotal")}</dt><dd>{formatINR(order.subtotal)}</dd></div>
              {toNum(order.discount) > 0 && <div className="flex justify-between text-success"><dt>{tc("discount")}</dt><dd>−{formatINR(order.discount)}</dd></div>}
              <div className="flex justify-between"><dt>{tc("shipping")}</dt><dd>{toNum(order.shippingFee) === 0 ? tc("free") : formatINR(order.shippingFee)}</dd></div>
              <div className="flex justify-between"><dt>{tc("handlingFee", { pct: pricing.handlingFeePercent })}</dt><dd>{formatINR(order.handlingFee)}</dd></div>
              {toNum(order.codFee) > 0 && <div className="flex justify-between"><dt>{tc("codFee")}</dt><dd>{formatINR(order.codFee)}</dd></div>}
              <div className="flex justify-between border-t border-line pt-2 text-base font-bold"><dt>{tc("total")}</dt><dd>{formatINR(order.total)}</dd></div>
              <p className="text-xs text-muted">{tc("gstIncluded", { amount: formatINR(gst, { decimals: true }) })}</p>
              {toNum(order.refundedAmount) > 0 && <p className="font-semibold text-success">{to("REFUNDED")}: {formatINR(order.refundedAmount, { decimals: true })}</p>}
            </dl>
          </Card>
          <Card className="p-5 text-sm">
            <p className="font-semibold">{addr.name}</p>
            <p>{[addr.line1, addr.line2, addr.landmark].filter(Boolean).join(", ")}</p>
            <p>
              {addr.city}, {addr.state} – {addr.pincode}
            </p>
            <p className="text-muted">{addr.phone}</p>
          </Card>
        </div>
      </div>
    </div>
  );
}
