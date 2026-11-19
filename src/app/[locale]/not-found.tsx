import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Illustration } from "@/components/brand/Illustration";

export default async function NotFound() {
  const t = await getTranslations("errors");
  return (
    <div className="container mt-12">
      <div className="mx-auto flex max-w-xl flex-col items-center text-center">
        <div className="relative">
          <Illustration name="field" className="h-44 w-44 text-primary/70" strokeWidth={2.2} />
          <span className="absolute -right-4 top-0 rounded-full bg-accent px-3 py-1 font-heading text-lg font-bold text-ink">404</span>
        </div>
        <h1 className="mt-4 font-heading text-3xl font-bold">{t("notFoundTitle")}</h1>
        <p className="mt-2 text-muted">{t("notFoundText")}</p>
        <Link href="/" className="mt-6 inline-flex h-12 items-center rounded-xl bg-primary px-6 font-semibold text-white hover:bg-primary-dark">
          {t("goHome")}
        </Link>
      </div>
    </div>
  );
}
