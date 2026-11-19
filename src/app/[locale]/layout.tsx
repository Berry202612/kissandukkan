import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Toaster } from "sonner";
import { routing } from "@/i18n/routing";
import { fontVars } from "@/app/fonts";
import { Header } from "@/components/store/Header";
import { Footer } from "@/components/store/Footer";
import { CartProvider } from "@/components/store/cart-context";
import { CookieBanner } from "@/components/store/CookieBanner";
import { JsonLd, organizationLd } from "@/components/store/JsonLd";
import { getBusiness } from "@/lib/settings";
import { siteUrl } from "@/lib/utils";
import "../globals.css";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export const viewport: Viewport = { themeColor: "#1E6B3A", width: "device-width", initialScale: 1 };

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "meta" });
  return {
    metadataBase: new URL(siteUrl()),
    title: { default: t("title"), template: `%s | ${locale === "hi" ? "किसान दुकान" : "KissanDukkan"}` },
    description: t("description"),
    applicationName: "KissanDukkan",
    icons: { icon: [{ url: "/favicon.ico" }, { url: "/icon.svg", type: "image/svg+xml" }], apple: "/apple-touch-icon.png" },
    openGraph: { type: "website", siteName: "KissanDukkan", locale: locale === "hi" ? "hi_IN" : "en_IN", images: ["/og.png"] },
    twitter: { card: "summary_large_image" },
    alternates: { canonical: `/${locale}`, languages: { en: "/en", hi: "/hi", "x-default": "/en" } },
  };
}

export default async function LocaleLayout({ children, params }: { children: React.ReactNode; params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const b = await getBusiness();
  return (
    <html lang={locale} className={fontVars}>
      <body className="min-h-screen font-sans">
        <NextIntlClientProvider>
          <CartProvider>
            <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[60] focus:rounded-xl focus:bg-white focus:p-3">
              Skip to content
            </a>
            <Header />
            <main id="main" className="min-h-[60vh] pb-8">
              {children}
            </main>
            <Footer />
            <CookieBanner />
            <Toaster position="top-center" richColors toastOptions={{ style: { borderRadius: 14, fontFamily: "var(--font-noto)" } }} />
          </CartProvider>
        </NextIntlClientProvider>
        <JsonLd data={organizationLd(b)} />
      </body>
    </html>
  );
}
