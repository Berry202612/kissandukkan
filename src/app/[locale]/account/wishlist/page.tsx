import { getTranslations, setRequestLocale } from "next-intl/server";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { publicCardSelect, withAvailability, type PublicCard } from "@/lib/catalog";
import { ProductGrid } from "@/components/store/ProductCard";
import { Card } from "@/components/ui/form";

export default async function WishlistPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const u = await requireUser();
  const t = await getTranslations("account");
  const rows = await db.wishlistItem.findMany({ where: { userId: u.id, product: { status: "PUBLISHED" } }, orderBy: { createdAt: "desc" }, select: { product: { select: publicCardSelect } } });
  const products = (await withAvailability(rows.map((r) => r.product))) as PublicCard[];
  return (
    <div>
      <h1 className="mb-4 font-heading text-2xl font-bold">{t("wishlist")}</h1>
      {products.length ? <ProductGrid products={products} /> : <Card className="p-6 text-muted">{t("noWishlist")}</Card>}
    </div>
  );
}
