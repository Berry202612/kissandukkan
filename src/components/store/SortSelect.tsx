"use client";

import { useSearchParams } from "next/navigation";
import { usePathname, useRouter } from "@/i18n/navigation";

export function SortSelect({ value, labels }: { value: string; labels: Record<string, string> }) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  return (
    <label className="ml-auto flex items-center gap-2 text-sm">
      <span className="hidden text-muted sm:inline">{labels.label}</span>
      <select
        value={value}
        onChange={(e) => {
          const p = new URLSearchParams(sp.toString());
          p.set("sort", e.target.value);
          p.delete("page");
          router.push(`${pathname}?${p}`);
        }}
        className="h-11 rounded-xl border border-line bg-white px-3 text-sm font-semibold"
        aria-label={labels.label}
      >
        {["relevance", "price_asc", "price_desc", "newest", "rating"].filter((k) => labels[k]).map((k) => (
          <option key={k} value={k}>
            {labels[k]}
          </option>
        ))}
      </select>
    </label>
  );
}
