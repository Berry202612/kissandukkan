import { useLocale, useTranslations } from "next-intl";
import { ChevronRight } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { JsonLd, breadcrumbLd } from "./JsonLd";

export function Breadcrumbs({ items }: { items: { name: string; href?: string }[] }) {
  const t = useTranslations("common");
  const locale = useLocale();
  const all = [{ name: t("home"), href: "/" }, ...items];
  return (
    <nav aria-label="Breadcrumb" className="container pt-4">
      <ol className="no-scrollbar flex items-center gap-1 overflow-x-auto whitespace-nowrap text-sm text-muted">
        {all.map((i, idx) => (
          <li key={idx} className="flex items-center gap-1">
            {idx > 0 && <ChevronRight className="h-3.5 w-3.5 shrink-0" />}
            {i.href && idx < all.length - 1 ? (
              <Link href={i.href} className="hover:text-primary">
                {i.name}
              </Link>
            ) : (
              <span className="font-medium text-ink" aria-current="page">
                {i.name}
              </span>
            )}
          </li>
        ))}
      </ol>
      <JsonLd data={breadcrumbLd(all.filter((i) => i.href).map((i) => ({ name: i.name, href: `/${locale}${i.href === "/" ? "" : i.href}` })))} />
    </nav>
  );
}
