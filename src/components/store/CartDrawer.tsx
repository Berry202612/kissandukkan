"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/overlay";
import { Skeleton } from "@/components/ui/form";
import { Illustration } from "@/components/brand/Illustration";
import { useCart, useQuote } from "./cart-context";
import { CartLines } from "./CartLines";
import { CartSummary, FreeShippingBar } from "./CartSummary";

export function CartDrawer() {
  const t = useTranslations("cart");
  const cart = useCart();
  const { quote, loading } = useQuote(cart.open);
  const close = () => cart.setOpen(false);
  return (
    <Dialog open={cart.open} onOpenChange={cart.setOpen}>
      <DialogContent title={t("title")} side="right">
        {!cart.items.length ? (
          <div className="flex flex-col items-center px-6 py-16 text-center">
            <Illustration name="sack" className="h-24 w-24 text-primary/60" />
            <p className="mt-4 font-heading text-xl font-bold text-primary-dark">{t("empty")}</p>
            <p className="mt-1 text-sm text-muted">{t("emptyHint")}</p>
            <Button asChild className="mt-6" onClick={close}>
              <Link href="/categories">{t("startShopping")}</Link>
            </Button>
          </div>
        ) : !quote ? (
          <div className="space-y-3 p-5">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
        ) : (
          <div className={loading ? "opacity-70 transition-opacity" : ""}>
            <div className="p-4">
              <FreeShippingBar quote={quote} />
              <CartLines quote={quote} compact onNavigate={close} />
            </div>
            <div className="sticky bottom-0 border-t border-line bg-white p-4">
              <CartSummary quote={quote} />
              <div className="mt-4 grid grid-cols-2 gap-2">
                <Button asChild variant="outline" onClick={close}>
                  <Link href="/cart">{t("viewCart")}</Link>
                </Button>
                <Button asChild onClick={close}>
                  <Link href="/checkout">{t("checkout")}</Link>
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
