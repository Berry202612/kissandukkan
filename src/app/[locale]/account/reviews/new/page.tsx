import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { canReview } from "@/lib/reviews";
import { tr } from "@/lib/utils";
import { ReviewForm } from "@/components/store/ReviewForm";
import { Card, Notice } from "@/components/ui/form";

export default async function NewReview({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ product?: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { product: slug } = await searchParams;
  const u = await requireUser();
  if (!slug) notFound();
  const product = await db.product.findUnique({ where: { slug }, select: { id: true, name_en: true, name_hi: true } });
  if (!product) notFound();
  const t = await getTranslations("review");
  const [eligible, existing] = await Promise.all([canReview(u.id, product.id), db.review.findUnique({ where: { productId_userId: { productId: product.id, userId: u.id } } })]);
  const name = tr(product, "name", locale);
  return (
    <Card className="p-5">
      <h1 className="font-heading text-2xl font-bold">{t("title", { product: name })}</h1>
      <div className="mt-5">
        {existing ? <Notice>{t("already")}</Notice> : !eligible ? <Notice tone="warn">{t("notEligible")}</Notice> : <ReviewForm productId={product.id} />}
      </div>
    </Card>
  );
}
