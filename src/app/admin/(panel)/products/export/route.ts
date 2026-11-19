import { db } from "@/lib/db";
import { canViewCosts, requireStaff } from "@/lib/session";
import { toCsv } from "@/lib/csv";

export async function GET() {
  const u = await requireStaff();
  const costs = canViewCosts(u);
  const variants = await db.productVariant.findMany({
    include: { product: { include: { brand: true, category: true, subCategory: true } } },
    orderBy: [{ product: { name_en: "asc" } }, { sortOrder: "asc" }],
  });
  const rows = variants.map((v) => ({
    product_id: v.productId,
    slug: v.product.slug,
    name_en: v.product.name_en,
    name_hi: v.product.name_hi,
    brand: v.product.brand?.name ?? "",
    category: v.product.category.slug,
    sub_category: v.product.subCategory?.slug ?? "",
    status: v.product.status,
    fulfilled_by: v.product.fulfilledBy,
    technical_content: v.product.technicalContent,
    sku: v.sku,
    pack_size: v.packSize,
    unit: v.unit,
    mrp: v.mrp.toString(),
    ...(costs ? { cost_price: v.costPrice.toString() } : {}),
    selling_price: v.sellingPrice.toString(),
    stock: v.stock,
    weight_grams: v.weightGrams,
    image_status: v.product.imageStatus,
    hi_reviewed: v.product.hiReviewed ? "yes" : "no",
  }));
  return new Response(toCsv(rows), { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="products-${new Date().toISOString().slice(0, 10)}.csv"` } });
}
