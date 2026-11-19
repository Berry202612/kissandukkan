# KissanDukkan (किसान दुकान)

**Every farm need, one trusted shop.** A bilingual (English + Hindi) agri-input aggregator store: one storefront that sells genuine branded seeds, fertilizers, crop protection, irrigation, tools and gardening supplies sourced from authorised suppliers. Suppliers, cost prices and margins live only in the private admin panel.

Stack: Next.js 15 (App Router, TypeScript strict) · Tailwind + customised shadcn-style UI · PostgreSQL (Neon) + Prisma 6 · Auth.js v5 (credentials, bcrypt cost 12, JWT) · next-intl · Razorpay · Shiprocket · Resend · Vercel Blob · Zod · Recharts · pdf-lib.

---

## 1. Local setup

```bash
npm install
cp .env.example .env          # fill DATABASE_URL, DIRECT_URL, AUTH_SECRET at minimum
npx prisma migrate deploy     # or: npm run db:migrate (dev)
npm run db:seed               # categories, crops, tax table, policies, FAQ, articles, email templates
npm run create-admin          # first ADMIN – prompts for name, email, password
npm run dev
```

Generate `AUTH_SECRET` with `npx auth secret` or `openssl rand -base64 32`.

The seed is **idempotent** and never overwrites edits made in the admin panel. It creates **no** products, customers, orders or reviews.

