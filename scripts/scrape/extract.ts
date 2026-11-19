/**
 * FACTS-ONLY extraction. We read structured data (JSON-LD), variant price/MRP markup and labelled
 * attribute rows (e.g. "Technical Content: …"). We never keep description paragraphs, reviews,
 * ratings, images or any other creative text written by the source site.
 */
import * as cheerio from "cheerio";
import type { AnyNode } from "domhandler";

export type Pack = { size: string; unit: string; mrp: number | null; price: number; inStock: boolean };
export type Facts = {
  name: string;
  brand: string;
  breadcrumb: string[];
  technicalContent: string;
  formulation: string;
  activeIngredients: string[];
  packs: Pack[];
  crops: string[];
  pests: string[];
  dosage: string;
  manufacturer: string;
  popularity: number; // review COUNT used only to rank which products to pick; never stored or shown
};

const clean = (s: string) => s.replace(/\s+/g, " ").trim();
const money = (s: string) => {
  const m = s.replace(/,/g, "").match(/(\d+(?:\.\d+)?)/);
  return m ? Number(m[1]) : NaN;
};

const PACK_RE = /(\d+(?:\.\d+)?)\s*(ml|ltr|litre|liter|l|kg|gm|gms|g|grams?|pcs|pc|piece|packet|pkt)\b/i;

export function parsePack(label: string): { size: string; unit: string } | null {
  const m = label.match(PACK_RE);
  if (!m) return null;
  const u = m[2].toLowerCase();
  const unit = ["ltr", "litre", "liter", "l"].includes(u)
    ? "L"
    : ["gm", "gms", "g", "gram", "grams"].includes(u)
      ? "g"
      : u === "kg"
        ? "kg"
        : u === "ml"
          ? "ml"
          : ["pc", "pcs", "piece"].includes(u)
            ? "pcs"
            : "packet";
  // "10 gm x 2" = two packets of 10 g. "2.5 Kg x 1 Qty" = a single pack.
  const rest = label.slice((m.index ?? 0) + m[0].length);
  const mult = rest.match(/^\s*(?:x|×|\*)\s*(\d+)(?!\s*qty)/i);
  const n = mult ? Number(mult[1]) : 1;
  const size = String(Number(m[1]));
  return { size: n > 1 ? `${size} × ${n}` : size, unit };
}

const packKey = (p: { size: string; unit: string }) => `${p.size}|${p.unit}`;

/** Find a value that follows a known attribute label in tables or "Label: value" lines. */
function attr($: cheerio.CheerioAPI, labels: RegExp): string {
  let found = "";
  $("tr").each((_, tr) => {
    if (found) return;
    const cells = $(tr).find("th,td");
    if (cells.length >= 2 && new RegExp(`^(?:${labels.source})$`, "i").test(clean($(cells[0]).text()).replace(/:$/, ""))) found = clean($(cells[1]).text());
  });
  if (found) return found.slice(0, 200);
  $("li, p, dd, div, span").each((_, el) => {
    if (found) return;
    const t = clean($(el).text());
    if (t.length > 220) return;
    // Named group: label regexes may contain their own capture groups
    const m = t.match(new RegExp(`^(?:${labels.source})\\s*:\\s*(?<value>.{1,160})$`, "i"));
    if (m?.groups?.value) found = clean(m.groups.value);
  });
  return found.slice(0, 200);
}

/** Variant cards that show pack, selling price and a struck-through MRP, or data-variant-* attributes. */
function variantMarkup($: cheerio.CheerioAPI) {
  const out: { size: string; unit: string; price: number; mrp: number }[] = [];
  const own: { size: string; unit: string; price: number; mrp: number }[] = [];
  $("[data-variant-price]").each((_, el) => {
    const e = $(el);
    const p = parsePack(String(e.attr("data-variant-name") ?? e.text()));
    const price = money(String(e.attr("data-variant-price")));
    const mrp = money(String(e.attr("data-variant-mrp") ?? ""));
    if (p && Number.isFinite(price)) own.push({ ...p, price, mrp: Number.isFinite(mrp) ? mrp : NaN });
  });
  $('s, del, strike, [class*="line-through"]').each((_, el) => {
    const mrp = money($(el).text());
    if (!Number.isFinite(mrp)) return;
    let node: cheerio.Cheerio<AnyNode> = $(el).parent();
    for (let i = 0; i < 6 && node.length; i++) {
      const text = clean(node.text());
      const p = parsePack(text);
      if (p && text.length < 400) {
        const prices = [...text.matchAll(/₹\s*([\d,]+(?:\.\d+)?)/g)].map((x) => money(x[1])).filter((n) => Number.isFinite(n) && n !== mrp && n < mrp);
        if (prices.length) out.push({ ...p, price: prices[0], mrp });
        break;
      }
      node = node.parent();
    }
  });
  // `own` = the product's declared variants (authoritative); `out` = struck-through prices (may include other products' cards)
  return { own, struck: out };
}

