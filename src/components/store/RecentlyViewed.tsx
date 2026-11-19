"use client";

import * as React from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { formatINR } from "@/lib/utils";
import { ProductImage } from "./ProductImage";

type Mini = { slug: string; name_en: string; name_hi: string; image: string | null; categorySlug: string; price: number };
const KEY = "kd_recent_v1";

export function RecentlyViewed({ current }: { current: string }) {
  const t = useTranslations("product");
  const locale = useLocale();
  const [items, setItems] = React.useState<Mini[]>([]);
  React.useEffect(() => {
    let list: string[] = [];
    try {
      list = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    } catch {}
    const others = list.filter((s) => s !== current).slice(0, 8);
    try {
      localStorage.setItem(KEY, JSON.stringify([current, ...others].slice(0, 12)));
    } catch {}
    if (!others.length) return;
    fetch(`/api/products/mini?slugs=${others.map(encodeURIComponent).join(",")}`)
      .then((r) => (r.ok ? r.json() : { items: [] }))
      .then((d) => setItems(d.items ?? []))
      .catch(() => {});
  }, [current]);
  if (!items.length) return null;
  return (
    <section className="container mt-12">
      <h2 className="section-title mb-4">{t("recentlyViewed")}</h2>
      <div className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4">
        {items.map((p) => (
          <Link key={p.slug} href={`/product/${p.slug}`} className="card w-40 shrink-0 p-3 hover:shadow-lift">
            <ProductImage src={p.image} alt={p.name_en} categorySlug={p.categorySlug} sizes="160px" />
            <p className="mt-2 line-clamp-2 text-sm font-semibold">{locale === "hi" && p.name_hi ? p.name_hi : p.name_en}</p>
            <p className="text-sm font-bold">{formatINR(p.price)}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
