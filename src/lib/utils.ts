import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function toNum(v: unknown): number {
  if (v == null) return 0;
  if (typeof v === "number") return v;
  return Number((v as { toString(): string }).toString());
}

export function formatINR(value: unknown, opts: { decimals?: boolean } = {}) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: opts.decimals ? 2 : 0,
    minimumFractionDigits: opts.decimals ? 2 : 0,
  }).format(toNum(value));
}

export function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-");
}

export function siteUrl(path = "") {
  const base = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");
  return `${base}${path}`;
}

/** Read a bilingual field (`name_en` / `name_hi`), falling back to English. */
export function tr(obj: object, field: string, locale: string): string {
  const o = obj as Record<string, unknown>;
  const v = o[`${field}_${locale}`];
  if (typeof v === "string" && v.trim()) return v;
  const en = o[`${field}_en`];
  return typeof en === "string" ? en : "";
}

export function trList(obj: object, field: string, locale: string): string[] {
  const o = obj as Record<string, unknown>;
  const v = o[`${field}_${locale}`];
  if (Array.isArray(v) && v.length) return v as string[];
  const en = o[`${field}_en`];
  return Array.isArray(en) ? (en as string[]) : [];
}

export function maskPan(pan?: string | null) {
  if (!pan) return "";
  return pan.length < 5 ? "****" : `${pan.slice(0, 2)}******${pan.slice(-2)}`;
}

export function packLabel(v: { packSize: string; unit: string }) {
  return `${v.packSize} ${v.unit}`;
}

export function discountPercent(mrp: unknown, price: unknown) {
  const m = toNum(mrp);
  const p = toNum(price);
  if (m <= 0 || p >= m) return 0;
  return Math.floor(((m - p) / m) * 100);
}
