"use client";

import * as React from "react";
import { useLocale, useTranslations } from "next-intl";
import { Search } from "lucide-react";
import { useRouter, Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

type Suggestion = { slug: string; name: string; brand: string | null };

export function SearchBox({ categories, compact }: { categories: { slug: string; name: string }[]; compact?: boolean }) {
  const t = useTranslations("common");
  const locale = useLocale();
  const router = useRouter();
  const [q, setQ] = React.useState("");
  const [cat, setCat] = React.useState("");
  const [items, setItems] = React.useState<Suggestion[]>([]);
  const [open, setOpen] = React.useState(false);
  const [active, setActive] = React.useState(-1);
  const listId = React.useId();

  React.useEffect(() => {
    if (q.trim().length < 2) {
      setItems([]);
      return;
    }
    const ctrl = new AbortController();
    const id = setTimeout(() => {
      fetch(`/api/search/suggest?q=${encodeURIComponent(q.trim())}&locale=${locale}${cat ? `&category=${cat}` : ""}`, { signal: ctrl.signal })
        .then((r) => (r.ok ? r.json() : { items: [] }))
        .then((d) => {
          setItems(d.items ?? []);
          setOpen(true);
          setActive(-1);
        })
        .catch(() => {});
    }, 200);
    return () => {
      clearTimeout(id);
      ctrl.abort();
    };
  }, [q, cat, locale]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (active >= 0 && items[active]) {
      router.push(`/product/${items[active].slug}`);
    } else {
      const params = new URLSearchParams();
      if (q.trim()) params.set("q", q.trim());
      if (cat) params.set("category", cat);
      router.push(`/search?${params}`);
    }
    setOpen(false);
  };

  return (
    <form onSubmit={submit} className="relative" role="search">
      <div className="flex h-11 overflow-hidden rounded-xl border-2 border-primary/20 bg-cream focus-within:border-primary">
        {!compact && categories.length > 0 && (
          <select
            value={cat}
            onChange={(e) => setCat(e.target.value)}
            aria-label={t("allCategories")}
            className="hidden max-w-[11rem] border-r border-line bg-primary-light px-3 text-sm font-semibold text-primary-dark focus:outline-none lg:block"
          >
            <option value="">{t("allCategories")}</option>
            {categories.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.name}
              </option>
            ))}
          </select>
        )}
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onFocus={() => items.length && setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") setActive((a) => Math.min(a + 1, items.length - 1));
            if (e.key === "ArrowUp") setActive((a) => Math.max(a - 1, -1));
            if (e.key === "Escape") setOpen(false);
          }}
          placeholder={t("searchPlaceholder")}
          aria-label={t("search")}
          role="combobox"
          aria-expanded={open && items.length > 0}
          aria-controls={listId}
          aria-autocomplete="list"
          className="min-w-0 flex-1 bg-transparent px-3.5 text-[15px] focus:outline-none"
        />
        <button type="submit" className="flex w-12 items-center justify-center bg-primary text-white hover:bg-primary-dark" aria-label={t("search")}>
          <Search className="h-5 w-5" />
        </button>
      </div>
      {open && items.length > 0 && (
        <ul id={listId} role="listbox" className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-xl border border-line bg-white shadow-lift">
          {items.map((s, i) => (
            <li key={s.slug} role="option" aria-selected={i === active}>
              <Link
                href={`/product/${s.slug}`}
                className={cn("flex min-h-[44px] flex-col justify-center px-4 py-2 text-sm hover:bg-primary-light", i === active && "bg-primary-light")}
                onClick={() => setOpen(false)}
              >
                <span className="font-medium text-ink">{s.name}</span>
                {s.brand && <span className="text-xs text-muted">{s.brand}</span>}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </form>
  );
}
