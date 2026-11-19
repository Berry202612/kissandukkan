"use client";

import { useTranslations } from "next-intl";
import { ShoppingCart } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useCart } from "./cart-context";

export function AddToCartButton({
  variantId,
  available,
  qty = 1,
  className,
  size = "md",
  openDrawer = true,
}: {
  variantId: string;
  available: boolean;
  qty?: number;
  className?: string;
  size?: "sm" | "md" | "lg";
  openDrawer?: boolean;
}) {
  const t = useTranslations("common");
  const cart = useCart();
  if (!available) {
    return (
      <Button variant="soft" size={size} className={className} disabled>
        {t("outOfStock")}
      </Button>
    );
  }
  return (
    <Button
      size={size}
      className={className}
      onClick={() => {
        cart.add(variantId, qty);
        toast.success(t("added"));
        if (openDrawer) cart.setOpen(true);
      }}
    >
      <ShoppingCart /> {t("addToCart")}
    </Button>
  );
}
