import type { Metadata } from "next";
import { headers } from "next/headers";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { db } from "@/lib/db";
import { currentUser } from "@/lib/session";
import { hitLimit, normalizeIdentifier } from "@/lib/rate-limit";
import { Breadcrumbs } from "@/components/store/Breadcrumbs";
import { OrderTimeline } from "@/components/store/OrderTimeline";
import { Button } from "@/components/ui/button";
import { Field, Input, Notice } from "@/components/ui/form";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "track" });
  return { title: t("title"), alternates: { canonical: `/${locale}/track` } };
}

async function findOrder(orderNumber: string, contact: string | undefined) {
  const order = await db.order.findUnique({
    where: { orderNumber },
    select: {
      id: true,
      orderNumber: true,
      userId: true,
      status: true,
      createdAt: true,
      shippingAddress: true,
      user: { select: { email: true, mobile: true } },
      events: { orderBy: { createdAt: "asc" }, select: { status: true, note: true, createdAt: true } },
      shipments: { select: { id: true, route: true, courierName: true, awb: true, trackingUrl: true, status: true, events: { orderBy: { occurredAt: "asc" }, select: { status: true, location: true, note: true, occurredAt: true } } } },
      items: { select: { id: true, name_en: true, name_hi: true, packLabel: true, quantity: true, shipmentId: true, etaMinDays: true, etaMaxDays: true } },
    },
  });
  if (!order) return null;
  const me = await currentUser();
  if (me?.id === order.userId) return order;
  if (!contact) return null;
  const c = normalizeIdentifier(contact);
  const phone = normalizeIdentifier(String((order.shippingAddress as { phone?: string }).phone ?? ""));
  const ok = c.includes("@") ? c === order.user.email : c === phone || c === order.user.mobile;
  return ok ? order : null;
}

export default async function TrackPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ order?: string; contact?: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("track");
  const to = await getTranslations("orderStatus");
  const { order: orderNumber, contact } = await searchParams;

  let order: Awaited<ReturnType<typeof findOrder>> = null;
  let searched = false;
  if (orderNumber) {
    const h = await headers();
    const ip = (h.get("x-forwarded-for") ?? "").split(",")[0].trim() || "unknown";
    if (contact && (await hitLimit(`track:${ip}`, 30))) {
      searched = true;
    } else {
      order = await findOrder(orderNumber.trim().toUpperCase().slice(0, 30), contact?.slice(0, 120));
      searched = Boolean(contact) || Boolean(order);
    }
  }

  return (
    <>
      <Breadcrumbs items={[{ name: t("title") }]} />
      <div className="container mt-4 grid gap-6 lg:grid-cols-[380px_1fr]">
        <div className="card h-fit p-6">
          <h1 className="font-heading text-2xl font-bold">{t("title")}</h1>
          <p className="mt-1 text-sm text-muted">{t("text")}</p>
          <form method="get" className="mt-5 space-y-4">
            <Field label={t("orderNumber")} htmlFor="order">
              <Input id="order" name="order" defaultValue={orderNumber} required className="uppercase" />
            </Field>
            <Field label={t("contact")} htmlFor="contact">
              <Input id="contact" name="contact" defaultValue={contact} required />
            </Field>
            <Button type="submit" className="w-full">
              {t("track")}
            </Button>
          </form>
        </div>
        <div>
          {order ? (
            <div className="card p-6">
              <p className="text-sm text-muted">{order.orderNumber}</p>
              <p className="font-heading text-2xl font-bold">{to(order.status)}</p>
              <div className="mt-5">
                <OrderTimeline events={order.events} shipments={order.shipments} items={order.items} placedAt={order.createdAt} />
              </div>
            </div>
          ) : searched ? (
            <Notice tone="error">{t("notFound")}</Notice>
          ) : null}
        </div>
      </div>
    </>
  );
}
