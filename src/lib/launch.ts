import "server-only";
import { db } from "./db";
import { isDemoImage } from "./demo-images";
import { getBusiness, getLaunch } from "./settings";
import { razorpayConfigured, razorpayLive } from "./razorpay";
import { shiprocketConfigured } from "./shiprocket";

export type Check = { label: string; ok: boolean; detail?: string; href?: string };

export async function launchChecklist(): Promise<Check[]> {
  const [b, launch, publishedNoImage, published, hiTotals, policies, taxUnverified, restrictedCount] = await Promise.all([
    getBusiness(),
    getLaunch(),
    db.product.count({ where: { status: "PUBLISHED", images: { isEmpty: true } } }),
    db.product.count({ where: { status: "PUBLISHED" } }),
    Promise.all([
      db.product.count({ where: { status: { not: "ARCHIVED" } } }),
      db.product.count({ where: { status: { not: "ARCHIVED" }, hiReviewed: true } }),
      db.page.count(),
      db.page.count({ where: { hiReviewed: true } }),
      db.article.count(),
      db.article.count({ where: { hiReviewed: true } }),
      db.faq.count(),
      db.faq.count({ where: { hiReviewed: true } }),
    ]),
    db.page.findMany({ where: { isPolicy: true }, select: { legalReviewed: true } }),
    db.taxRule.count({ where: { verified: false } }),
    db.restrictedIngredient.count(),
  ]);
  const demoImageProducts = (await db.product.findMany({ where: { images: { isEmpty: false } }, select: { images: true } })).filter((p) => p.images.some((i) => isDemoImage(i))).length;
  const [pT, pR, gT, gR, aT, aR, fT, fR] = hiTotals;
  const hiTotal = pT + gT + aT + fT;
  const hiPct = hiTotal ? Math.round(((pR + gR + aR + fR) / hiTotal) * 100) : 0;
  const businessFields = [b.legalName, b.gstin, b.registeredAddress, b.grievanceOfficerName, b.grievanceOfficerEmail, b.supportEmail, b.supportHours];
  const licences = [b.pesticideLicenceNo, b.fertilizerLicenceNo, b.seedLicenceNo, b.licenceIssuingAuthority];
  return [
    { label: "Business details complete (legal name, GSTIN, address, grievance officer, support)", ok: businessFields.every(Boolean), detail: `${businessFields.filter(Boolean).length}/${businessFields.length} filled`, href: "/admin/settings/business" },
    { label: "Dealer licence numbers entered (insecticide, fertilizer, seed, authority)", ok: licences.every(Boolean), detail: `${licences.filter(Boolean).length}/4 filled`, href: "/admin/settings/business" },
    { label: "Contact phone and address shown on Contact page (Razorpay website review usually requires both)", ok: Boolean(b.supportPhone && b.registeredAddress), href: "/admin/settings/business" },
    { label: "Razorpay LIVE keys set", ok: razorpayConfigured() && razorpayLive(), detail: razorpayConfigured() ? (razorpayLive() ? "live" : "test keys") : "not configured" },
    { label: "Razorpay webhook secret set", ok: Boolean(process.env.RAZORPAY_WEBHOOK_SECRET) },
    { label: "Razorpay website review completed", ok: launch.razorpayWebsiteReviewed },
    { label: "Shiprocket connected and pickup location set", ok: shiprocketConfigured() && Boolean(b.shiprocketPickupLocation && b.pickupPincode), href: "/admin/settings/business" },
    { label: "Transactional email (Resend) configured", ok: Boolean(process.env.RESEND_API_KEY) },
    { label: "Image storage (Vercel Blob) configured", ok: Boolean(process.env.BLOB_READ_WRITE_TOKEN) },
    { label: "Tax table verified by CA", ok: taxUnverified === 0 && launch.taxTableVerified, detail: `${taxUnverified} rule(s) unverified`, href: "/admin/settings/tax" },
    { label: "Restricted-ingredient list filled from current CIB&RC notifications", ok: restrictedCount > 0, detail: `${restrictedCount} entries`, href: "/admin/restricted" },
    { label: "Products published", ok: published > 0, detail: `${published} published`, href: "/admin/products" },
    { label: "All published products have real images (not the fallback illustration)", ok: published > 0 && publishedNoImage === 0, detail: `${publishedNoImage} without image`, href: "/admin/products?status=PUBLISHED&image=missing" },
    { label: "No DEMO photos linked from other sites (npm run demo-images -- --remove)", ok: demoImageProducts === 0, detail: `${demoImageProducts} product(s) use demo photos`, href: "/admin/products" },
    { label: "Hindi content reviewed by a native speaker", ok: hiPct === 100, detail: `${hiPct}% reviewed`, href: "/admin/products?hi=no" },
    { label: "All policies reviewed by a lawyer / CA", ok: policies.length > 0 && policies.every((p) => p.legalReviewed) && launch.policiesLegalReviewed, detail: `${policies.filter((p) => p.legalReviewed).length}/${policies.length} policies`, href: "/admin/content" },
    { label: "CRON_SECRET set (auto-cancel and review-request jobs)", ok: Boolean(process.env.CRON_SECRET) },
  ];
}
