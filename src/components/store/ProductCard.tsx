import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Truck, Star } from "lucide-react";
import type { PublicCard } from "@/lib/catalog";
import { tr, toNum } from "@/lib/utils";
import { ProductImage } from "./ProductImage";
import { Price } from "./Price";
import { AddToCartButton } from "./AddToCartButton";

export function ProductCard({ p }: { p: PublicCard }) {
  const locale = useLocale();
  const t = useTranslations("common");
  const v = p.variants.find((x) => p.availability[x.id]) ?? p.variants[0];
  if (!v) return null;
  const available = Boolean(p.availability[v.id]);
  const name = tr(p, "name", locale);
  return (
    <div className="card group flex flex-col overflow-hidden p-3 transition hover:shadow-lift">
      <Link href={`/product/${p.slug}`} className="block">
        <ProductImage src={p.images[0]} alt={name} categorySlug={p.category.slug} />
      </Link>
      <div className="mt-3 flex flex-1 flex-col">
        <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide">
          {p.brand && <span className="text-soil">{p.brand.name}</span>}
          {p.fulfilledBy === "OWN_STOCK" && (
            <span className="inline-flex items-center gap-1 rounded-full bg-primary-light px-2 py-0.5 normal-case tracking-normal text-primary-dark">
              <Truck className="h-3 w-3" /> {t("fastDelivery")}
            </span>
          )}
          {p.isOrganic && <span className="rounded-full bg-soil-light px-2 py-0.5 normal-case tracking-normal text-soil">{t("organic")}</span>}
        </div>
        <Link href={`/product/${p.slug}`} className="mt-1 line-clamp-2 min-h-[2.75rem] text-[15px] font-semibold leading-snug text-ink hover:text-primary">
          {name}
        </Link>
        {p.ratingCount > 0 && p.ratingAvg && (
          <div className="mt-1 flex items-center gap-1 text-xs text-muted">
            <Star className="h-3.5 w-3.5 fill-accent text-accent" /> {toNum(p.ratingAvg).toFixed(1)} ({p.ratingCount})
          </div>
        )}
        <p className="mt-1 text-xs text-muted">
          {v.packSize} {v.unit}
          {p.variants.length > 1 ? ` +${p.variants.length - 1}` : ""}
        </p>
        <div className="mt-auto pt-2">
          <Price price={v.sellingPrice} mrp={v.mrp} size="sm" />
          <AddToCartButton variantId={v.id} available={available} className="mt-2 w-full" size="sm" />
        </div>
      </div>
    </div>
  );
}

export function ProductGrid({ products }: { products: PublicCard[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:gap-4 lg:grid-cols-4">
      {products.map((p) => (
        <ProductCard key={p.id} p={p} />
      ))}
    </div>
  );
}
