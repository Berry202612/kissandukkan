/**
 * Turn scraper output (facts only) into DRAFT products.
 *
 *   npm run import                      # queue + create drafts for every non-flagged record
 *   npm run import -- --queue-only      # only fill Admin → Import queue, approve there
 *   npm run import -- --file=path.json
 *
 * Every product is created as DRAFT with ORIGINAL generated copy (EN + HI, hiReviewed=false),
 * pack sizes priced at cost × (1 + markup) capped at MRP, and a private supplier listing.
 * Records whose active ingredient is on the Restricted list stay in the queue, flagged.
 */
import fs from "fs";
import path from "path";
import { PrismaClient } from "@prisma/client";
import { approveImport, queueRecords } from "../../src/lib/importer";

const db = new PrismaClient();
const args = Object.fromEntries(process.argv.slice(2).map((a) => a.replace(/^--/, "").split("=")).map(([k, v]) => [k, v ?? "true"]));

async function markup() {
  const row = await db.setting.findUnique({ where: { key: "pricing" } });
  const v = (row?.value as { markupPercent?: number } | null)?.markupPercent;
  return typeof v === "number" ? v : 1;
}

async function main() {
  const file = args.file ?? path.join(__dirname, "..", "output", "products-raw.json");
  if (!fs.existsSync(file)) throw new Error(`Not found: ${file}. Run "npm run scrape" first or pass --file=`);
  const records = JSON.parse(fs.readFileSync(file, "utf8")) as unknown[];
  const cats = await db.category.count();
  if (!cats) throw new Error("No categories found. Run `npx prisma db seed` first.");

  const { queued, invalid } = await queueRecords(db, records);
  console.log(`Queued ${queued} records (${invalid} invalid skipped).`);
  if (args["queue-only"]) return;

  const pending = await db.importItem.findMany({ where: { status: "PENDING", flagged: false, productId: null } });
  const m = await markup();
  let created = 0;
  const failed: string[] = [];
  for (const item of pending) {
    try {
      await approveImport(db, item.id, m);
      created++;
    } catch (e) {
      failed.push(`${item.sourceUrl}: ${(e as Error).message}`);
    }
  }
  const flagged = await db.importItem.count({ where: { status: "PENDING", flagged: true } });
  const priceUpdates = await db.importItem.count({ where: { status: "PENDING", productId: { not: null } } });
  console.log(`Created ${created} DRAFT products.`);
  if (flagged) console.log(`${flagged} record(s) flagged by the Restricted-ingredient list – review in Admin → Import queue.`);
  if (priceUpdates) console.log(`${priceUpdates} price update(s) for existing products waiting for approval in Admin → Import queue.`);
  if (failed.length) console.log(`Failed:\n  ${failed.join("\n  ")}`);
  console.log("Next: review drafts in Admin → Products (Hindi, images, MRP, tax), then publish.");
}

main()
  .catch((e) => {
    console.error(e.message ?? e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