export function extractFacts(html: string): Facts | null {
  const $ = cheerio.load(html);
  const ld: Record<string, unknown>[] = [];
  $('script[type="application/ld+json"]').each((_, s) => {
    try {
      const j = JSON.parse($(s).contents().text());
      const arr = Array.isArray(j) ? j : j["@graph"] ? j["@graph"] : [j];
      for (const x of arr) ld.push(x);
    } catch {
      /* ignore malformed blocks */
    }
  });
  const product = ld.find((x) => String(x["@type"]).toLowerCase().includes("product")) as Record<string, unknown> | undefined;
  const crumbs = ld.find((x) => x["@type"] === "BreadcrumbList") as { itemListElement?: { name?: string; item?: { name?: string } }[] } | undefined;

  const name = clean(String(product?.name ?? $("h1").first().text() ?? ""));
  if (!name) return null;
  const brandRaw = product?.brand as { name?: string } | string | undefined;
  const brand = clean(typeof brandRaw === "string" ? brandRaw : (brandRaw?.name ?? attr($, /brand/i)));

  // 1) Selling prices per pack from JSON-LD offers
  const offersRaw = product?.offers as Record<string, unknown> | Record<string, unknown>[] | undefined;
  const offers = (Array.isArray(offersRaw) ? offersRaw : offersRaw ? [offersRaw] : []).flatMap((o) => ((o as { offers?: unknown[] }).offers as Record<string, unknown>[] | undefined) ?? [o]);
  const packs = new Map<string, Pack>();
  for (const o of offers) {
    const p = parsePack(String(o.name ?? o.sku ?? "")) ?? (offers.length === 1 ? parsePack(name) : null);
    const price = money(String(o.price ?? o.lowPrice ?? ""));
    if (!p || !Number.isFinite(price)) continue;
    packs.set(packKey(p), { ...p, price, mrp: null, inStock: !String(o.availability ?? "").toLowerCase().includes("outofstock") });
  }
  // 2) MRP (and missing packs) from visible variant markup
  const { own, struck } = variantMarkup($);
  if (own.length) {
    // Declared variant elements are the product's own packs: they replace JSON-LD (which may mislabel multi-packs).
    const stock = new Map([...packs.values()].map((p) => [p.price, p.inStock]));
    packs.clear();
    for (const v of own) packs.set(packKey(v), { size: v.size, unit: v.unit, price: v.price, mrp: Number.isFinite(v.mrp) ? v.mrp : null, inStock: stock.get(v.price) ?? true });
  }
  for (const v of struck) {
    const existing = packs.get(packKey(v));
    // Only fill MRP for a pack this product actually lists, at the same selling price.
    if (existing && existing.mrp == null && Math.abs(existing.price - v.price) < 1) existing.mrp = v.mrp;
  }
  // Never let a recorded MRP be below the selling price (would be a parsing error)
  for (const p of packs.values()) if (p.mrp != null && p.mrp < p.price) p.mrp = null;

  const technicalContent = attr($, /technical\s*(content|name)|composition|active\s*ingredients?/i);
  const formulation = (technicalContent.match(/\b(SC|SL|EC|WP|WG|WDG|GR|CS|OD|ME|EW|SP|DP|FS)\b/) ?? [])[1] ?? attr($, /formulation/i);
  const activeIngredients = technicalContent
    .split(/\+|,|&| and /i)
    .map((s) => s.replace(/\d+(\.\d+)?\s*%.*$/, "").replace(/\b(SC|SL|EC|WP|WG|WDG|GR|CS|OD|ME|EW|SP|DP|FS)\b/g, "").trim().toLowerCase())
    .filter((s) => s.length > 2);
  const list = (v: string) => v.split(/,|\/|;|\band\b/).map(clean).filter((x) => x && x.length < 40 && !/target|pest|disease|crop|weed/i.test(x)).slice(0, 12);
  const agg = product?.aggregateRating as { reviewCount?: number; ratingCount?: number } | undefined;

  return {
    name,
    brand,
    breadcrumb: (crumbs?.itemListElement ?? []).map((i) => clean(i.name ?? i.item?.name ?? "")).filter(Boolean),
    technicalContent,
    formulation: formulation ?? "",
    activeIngredients,
    packs: [...packs.values()],
    crops: list(attr($, /crops?|recommended\s*crops?|suitable\s*crops?/i)),
    pests: list(attr($, /target\s*(pests?|diseases?)|pests?|diseases?|weeds?/i)),
    dosage: attr($, /dosage|dose|application\s*rate|seed\s*rate/i),
    manufacturer: attr($, /manufacturer|manufactured\s*by|marketed\s*by/i),
    popularity: Number(agg?.reviewCount ?? agg?.ratingCount ?? 0) || 0,
  };
}

