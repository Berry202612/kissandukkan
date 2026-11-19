"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { ChevronDown } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Illustration } from "@/components/brand/Illustration";
import { cn } from "@/lib/utils";

type Cat = { slug: string; name: string; illustration: string; subs: { slug: string; name: string }[] };

export function MegaMenu({ categories }: { categories: Cat[] }) {
  const t = useTranslations("nav");
  const [open, setOpen] = React.useState<string | null>(null);
  const closeTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const show = (slug: string) => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setOpen(slug);
  };
  const hide = () => {
    closeTimer.current = setTimeout(() => setOpen(null), 120);
  };
  if (!categories.length) return null;
  const current = categories.find((c) => c.slug === open);

  return (
    <div className="relative hidden border-t border-line md:block" onMouseLeave={hide}>
      <div className="container flex flex-wrap items-center gap-x-0.5 gap-y-0 py-1 text-[13.5px] font-semibold">
        {categories.map((c) => (
          <Link
            key={c.slug}
            href={`/category/${c.slug}`}
            onMouseEnter={() => show(c.slug)}
            onFocus={() => show(c.slug)}
            className={cn("inline-flex h-9 shrink-0 items-center gap-1 rounded-lg px-2.5 text-ink hover:bg-primary-light hover:text-primary-dark", open === c.slug && "bg-primary-light text-primary-dark")}
          >
            {c.name}
            {c.subs.length > 0 && <ChevronDown className="h-3.5 w-3.5 opacity-60" />}
          </Link>
        ))}
        <span className="mx-1 hidden h-5 w-px shrink-0 bg-line xl:block" />
        <Link href="/crops" className="inline-flex h-9 shrink-0 items-center rounded-lg px-2.5 text-soil hover:bg-soil-light">{t("shopByCrop")}</Link>
        <Link href="/brands" className="inline-flex h-9 shrink-0 items-center rounded-lg px-2.5 text-soil hover:bg-soil-light">{t("shopByBrand")}</Link>
        <Link href="/kisan-gyan" className="inline-flex h-9 shrink-0 items-center rounded-lg px-2.5 text-soil hover:bg-soil-light">{t("kisanGyan")}</Link>
      </div>
      {current && current.subs.length > 0 && (
        <div className="absolute inset-x-0 top-full z-40 border-b border-line bg-white shadow-lift" onMouseEnter={() => show(current.slug)}>
          <div className="container flex gap-8 py-6">
            <div className="hidden w-48 shrink-0 rounded-2xl bg-primary-light p-4 lg:block">
              <Illustration name={current.illustration} className="h-24 w-24" />
              <Link href={`/category/${current.slug}`} className="mt-3 block font-heading text-lg font-bold text-primary-dark hover:underline" onClick={() => setOpen(null)}>
                {current.name} →
              </Link>
            </div>
            <ul className="grid flex-1 grid-cols-2 content-start gap-x-6 gap-y-1 lg:grid-cols-3">
              {current.subs.map((s) => (
                <li key={s.slug}>
                  <Link href={`/category/${current.slug}?sub=${s.slug}`} className="flex min-h-[40px] items-center rounded-lg px-3 text-[15px] hover:bg-primary-light hover:text-primary-dark" onClick={() => setOpen(null)}>
                    {s.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