## 2. Environment variables

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Neon **pooled** connection string |
| `DIRECT_URL` | Neon **direct** connection string (migrations) |
| `AUTH_SECRET` | Auth.js session encryption |
| `NEXTAUTH_URL`, `NEXT_PUBLIC_SITE_URL` | Public site URL, e.g. `https://kissandukkan.in` |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob (product photos, review photos, replacement evidence) |
| `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `NEXT_PUBLIC_RAZORPAY_KEY_ID` | Razorpay API keys (same key id in both id variables) |
| `RAZORPAY_WEBHOOK_SECRET` | Secret you set on the Razorpay webhook |
| `SHIPROCKET_EMAIL`, `SHIPROCKET_PASSWORD` | Shiprocket **API user** (not your login) |
| `SHIPROCKET_WEBHOOK_TOKEN` | Token Shiprocket sends in `x-api-key` on tracking webhooks |
| `RESEND_API_KEY`, `EMAIL_FROM` | Transactional email (verify the sending domain in Resend) |
| `CRON_SECRET` | Protects `/api/cron/*` (Vercel Cron sends it automatically) |

Without Razorpay keys the checkout shows "online payment not available"; without Shiprocket the pincode checker answers "cannot confirm" (never "yes"); without Resend emails are logged, not sent.

## 3. Deploy on Vercel + Neon

1. Push the repo to GitHub and import it in Vercel.
2. Vercel → **Storage → Marketplace → Neon** → create a database and connect it to the project (adds `DATABASE_URL`; add `DIRECT_URL` from Neon's "direct" connection string).
3. Vercel → **Storage → Blob** → create a store (adds `BLOB_READ_WRITE_TOKEN`).
4. Add the remaining env vars (section 2) for Production.
5. Set the **Build Command** to `prisma migrate deploy && npm run build`.
6. Deploy, then run once from your machine against production: `DATABASE_URL=… npm run db:seed` and `DATABASE_URL=… npm run create-admin`.
7. `vercel.json` schedules two daily crons (auto-cancel unpaid orders, review-request emails). Unpaid orders are also expired on every checkout/order page load, so the daily schedule works on the Hobby plan; on Pro you may make cancel-pending more frequent.

## 4. Product data: scraper → import → review → publish

The scraper runs **only on your computer**, never on Vercel.

```bash
npm run scrape -- --test=https://www.kisanshop.in/product/<slug>   # check extraction on one page
npm run scrape -- --limit=150                                       # both sites
npm run import                                                      # create DRAFT products
```

- It reads robots.txt and obeys it, waits 2–3 s between requests (or the site's Crawl-delay if longer), identifies itself with a clear user-agent and caches pages in `scripts/output/cache` (git-ignored).
- It keeps **facts only**: name, brand, category, technical content, formulation, pack sizes, MRP, supplier price, crops, pests, dosage and the source URL. No images, descriptions, reviews or ratings are stored.
- Selection prefers products found on both sites and spreads picks across all categories.
- Outputs `scripts/output/products-raw.json`, `products-raw.csv` and `image-request-list.csv` (send this to distributors/brand offices for official pack shots).
- `npm run import` writes **original** EN + HI copy from the facts (`src/lib/content-gen.ts`), prices at cost × (1 + markup) capped at MRP, creates a private supplier listing and leaves every product as **DRAFT** with `hiReviewed = false`.
- If MRP could not be read from the source page, the product is marked **"MRP not verified"** and cannot be published until someone checks the printed pack, corrects the MRPs and ticks the box.
- Anything matching the **Restricted ingredients** list stays in Admin → Import queue, flagged. The list ships **empty**: fill it from current CIB&RC / Ministry of Agriculture notifications before importing.
- Site HTML changes over time; if extraction degrades, adjust `scripts/scrape/extract.ts` and re-test with `--test=`.
- Re-running scrape + import later queues **price updates** for existing products for approval in the Import queue; approved changes reprice automatically and are kept in price history.
- CSV upload in Admin → Import queue accepts the same columns as `products-raw.csv` (for distributor price lists).

## 5. Razorpay

1. Test first: put **test** keys (`rzp_test_…`) in the env vars.
2. Razorpay Dashboard → Settings → **Webhooks** → URL `https://<your-domain>/api/razorpay/webhook`, events `payment.captured`, `payment.failed`, `refund.processed`, and a secret → copy it into `RAZORPAY_WEBHOOK_SECRET`.
3. Place a test order (Razorpay test UPI / cards), confirm the order becomes CONFIRMED, the invoice downloads, and a partial refund works from Admin → Order → Refund.
4. **Going live:** complete Razorpay KYC and the **website review** (they usually check that the Contact page shows a phone number and a physical address, and that Terms, Privacy, Refund and Shipping policies are live). Then replace both key ids and the secret with `rzp_live_…` keys and create the webhook again in live mode with a new secret.

The webhook is the source of truth and is idempotent (event ids are stored; confirming a paid order twice is a no-op). Amounts are re-checked against the order total.

## 6. Shiprocket

1. Shiprocket → Settings → API → create an **API user**; put its email/password in `SHIPROCKET_EMAIL` / `SHIPROCKET_PASSWORD`.
2. Create your pickup address in Shiprocket and enter its exact **name** and the pickup **pincode** in Admin → Settings → Business details.
3. Shiprocket → Settings → Webhooks → URL `https://<your-domain>/api/shiprocket/webhook`, token = `SHIPROCKET_WEBHOOK_TOKEN`.
4. Admin → Order → "Create shipment, AWB & label" ships own-stock items. Supplier-direct items get their courier + AWB entered manually; customers track both on `/track`.

## 7. Tests and checks

```bash
npm run typecheck
npm run lint
npm test                                          # pricing rules + supplier-leak static checks
LEAK_TEST_BASE_URL=http://localhost:3000 npm test # + live crawl for supplier names / URLs / costs
npm run build
```

## 8. Brand assets

`node scripts/brand-assets.mjs` regenerates `/public/logo.svg`, `logo-white.svg`, `logo-stacked.svg`, `icon.svg`, favicons (16/32/48 + `.ico`), `apple-touch-icon.png` and `og.png` from the hand-coded logo. Photo rules for products: `docs/PHOTO_GUIDE.md`.

## 9. Pre-launch checklist

The admin **Dashboard → Launch readiness** panel tracks these live:

- [ ] **Business details** complete: legal name, GSTIN, registered address, grievance officer, support email, support hours (+ phone & address on the Contact page for Razorpay review)
- [ ] **Dealer licence numbers** (insecticide, fertilizer, seed) and issuing authority entered
- [ ] **Restricted ingredients** list filled from current CIB&RC / MoA&FW and state notifications
- [ ] **Tax table** (HSN / GST per category) verified by your **CA** – the seeded values are only a starting point
- [ ] Every **policy page reviewed by a lawyer / CA** (tick "Reviewed by lawyer / CA" on each page and the dashboard box)
- [ ] **Hindi reviewed** by a native speaker for products, pages, FAQ and articles (filter: Products → "Hindi not yet reviewed")
- [ ] Every published product has a **real image** (distributor pack shot or own photo) and verified MRPs
- [ ] **Razorpay**: test-mode order + refund done, website review passed, **live keys** and live webhook set
- [ ] **Shiprocket** connected, pickup location set, webhook added
- [ ] **Resend** domain verified and `RESEND_API_KEY` set; **Vercel Blob** token set; `CRON_SECRET` set
- [ ] Review pricing: with the default 1% markup + 2% handling fee, the admin margin view shows that a single small order often does **not** cover the Razorpay fee and courier cost. Decide the markup / fee / free-shipping threshold with your accountant before launch (Admin → Pricing; changing markup reprices everything, always capped at MRP).
- [ ] COD stays **off** until you decide otherwise (Admin → Pricing)

## 10. What is deliberately NOT included

No invented reviews, ratings, sold counts, stats, testimonials, licence numbers, GSTINs, phone numbers or social links. Every such element is hidden until real data exists. No copied product descriptions or images.
