"use client";

import * as React from "react";
import Script from "next/script";
import { useLocale, useTranslations } from "next-intl";
import { Lock, Plus } from "lucide-react";
import { toast } from "sonner";
import { Link, useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Notice, Skeleton } from "@/components/ui/form";
import { cn, formatINR } from "@/lib/utils";
import { useCart, useQuote } from "./cart-context";
import { CartSummary } from "./CartSummary";
import { CouponBox } from "./CartPageClient";
import { AddressForm } from "./AddressForm";

type Address = { id: string; name: string; phone: string; line1: string; line2: string | null; city: string; state: string; pincode: string; isDefault: boolean };

declare global {
  interface Window {
    Razorpay?: new (opts: Record<string, unknown>) => { open: () => void; on: (e: string, cb: (r: unknown) => void) => void };
  }
}

export function CheckoutClient({
  addresses,
  codEnabled,
  onlineEnabled,
  retryOrderNumber,
  user,
}: {
  addresses: Address[];
  codEnabled: boolean;
  onlineEnabled: boolean;
  retryOrderNumber: string | null;
  user: { name: string; email: string };
}) {
  const t = useTranslations("checkout");
  const tc = useTranslations("cart");
  const tcom = useTranslations("common");
  const tpol = useTranslations("checkout.links");
  const locale = useLocale();
  const router = useRouter();
  const cart = useCart();
  const [method, setMethod] = React.useState<"RAZORPAY" | "COD">(onlineEnabled ? "RAZORPAY" : "COD");
  const { quote } = useQuote(true, { cod: method === "COD" });
  const [addressId, setAddressId] = React.useState(addresses.find((a) => a.isDefault)?.id ?? addresses[0]?.id ?? "");
  const [adding, setAdding] = React.useState(addresses.length === 0);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  React.useEffect(() => {
    if (!addressId && addresses.length) setAddressId(addresses.find((a) => a.isDefault)?.id ?? addresses[0].id);
  }, [addresses, addressId]);

  const openRazorpay = (orderNumber: string, rp: { orderId: string; amount: number; keyId: string }) => {
    if (!window.Razorpay) {
      setError(t("paymentNotConfigured"));
      return;
    }
    const addr = addresses.find((a) => a.id === addressId);
    const r = new window.Razorpay({
      key: rp.keyId,
      amount: rp.amount,
      currency: "INR",
      name: "KissanDukkan",
      description: orderNumber,
      order_id: rp.orderId,
      prefill: { name: user.name, email: user.email, contact: addr?.phone },
      theme: { color: "#1E6B3A" },
      handler: async (resp: Record<string, string>) => {
        const v = await fetch("/api/razorpay/verify", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(resp) });
        cart.clear();
        router.push(`/order/${orderNumber}/success${v.ok ? "" : "?pending=1"}`);
      },
      modal: {
        ondismiss: () => {
          setBusy(false);
          toast.error(t("paymentFailed"));
          router.push(`/account/orders/${orderNumber}`);
        },
      },
    });
    r.on("payment.failed", () => {
      toast.error(t("paymentFailed"));
    });
    r.open();
  };

  const placeOrder = async () => {
    setError(null);
    if (!retryOrderNumber && !addressId) {
      setError(t("errors.address"));
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(retryOrderNumber ? { retryOrderNumber } : { items: cart.items, addressId, coupon: cart.coupon, method, locale }),
      });
      const data = await res.json();
      if (!res.ok) {
        const code = String(data.error ?? "");
        setError(
          code === "payment_not_configured"
            ? t("paymentNotConfigured")
            : code.startsWith("coupon")
              ? t("errors.coupon")
              : ["address", "empty", "unavailable", "cod_disabled", "cod_limit"].includes(code)
                ? t(`errors.${code}` as "errors.address")
                : tcom("somethingWrong"),
        );
        setBusy(false);
        return;
      }
      if (data.razorpay) openRazorpay(data.orderNumber, data.razorpay);
      else {
        cart.clear();
        router.push(`/order/${data.orderNumber}/success`);
      }
    } catch {
      setError(t("paymentFailed"));
      setBusy(false);
    }
  };

  if (retryOrderNumber) {
    return (
      <div className="container mt-8 max-w-lg">
        <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="afterInteractive" />
        <div className="card p-6 text-center">
          <h1 className="font-heading text-2xl font-bold">{t("retry")}</h1>
          <p className="mt-2 text-muted">{retryOrderNumber}</p>
          {error && <Notice tone="error" className="mt-4">{error}</Notice>}
          <Button size="lg" className="mt-6 w-full" onClick={placeOrder} disabled={busy}>
            <Lock /> {busy ? t("processing") : t("retry")}
          </Button>
        </div>
      </div>
    );
  }

  if (cart.ready && !cart.items.length) {
    return (
      <div className="container mt-10 text-center">
        <p className="font-heading text-xl font-bold">{t("errors.empty")}</p>
        <Button asChild className="mt-4">
          <Link href="/categories">{tc("startShopping")}</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="container mt-6">
      {onlineEnabled && <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="afterInteractive" />}
      <h1 className="font-heading text-3xl font-bold">{t("title")}</h1>
      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_400px]">
        <div className="space-y-6">
          <section className="card p-5 md:p-6">
            <h2 className="font-heading text-xl font-bold">1. {t("address")}</h2>
            {addresses.length > 0 && (
              <div className="mt-4 grid gap-3 sm:grid-cols-2" role="radiogroup">
                {addresses.map((a) => (
                  <label key={a.id} className={cn("cursor-pointer rounded-2xl border-2 p-4 text-sm transition", addressId === a.id ? "border-primary bg-primary-light" : "border-line bg-white hover:border-primary/40")}>
                    <input type="radio" name="address" value={a.id} checked={addressId === a.id} onChange={() => setAddressId(a.id)} className="sr-only" />
                    <p className="font-semibold">{a.name}</p>
                    <p>{[a.line1, a.line2].filter(Boolean).join(", ")}</p>
                    <p>
                      {a.city}, {a.state} – {a.pincode}
                    </p>
                    <p className="text-muted">{a.phone}</p>
                  </label>
                ))}
              </div>
            )}
            {adding ? (
              <div className="mt-5 rounded-2xl border border-dashed border-line p-4">
                <AddressForm
                  onSaved={(id) => {
                    setAddressId(id);
                    setAdding(false);
                    router.refresh();
                  }}
                />
              </div>
            ) : (
              <Button variant="ghost" className="mt-3" onClick={() => setAdding(true)}>
                <Plus /> {t("addAddress")}
              </Button>
            )}
          </section>

          <section className="card p-5 md:p-6">
            <h2 className="font-heading text-xl font-bold">2. {t("perItemEta")}</h2>
            {!quote ? (
              <Skeleton className="mt-4 h-24" />
            ) : (
              <ul className="mt-3 divide-y divide-line text-sm">
                {quote.lines.map((l) => (
                  <li key={l.variantId} className="flex items-center justify-between gap-3 py-2.5">
                    <span className="min-w-0">
                      <span className="line-clamp-1 font-medium">{locale === "hi" && l.name_hi ? l.name_hi : l.name_en}</span>
                      <span className="text-muted">
                        {l.packLabel} × {l.qty}
                      </span>
                    </span>
                    <span className={cn("shrink-0 font-semibold", l.available ? "text-primary-dark" : "text-danger")}>
                      {l.available ? tc("eta", { min: l.etaMinDays, max: l.etaMaxDays }) : tcom("outOfStock")}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="card p-5 md:p-6">
            <h2 className="font-heading text-xl font-bold">3. {t("payment")}</h2>
            <div className="mt-4 space-y-2">
              {onlineEnabled && (
                <label className={cn("flex min-h-[56px] cursor-pointer items-center gap-3 rounded-2xl border-2 px-4", method === "RAZORPAY" ? "border-primary bg-primary-light" : "border-line bg-white")}>
                  <input type="radio" name="method" checked={method === "RAZORPAY"} onChange={() => setMethod("RAZORPAY")} className="h-5 w-5 accent-primary" />
                  <span className="font-semibold">{t("payOnline")}</span>
                </label>
              )}
              {codEnabled && (
                <label className={cn("flex min-h-[56px] cursor-pointer items-center gap-3 rounded-2xl border-2 px-4", method === "COD" ? "border-primary bg-primary-light" : "border-line bg-white")}>
                  <input type="radio" name="method" checked={method === "COD"} onChange={() => setMethod("COD")} className="h-5 w-5 accent-primary" />
                  <span className="font-semibold">{t("cod")}</span>
                </label>
              )}
              {!onlineEnabled && !codEnabled && <Notice tone="warn">{t("paymentNotConfigured")}</Notice>}
            </div>
            {onlineEnabled && (
              <p className="mt-3 flex items-start gap-2 text-xs text-muted">
                <Lock className="mt-0.5 h-4 w-4 shrink-0" /> {t("secure")}
              </p>
            )}
          </section>
        </div>

        <aside className="card h-fit space-y-4 p-5 lg:sticky lg:top-40">
          <h2 className="font-heading text-xl font-bold">{t("summary")}</h2>
          <CouponBox />
          {quote ? <CartSummary quote={quote} /> : <Skeleton className="h-40" />}
          {error && <Notice tone="error">{error}</Notice>}
          <Button size="lg" className="w-full" onClick={placeOrder} disabled={busy || !quote || (!onlineEnabled && !codEnabled) || !addressId || quote.lines.every((l) => !l.available)}>
            <Lock /> {busy ? t("processing") : method === "COD" ? t("placeOrder") : t("pay", { amount: quote ? formatINR(quote.total) : "" })}
          </Button>
          <p className="text-xs text-muted">
            {t("agree")}{" "}
            <Link href="/policies/terms-of-use" className="link">
              {tpol("terms")}
            </Link>{" "}
            ·{" "}
            <Link href="/policies/replacement-return-policy" className="link">
              {tpol("returns")}
            </Link>
          </p>
        </aside>
      </div>
    </div>
  );

}
