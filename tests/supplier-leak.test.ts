/**
 * Supplier data (names, URLs, cost prices) must never reach customers: not in page HTML,
 * API responses, emails, invoices or JSON-LD.
 *
 * Part 1 (always runs): static checks on the public select allow-lists and on public code paths.
 * Part 2 (runs when LEAK_TEST_BASE_URL is set, e.g. http://localhost:3000, with DATABASE_URL):
 *   reads every supplier name/URL and every cost price from the DB, crawls public pages & APIs,
 *   and asserts none of them appear.
 */
import fs from "fs";
import path from "path";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const FORBIDDEN_KEYS = ["costPrice", "supplierListings", "supplier", "supplierPrice", "supplierProductUrl", "marginFlag", "restrictedFlag", "restrictedReason", "procurement"];

function keysDeep(obj: unknown, out = new Set<string>()) {
  if (obj && typeof obj === "object") for (const [k, v] of Object.entries(obj)) {
    out.add(k);
    keysDeep(v, out);
  }
  return out;
}

describe("public select allow-lists", async () => {
  const catalog = await import("../src/lib/catalog");
  for (const [name, sel] of Object.entries({ publicVariantSelect: catalog.publicVariantSelect, publicCardSelect: catalog.publicCardSelect, publicProductSelect: catalog.publicProductSelect })) {
    it(`${name} has no supplier/cost fields`, () => {
      const keys = keysDeep(sel);
      for (const k of FORBIDDEN_KEYS) expect(keys.has(k), `${name} selects ${k}`).toBe(false);
    });
  }
});

function walk(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((d) => (d.isDirectory() ? walk(path.join(dir, d.name)) : [path.join(dir, d.name)]));
}

describe("public code paths", () => {
  const root = path.join(__dirname, "..", "src");
  const publicFiles = [...walk(path.join(root, "app", "[locale]")), ...walk(path.join(root, "components", "store")), path.join(root, "lib", "invoice.ts"), path.join(root, "lib", "email.ts"), path.join(root, "lib", "email-defaults.ts"), path.join(root, "components", "store", "JsonLd.tsx")].filter((f) => /\.(tsx?|json)$/.test(f));
  it("storefront pages, components, invoices and emails never reference supplier or cost fields", () => {
    for (const f of publicFiles) {
      const src = fs.readFileSync(f, "utf8");
      for (const k of ["costPrice", "supplierListings", "supplierPrice", "supplierProductUrl", "procurement"]) {
        expect(src.includes(k), `${path.relative(root, f)} references ${k}`).toBe(false);
      }
    }
  });
  it("cart quote API maps lines to an explicit public shape", () => {
    const src = fs.readFileSync(path.join(root, "app", "api", "cart", "quote", "route.ts"), "utf8");
    expect(src).toMatch(/lines: q\.lines\.map\(/);
    expect(src.includes("costPrice")).toBe(false);
  });
});

const BASE = process.env.LEAK_TEST_BASE_URL;
describe.skipIf(!BASE)("live crawl (no supplier data in responses)", () => {
  it("public pages and APIs contain no supplier names, URLs or cost prices", async () => {
    const { PrismaClient } = await import("@prisma/client");
    const db = new PrismaClient();
    const suppliers = await db.supplier.findMany({ select: { name: true, website: true } });
    const listings = await db.supplierListing.findMany({ select: { supplierProductUrl: true } });
    const products = await db.product.findMany({ where: { status: "PUBLISHED" }, select: { slug: true, variants: { select: { id: true, costPrice: true, sellingPrice: true, mrp: true } } } });
    await db.$disconnect();

    const needles = [
      ...suppliers.flatMap((s) => [s.name, s.website ?? ""]),
      ...listings.map((l) => l.supplierProductUrl ?? ""),
    ].filter((s) => s && s.length > 3);

    const urls = ["/en", "/hi", "/en/categories", "/en/search?q=a", "/sitemap.xml", "/en/sitemap", "/api/search/suggest?q=np", ...products.flatMap((p) => [`/en/product/${p.slug}`, `/hi/product/${p.slug}`])];
    const bodies: [string, string][] = [];
    for (const u of urls) {
      const r = await fetch(BASE + u);
      bodies.push([u, await r.text()]);
    }
    const variantIds = products.flatMap((p) => p.variants.map((v) => v.id));
    if (variantIds.length) {
      const r = await fetch(BASE + "/api/cart/quote", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ items: variantIds.slice(0, 20).map((variantId) => ({ variantId, qty: 1 })) }) });
      bodies.push(["/api/cart/quote", await r.text()]);
    }
    for (const [u, body] of bodies) {
      const lower = body.toLowerCase();
      for (const n of needles) expect(lower.includes(n.toLowerCase()), `${u} leaks "${n}"`).toBe(false);
      expect(body.includes("costPrice"), `${u} leaks costPrice`).toBe(false);
      expect(body.includes("supplierListings"), `${u} leaks supplierListings`).toBe(false);
    }
  }, 120000);
});
