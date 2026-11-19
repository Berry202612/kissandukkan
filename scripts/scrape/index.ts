/**
 * Local, polite, FACTS-ONLY scraper (never runs on Vercel).
 *
 *   npm run scrape -- --limit=150            # both sites
 *   npm run scrape -- --site=kisanshop --max-pages=400
 *   npm run scrape -- --test=https://...      # extract one page and print the facts
 *
 * Rules enforced here:
 *  - robots.txt is fetched and obeyed for our user-agent (Crawl-delay honoured if larger than ours)
 *  - 1 request every 2–3 seconds per site, clear user-agent, HTML cached locally (scripts/output/cache)
 *  - only factual attributes are kept (see extract.ts). No images, descriptions, reviews or ratings.
 * Outputs: scripts/output/products-raw.json, products-raw.csv, image-request-list.csv
 */
import fs from "fs";
import path from "path";
import crypto from "crypto";
import * as cheerio from "cheerio";
import { parseRobots, type Robots } from "./robots";
import { extractFacts, mapCategory, type Facts } from "./extract";

const UA = "KissanDukkanFactsBot/1.0 (+catalogue facts for a licensed agri-input dealer; contact via site owner)";
const OUT = path.join(__dirname, "..", "output");
const CACHE = path.join(OUT, "cache");

