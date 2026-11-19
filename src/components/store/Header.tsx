import { Suspense } from "react";
import { getLocale, getTranslations } from "next-intl/server";
import { Mail, Phone, Truck } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Logo } from "@/components/brand/Logo";
import { getNavCategories } from "@/lib/catalog";
import { getBusiness } from "@/lib/settings";
import { tr } from "@/lib/utils";
import { LangToggle } from "./LangToggle";
import { SearchBox } from "./SearchBox";
import { HeaderActions, MobileBottomNav } from "./HeaderActions";
import { MegaMenu } from "./MegaMenu";
import { WhatsAppIcon } from "./icons";

export async function Header() {
  const [locale, t, b] = await Promise.all([getLocale(), getTranslations(), getBusiness()]);
  let cats: Awaited<ReturnType<typeof getNavCategories>> = [];
  try {
    cats = await getNavCategories();
  } catch {
    /* DB unavailable – render header without categories */
  }
  const categories = cats.map((c) => ({
    slug: c.slug,
    name: tr(c, "name", locale),
    illustration: c.illustration,
    subs: c.subCategories.map((s) => ({ slug: s.slug, name: tr(s, "name", locale) })),
  }));

  return (
    <>
      <div className="bg-primary-dark text-[13px] text-white/90">
        <div className="container flex h-9 items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-4">
            {b.supportEmail && (
              <a href={`mailto:${b.supportEmail}`} className="hidden items-center gap-1.5 hover:text-white sm:inline-flex">
                <Mail className="h-3.5 w-3.5" /> {b.supportEmail}
              </a>
            )}
            {b.supportPhone && (
              <a href={`tel:${b.supportPhone.replace(/\s/g, "")}`} className="inline-flex items-center gap-1.5 hover:text-white">
                <Phone className="h-3.5 w-3.5" /> {b.supportPhone}
              </a>
            )}
            {b.whatsappNumber && (
              <a href={`https://wa.me/${b.whatsappNumber.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 hover:text-white">
                <WhatsAppIcon className="h-3.5 w-3.5" /> WhatsApp
              </a>
            )}
          </div>
          <div className="flex items-center gap-4">
            <Link href="/track" className="inline-flex items-center gap-1.5 hover:text-white">
              <Truck className="h-3.5 w-3.5" /> {t("nav.trackOrder")}
            </Link>
            <Suspense fallback={null}>
              <LangToggle />
            </Suspense>
          </div>
        </div>
      </div>
      <header className="sticky top-0 z-40 border-b border-line bg-white/95 backdrop-blur">
        <div className="container flex h-16 items-center gap-3 md:h-[72px] md:gap-6">
          <Link href="/" className="shrink-0" aria-label="KissanDukkan home">
            <Logo />
          </Link>
          <div className="hidden flex-1 md:block">
            <SearchBox categories={categories.map(({ slug, name }) => ({ slug, name }))} />
          </div>
          <HeaderActions />
        </div>
        <div className="container pb-2 md:hidden">
          <SearchBox categories={[]} compact />
        </div>
        <MegaMenu categories={categories} />
      </header>
      <MobileBottomNav />
    </>
  );
}
