import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { getLocale } from "next-intl/server";
import { currentUser } from "@/lib/session";
import { AccountNav } from "@/components/store/AccountNav";
import { logoutAction } from "@/app/actions/auth";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "account" });
  return { title: t("title"), robots: { index: false, follow: false } };
}

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  const u = await currentUser();
  if (!u) redirect({ href: "/login", locale });
  const t = await getTranslations("account");
  const tn = await getTranslations("nav");
  return (
    <div className="container mt-6 grid gap-6 lg:grid-cols-[240px_1fr]">
      <aside>
        <p className="mb-3 font-heading text-xl font-bold">{t("hello", { name: (u!.name ?? "").split(" ")[0] })}</p>
        <AccountNav
          labels={{
            overview: t("overview"),
            orders: t("orders"),
            wishlist: t("wishlist"),
            addresses: t("addresses"),
            profile: t("profile"),
            reviews: t("reviews"),
            tickets: t("tickets"),
          }}
        />
        <form action={logoutAction} className="mt-2">
          <input type="hidden" name="locale" value={locale} />
          <button type="submit" className="flex min-h-[44px] w-full items-center rounded-xl px-3 text-left text-sm font-semibold text-danger hover:bg-[#fdecea]">
            {tn("logout")}
          </button>
        </form>
      </aside>
      <div className="min-w-0">{children}</div>
    </div>
  );
}
