"use client";

import { useTranslations } from "next-intl";
import { Info } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { formatINR } from "@/lib/utils";
import type { QuoteResponse } from "./cart-context";

export function FreeShippingBar({ quote }: { quote: QuoteResponse }) {
  const t = useTranslations("cart");
  const pct = quote.freeShippingThreshold > 0 ? Math.min(100, ((quote.subtotal - quote.discount) / quote.freeShippingThreshold) * 100) : 100;
  return (
    <div className="rounded-xl bg-primary-light p-3">
      <p className="text-sm font-semibold text-primary-dark">
        {quote.amountToFreeShipping > 0 ? t("freeShipProgress", { amount: formatINR(quote.amountToFreeShipping) }) : t("freeShipDone")}
      </p>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-white">
        <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function CartSummary({ quote }: { quote: QuoteResponse }) {
  const t = useTranslations("cart");
  const gst = quote.taxBreakup.reduce((s, r) => s + r.tax, 0);
  return (
    <dl className="space-y-2 text-[15px]">
      <div className="flex justify-between">
        <dt>{t("subtotal")}</dt>
        <dd>{formatINR(quote.subtotal)}</dd>
      </div>
      {quote.discount > 0 && (
        <div className="flex justify-between text-success">
          <dt>
            {t("discount")} ({quote.couponCode})
          </dt>
          <dd>−{formatINR(quote.discount)}</dd>
        </div>
      )}
      <div className="flex justify-between">
        <dt>{t("shipping")}</dt>
        <dd>{quote.shippingFee === 0 ? <span className="font-semibold text-success">{t("free")}</span> : formatINR(quote.shippingFee)}</dd>
      </div>
      <div className="flex justify-between gap-2">
        <dt className="flex items-center gap-1">
          {t("handlingFee", { pct: quote.handlingFeePercent })}
          <span className="group relative inline-flex">
            <button type="button" className="inline-flex h-6 w-6 items-center justify-center rounded-full text-muted hover:text-primary focus:text-primary" aria-label={t("handlingTooltip")}>
              <Info className="h-4 w-4" />
            </button>
            <span role="tooltip" className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 hidden w-64 -translate-x-1/2 rounded-xl bg-ink p-3 text-xs font-normal leading-relaxed text-white shadow-lift group-focus-within:block group-hover:block">
              {t("handlingTooltip")}
            </span>
          </span>
        </dt>
        <dd>{formatINR(quote.handlingFee)}</dd>
      </div>
      {quote.codFee > 0 && (
        <div className="flex justify-between">
          <dt>{t("codFee")}</dt>
          <dd>{formatINR(quote.codFee)}</dd>
        </div>
      )}
      <div className="flex justify-between border-t border-line pt-2 text-lg font-bold">
        <dt>{t("total")}</dt>
        <dd>{formatINR(quote.total)}</dd>
      </div>
      <p className="text-xs text-muted">{t("gstIncluded", { amount: formatINR(gst, { decimals: true }) })}</p>
      <p className="text-xs">
        <Link href="/policies/payment-policy" className="link">
          {t("handlingFee", { pct: quote.handlingFeePercent })} →
        </Link>
      </p>
    </dl>
  );
}
