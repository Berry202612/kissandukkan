import { getLocale, getTranslations } from "next-intl/server";
import { CheckCircle2, Circle, ExternalLink, Truck } from "lucide-react";
import { cn } from "@/lib/utils";

type Ev = { status: string; note?: string | null; createdAt: Date };
type ShipmentView = {
  id: string;
  route: string;
  courierName: string | null;
  awb: string | null;
  trackingUrl: string | null;
  status: string;
  events: { status: string; location: string | null; note: string | null; occurredAt: Date }[];
};
type ItemView = { id: string; name_en: string; name_hi: string; packLabel: string; quantity: number; shipmentId: string | null; etaMinDays: number; etaMaxDays: number };

const PUBLIC_NOTE = /refund|cancel|payment/i; // only customer-relevant event notes are shown
const SHIP_KEYS = ["PENDING", "CREATED", "PICKED_UP", "IN_TRANSIT", "OUT_FOR_DELIVERY", "DELIVERED", "RTO", "CANCELLED"];
const ALIASES: Record<string, string> = { SHIPPED: "IN_TRANSIT", SHIPMENT_CREATED: "CREATED", PICKED: "PICKED_UP" };

export async function OrderTimeline({ events, shipments, items, placedAt }: { events: Ev[]; shipments: ShipmentView[]; items: ItemView[]; placedAt: Date }) {
  const t = await getTranslations();
  const locale = await getLocale();
  const fmt = new Intl.DateTimeFormat(locale === "hi" ? "hi-IN" : "en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" });
  const dfmt = new Intl.DateTimeFormat(locale === "hi" ? "hi-IN" : "en-IN", { dateStyle: "medium", timeZone: "Asia/Kolkata" });
  const name = (i: ItemView) => (locale === "hi" && i.name_hi ? i.name_hi : i.name_en);
  const unshipped = items.filter((i) => !i.shipmentId);
  const label = (raw: string) => {
    const k = raw.trim().toUpperCase().replace(/[s-]+/g, "_");
    const key = ALIASES[k] ?? k;
    return SHIP_KEYS.includes(key) ? t(`shipmentStatus.${key}` as "shipmentStatus.PENDING") : raw;
  };
  const addDays = (n: number) => new Date(placedAt.getTime() + n * 86400000);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-heading text-lg font-bold">{t("account.timeline")}</h3>
        <ol className="mt-3 space-y-0">
          {events.map((e, idx) => (
            <li key={idx} className="relative flex gap-3 pb-5 last:pb-0">
              {idx < events.length - 1 && <span className="absolute left-[11px] top-6 h-full w-0.5 bg-primary/20" />}
              <CheckCircle2 className={cn("relative h-6 w-6 shrink-0", e.status === "CANCELLED" ? "text-danger" : "text-success")} />
              <div>
                <p className="font-semibold">{t(`orderStatus.${e.status}` as "orderStatus.PLACED")}</p>
                <p className="text-xs text-muted">{fmt.format(e.createdAt)}</p>
                {e.note && PUBLIC_NOTE.test(e.note) && <p className="text-sm text-muted">{e.note}</p>}
              </div>
            </li>
          ))}
        </ol>
      </div>

      {shipments.map((s, idx) => (
        <div key={s.id} className="rounded-2xl border border-line bg-cream p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="flex items-center gap-2 font-heading text-base font-bold text-primary-dark">
              <Truck className="h-5 w-5" /> {t("account.shipment")} {idx + 1} · {t(`shipmentStatus.${s.status}` as "shipmentStatus.PENDING")}
            </p>
            {s.trackingUrl && (
              <a href={s.trackingUrl} target="_blank" rel="noopener noreferrer" className="link inline-flex items-center gap-1 text-sm">
                {t("account.trackCourier")} <ExternalLink className="h-3.5 w-3.5" />
              </a>
            )}
          </div>
          {(s.courierName || s.awb) && (
            <p className="mt-1 text-sm">
              {s.courierName}
              {s.awb ? ` · AWB ${s.awb}` : ""}
            </p>
          )}
          <p className="mt-2 text-xs font-semibold text-muted">{t("track.items")}</p>
          <ul className="text-sm">
            {items
              .filter((i) => i.shipmentId === s.id)
              .map((i) => (
                <li key={i.id}>
                  {name(i)} ({i.packLabel}) × {i.quantity}
                </li>
              ))}
          </ul>
          {s.events.length > 0 && (
            <ol className="mt-3 space-y-2 border-l-2 border-primary/20 pl-4">
              {[...s.events].reverse().map((e, j) => (
                <li key={j} className="text-sm">
                  <p className="font-medium">{label(e.status)}</p>
                  <p className="text-xs text-muted">
                    {fmt.format(e.occurredAt)}
                    {e.location ? ` · ${e.location}` : ""}
                  </p>
                  {e.note && <p className="text-xs text-muted">{e.note}</p>}
                </li>
              ))}
            </ol>
          )}
        </div>
      ))}

      {unshipped.length > 0 && (
        <div className="rounded-2xl border border-dashed border-line p-4">
          <p className="flex items-center gap-2 text-sm font-semibold">
            <Circle className="h-4 w-4 text-muted" /> {t("track.awaiting")}
          </p>
          <ul className="mt-1 text-sm">
            {unshipped.map((i) => (
              <li key={i.id}>
                {name(i)} ({i.packLabel}) × {i.quantity} — {dfmt.format(addDays(i.etaMinDays))} – {dfmt.format(addDays(i.etaMaxDays))}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
