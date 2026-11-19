import type { MetadataRoute } from "next";
import { db } from "@/lib/db";
import { siteUrl } from "@/lib/utils";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entry = (path: string, lastModified?: Date, priority = 0.6): MetadataRoute.Sitemap[number] => ({
    url: siteUrl(`/en${path}`),
    lastModified,
    priority,
    alternates: { languages: { en: siteUrl(`/en${path}`), hi: siteUrl(`/hi${path}`) } },
  });
  const statics = ["", "/categories", "/crops", "/brands", "/kisan-gyan", "/about", "/contact", "/faq", "/track", "/bulk-enquiry", "/sitemap"].map((p) => entry(p, undefined, p === "" ? 1 : 0.5));
  try {
    const [cats, crops, brands, products, pages, articles] = await Promise.all([
      db.category.findMany({ where: { isActive: true }, select: { slug: true } }),
      db.crop.findMany({ where: { isActive: true }, select: { slug: true } }),
      db.brand.findMany({ where: { isActive: true, products: { some: { status: "PUBLISHED" } } }, select: { slug: true } }),
      db.product.findMany({ where: { status: "PUBLISHED" }, select: { slug: true, updatedAt: true } }),
      db.page.findMany({ where: { isPolicy: true }, select: { slug: true, updatedAt: true } }),
      db.article.findMany({ where: { isPublished: true, publishedAt: { lte: new Date() } }, select: { slug: true, updatedAt: true } }),
    ]);
    return [
      ...statics,
      ...cats.map((c) => entry(`/category/${c.slug}`, undefined, 0.8)),
      ...crops.map((c) => entry(`/crop/${c.slug}`, undefined, 0.7)),
      ...brands.map((b) => entry(`/brand/${b.slug}`)),
      ...products.map((p) => entry(`/product/${p.slug}`, p.updatedAt, 0.9)),
      ...pages.map((p) => entry(`/policies/${p.slug}`, p.updatedAt, 0.3)),
      ...articles.map((a) => entry(`/kisan-gyan/${a.slug}`, a.updatedAt, 0.6)),
    ];
  } catch {
    return statics;
  }
}
