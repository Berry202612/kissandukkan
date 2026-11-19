import "server-only";
import { cache } from "react";
import { db } from "./db";
import { toNum } from "./utils";

const loadRules = cache(async () => {
  try {
    return await db.taxRule.findMany();
  } catch {
    return [];
  }
});

/** Product override → category tax rule → conservative default (18%, flagged for CA review). */
export async function resolveTax(categorySlug: string, hsnOverride?: string | null, gstOverride?: unknown) {
  const rules = await loadRules();
  const rule = rules.find((r) => r.categorySlug === categorySlug);
  return {
    hsnCode: hsnOverride || rule?.hsnCode || "",
    gstRate: gstOverride != null ? toNum(gstOverride) : rule ? toNum(rule.gstRate) : 18,
  };
}