type Site = { key: string; base: string; productUrl: RegExp };
const SITES: Site[] = [
  // Product URL patterns are heuristics – adjust if a site changes its URL structure (use --test to check).
  { key: "agribegri", base: "https://agribegri.com", productUrl: /agribegri\.com\/products\/[^/?#]+\.php$/i },
  { key: "kisanshop", base: "https://www.kisanshop.in", productUrl: /kisanshop\.in\/(?!hi\/)(?:en\/)?product\/[^/?#]+/i },
];

const args = Object.fromEntries(process.argv.slice(2).map((a) => a.replace(/^--/, "").split("=")).map(([k, v]) => [k, v ?? "true"]));
const LIMIT = Number(args.limit ?? 150);
const MAX_PAGES = Number(args["max-pages"] ?? 600);

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const lastHit = new Map<string, number>();
const robotsCache = new Map<string, Robots>();

async function politeFetch(url: string, delayMs: number): Promise<string | null> {
  const u = new URL(url);
  const robots = robotsCache.get(u.host);
  if (robots && !robots.allowed(u.pathname + u.search)) {
    console.log(`  robots.txt disallows ${u.pathname} – skipped`);
    return null;
  }
  const file = path.join(CACHE, crypto.createHash("sha1").update(url).digest("hex") + ".html");
  if (fs.existsSync(file)) return fs.readFileSync(file, "utf8");
  const wait = (lastHit.get(u.host) ?? 0) + delayMs + Math.random() * 1000 - Date.now();
  if (wait > 0) await sleep(wait);
  lastHit.set(u.host, Date.now());
  try {
    const res = await fetch(url, { headers: { "User-Agent": UA, Accept: "text/html,application/xml" }, redirect: "follow", signal: AbortSignal.timeout(30000) });
    if (res.status === 429 || res.status === 503) {
      console.log(`  ${res.status} from ${u.host} – backing off 60s`);
      await sleep(60000);
      return null;
    }
    if (!res.ok) return null;
    const text = await res.text();
    fs.writeFileSync(file, text);
    return text;
  } catch (e) {
    console.log(`  fetch failed ${url}: ${(e as Error).message}`);
    return null;
  }
}

async function loadRobots(site: Site) {
  const res = await fetch(`${site.base}/robots.txt`, { headers: { "User-Agent": UA } }).catch(() => null);
  const robots = parseRobots(res?.ok ? await res.text() : "", UA);
  robotsCache.set(new URL(site.base).host, robots);
  robotsCache.set(new URL(site.base).host.replace(/^www\./, ""), robots);
  robotsCache.set("www." + new URL(site.base).host.replace(/^www\./, ""), robots);
  return robots;
}

async function discover(site: Site, robots: Robots, delay: number): Promise<string[]> {
  const queue = robots.sitemaps.length ? [...robots.sitemaps] : [`${site.base}/sitemap.xml`];
  const seen = new Set<string>();
  const products = new Set<string>();
  while (queue.length && seen.size < 50) {
    const sm = queue.shift()!;
    if (seen.has(sm)) continue;
    seen.add(sm);
    const xml = await politeFetch(sm, delay);
    if (!xml) continue;
    const $ = cheerio.load(xml, { xmlMode: true });
    $("sitemap > loc").each((_, el) => {
      const loc = $(el).text().trim();
      // Follow only English product sitemaps (skip /hi/, /te/, /kn/… language copies and non-product sitemaps)
      if (/product/i.test(loc) && !/\.(?:com|in)\/[a-z]{2}\//i.test(loc)) queue.push(loc);
    });
    $("url > loc").each((_, el) => {
      const loc = $(el).text().trim();
      if (site.productUrl.test(loc)) products.add(loc);
    });
  }
  return [...products];
}

type Rec = Facts & { sourceSite: string; sourceUrl: string; category: string; subCategory: string };

function toRecord(site: Site, url: string, f: Facts): Rec | null {
  const map = mapCategory([...f.breadcrumb, f.name, f.technicalContent, url].join(" "));
  if (!map || !f.packs.length) return null;
  return { ...f, sourceSite: new URL(site.base).host.replace(/^www\./, ""), sourceUrl: url, ...map };
}

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

async function main() {
  fs.mkdirSync(CACHE, { recursive: true });
  if (args.test) {
    const site = SITES.find((s) => args.test.includes(new URL(s.base).host.replace(/^www\./, ""))) ?? SITES[0];
    await loadRobots(site);
    const html = await politeFetch(args.test, 2500);
    const f = html ? extractFacts(html) : null;
    console.log(JSON.stringify(f && toRecord(site, args.test, f), null, 2) ?? "Could not extract");
    if (f && !toRecord(site, args.test, f)) console.log("Extracted facts but could not map category or no pack prices found:", f);
    return;
  }

  const records: Rec[] = [];
  for (const site of SITES.filter((s) => !args.site || s.key === args.site)) {
    console.log(`\n== ${site.key}`);
    const robots = await loadRobots(site);
    const delay = Math.max(2000, robots.crawlDelayMs ?? 0);
    const urls = (await discover(site, robots, delay)).slice(0, MAX_PAGES);
    console.log(`  ${urls.length} product URLs found (processing up to ${MAX_PAGES})`);
    for (const [i, url] of urls.entries()) {
      const html = await politeFetch(url, delay);
      const f = html ? extractFacts(html) : null;
      const r = f ? toRecord(site, url, f) : null;
      if (r) records.push(r);
      if ((i + 1) % 25 === 0) console.log(`  ${i + 1}/${urls.length} pages, ${records.length} usable records`);
    }
  }

  // Selection: prefer products found on BOTH sites (price comparison + backup supply), then well-known
  // (more reviews on the source = popularity proxy, used only for ranking), and spread across all categories.
  const key = (r: Rec) => norm(`${r.brand} ${r.name}`).split(" ").slice(0, 6).join(" ");
  const groups = new Map<string, Rec[]>();
  for (const r of records) groups.set(key(r), [...(groups.get(key(r)) ?? []), r]);
  const ranked = [...groups.values()].sort((a, b) => b.length - a.length || Math.max(...b.map((x) => x.popularity)) - Math.max(...a.map((x) => x.popularity)));
  const perCategory = new Map<string, number>();
  const cap = Math.max(6, Math.ceil(LIMIT / 8));
  const picked: Rec[] = [];
  for (const g of ranked) {
    const c = g[0].category;
    if ((perCategory.get(c) ?? 0) >= cap) continue;
    perCategory.set(c, (perCategory.get(c) ?? 0) + 1);
    // Keep every source listing for the product (each becomes a private supplier listing / price compare)
    picked.push(...g);
    if (new Set(picked.map(key)).size >= LIMIT) break;
  }

  const out = picked.map((r) => ({
    sourceSite: r.sourceSite,
    sourceUrl: r.sourceUrl,
    name: r.name,
    brand: r.brand,
    category: r.category,
    subCategory: r.subCategory,
    technicalContent: r.technicalContent,
    activeIngredients: r.activeIngredients,
    formulation: r.formulation,
    packs: r.packs,
    crops: r.crops,
    pests: r.pests,
    dosage: r.dosage,
    manufacturer: r.manufacturer,
  }));
  fs.writeFileSync(path.join(OUT, "products-raw.json"), JSON.stringify(out, null, 2));

  const csvCell = (v: unknown) => {
    const s = String(v ?? "");
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [
    "sourceSite,sourceUrl,name,brand,category,subCategory,technicalContent,formulation,activeIngredients,packs,crops,pests,dosage",
    ...out.map((r) =>
      [r.sourceSite, r.sourceUrl, r.name, r.brand, r.category, r.subCategory, r.technicalContent, r.formulation, r.activeIngredients.join(";"), r.packs.map((p) => `${p.size}|${p.unit}|${p.mrp}|${p.price}`).join(";"), r.crops.join(";"), r.pests.join(";"), r.dosage]
        .map(csvCell)
        .join(","),
    ),
  ].join("\n");
  fs.writeFileSync(path.join(OUT, "products-raw.csv"), "﻿" + csv);

  const imgRows = new Map<string, string>();
  for (const r of out) imgRows.set(key(r as Rec), [r.brand, r.name, [...new Set(r.packs.map((p) => `${p.size} ${p.unit}`))].join(" / ")].map(csvCell).join(","));
  fs.writeFileSync(path.join(OUT, "image-request-list.csv"), "﻿" + ["brand,product_name,pack_sizes", ...imgRows.values()].join("\n"));

  console.log(`\nDone. ${new Set(out.map((r) => key(r as Rec))).size} products (${out.length} source listings) written to scripts/output/.`);
  console.log("Next: npm run import   (queues facts, creates DRAFT products with original copy)");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
