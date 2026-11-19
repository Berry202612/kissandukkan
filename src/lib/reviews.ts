import "server-only";
import { db } from "./db";
import { getDelivery } from "./settings";
import { sendTemplate } from "./email";
import { siteUrl } from "./utils";

/** Products in the user's delivered orders that they have not reviewed yet. */
export async function reviewableProducts(userId: string) {
  const items = await db.orderItem.findMany({
    where: { order: { userId, status: "DELIVERED" } },
    select: { productId: true, productSlug: true, name_en: true, name_hi: true, orderId: true },
    orderBy: { order: { deliveredAt: "desc" } },
  });
  const reviewed = new Set((await db.review.findMany({ where: { userId }, select: { productId: true } })).map((r) => r.productId));
  const seen = new Set<string>();
  return items.filter((i) => !reviewed.has(i.productId) && !seen.has(i.productId) && seen.add(i.productId));
}

export async function canReview(userId: string, productId: string) {
  const item = await db.orderItem.findFirst({ where: { productId, order: { userId, status: "DELIVERED" } }, select: { orderId: true } });
  return item?.orderId ?? null;
}

/** Recompute rating from PUBLISHED reviews only. */
export async function recomputeRating(productId: string) {
  const agg = await db.review.aggregate({ where: { productId, status: "PUBLISHED" }, _avg: { rating: true }, _count: true });
  await db.product.update({ where: { id: productId }, data: { ratingAvg: agg._count ? agg._avg.rating : null, ratingCount: agg._count } });
}

export async function sendDueReviewRequests() {
  const d = await getDelivery();
  const cutoff = new Date(Date.now() - d.reviewRequestDelayDays * 24 * 3600 * 1000);
  const orders = await db.order.findMany({
    where: { status: "DELIVERED", deliveredAt: { lte: cutoff }, reviewRequestSentAt: null },
    include: { user: { select: { name: true, email: true, emailOptIn: true, orderUpdatesOptIn: true } }, items: { select: { productSlug: true, name_en: true, name_hi: true } } },
    take: 100,
  });
  let sent = 0;
  for (const o of orders) {
    const first = o.items[0];
    if (first && o.user.email && o.user.orderUpdatesOptIn) {
      if (!process.env.RESEND_API_KEY) break; // email not configured: leave pending so it is sent once email works
      const loc = o.locale;
      const r = await sendTemplate("review_request", loc, o.user.email, {
        name: o.user.name,
        orderNumber: o.orderNumber,
        productName: loc === "hi" ? first.name_hi : first.name_en,
        reviewUrl: siteUrl(`/${loc}/account/reviews/new?product=${encodeURIComponent(first.productSlug)}`),
      });
      if (!r.sent) continue; // retry on the next run
      sent++;
    }
    await db.order.update({ where: { id: o.id }, data: { reviewRequestSentAt: new Date() } });
  }
  return sent;
}
