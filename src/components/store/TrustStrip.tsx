import { getTranslations } from "next-intl/server";
import { BadgeCheck, FileText, PackageCheck, RefreshCcw, ShieldCheck, Truck } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { getBusiness } from "@/lib/settings";
import { razorpayConfigured } from "@/lib/razorpay";
import { shiprocketConfigured } from "@/lib/shiprocket";
import { db } from "@/lib/db";

/** Provable facts only – each item renders only when the underlying data exists. */
export async function TrustStrip() {
  const [t, b] = await Promise.all([getTranslations("trust"), getBusiness()]);
  let pages: string[] = [];
  try {
    pages = (await db.page.findMany({ select: { slug: true } })).map((p) => p.slug);
  } catch {}
  const licences = [
    b.pesticideLicenceNo && `${t("pesticide")}: ${b.pesticideLicenceNo}`,
    b.fertilizerLicenceNo && `${t("fertilizer")}: ${b.fertilizerLicenceNo}`,
    b.seedLicenceNo && `${t("seed")}: ${b.seedLicenceNo}`,
  ].filter(Boolean) as string[];

  const items: { key: string; icon: React.ReactNode; label: string; detail?: string[]; href?: string }[] = [];
  if (licences.length) items.push({ key: "lic", icon: <BadgeCheck />, label: t("licensed"), detail: [...licences, ...(b.licenceIssuingAuthority ? [`${t("issuedBy")}: ${b.licenceIssuingAuthority}`] : [])] });
  if (b.gstin) items.push({ key: "gst", icon: <FileText />, label: t("gst"), detail: [`GSTIN: ${b.gstin}`] });
  if (pages.includes("genuine-products-sourcing-policy")) items.push({ key: "gen", icon: <PackageCheck />, label: t("genuine"), href: "/policies/genuine-products-sourcing-policy" });
  if (razorpayConfigured()) items.push({ key: "pay", icon: <ShieldCheck />, label: t("secure"), href: "/policies/payment-policy" });
  if (pages.includes("replacement-return-policy")) items.push({ key: "rep", icon: <RefreshCcw />, label: t("replacement"), href: "/policies/replacement-return-policy" });
  // "Across India" is only claimed when the pan-India courier integration is live, not for a partial region list.
  if (shiprocketConfigured()) items.push({ key: "del", icon: <Truck />, label: t("delivery"), href: "/policies/shipping-delivery-policy" });
  if (!items.length) return null;

  return (
    <section className="container mt-6">
      {/* Flex so 2 items look as intentional as 6 (items appear only when backed by real data) */}
      <ul className="flex flex-wrap items-stretch justify-center gap-x-2 gap-y-1 rounded-2xl border border-line bg-white p-2 sm:justify-around">
        {items.map((i) => {
          const inner = (
            <>
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-light text-primary [&_svg]:h-5 [&_svg]:w-5">{i.icon}</span>
              <span className="text-[13px] font-semibold leading-tight text-ink sm:whitespace-nowrap">{i.label}</span>
            </>
          );
          return (
            <li key={i.key} className="min-w-[45%] sm:min-w-0">
              {i.detail ? (
                <details className="group rounded-xl hover:bg-primary-light">
                  <summary className="flex min-h-[56px] cursor-pointer list-none items-center gap-2.5 px-2">{inner}</summary>
                  <div className="px-2 pb-2 text-xs text-muted">
                    {i.detail.map((d) => (
                      <p key={d}>{d}</p>
                    ))}
                  </div>
                </details>
              ) : (
                <Link href={i.href!} className="flex min-h-[56px] items-center gap-2.5 rounded-xl px-2 hover:bg-primary-light">
                  {inner}
                </Link>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
