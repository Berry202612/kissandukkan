/**
 * Idempotent seed. Creates reference data and original content only.
 * NO fake customers, orders, reviews, ratings or products. Products come from the import pipeline.
 * Re-running never overwrites edits made in the admin panel (create-only upserts).
 */
import { PrismaClient } from "@prisma/client";
import { categories, crops, taxRules, banners } from "./seed-data/taxonomy";
import { policiesPart1 } from "./seed-data/policies-1";
import { policiesPart2 } from "./seed-data/policies-2";
import { faqs } from "./seed-data/faq";
import { articlesPart1 } from "./seed-data/articles-1";
import { articlesPart2 } from "./seed-data/articles-2";
import { defaultTemplates } from "../src/lib/email-defaults";

const db = new PrismaClient();

async function main() {
  // Categories & sub-categories
  for (const [i, c] of categories.entries()) {
    const { subs, ...data } = c;
    const cat = await db.category.upsert({ where: { slug: c.slug }, create: { ...data, sortOrder: i }, update: {} });
    for (const [j, [slug, en, hi]] of subs.entries()) {
      await db.subCategory.upsert({ where: { slug }, create: { slug, name_en: en, name_hi: hi, categoryId: cat.id, sortOrder: j }, update: {} });
    }
  }

  for (const [i, [slug, en, hi]] of crops.entries()) {
    await db.crop.upsert({ where: { slug }, create: { slug, name_en: en, name_hi: hi, sortOrder: i }, update: {} });
  }

  for (const [categorySlug, label, hsnCode, gstRate] of taxRules) {
    await db.taxRule.upsert({ where: { categorySlug }, create: { categorySlug, label, hsnCode, gstRate, verified: false }, update: {} });
  }

  // Restricted ingredients: intentionally EMPTY. The owner must fill it from current CIB&RC / MoA&FW notifications.

  for (const [i, b] of banners.entries()) {
    await db.banner.upsert({ where: { id: `seed-banner-${i + 1}` }, create: { id: `seed-banner-${i + 1}`, ...b, sortOrder: i }, update: {} });
  }

  for (const p of [...policiesPart1, ...policiesPart2]) {
    await db.page.upsert({ where: { slug: p.slug }, create: { ...p, hiReviewed: false, legalReviewed: false }, update: {} });
  }

  for (const [i, [group, q_en, q_hi, a_en, a_hi]] of faqs.entries()) {
    await db.faq.upsert({
      where: { id: `seed-faq-${String(i + 1).padStart(2, "0")}` },
      create: { id: `seed-faq-${String(i + 1).padStart(2, "0")}`, group, question_en: q_en, question_hi: q_hi, answer_en: a_en, answer_hi: a_hi, sortOrder: i },
      update: {},
    });
  }

  // Articles: published with the ACTUAL date they are first seeded (never backdated).
  for (const a of [...articlesPart1, ...articlesPart2]) {
    await db.article.upsert({ where: { slug: a.slug }, create: { ...a, isPublished: true, publishedAt: new Date(), hiReviewed: false }, update: {} });
  }

  for (const [key, byLocale] of Object.entries(defaultTemplates)) {
    for (const locale of ["en", "hi"] as const) {
      await db.emailTemplate.upsert({ where: { key_locale: { key, locale } }, create: { key, locale, ...byLocale[locale] }, update: {} });
    }
  }

  // Default settings (create only). Business details start empty except trade name and support email.
  const defaults: Record<string, object> = {
    business: { tradeName: "KissanDukkan", supportEmail: "support@kissandukkan.in" },
    pricing: {},
    delivery: {},
    launch: {},
  };
  for (const [key, value] of Object.entries(defaults)) {
    await db.setting.upsert({ where: { key }, create: { key, value }, update: {} });
  }

  const counts = await Promise.all([db.category.count(), db.subCategory.count(), db.crop.count(), db.page.count(), db.faq.count(), db.article.count(), db.emailTemplate.count()]);
  console.log(`Seeded: ${counts[0]} categories, ${counts[1]} sub-categories, ${counts[2]} crops, ${counts[3]} pages, ${counts[4]} FAQs, ${counts[5]} articles, ${counts[6]} email templates.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
