import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ShieldAlert, Star } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { db } from "@/lib/db";
import { getCards, getProductBySlug } from "@/lib/catalog";
import { getBusiness, getDelivery } from "@/lib/settings";
import { siteUrl, toNum, tr, trList } from "@/lib/utils";
import { Breadcrumbs } from "@/components/store/Breadcrumbs";
import { ProductGallery } from "@/components/store/ProductGallery";
import { ProductBuyBox } from "@/components/store/ProductBuyBox";
import { DosageCalculator } from "@/components/store/DosageCalculator";
import { ProductGrid } from "@/components/store/ProductCard";
import { RecentlyViewed } from "@/components/store/RecentlyViewed";
import { QuestionForm } from "@/components/store/QuestionForm";
import { JsonLd } from "@/components/store/JsonLd";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/overlay";
import { Badge } from "@/components/ui/form";
import { isDemoImage } from "@/lib/demo-images";

export const revalidate = 300;

type Props = { params: Promise<{ locale: string; slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const p = await getProductBySlug(slug);
  if (!p) return {};
  const name = tr(p, "name", locale);
  return {
    title: p.brand ? `${name} – ${p.brand.name}` : name,
    description: tr(p, "shortDescription", locale).slice(0, 160) || undefined,
    alternates: { canonical: `/${locale}/product/${slug}`, languages: { en: `/en/product/${slug}`, hi: `/hi/product/${slug}` } },
    openGraph: { images: p.images[0] && !isDemoImage(p.images[0]) ? [p.images[0]] : ["/og.png"] },
  };
}

function Paragraphs({ text }: { text: string }) {
  if (!text.trim()) return null;
  return (
    <div className="space-y-3 leading-relaxed">
      {text.split(/\n{2,}/).map((para, i) => (
        <p key={i} className="whitespace-pre-line">
          {para}
        </p>
      ))}
    </div>
  );
}

function Row({ label, value }: { label: string; value?: React.ReactNode }) {
  if (value == null || value === "" || (Array.isArray(value) && !value.length)) return null;
  return (
    <div className="grid gap-1 border-b border-line py-3 sm:grid-cols-[220px_1fr]">
      <dt className="text-sm font-semibold text-muted">{label}</dt>
      <dd className="text-[15px]">{value}</dd>
    </div>
  );
}

export default async function ProductPage({ params }: Props) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const p = await getProductBySlug(slug);
  if (!p) notFound();
  const [t, b, delivery] = await Promise.all([getTranslations("product"), getBusiness(), getDelivery()]);

  const [reviews, questions, similar] = await Promise.all([
    db.review.findMany({
      where: { productId: p.id, status: "PUBLISHED" },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: { id: true, rating: true, title: true, body: true, photos: true, adminReply: true, createdAt: true, user: { select: { name: true } } },
    }),
    db.question.findMany({ where: { productId: p.id, isPublished: true, answer: { not: null } }, orderBy: { answeredAt: "desc" }, take: 20, select: { id: true, body: true, answer: true } }),
    getCards({ id: { not: p.id }, ...(p.subCategory ? { subCategory: { slug: p.subCategory.slug } } : { category: { slug: p.category.slug } }) }, 4),
  ]);

  const name = tr(p, "name", locale);
  const own = p.fulfilledBy === "OWN_STOCK";
  const extra = p.surfaceOnly ? delivery.surfaceExtraDays : 0;
  const eta = own ? { min: delivery.ownStockMinDays + extra, max: delivery.ownStockMaxDays + extra } : { min: delivery.supplierMinDays + extra, max: delivery.supplierMaxDays + extra };
  const licenceNo = p.licenceType === "PESTICIDE" ? b.pesticideLicenceNo : p.licenceType === "FERTILIZER" ? b.fertilizerLicenceNo : p.licenceType === "SEED" ? b.seedLicenceNo : "";
  const isPesticide = p.category.slug === "crop-protection" || p.licenceType === "PESTICIDE";
  const variants = p.variants.map((v) => ({ id: v.id, packSize: v.packSize, unit: v.unit, mrp: toNum(v.mrp), sellingPrice: Math.min(toNum(v.sellingPrice), toNum(v.mrp)) }));
  const features = trList(p, "keyFeatures", locale);
  const crops = p.crops.map((c) => c.crop);
  const dateFmt = new Intl.DateTimeFormat(locale === "hi" ? "hi-IN" : "en-IN", { dateStyle: "medium", timeZone: "Asia/Kolkata" });
  const safety = tr(p, "safety", locale);
  const howTo = tr(p, "howToUse", locale);
  const dosage = tr(p, "dosage", locale);
  const hasCalc = Boolean(p.doseUnit && (p.dosePerAcre || p.dosePerLitre));

  const offers = variants.map((v) => ({
    "@type": "Offer",
    priceCurrency: "INR",
    price: v.sellingPrice,
    sku: p.variants.find((x) => x.id === v.id)?.sku,
    availability: p.availability[v.id] ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
    url: siteUrl(`/${locale}/product/${p.slug}`),
    itemCondition: "https://schema.org/NewCondition",
  }));
  const productLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name,
    description: tr(p, "shortDescription", locale) || undefined,
    image: p.images.filter((i) => !isDemoImage(i)).length ? p.images.filter((i) => !isDemoImage(i)) : undefined,
    brand: p.brand ? { "@type": "Brand", name: p.brand.name } : undefined,
    sku: p.variants[0]?.sku,
    offers: offers.length === 1 ? offers[0] : { "@type": "AggregateOffer", priceCurrency: "INR", lowPrice: Math.min(...variants.map((v) => v.sellingPrice)), highPrice: Math.max(...variants.map((v) => v.sellingPrice)), offerCount: offers.length, offers },
    ...(p.ratingCount > 0 && p.ratingAvg ? { aggregateRating: { "@type": "AggregateRating", ratingValue: toNum(p.ratingAvg).toFixed(1), reviewCount: p.ratingCount } } : {}),
  };

  return (
    <>
      <Breadcrumbs items={[{ name: tr(p.category, "name", locale), href: `/category/${p.category.slug}` }, ...(p.subCategory ? [{ name: tr(p.subCategory, "name", locale), href: `/category/${p.category.slug}?sub=${p.subCategory.slug}` }] : []), { name }]} />
      <div className="container mt-4 grid gap-8 lg:grid-cols-2">
        <ProductGallery images={p.images} alt={name} categorySlug={p.category.slug} genericNote={t("imageGeneric")} />
        <div>
          {p.brand && (
            <Link href={`/brand/${p.brand.slug}`} className="text-sm font-bold uppercase tracking-wide text-soil hover:underline">
              {p.brand.name}
            </Link>
          )}
          <h1 className="mt-1 font-heading text-2xl font-bold leading-tight md:text-3xl">{name}</h1>
          {p.ratingCount > 0 && p.ratingAvg ? (
            <a href="#reviews" className="mt-2 inline-flex items-center gap-1 text-sm text-muted hover:text-primary">
              <Star className="h-4 w-4 fill-accent text-accent" /> {t("ratingOf", { avg: toNum(p.ratingAvg).toFixed(1), count: p.ratingCount })}
            </a>
          ) : null}
          {tr(p, "shortDescription", locale) && <p className="mt-3 text-muted">{tr(p, "shortDescription", locale)}</p>}
          <div className="mt-2 flex flex-wrap gap-2">
            {p.isOrganic && <Badge tone="soil">{(await getTranslations("common"))("organic")}</Badge>}
            {p.technicalContent && <Badge tone="green">{p.technicalContent}</Badge>}
          </div>
          <div className="mt-5">
            <ProductBuyBox
              productId={p.id}
              variants={variants}
              availability={p.availability}
              fulfilledBy={p.fulfilledBy}
              eta={eta}
              surfaceOnly={p.surfaceOnly}
              shareText={name}
              shareUrl={siteUrl(`/${locale}/product/${p.slug}`)}
            />
          </div>
          <div className="mt-4 space-y-1 text-sm text-muted">
            {p.minShelfLifeMonths ? <p>{t("shelfLife", { months: p.minShelfLifeMonths })}</p> : null}
            {own && p.batchNo && p.expiryDate ? (
              <p>
                {t("batch")}: {p.batchNo} · {t("expiry")}: {dateFmt.format(p.expiryDate)}
              </p>
            ) : (
              <p>{t("batchPrinted")}</p>
            )}
          </div>
          {isPesticide && (
            <p className="mt-4 flex gap-2 rounded-xl border border-accent/50 bg-accent-light p-3 text-sm text-[#6b4f00]">
              <ShieldAlert className="h-5 w-5 shrink-0" /> {t("labelNote")}
            </p>
          )}
        </div>
      </div>

      <div className="container mt-10">
        <Tabs defaultValue="desc" className="card p-4 md:p-6">
          <TabsList>
            <TabsTrigger value="desc">{t("tabDescription")}</TabsTrigger>
            <TabsTrigger value="tech">{t("tabTechnical")}</TabsTrigger>
            {(dosage || howTo || hasCalc) && <TabsTrigger value="dose">{t("tabDosage")}</TabsTrigger>}
            {(safety || isPesticide) && <TabsTrigger value="safety">{t("tabSafety")}</TabsTrigger>}
            <TabsTrigger value="legal">{t("tabLegal")}</TabsTrigger>
          </TabsList>
          <TabsContent value="desc" className="max-w-3xl">
            <Paragraphs text={tr(p, "description", locale)} />
            {features.length > 0 && (
              <>
                <h2 className="mt-6 text-lg font-bold">{t("keyFeatures")}</h2>
                <ul className="mt-2 list-disc space-y-1 pl-5 marker:text-soil">
                  {features.map((f) => (
                    <li key={f}>{f}</li>
                  ))}
                </ul>
              </>
            )}
          </TabsContent>
          <TabsContent value="tech">
            <dl className="max-w-3xl">
              {p.brand && <Row label={t("brand")} value={p.brand.name} />}
              <Row label={t("technicalContent")} value={p.technicalContent} />
              <Row label={t("formulation")} value={p.formulation} />
              <Row label={t("targetPests")} value={p.targetPests.join(", ")} />
              <Row
                label={t("suitableCrops")}
                value={
                  crops.length ? (
                    <span className="flex flex-wrap gap-1.5">
                      {crops.map((c) => (
                        <Link key={c.slug} href={`/crop/${c.slug}`} className="chip hover:bg-accent-light">
                          {tr(c, "name", locale)}
                        </Link>
                      ))}
                    </span>
                  ) : null
                }
              />
              <Row label={t("compatibility")} value={p.compatibility} />
              <Row label={t("packSize")} value={variants.map((v) => `${v.packSize} ${v.unit}`).join(", ")} />
            </dl>
          </TabsContent>
          <TabsContent value="dose" className="max-w-3xl space-y-5">
            {dosage && (
              <div>
                <h2 className="text-lg font-bold">{t("dosage")}</h2>
                <Paragraphs text={dosage} />
              </div>
            )}
            {howTo && (
              <div>
                <h2 className="text-lg font-bold">{t("howToUse")}</h2>
                <Paragraphs text={howTo} />
              </div>
            )}
            {hasCalc && <DosageCalculator perAcre={p.dosePerAcre ? toNum(p.dosePerAcre) : null} perLitre={p.dosePerLitre ? toNum(p.dosePerLitre) : null} unit={p.doseUnit!} variants={variants} />}
          </TabsContent>
          <TabsContent value="safety" className="max-w-3xl space-y-3">
            {isPesticide && <p className="font-semibold text-[#6b4f00]">{t("labelNote")}</p>}
            <Paragraphs text={safety} />
          </TabsContent>
          <TabsContent value="legal">
            <dl className="max-w-3xl">
              <Row label={t("seller")} value={[b.legalName || b.tradeName, b.registeredAddress].filter(Boolean).join(", ")} />
              <Row label={t("dealerLicence")} value={licenceNo ? `${licenceNo}${b.licenceIssuingAuthority ? ` (${b.licenceIssuingAuthority})` : ""}` : null} />
              {b.gstin && <Row label="GSTIN" value={b.gstin} />}
              <Row label={t("manufacturer")} value={p.manufacturerName} />
              <Row label={t("manufacturerAddress")} value={p.manufacturerAddress} />
              <Row label={t("origin")} value={p.countryOfOrigin} />
              <Row label={(await getTranslations("common"))("mrp")} value={`${variants.map((v) => `${v.packSize} ${v.unit}: ₹${v.mrp}`).join(" · ")} — ${(await getTranslations("common"))("inclTaxes")}`} />
              <Row
                label={t("tabLegal")}
                value={
                  <>
                    {t("returnTerms")}{" "}
                    <Link href="/policies/replacement-return-policy" className="link">
                      {t("returnPolicyLink")}
                    </Link>
                  </>
                }
              />
            </dl>
          </TabsContent>
        </Tabs>
      </div>

      <section id="reviews" className="container mt-10 grid gap-6 lg:grid-cols-2">
        <div className="card p-5 md:p-6">
          <h2 className="section-title">{t("reviews")}</h2>
          {reviews.length === 0 ? (
            <p className="mt-3 text-muted">{t("noReviews")}</p>
          ) : (
            <>
              {p.ratingAvg && <p className="mt-2 text-sm text-muted">{t("ratingOf", { avg: toNum(p.ratingAvg).toFixed(1), count: p.ratingCount })}</p>}
              <ul className="mt-4 divide-y divide-line">
                {reviews.map((r) => (
                  <li key={r.id} className="py-4">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex" role="img" aria-label={`${r.rating}/5`}>
                        {[1, 2, 3, 4, 5].map((n) => (
                          <Star key={n} className={n <= r.rating ? "h-4 w-4 fill-accent text-accent" : "h-4 w-4 text-line"} />
                        ))}
                      </span>
                      <Badge tone="green">{t("verified")}</Badge>
                    </div>
                    {r.title && <p className="mt-1 font-semibold">{r.title}</p>}
                    <p className="mt-1 whitespace-pre-line text-[15px]">{r.body}</p>
                    <p className="mt-1 text-xs text-muted">
                      {r.user.name.split(" ")[0]} · {dateFmt.format(r.createdAt)}
                    </p>
                    {r.adminReply && (
                      <div className="mt-2 rounded-xl bg-primary-light p-3 text-sm">
                        <p className="font-semibold text-primary-dark">{t("teamReply")}</p>
                        <p>{r.adminReply}</p>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
        <div className="card p-5 md:p-6">
          <h2 className="section-title">{t("qa")}</h2>
          {questions.length === 0 ? (
            <p className="mt-3 text-muted">{t("noQuestions")}</p>
          ) : (
            <ul className="mt-4 divide-y divide-line">
              {questions.map((q) => (
                <li key={q.id} className="py-3">
                  <p className="font-semibold">Q: {q.body}</p>
                  <p className="mt-1 text-[15px]">
                    <span className="font-semibold text-primary-dark">{t("teamReply")}:</span> {q.answer}
                  </p>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-4">
            <QuestionForm productId={p.id} />
          </div>
        </div>
      </section>

      {similar.length > 0 && (
        <section className="container mt-12">
          <h2 className="section-title mb-4">{t("similar")}</h2>
          <ProductGrid products={similar} />
        </section>
      )}
      <RecentlyViewed current={p.slug} />
      <JsonLd data={productLd} />
    </>
  );
}
