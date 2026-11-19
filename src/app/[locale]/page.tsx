import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { db } from "@/lib/db";
import { getCards } from "@/lib/catalog";
import { tr } from "@/lib/utils";
import { Illustration } from "@/components/brand/Illustration";
import { HeroCarousel } from "@/components/store/HeroCarousel";
import { TrustStrip } from "@/components/store/TrustStrip";
import { ProductGrid } from "@/components/store/ProductCard";
import { Newsletter } from "@/components/store/Newsletter";
import type { PublicCard } from "@/lib/catalog";

export const revalidate = 300;

async function safe<T>(p: Promise<T>, fallback: T): Promise<T> {
  try {
    return await p;
  } catch (e) {
    console.error("[home]", e);
    return fallback;
  }
}

const cropIcons: Record<string, string> = { tomato: "tomato", chilli: "chilli", cotton: "cotton", paddy: "paddy", wheat: "wheat", sugarcane: "sugarcane", onion: "onion", grapes: "grapes", banana: "banana", soybean: "soybean" };

function Section({ title, href, viewAll, children }: { title: string; href?: string; viewAll?: string; children: React.ReactNode }) {
  return (
    <section className="container mt-12">
      <div className="mb-5 flex items-end justify-between gap-4">
        <h2 className="section-title">{title}</h2>
        {href && (
          <Link href={href} className="link shrink-0 text-sm">
            {viewAll} →
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("home");
  const tc = await getTranslations("common");

  const [banners, categories, crops, brands, featured, newest, organic, articles] = await Promise.all([
    safe(db.banner.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } }), []),
    safe(db.category.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } }), []),
    safe(db.crop.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } }), []),
    safe(db.brand.findMany({ where: { isActive: true, products: { some: { status: "PUBLISHED" } } }, orderBy: { name: "asc" }, take: 24 }), []),
    safe(getCards({ isFeatured: true }, 8), [] as PublicCard[]),
    safe(getCards({}, 8, { publishedAt: "desc" }), [] as PublicCard[]),
    safe(getCards({ OR: [{ isOrganicPick: true }, { isOrganic: true }] }, 4), [] as PublicCard[]),
    safe(db.article.findMany({ where: { isPublished: true, publishedAt: { lte: new Date() } }, orderBy: { publishedAt: "desc" }, take: 3 }), []),
  ]);

  const slides = banners.map((b) => ({
    id: b.id,
    title: tr(b, "title", locale),
    subtitle: tr(b, "subtitle", locale),
    cta: tr(b, "ctaLabel", locale),
    href: b.ctaHref,
    illustration: b.illustration,
    imageUrl: b.imageUrl,
    theme: b.theme,
  }));
  const hasProducts = featured.length + newest.length > 0;

  return (
    <>
      <HeroCarousel slides={slides} />
      <TrustStrip />

      {categories.length > 0 && (
        <Section title={t("shopByCategory")} href="/categories" viewAll={tc("viewAll")}>
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-5">
            {categories.map((c) => (
              <Link key={c.id} href={`/category/${c.slug}`} className="card group flex flex-col items-center gap-2 p-4 text-center transition hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-lift">
                <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-light transition group-hover:bg-accent-light md:h-20 md:w-20">
                  <Illustration name={c.illustration} className="h-11 w-11 md:h-14 md:w-14" strokeWidth={3.5} />
                </span>
                <span className="text-[13px] font-semibold leading-tight md:text-sm">{tr(c, "name", locale)}</span>
              </Link>
            ))}
          </div>
        </Section>
      )}

      {crops.length > 0 && (
        <Section title={t("shopByCrop")} href="/crops" viewAll={tc("viewAll")}>
          <div className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4 pb-1">
            {crops.map((c) => (
              <Link key={c.id} href={`/crop/${c.slug}`} className="flex w-24 shrink-0 flex-col items-center gap-2 text-center">
                <span className="flex h-20 w-20 items-center justify-center rounded-full border-2 border-soil/20 bg-soil-light hover:border-soil">
                  <Illustration name={cropIcons[c.slug] ?? "sprout"} className="h-11 w-11 text-soil" strokeWidth={3.5} />
                </span>
                <span className="text-sm font-semibold">{tr(c, "name", locale)}</span>
              </Link>
            ))}
          </div>
        </Section>
      )}

      {!hasProducts && (
        <section className="container mt-12">
          <div className="card flex flex-col items-center p-10 text-center">
            <Illustration name="field" className="h-28 w-28" />
            <p className="mt-4 text-muted">{t("noProducts")}</p>
          </div>
        </section>
      )}
      {featured.length > 0 && (
        <Section title={t("featured")}>
          <ProductGrid products={featured} />
        </Section>
      )}
      {newest.length > 0 && (
        <Section title={t("newArrivals")} href="/search?sort=newest" viewAll={tc("viewAll")}>
          <ProductGrid products={newest} />
        </Section>
      )}
      {organic.length > 0 && (
        <Section title={t("organicPicks")} href="/category/organic-farming" viewAll={tc("viewAll")}>
          <ProductGrid products={organic} />
        </Section>
      )}

      {brands.length > 0 && (
        <Section title={t("shopByBrand")} href="/brands" viewAll={tc("viewAll")}>
          <div className="flex flex-wrap gap-2">
            {brands.map((b) => (
              <Link key={b.id} href={`/brand/${b.slug}`} className="inline-flex min-h-[44px] items-center rounded-xl border border-line bg-white px-4 text-sm font-bold text-primary-dark hover:border-primary hover:bg-primary-light">
                {b.name}
              </Link>
            ))}
          </div>
        </Section>
      )}

      <Section title={t("whyTitle")}>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {([1, 2, 3, 4] as const).map((n) => (
            <div key={n} className="card p-5">
              <Illustration name={["sack", "seed-packet", "wheel", "sprout"][n - 1]} className="h-12 w-12 text-soil" />
              <h3 className="mt-3 text-lg font-bold">{t(`why${n}Title`)}</h3>
              <p className="mt-1 text-sm leading-relaxed text-muted">{t(`why${n}`)}</p>
            </div>
          ))}
        </div>
      </Section>

      {articles.length > 0 && (
        <Section title={t("gyanTitle")} href="/kisan-gyan" viewAll={tc("viewAll")}>
          <div className="grid gap-4 md:grid-cols-3">
            {articles.map((a) => (
              <Link key={a.id} href={`/kisan-gyan/${a.slug}`} className="card group flex gap-4 p-5 hover:shadow-lift">
                <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-primary-light">
                  <Illustration name={a.illustration} className="h-10 w-10" />
                </span>
                <span>
                  <span className="block font-heading text-lg font-bold leading-snug text-primary-dark group-hover:underline">{tr(a, "title", locale)}</span>
                  <span className="mt-1 line-clamp-2 block text-sm text-muted">{tr(a, "excerpt", locale)}</span>
                </span>
              </Link>
            ))}
          </div>
        </Section>
      )}

      <Newsletter />

      <section className="container mt-12">
        <h2 className="font-heading text-xl font-bold">{t("seoTitle")}</h2>
        <p className="mt-2 max-w-4xl text-sm leading-relaxed text-muted">{t("seoText")}</p>
      </section>
    </>
  );
}
