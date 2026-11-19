/**
 * DEMO ONLY – for a private presentation of the store with filled-in product photos.
 *
 *   npm run demo-images              # link each imported product to the photo on its source page
 *   npm run demo-images -- --remove  # remove every demo photo again
 *
 * Photos are NOT downloaded: products point to the image URL on the source site (from the page's
 * structured data already in the local scraper cache). They are labelled "Demo" on the site, the
 * admin launch checklist fails while any are present, and saving images in the admin drops them.
 * Before going live, replace them with official pack shots or your own photos (docs/PHOTO_GUIDE.md).
 */
import fs from "fs";
import path from "path";
import crypto from "crypto";
import * as cheerio from "cheerio";
import { PrismaClient } from "@prisma/client";
import { isDemoImage } from "../src/lib/demo-images";

const db = new PrismaClient();
const CACHE = path.join(__dirname, "output", "cache");

function imageFromCache(url: string): string | null {
  const file = path.join(CACHE, crypto.createHash("sha1").update(url).digest("hex") + ".html");
  if (!fs.existsSync(file)) return null;
  const $ = cheerio.load(fs.readFileSync(file, "utf8"));
  let found: string | null = null;
  $('script[type="application/ld+json"]').each((_, s) => {
    if (found) return;
    try {
      const j = JSON.parse($(s).contents().text());
      const arr = Array.isArray(j) ? j : j["@graph"] ? j["@graph"] : [j];
      const p = arr.find((x: Record<string, unknown>) => String(x["@type"]).toLowerCase().includes("product"));
      const img = p?.image;
      const first = Array.isArray(img) ? img[0] : img;
      const u = typeof first === "string" ? first : first?.url;
      if (typeof u === "string" && /^https:\/\//.test(u)) found = u;
    } catch {
      /* ignore */
    }
  });
  return found ?? $('meta[property="og:image"]').attr("content") ?? null;
}

async function main() {
  if (process.argv.includes("--remove")) {
    const products = await db.product.findMany({ select: { id: true, images: true } });
    let n = 0;
    for (const p of products) {
      const keep = p.images.filter((i) => !isDemoImage(i));
      if (keep.length !== p.images.length) {
        await db.product.update({ where: { id: p.id }, data: { images: keep, imageStatus: keep.length ? undefined : "CATEGORY_FALLBACK" } });
        n++;
      }
    }
    console.log(`Removed demo photos from ${n} products.`);
    return;
  }
  const items = await db.importItem.findMany({ where: { productId: { not: null } }, select: { productId: true, sourceUrl: true } });
  let linked = 0;
  for (const it of items) {
    const product = await db.product.findUnique({ where: { id: it.productId! }, select: { images: true } });
    if (!product || product.images.some((i) => !isDemoImage(i))) continue; // never touch real photos
    const img = imageFromCache(it.sourceUrl);
    if (!img) continue;
    await db.product.update({ where: { id: it.productId! }, data: { images: [img] } }); // imageStatus stays "fallback" – not a real photo
    linked++;
  }
  console.log(`Linked demo photos for ${linked} products. Remove with: npm run demo-images -- --remove`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
