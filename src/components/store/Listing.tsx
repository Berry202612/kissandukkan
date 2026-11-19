import { getLocale, getTranslations } from "next-intl/server";
import { SlidersHorizontal } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { getFacets, listProducts, type ListingFilters } from "@/lib/catalog";
import { Illustration } from "@/components/brand/Illustration";
import { ProductGrid } from "./ProductCard";
import { SortSelect } from "./SortSelect";

export type SP = Record<string, string | string[] | undefined>;

const arr = (v: string | string[] | undefined) => (v == null ? [] : Array.isArray(v) ? v : [v]).filter(Boolean);
const num = (v: string | string[] | undefined) => {
  const s = Array.isArray(v) ? v[0] : v;
  const n = s ? Number(s) : NaN;
  return Number.isFinite(n) && n >= 0 ? n : undefined;
};
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export function parseFilters(sp: SP, fixed: Partial<ListingFilters> = {}): ListingFilters {
  const sort = one(sp.sort);
  return {
    q: one(sp.q)?.slice(0, 80),
    category: one(sp.category),
    sub: arr(sp.sub),
    brand: arr(sp.brand),
    crop: arr(sp.crop),
    pack: arr(sp.pack),
    minPrice: num(sp.min),
    maxPrice: num(sp.max),
    organic: one(sp.organic) === "1",
    inStock: one(sp.instock) === "1",
    fast: one(sp.fast) === "1",
    sort: (["relevance", "price_asc", "price_desc", "newest", "rating"].includes(sort ?? "") ? sort : "relevance") as ListingFilters["sort"],
    page: num(sp.page) ?? 1,
    ...fixed,
  };
}

function qs(sp: SP, patch: Record<string, string | undefined>) {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) for (const x of arr(v)) p.append(k, x);
  for (const [k, v] of Object.entries(patch)) {
    p.delete(k);
    if (v) p.set(k, v);
  }
  const s = p.toString();
  return s ? `?${s}` : "";
}

