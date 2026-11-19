import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Logo } from "@/components/brand/Logo";
import { Illustration } from "@/components/brand/Illustration";
import { getBusiness } from "@/lib/settings";
import { db } from "@/lib/db";
import { razorpayConfigured } from "@/lib/razorpay";
import { tr } from "@/lib/utils";
import { FacebookIcon, InstagramIcon, PaymentBadges, WhatsAppIcon, YouTubeIcon } from "./icons";

async function safe<T>(p: Promise<T>, fallback: T) {
  try {
    return await p;
  } catch {
    return fallback;
  }
}

export async function Footer() {
  const [locale, t, b] = await Promise.all([getLocale(), getTranslations("footer"), getBusiness()]);
  const [cats, policies] = await Promise.all([
    safe(db.category.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" }, select: { slug: true, name_en: true, name_hi: true } }), []),
    safe(db.page.findMany({ where: { isPolicy: true }, orderBy: { sortOrder: "asc" }, select: { slug: true, title_en: true, title_hi: true } }), []),
  ]);
  const socials = [
    { href: b.instagram, label: "Instagram", Icon: InstagramIcon },
    { href: b.facebook, label: "Facebook", Icon: FacebookIcon },
    { href: b.youtube, label: "YouTube", Icon: YouTubeIcon },
  ].filter((s) => s.href);
  const tt = await getTranslations("trust");
  const tn = await getTranslations("nav");
  const licences = [
    b.pesticideLicenceNo && `${tt("pesticide")}: ${b.pesticideLicenceNo}`,
    b.fertilizerLicenceNo && `${tt("fertilizer")}: ${b.fertilizerLicenceNo}`,
    b.seedLicenceNo && `${tt("seed")}: ${b.seedLicenceNo}`,
  ].filter(Boolean) as string[];
  const year = new Date().getFullYear();

  return (
    <footer className="relative mt-16 bg-primary-dark pb-20 text-white/85 md:pb-0">
      <Illustration name="wheat" className="pointer-events-none absolute right-6 top-6 hidden h-32 w-32 text-white/10 lg:block" />
      <div className="container grid gap-10 py-12 md:grid-cols-2 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <Logo variant="white" showHindi />
          <p className="mt-4 max-w-sm text-sm leading-relaxed">{t("about")}</p>
          {(b.supportEmail || b.supportPhone || b.whatsappNumber || b.supportHours) && (
            <div className="mt-5 space-y-1.5 text-sm">
              <p className="font-heading text-base font-bold text-white">{t("contact")}</p>
              {b.supportEmail && (
                <p>
                  <a href={`mailto:${b.supportEmail}`} className="hover:text-accent">{b.supportEmail}</a>
                </p>
              )}
              {b.supportPhone && (
                <p>
                  <a href={`tel:${b.supportPhone.replace(/\s/g, "")}`} className="hover:text-accent">{b.supportPhone}</a>
                </p>
              )}
              {b.whatsappNumber && (
                <p>
                  <a href={`https://wa.me/${b.whatsappNumber.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 hover:text-accent">
                    <WhatsAppIcon className="h-4 w-4" /> WhatsApp
                  </a>
                </p>
              )}
              {b.supportHours && <p className="text-white/70">{b.supportHours}</p>}
              {b.registeredAddress && <p className="text-white/70">{b.registeredAddress}</p>}
            </div>
          )}
          {socials.length > 0 && (
            <div className="mt-5">
              <p className="mb-2 text-sm font-semibold text-white">{t("follow")}</p>
              <div className="flex gap-2">
                {socials.map(({ href, label, Icon }) => (
                  <a key={label} href={href} target="_blank" rel="noopener noreferrer" aria-label={label} className="tap inline-flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20">
                    <Icon className="h-5 w-5" />
                  </a>
                ))}
              </div>
            </div>
          )}
          {(b.androidAppUrl || b.iosAppUrl) && (
            <div className="mt-5 flex gap-3 text-sm">
              <span className="font-semibold text-white">{t("getApp")}:</span>
              {b.androidAppUrl && <a href={b.androidAppUrl} className="underline hover:text-accent" target="_blank" rel="noopener noreferrer">Android</a>}
              {b.iosAppUrl && <a href={b.iosAppUrl} className="underline hover:text-accent" target="_blank" rel="noopener noreferrer">iOS</a>}
            </div>
          )}
        </div>
        {cats.length > 0 && (
          <div>
            <p className="font-heading text-base font-bold text-white">{t("shop")}</p>
            <ul className="mt-3 space-y-1.5 text-sm">
              {cats.map((c) => (
                <li key={c.slug}>
                  <Link href={`/category/${c.slug}`} className="hover:text-accent">{tr(c, "name", locale)}</Link>
                </li>
              ))}
            </ul>
          </div>
        )}
        <div>
          <p className="font-heading text-base font-bold text-white">{t("help")}</p>
          <ul className="mt-3 space-y-1.5 text-sm">
            <li><Link href="/about" className="hover:text-accent">{t("aboutUs")}</Link></li>
            <li><Link href="/contact" className="hover:text-accent">{t("contactUs")}</Link></li>
            <li><Link href="/faq" className="hover:text-accent">{t("faq")}</Link></li>
            <li><Link href="/track" className="hover:text-accent">{tn("trackOrder")}</Link></li>
            <li><Link href="/bulk-enquiry" className="hover:text-accent">{t("bulk")}</Link></li>
            <li><Link href="/kisan-gyan" className="hover:text-accent">{tn("kisanGyan")}</Link></li>
            <li><Link href="/sitemap" className="hover:text-accent">{t("sitemap")}</Link></li>
          </ul>
        </div>
        {policies.length > 0 && (
          <div>
            <p className="font-heading text-base font-bold text-white">{t("policies")}</p>
            <ul className="mt-3 space-y-1.5 text-sm">
              {policies.map((p) => (
                <li key={p.slug}>
                  <Link href={`/policies/${p.slug}`} className="hover:text-accent">{tr(p, "title", locale)}</Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
      <div className="border-t border-white/10">
        <div className="container flex flex-col gap-4 py-6 text-xs md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            {razorpayConfigured() && (
              <>
                <PaymentBadges />
                <p className="pt-1">{t("securedBy")}</p>
              </>
            )}
          </div>
          <div className="space-y-1 md:text-right">
            {licences.length > 0 && <p>{licences.join(" · ")}{b.licenceIssuingAuthority ? ` (${b.licenceIssuingAuthority})` : ""}</p>}
            {b.gstin && <p>{t("gstin")}: {b.gstin}</p>}
            <p>
              {t("madeInIndia")} · © {year} {b.legalName || b.tradeName}. {t("rights")}
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
