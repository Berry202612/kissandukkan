import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { db } from "@/lib/db";
import { tr } from "@/lib/utils";
import { Breadcrumbs } from "@/components/store/Breadcrumbs";

export const revalidate = 3600;

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "sitemap" });
  return { title: t("title") };
}

export default async function HtmlSitemap({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [t, tn, tf, tl] = await Promise.all([getTranslations("sitemap"), getTranslations("nav"), getTranslations("footer"), getTranslations("listing")]);
  const [cats, crops, brands, policies, articles, products] = await Promise.all([
    db.category.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } }),
    db.crop.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } }),
    db.brand.findMany({ where: { isActive: true, products: { some: { status: "PUBLISHED" } } }, orderBy: { name: "asc" } }),
    db.page.findMany({ where: { isPolicy: true }, orderBy: { sortOrder: "asc" } }),
    db.article.findMany({ where: { isPublished: true, publishedAt: { lte: new Date() } }, orderBy: { publishedAt: "desc" } }),
    db.product.findMany({ where: { status: "PUBLISHED" }, select: { slug: true, name_en: true, name_hi: true }, orderBy: { name_en: "asc" }, take: 1000 }),
  ]);
  const Col = ({ title, links }: { title: string; links: { href: string; label: string }[] }) =>
    links.length ? (
      <section>
        <h2 className="font-heading text-lg font-bold">{title}</h2>
        <ul className="mt-2 space-y-1 text-sm">
          {links.map((l) => (
            <li key={l.href}>
              <Link href={l.href} className="hover:text-primary hover:underline">
                {l.label}
              </Link>
            </li>
          ))}
        </ul>
      </section>
    ) : null;
  return (
    <>
      <Breadcrumbs items={[{ name: t("title") }]} />
      <div className="container mt-4">
        <h1 className="font-heading text-3xl font-bold">{t("title")}</h1>
        <div className="mt-6 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <Col
            title={t("pages")}
            links={[
              { href: "/", label: (await getTranslations("common"))("home") },
              { href: "/about", label: tf("aboutUs") },
              { href: "/contact", label: tf("contactUs") },
              { href: "/faq", label: tf("faq") },
              { href: "/track", label: tn("trackOrder") },
              { href: "/bulk-enquiry", label: tf("bulk") },
              { href: "/kisan-gyan", label: tn("kisanGyan") },
            ]}
          />
          <Col title={tl("categoriesTitle")} links={cats.map((c) => ({ href: `/category/${c.slug}`, label: tr(c, "name", locale) }))} />
          <Col title={tl("cropsTitle")} links={crops.map((c) => ({ href: `/crop/${c.slug}`, label: tr(c, "name", locale) }))} />
          <Col title={tl("brandsTitle")} links={brands.map((b) => ({ href: `/brand/${b.slug}`, label: b.name }))} />
          <Col title={tf("policies")} links={policies.map((p) => ({ href: `/policies/${p.slug}`, label: tr(p, "title", locale) }))} />
          <Col title={tn("kisanGyan")} links={articles.map((a) => ({ href: `/kisan-gyan/${a.slug}`, label: tr(a, "title", locale) }))} />
        </div>
        {products.length > 0 && (
          <div className="mt-10">
            <Col title={tf("shop")} links={products.map((p) => ({ href: `/product/${p.slug}`, label: tr(p, "name", locale) }))} />
          </div>
        )}
      </div>
    </>
  );
}
