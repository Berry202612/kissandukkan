"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { cancelOrder } from "@/app/actions/account";
import { useCart } from "./cart-context";

export function OrderActions({ orderNumber, cancellable, pending, reorderItems }: { orderNumber: string; cancellable: boolean; pending: boolean; reorderItems: { variantId: string; qty: number }[] }) {
  const t = useTranslations("account");
  const tc = useTranslations("common");
  const router = useRouter();
  const cart = useCart();
  const [confirming, setConfirming] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  return (
    <>
      {pending && (
        <Button variant="accent" onClick={() => router.push(`/checkout?retry=${orderNumber}`)}>
          {t("retryPayment")}
        </Button>
      )}
      <Button
        variant="soft"
        onClick={() => {
          reorderItems.forEach((i) => cart.add(i.variantId, i.qty));
          cart.setOpen(true);
        }}
      >
        {t("reorder")}
      </Button>
      {cancellable &&
        (confirming ? (
          <span className="inline-flex items-center gap-2">
            <Button
              variant="danger"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                const r = await cancelOrder(orderNumber);
                setBusy(false);
                setConfirming(false);
                if (r.ok) {
                  toast.success(t("cancelled"));
                  router.refresh();
                } else toast.error(tc("somethingWrong"));
              }}
            >
              {t("cancelConfirm")}
            </Button>
            <Button variant="ghost" onClick={() => setConfirming(false)}>
              {tc("no")}
            </Button>
          </span>
        ) : (
          <Button variant="ghost" className="text-danger" onClick={() => setConfirming(true)}>
            {t("cancelOrder")}
          </Button>
        ))}
    </>
  );
}