export async function Listing({
  basePath,
  sp,
  fixed,
  title,
  intro,
  seoText,
  hide = [],
  banner,
}: {
  basePath: string;
  sp: SP;
  fixed: Partial<ListingFilters>;
  title: string;
  intro?: string;
  seoText?: string;
  hide?: ("sub" | "brand" | "crop")[];
  banner?: string;
}) {
  const t = await getTranslations("listing");
  const tc = await getTranslations("common");
  const locale = await getLocale();
  const f = parseFilters(sp, fixed);
  const [result, facets] = await Promise.all([listProducts(f), getFacets(f)]);
  const hasRatings = result.items.some((p) => p.ratingCount > 0);
  const name = (x: { name_en: string; name_hi: string }) => (locale === "hi" && x.name_hi ? x.name_hi : x.name_en);
  const hasActive = Boolean(f.sub?.length || f.brand?.length || (!fixed.crop && f.crop?.length) || f.pack?.length || f.minPrice != null || f.maxPrice != null || f.organic || f.inStock || f.fast);

  const filters = (
    <form method="get" action={basePath === "/search" ? `/${locale}/search` : `/${locale}${basePath}`} className="space-y-5">
      {f.q && <input type="hidden" name="q" value={f.q} />}
      {f.sort && f.sort !== "relevance" && <input type="hidden" name="sort" value={f.sort} />}
      {!hide.includes("sub") && facets.subs.length > 0 && (
        <fieldset>
          <legend className="mb-2 font-heading text-base font-bold text-primary-dark">{t("subCategory")}</legend>
          {facets.subs.map((s) => (
            <label key={s.slug} className="flex min-h-[36px] items-center gap-2.5 text-sm">
              <input type="checkbox" name="sub" value={s.slug} defaultChecked={f.sub?.includes(s.slug)} className="h-5 w-5 accent-primary" />
              {name(s)}
            </label>
          ))}
        </fieldset>
      )}
      {!hide.includes("brand") && facets.brands.length > 0 && (
        <fieldset>
          <legend className="mb-2 font-heading text-base font-bold text-primary-dark">{t("brand")}</legend>
          <div className="max-h-56 overflow-y-auto pr-1">
            {facets.brands.map((b) => (
              <label key={b.slug} className="flex min-h-[36px] items-center gap-2.5 text-sm">
                <input type="checkbox" name="brand" value={b.slug} defaultChecked={f.brand?.includes(b.slug)} className="h-5 w-5 accent-primary" />
                {b.name}
              </label>
            ))}
          </div>
        </fieldset>
      )}
      {!hide.includes("crop") && facets.crops.length > 0 && (
        <fieldset>
          <legend className="mb-2 font-heading text-base font-bold text-primary-dark">{t("crop")}</legend>
          <div className="max-h-56 overflow-y-auto pr-1">
            {facets.crops.map((c) => (
              <label key={c.slug} className="flex min-h-[36px] items-center gap-2.5 text-sm">
                <input type="checkbox" name="crop" value={c.slug} defaultChecked={f.crop?.includes(c.slug)} className="h-5 w-5 accent-primary" />
                {name(c)}
              </label>
            ))}
          </div>
        </fieldset>
      )}
      <fieldset>
        <legend className="mb-2 font-heading text-base font-bold text-primary-dark">{t("price")}</legend>
        <div className="flex gap-2">
          <input type="number" name="min" min={0} defaultValue={f.minPrice} placeholder={t("min")} aria-label={t("min")} className="h-11 w-full rounded-xl border border-line px-3 text-sm" />
          <input type="number" name="max" min={0} defaultValue={f.maxPrice} placeholder={t("max")} aria-label={t("max")} className="h-11 w-full rounded-xl border border-line px-3 text-sm" />
        </div>
      </fieldset>
      {facets.packs.length > 0 && (
        <fieldset>
          <legend className="mb-2 font-heading text-base font-bold text-primary-dark">{t("packSize")}</legend>
          <div className="flex flex-wrap gap-2">
            {facets.packs.map((p) => {
              const [size, unit] = p.split("|");
              return (
                <label key={p} className="cursor-pointer">
                  <input type="checkbox" name="pack" value={p} defaultChecked={f.pack?.includes(p)} className="peer sr-only" />
                  <span className="inline-flex min-h-[36px] items-center rounded-lg border border-line bg-white px-3 text-sm peer-checked:border-primary peer-checked:bg-primary-light peer-checked:font-semibold peer-focus-visible:ring-2 peer-focus-visible:ring-accent">
                    {size} {unit}
                  </span>
                </label>
              );
            })}
          </div>
        </fieldset>
      )}
      <fieldset className="space-y-1">
        {facets.hasOrganic && (
          <label className="flex min-h-[36px] items-center gap-2.5 text-sm">
            <input type="checkbox" name="organic" value="1" defaultChecked={f.organic} className="h-5 w-5 accent-primary" /> {t("organicOnly")}
          </label>
        )}
        <label className="flex min-h-[36px] items-center gap-2.5 text-sm">
          <input type="checkbox" name="instock" value="1" defaultChecked={f.inStock} className="h-5 w-5 accent-primary" /> {t("inStockOnly")}
        </label>
        <label className="flex min-h-[36px] items-center gap-2.5 text-sm">
          <input type="checkbox" name="fast" value="1" defaultChecked={f.fast} className="h-5 w-5 accent-primary" /> {t("fastOnly")}
        </label>
      </fieldset>
      <div className="flex gap-2">
        <button type="submit" className="h-11 flex-1 rounded-xl bg-primary font-semibold text-white hover:bg-primary-dark">{t("apply")}</button>
        {hasActive && (
          <Link href={`${basePath}${f.q ? `?q=${encodeURIComponent(f.q)}` : ""}`} className="inline-flex h-11 items-center rounded-xl px-4 text-sm font-semibold text-primary hover:bg-primary-light">
            {t("clear")}
          </Link>
        )}
      </div>
    </form>
  );

  return (
    <div className="container mt-4">
      {banner ? (
        <div className="relative overflow-hidden rounded-3xl border border-line">
          {/* eslint-disable-next-line @next/next/no-img-element -- local SVG creative */}
          <img src={banner} alt="" className="absolute inset-0 h-full w-full object-cover object-right" />
          <div className="relative flex min-h-[150px] flex-col justify-center gap-1 bg-gradient-to-r from-white/90 via-white/70 to-transparent px-6 py-6 md:min-h-[190px] md:w-2/3 md:px-10">
            <h1 className="font-heading text-3xl font-bold md:text-4xl">{title}</h1>
            {intro && <p className="max-w-xl text-ink/80">{intro}</p>}
            <p className="text-sm font-semibold text-muted">{tc("results", { count: result.total })}</p>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-1">
          <h1 className="font-heading text-3xl font-bold">{title}</h1>
          {intro && <p className="max-w-3xl text-muted">{intro}</p>}
          <p className="text-sm text-muted">{tc("results", { count: result.total })}</p>
        </div>
      )}
      <div className="mt-6 grid gap-6 lg:grid-cols-[260px_1fr]">
        <aside className="hidden lg:block">
          <div className="card sticky top-40 p-5">{filters}</div>
        </aside>
        <div>
          <div className="mb-4 flex items-center justify-between gap-3">
            <details className="lg:hidden">
              <summary className="inline-flex h-11 cursor-pointer list-none items-center gap-2 rounded-xl border border-line bg-white px-4 text-sm font-semibold">
                <SlidersHorizontal className="h-4 w-4" /> {t("filters")}
              </summary>
              <div className="card fixed inset-x-3 bottom-20 top-24 z-50 overflow-y-auto p-5">{filters}</div>
            </details>
            <SortSelect value={f.sort ?? "relevance"} labels={{ label: t("sort"), relevance: t("sortRelevance"), price_asc: t("sortPriceAsc"), price_desc: t("sortPriceDesc"), newest: t("sortNewest"), ...(hasRatings ? { rating: t("sortRating") } : {}) }} />
          </div>
          {result.items.length ? (
            <ProductGrid products={result.items} />
          ) : (
            <div className="card flex flex-col items-center p-10 text-center">
              <Illustration name="sprout" className="h-24 w-24 text-primary/60" />
              <p className="mt-4 font-heading text-xl font-bold text-primary-dark">{t("empty")}</p>
              <p className="mt-1 text-sm text-muted">{t("emptyHint")}</p>
            </div>
          )}
          {result.pages > 1 && (
            <nav className="mt-8 flex items-center justify-center gap-3" aria-label="Pagination">
              {result.page > 1 && (
                <Link href={`${basePath}${qs(sp, { page: String(result.page - 1) })}`} className="inline-flex h-11 items-center rounded-xl border border-line bg-white px-4 font-semibold hover:bg-primary-light">
                  ← {tc("prev")}
                </Link>
              )}
              <span className="text-sm text-muted">{tc("page", { page: result.page, pages: result.pages })}</span>
              {result.page < result.pages && (
                <Link href={`${basePath}${qs(sp, { page: String(result.page + 1) })}`} className="inline-flex h-11 items-center rounded-xl border border-line bg-white px-4 font-semibold hover:bg-primary-light">
                  {tc("next")} →
                </Link>
              )}
            </nav>
          )}
          {seoText && <div className="mt-12 max-w-4xl text-sm leading-relaxed text-muted">{seoText}</div>}
        </div>
      </div>
    </div>
  );
}
