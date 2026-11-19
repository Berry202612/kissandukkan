"use client";

import { useLocale } from "next-intl";
import { useSearchParams } from "next/navigation";
import { usePathname, useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

export function LangToggle({ className }: { className?: string }) {
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const search = useSearchParams();
  const go = (next: "en" | "hi") => {
    if (next === locale) return;
    const qs = search.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { locale: next });
  };
  return (
    <div className={cn("inline-flex overflow-hidden rounded-full border border-white/30 text-xs font-bold", className)} role="group" aria-label="Language">
      {(["en", "hi"] as const).map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => go(l)}
          aria-pressed={locale === l}
          className={cn("min-h-[28px] px-2.5", locale === l ? "bg-accent text-ink" : "text-white hover:bg-white/10")}
        >
          {l === "en" ? "EN" : <span style={{ fontFamily: "system-ui, sans-serif" }}>हिं</span>}
        </button>
      ))}
    </div>
  );
}