/** Map source category words → our category & sub-category slugs. */
export function mapCategory(text: string): { category: string; subCategory: string } | null {
  const t = text.toLowerCase();
  const rules: [RegExp, string, string][] = [
    [/bio[\s-]?(pesticide|insecticide|fungicide)|beauveria|metarhizium|trichoderma|pseudomonas|bacillus thuringiensis|\bnpv\b/, "crop-protection", "bio-pesticides"],
    [/insecticide/, "crop-protection", "insecticides"],
    [/fungicide/, "crop-protection", "fungicides"],
    [/herbicide|weedicide/, "crop-protection", "herbicides"],
    [/growth regulator|\bpgr\b|growth promoter|gibberellic|bio[\s-]?stimulant|triacontanol|tricontanol/, "plant-growth-regulators", ""],
    [/water soluble|19[:\s-]19[:\s-]19|\bnpk\b|12[:\s-]61|0?0[:\s-]52[:\s-]34|13[:\s-]0?0[:\s-]45/, "crop-nutrition", "water-soluble-npk"],
    [/micronutrient|zinc|boron|chelated|ferrous|magnesium sulphate|calcium nitrate/, "crop-nutrition", "micronutrients"],
    [/bio[\s-]?fertili[sz]er|organic manure|vermicompost|humic|seaweed/, "crop-nutrition", "organic-bio-fertilizers"],
    [/neem/, "organic-farming", "neem-products"],
    [/cocopeat|coco peat|perlite|vermiculite/, "organic-farming", "cocopeat-media"],
    [/flower seed|marigold|zinnia|petunia/, "seeds", "flower-seeds"],
    [/fodder|berseem|napier/, "seeds", "fodder-seeds"],
    [/vegetable|tomato|chilli|brinjal|okra|bhindi|cucumber|gourd|cauliflower|cabbage|onion seed/, "seeds", "vegetable-seeds"],
    [/seed/, "seeds", "field-crop-seeds"],
    [/drip|lateral|dripper|emitter/, "irrigation", "drip-kits"],
    [/sprinkler|rain pipe|rain hose/, "irrigation", "sprinklers"],
    [/venturi|screen filter|disc filter/, "irrigation", "filters-venturi"],
    [/battery sprayer|battery operated/, "farm-tools-equipment", "battery-sprayers"],
    [/knapsack|hand sprayer|manual sprayer/, "farm-tools-equipment", "knapsack-sprayers"],
    [/brush cutter/, "farm-tools-equipment", "brush-cutters"],
    [/pruner|secateur|sickle|khurpi|trowel|hand tool/, "farm-tools-equipment", "hand-tools"],
    [/grow bag/, "gardening-nursery", "grow-bags"],
    [/seedling tray|pro tray|nursery tray/, "gardening-nursery", "seedling-trays"],
    [/\bpots?\b|planter/, "gardening-nursery", "pots-planters"],
    [/potting mix|potting soil/, "gardening-nursery", "potting-mix"],
    [/mineral mixture/, "animal-husbandry", "mineral-mixture"],
    [/cattle feed|feed supplement|livestock|veterinary/, "animal-husbandry", "feed-supplements"],
    [/milking|teat/, "animal-husbandry", "milking-accessories"],
    [/mulch/, "protection-gear-farm-supplies", "mulching-film"],
    [/shade net/, "protection-gear-farm-supplies", "shade-net"],
    [/sticky trap|pheromone|lure|fruit fly trap/, "protection-gear-farm-supplies", "traps"],
    [/glove|mask|safety kit|apron|goggle/, "protection-gear-farm-supplies", "safety-gear"],
    [/fertili[sz]er/, "crop-nutrition", "micronutrients"],
  ];
  for (const [re, category, subCategory] of rules) if (re.test(t)) return { category, subCategory };
  return null;
}
