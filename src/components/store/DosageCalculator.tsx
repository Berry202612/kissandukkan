"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Calculator } from "lucide-react";

type Variant = { packSize: string; unit: string };

const toBase = (qty: number, unit: string) => {
  const u = unit.toLowerCase();
  if (u === "l" || u === "litre" || u === "ltr") return { v: qty * 1000, base: "ml" };
  if (u === "kg") return { v: qty * 1000, base: "g" };
  return { v: qty, base: u };
};

/** Suggest the fewest packs that cover the need (greedy, largest first, then top-up with the smallest). */
function suggest(needBase: number, base: string, variants: Variant[]) {
  const packs = variants
    .map((v) => ({ label: `${v.packSize} ${v.unit}`, ...toBase(Number(v.packSize), v.unit) }))
    .filter((p) => p.base === base && p.v > 0)
    .sort((a, b) => b.v - a.v);
  if (!packs.length) return "";
  let remaining = needBase;
  const out: Record<string, number> = {};
  for (const p of packs) {
    const n = Math.floor(remaining / p.v);
    if (n > 0) {
      out[p.label] = n;
      remaining -= n * p.v;
    }
  }
  if (remaining > 0.0001) {
    const fit = [...packs].reverse().find((p) => p.v >= remaining) ?? packs[packs.length - 1];
    out[fit.label] = (out[fit.label] ?? 0) + 1;
  }
  return Object.entries(out)
    .map(([l, n]) => `${n} × ${l}`)
    .join(" + ");
}

export function DosageCalculator({ perAcre, perLitre, unit, variants }: { perAcre: number | null; perLitre: number | null; unit: string; variants: Variant[] }) {
  const t = useTranslations("product");
  const [mode, setMode] = React.useState<"acre" | "litre">(perAcre ? "acre" : "litre");
  const [value, setValue] = React.useState("1");
  const n = Number(value);
  const rate = mode === "acre" ? perAcre : perLitre;
  const need = rate && n > 0 ? rate * n : 0;
  const { v: needBase, base } = toBase(need, unit);
  const display = need >= 1000 && (unit === "ml" || unit === "g") ? `${(need / 1000).toFixed(2)} ${unit === "ml" ? "L" : "kg"}` : `${Number(need.toFixed(2))} ${unit}`;

  return (
    <div className="rounded-2xl border border-line bg-white p-4">
      <p className="flex items-center gap-2 font-heading text-lg font-bold text-primary-dark">
        <Calculator className="h-5 w-5" /> {t("calcTitle")}
      </p>
      <div className="mt-3 flex flex-wrap items-end gap-3">
        {perAcre && perLitre && (
          <label className="text-sm">
            <span className="mb-1 block font-semibold">{t("calcBy")}</span>
            <select value={mode} onChange={(e) => setMode(e.target.value as "acre" | "litre")} className="h-11 rounded-xl border border-line px-3">
              <option value="acre">{t("calcAcres")}</option>
              <option value="litre">{t("calcLitres")}</option>
            </select>
          </label>
        )}
        <label className="text-sm">
          <span className="mb-1 block font-semibold">{mode === "acre" ? t("calcAcres") : t("calcLitres")}</span>
          <input type="number" min={0} step="0.5" value={value} onChange={(e) => setValue(e.target.value)} className="h-11 w-32 rounded-xl border border-line px-3" />
        </label>
      </div>
      {need > 0 && (
        <div className="mt-3 text-sm" aria-live="polite">
          <p className="font-semibold">{t("calcNeed", { qty: display.split(" ")[0], unit: display.split(" ")[1] })}</p>
          {suggest(needBase, base, variants) && <p className="text-primary-dark">{t("calcSuggest", { packs: suggest(needBase, base, variants) })}</p>}
        </div>
      )}
      <p className="mt-2 text-xs text-muted">{t("calcNote")}</p>
    </div>
  );
}
