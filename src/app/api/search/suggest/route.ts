import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const q = (url.searchParams.get("q") ?? "").trim().slice(0, 60);
  const locale = url.searchParams.get("locale") === "hi" ? "hi" : "en";
  const category = url.searchParams.get("category") ?? undefined;
  if (q.length < 2) return NextResponse.json({ items: [] });
  const rows = await db.product.findMany({
    where: {
      status: "PUBLISHED",
      ...(category ? { category: { slug: category } } : {}),
      OR: [
        { name_en: { contains: q, mode: "insensitive" } },
        { name_hi: { contains: q, mode: "insensitive" } },
        { technicalContent: { contains: q, mode: "insensitive" } },
        { brand: { name: { contains: q, mode: "insensitive" } } },
      ],
    },
    select: { slug: true, name_en: true, name_hi: true, brand: { select: { name: true } } },
    take: 8,
    orderBy: { isFeatured: "desc" },
  });
  return NextResponse.json(
    { items: rows.map((r) => ({ slug: r.slug, name: locale === "hi" && r.name_hi ? r.name_hi : r.name_en, brand: r.brand?.name ?? null })) },
    { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } },
  );
}
