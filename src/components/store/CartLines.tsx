"use client";

import { useLocale, useTranslations } from "next-intl";
import { Minus, Plus, Trash2, Truck } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { formatINR } from "@/lib/utils";
import { ProductImage } from "./ProductImage";
import { useCart, type QuoteResponse } from "./cart-context";

export function CartLines({ quote, compact, onNavigate }: { quote: QuoteResponse; compact?: boolean; onNavigate?: () => void }) {
  const t = useTranslations("cart");
  const tc = useTranslations("common");
  const locale = useLocale();
  const cart = useCart();
  return (
    <ul className="divide-y divide-line">
      {quote.lines.map((l) => {
        const name = locale === "hi" && l.name_hi ? l.name_hi : l.name_en;
        const qty = cart.items.find((i) => i.variantId === l.variantId)?.qty ?? l.qty;
        return (
          <li key={l.variantId} className="flex gap-3 py-3">
            <Link href={`/product/${l.slug}`} onClick={onNavigate} className={compact ? "w-16 shrink-0" : "w-20 shrink-0 sm:w-24"}>
              <ProductImage src={l.image} alt={name} categorySlug={l.categorySlug} sizes="96px" />
            </Link>
            <div className="min-w-0 flex-1">
              <Link href={`/product/${l.slug}`} onClick={onNavigate} className="line-clamp-2 text-sm font-semibold hover:text-primary">
                {name}
              </Link>
              <p className="text-xs text-muted">{l.packLabel}</p>
              {l.available ? (
                <p className="mt-0.5 inline-flex items-center gap-1 text-xs text-primary-dark">
                  <Truck className="h-3.5 w-3.5" /> {t("eta", { min: l.etaMinDays, max: l.etaMaxDays })}
                </p>
              ) : (
                <p className="mt-0.5 text-xs font-semibold text-danger">{tc("outOfStock")}</p>
              )}
              <div className="mt-2 flex items-center justify-between gap-2">
                <div className="inline-flex items-center rounded-xl border border-line bg-white">
                  <button type="button" className="tap inline-flex items-center justify-center text-primary disabled:opacity-40" onClick={() => cart.setQty(l.variantId, qty - 1)} aria-label="−">
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="w-8 text-center text-sm font-semibold" aria-live="polite">{qty}</span>
                  <button type="button" className="tap inline-flex items-center justify-center text-primary disabled:opacity-40" disabled={qty >= l.maxQty} onClick={() => cart.setQty(l.variantId, qty + 1)} aria-label="+">
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold">{formatINR(l.unitPrice * qty)}</p>
                  {l.mrp > l.unitPrice && <p className="text-xs text-muted line-through">{formatINR(l.mrp * qty)}</p>}
                </div>
              </div>
              {qty > l.maxQty && l.available && <p className="mt-1 text-xs text-danger">{t("maxQty", { n: l.maxQty })}</p>}
              <button type="button" onClick={() => cart.remove(l.variantId)} className="mt-1 inline-flex min-h-[32px] items-center gap-1 text-xs font-semibold text-muted hover:text-danger">
                <Trash2 className="h-3.5 w-3.5" /> {t("remove")}
              </button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
