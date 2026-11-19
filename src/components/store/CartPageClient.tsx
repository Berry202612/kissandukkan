"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Input, Notice, Skeleton } from "@/components/ui/form";
import { Illustration } from "@/components/brand/Illustration";
import { useCart, useQuote } from "./cart-context";
import { CartLines } from "./CartLines";
import { CartSummary, FreeShippingBar } from "./CartSummary";

export function CouponBox() {
  const t = useTranslations("cart");
  const cart = useCart();
  const { quote } = useQuote();
  const [code, setCode] = React.useState(cart.coupon ?? "");
  React.useEffect(() => setCode(cart.coupon ?? ""), [cart.coupon]);
  const err = cart.coupon && quote?.couponError ? t(`couponErrors.${quote.couponError}` as "couponErrors.invalid") : null;
  return (
    <div>
      {cart.coupon && quote?.couponCode ? (
        <div className="flex items-center justify-between rounded-xl bg-[#e8f5e9] px-3 py-2 text-sm text-success">
          <span className="font-semibold">{t("couponApplied", { code: quote.couponCode })}</span>
          <button type="button" className="font-semibold underline" onClick={() => cart.setCoupon(null)}>
            {t("removeCoupon")}
          </button>
        </div>
      ) : (
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            cart.setCoupon(code.trim().toUpperCase() || null);
          }}
        >
          <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder={t("coupon")} aria-label={t("coupon")} className="uppercase" />
          <Button type="submit" variant="outline">
            {t("applyCoupon")}
          </Button>
        </form>
      )}
      {err && <p className="mt-1 text-sm text-danger">{err}</p>}
    </div>
  );
}

export function CartPageClient() {
  const t = useTranslations("cart");
  const cart = useCart();
  const { quote, loading } = useQuote();

  if (cart.ready && !cart.items.length) {
    return (
      <div className="container mt-10">
        <div className="card mx-auto flex max-w-lg flex-col items-center p-10 text-center">
          <Illustration name="sack" className="h-28 w-28 text-primary/60" />
          <h1 className="mt-4 font-heading text-2xl font-bold">{t("empty")}</h1>
          <p className="mt-1 text-muted">{t("emptyHint")}</p>
          <Button asChild className="mt-6">
            <Link href="/categories">{t("startShopping")}</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mt-6">
      <h1 className="font-heading text-3xl font-bold">{t("title")}</h1>
      {!quote ? (
        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_380px]">
          <Skeleton className="h-80" />
          <Skeleton className="h-64" />
        </div>
      ) : (
        <div className={`mt-6 grid gap-6 lg:grid-cols-[1fr_380px] ${loading ? "opacity-80" : ""}`}>
          <div className="card p-4 md:p-6">
            {quote.lines.some((l) => !l.available) && <Notice tone="warn" className="mb-3">{t("unavailableItems")}</Notice>}
            <FreeShippingBar quote={quote} />
            <CartLines quote={quote} />
          </div>
          <div className="card h-fit space-y-4 p-5 lg:sticky lg:top-40">
            <CouponBox />
            <CartSummary quote={quote} />
            <Button asChild size="lg" className="w-full">
              <Link href="/checkout">{t("checkout")}</Link>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
