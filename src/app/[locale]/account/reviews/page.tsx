import { getTranslations, setRequestLocale } from "next-intl/server";
import { Star } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { reviewableProducts } from "@/lib/reviews";
import { tr } from "@/lib/utils";
import { Badge, Card } from "@/components/ui/form";

export default async function MyReviews({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const u = await requireUser();
  const t = await getTranslations("account");
  const [reviews, pending] = await Promise.all([
    db.review.findMany({ where: { userId: u.id }, orderBy: { createdAt: "desc" }, include: { product: { select: { slug: true, name_en: true, name_hi: true } } } }),
    reviewableProducts(u.id),
  ]);
  return (
    <div className="space-y-5">
      {pending.length > 0 && (
        <Card className="p-5">
          <h2 className="font-heading text-xl font-bold">{t("toReview")}</h2>
          <ul className="mt-3 divide-y divide-line">
            {pending.map((p) => (
              <li key={p.productId} className="flex items-center justify-between gap-3 py-2">
                <span className="text-sm font-medium">{tr(p, "name", locale)}</span>
                <Link href={`/account/reviews/new?product=${p.productSlug}`} className="link shrink-0 text-sm">
                  {t("writeReview")}
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}
      <Card className="p-5">
        <h1 className="font-heading text-2xl font-bold">{t("reviews")}</h1>
        {reviews.length === 0 ? (
          <p className="mt-2 text-muted">{t("noReviewsYet")}</p>
        ) : (
          <ul className="mt-3 divide-y divide-line">
            {reviews.map((r) => (
              <li key={r.id} className="py-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Link href={`/product/${r.product.slug}`} className="font-semibold hover:text-primary">
                    {tr(r.product, "name", locale)}
                  </Link>
                  <Badge tone={r.status === "PUBLISHED" ? "green" : r.status === "HIDDEN" ? "gray" : "gold"}>
                    {r.status === "PUBLISHED" ? t("published") : r.status === "HIDDEN" ? t("hidden") : t("pendingModeration")}
                  </Badge>
                </div>
                <span className="mt-1 inline-flex">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <Star key={n} className={n <= r.rating ? "h-4 w-4 fill-accent text-accent" : "h-4 w-4 text-line"} />
                  ))}
                </span>
                <p className="mt-1 text-sm">{r.body}</p>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
