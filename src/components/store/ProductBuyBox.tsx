"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Heart, MapPin, Minus, Plus, Share2, ShoppingCart, Truck, Zap } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toggleWishlist } from "@/app/actions/public";
import { useCart } from "./cart-context";
import { Price } from "./Price";

type Variant = { id: string; packSize: string; unit: string; mrp: number; sellingPrice: number };

export function ProductBuyBox({
  productId,
  variants,
  availability,
  fulfilledBy,
  eta,
  surfaceOnly,
  shareText,
  shareUrl,
}: {
  productId: string;
  variants: Variant[];
  availability: Record<string, boolean>;
  fulfilledBy: "OWN_STOCK" | "SUPPLIER_DIRECT";
  eta: { min: number; max: number };
  surfaceOnly: boolean;
  shareText: string;
  shareUrl: string;
}) {
  const t = useTranslations("product");
  const tc = useTranslations("common");
  const cart = useCart();
  const router = useRouter();
  const firstAvailable = variants.find((v) => availability[v.id]) ?? variants[0];
  const [vid, setVid] = React.useState(firstAvailable?.id);
  const [qty, setQty] = React.useState(1);
  const [saved, setSaved] = React.useState(false);
  React.useEffect(() => {
    fetch(`/api/wishlist?productId=${productId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setSaved(Boolean(d.saved)))
      .catch(() => {});
  }, [productId]);
  const v = variants.find((x) => x.id === vid) ?? variants[0];
  if (!v) return null;
  const available = Boolean(availability[v.id]);

  const add = (buyNow = false) => {
    cart.add(v.id, qty);
    if (buyNow) router.push("/checkout");
    else {
      toast.success(tc("added"));
      cart.setOpen(true);
    }
  };

  return (
    <div className="space-y-5">
      <Price price={v.sellingPrice} mrp={v.mrp} size="lg" showTaxNote />
      {variants.length > 0 && (
        <div>
          <p className="mb-2 text-sm font-semibold">{t("packSize")}</p>
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={t("packSize")}>
            {variants.map((x) => (
              <button
                key={x.id}
                type="button"
                role="radio"
                aria-checked={x.id === v.id}
                onClick={() => setVid(x.id)}
                className={cn(
                  "min-h-[48px] min-w-[72px] rounded-xl border-2 px-3 text-sm font-semibold transition",
                  x.id === v.id ? "border-primary bg-primary-light text-primary-dark" : "border-line bg-white hover:border-primary/50",
                  !availability[x.id] && "opacity-50 line-through",
                )}
              >
                {x.packSize} {x.unit}
              </button>
            ))}
          </div>
        </div>
      )}
      <div className="flex items-center gap-3">
        <span className="text-sm font-semibold">{t("quantity")}</span>
        <div className="inline-flex items-center rounded-xl border border-line bg-white">
          <button type="button" className="tap inline-flex items-center justify-center text-primary" onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="−">
            <Minus className="h-4 w-4" />
          </button>
          <span className="w-10 text-center font-semibold" aria-live="polite">{qty}</span>
          <button type="button" className="tap inline-flex items-center justify-center text-primary" onClick={() => setQty((q) => Math.min(50, q + 1))} aria-label="+">
            <Plus className="h-4 w-4" />
          </button>
        </div>
        <span className={cn("text-sm font-semibold", available ? "text-success" : "text-danger")}>{available ? (fulfilledBy === "OWN_STOCK" ? tc("inStock") : tc("available")) : tc("outOfStock")}</span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Button size="lg" variant="outline" disabled={!available} onClick={() => add(false)}>
          <ShoppingCart /> {tc("addToCart")}
        </Button>
        <Button size="lg" variant="accent" disabled={!available} onClick={() => add(true)}>
          <Zap /> {tc("buyNow")}
        </Button>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={async () => {
            const r = await toggleWishlist(productId);
            if (!r.ok) {
              toast.error(r.error === "login" ? tc("loginToSave") : tc("somethingWrong"));
              if (r.error === "login") router.push("/login");
              return;
            }
            setSaved(Boolean(r.saved));
            toast.success(r.saved ? tc("addedWishlist") : tc("removedWishlist"));
          }}
          aria-pressed={saved}
        >
          <Heart className={cn(saved && "fill-danger text-danger")} /> {tc("wishlist")}
        </Button>
        <Button variant="ghost" size="sm" asChild>
          <a href={`https://wa.me/?text=${encodeURIComponent(`${shareText} ${shareUrl}`)}`} target="_blank" rel="noopener noreferrer">
            <Share2 /> {tc("share")}
          </a>
        </Button>
      </div>
      <div className="rounded-2xl bg-primary-light p-4 text-sm">
        <p className="flex items-center gap-2 font-semibold text-primary-dark">
          <Truck className="h-5 w-5" />
          {fulfilledBy === "OWN_STOCK" ? t("deliveryOwn", eta) : t("deliverySupplier", eta)}
        </p>
        {surfaceOnly && <p className="mt-1 text-muted">{t("surfaceOnly")}</p>}
        <PincodeChecker variantId={v.id} />
      </div>
    </div>
  );
}

function PincodeChecker({ variantId }: { variantId: string }) {
  const t = useTranslations("product");
  const [pin, setPin] = React.useState("");
  const [msg, setMsg] = React.useState<{ ok: boolean | null; text: string } | null>(null);
  const [loading, setLoading] = React.useState(false);
  React.useEffect(() => {
    try {
      const saved = localStorage.getItem("kd_pincode");
      if (saved) setPin(saved);
    } catch {}
  }, []);
  const check = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^[1-9][0-9]{5}$/.test(pin)) {
      setMsg({ ok: false, text: t("pinInvalid") });
      return;
    }
    setLoading(true);
    try {
      localStorage.setItem("kd_pincode", pin);
    } catch {}
    try {
      const r = await fetch(`/api/pincode?pin=${pin}&variant=${variantId}`);
      const d = await r.json();
      if (d.status === "ok") setMsg({ ok: true, text: d.days ? t("pinOkDays", { pincode: pin, days: d.days }) : t("pinOk", { pincode: pin, min: d.min, max: d.max }) });
      else if (d.status === "no") setMsg({ ok: false, text: t("pinNo", { pincode: pin }) });
      else setMsg({ ok: null, text: t("pinUnknown") });
    } catch {
      setMsg({ ok: null, text: t("pinUnknown") });
    } finally {
      setLoading(false);
    }
  };
  return (
    <form onSubmit={check} className="mt-3">
      <label htmlFor="pin" className="mb-1 flex items-center gap-1 font-semibold">
        <MapPin className="h-4 w-4" /> {t("pincode")}
      </label>
      <div className="flex gap-2">
        <input
          id="pin"
          inputMode="numeric"
          maxLength={6}
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
          placeholder={t("pincodePlaceholder")}
          className="h-11 w-full max-w-[200px] rounded-xl border border-line bg-white px-3"
        />
        <Button type="submit" size="md" variant="primary" disabled={loading}>
          {t("check")}
        </Button>
      </div>
      {msg && (
        <p className={cn("mt-2", msg.ok === true ? "text-success" : msg.ok === false ? "text-danger" : "text-muted")} role="status">
          {msg.text}
        </p>
      )}
    </form>
  );
}
