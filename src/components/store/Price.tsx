import { useTranslations } from "next-intl";
import { discountBadge } from "@/lib/pricing";
import { cn, formatINR, toNum } from "@/lib/utils";

export function Price({ price, mrp, size = "md", showTaxNote = false }: { price: unknown; mrp: unknown; size?: "sm" | "md" | "lg"; showTaxNote?: boolean }) {
  const t = useTranslations("common");
  const p = toNum(price);
  const m = toNum(mrp);
  const pct = discountBadge(m, p);
  return (
    <div>
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
        <span className={cn("font-heading font-bold text-ink", size === "lg" ? "text-3xl" : size === "md" ? "text-xl" : "text-lg")}>{formatINR(p)}</span>
        {m > p && (
          <span className="text-sm text-muted">
            {t("mrp")} <s>{formatINR(m)}</s>
          </span>
        )}
        {m === p && <span className="text-xs text-muted">{t("mrp")}</span>}
        {pct && <span className="rounded-md bg-accent px-1.5 py-0.5 text-xs font-bold text-ink">{t("off", { pct })}</span>}
      </div>
      {showTaxNote && <p className="mt-0.5 text-xs text-muted">{t("inclTaxes")}</p>}
    </div>
  );
}
