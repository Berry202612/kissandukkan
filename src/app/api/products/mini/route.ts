import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { toNum } from "@/lib/utils";

export async function GET(req: Request) {
  const slugs = (new URL(req.url).searchParams.get("slugs") ?? "").split(",").filter(Boolean).slice(0, 12);
  if (!slugs.length) return NextResponse.json({ items: [] });
  const rows = await db.product.findMany({
    where: { slug: { in: slugs }, status: "PUBLISHED" },
    select: { slug: true, name_en: true, name_hi: true, images: true, category: { select: { slug: true } }, variants: { where: { isActive: true }, select: { sellingPrice: true, mrp: true } } },
  });
  const items = slugs
    .map((s) => rows.find((r) => r.slug === s))
    .filter((r): r is NonNullable<typeof r> => Boolean(r && r.variants.length))
    .map((r) => ({
      slug: r.slug,
      name_en: r.name_en,
      name_hi: r.name_hi,
      image: r.images[0] ?? null,
      categorySlug: r.category.slug,
      price: Math.min(...r.variants.map((v) => Math.min(toNum(v.sellingPrice), toNum(v.mrp)))),
    }));
  return NextResponse.json({ items });
}
