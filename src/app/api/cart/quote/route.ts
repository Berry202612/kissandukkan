import { NextResponse } from "next/server";
import { z } from "zod";
import { quoteCart } from "@/lib/quote";
import { currentUser } from "@/lib/session";

const schema = z.object({
  items: z.array(z.object({ variantId: z.string().min(1).max(40), qty: z.number().int().min(1).max(50) })).max(100),
  coupon: z.string().trim().max(40).nullable().optional(),
  cod: z.boolean().optional(),
});

/** Server-side price quote. The client never computes prices. Only public fields are returned. */
export async function POST(req: Request) {
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid" }, { status: 400 });
  const user = await currentUser();
  const q = await quoteCart(parsed.data.items, { couponCode: parsed.data.coupon, userId: user?.id, cod: parsed.data.cod });
  return NextResponse.json({
    ...q,
    lines: q.lines.map((l) => ({
      variantId: l.variantId,
      slug: l.slug,
      name_en: l.name_en,
      name_hi: l.name_hi,
      image: l.image,
      categorySlug: l.categorySlug,
      packLabel: l.packLabel,
      mrp: l.mrp,
      unitPrice: l.unitPrice,
      qty: l.qty,
      lineTotal: l.lineTotal,
      fulfilledBy: l.fulfilledBy,
      etaMinDays: l.etaMinDays,
      etaMaxDays: l.etaMaxDays,
      available: l.available,
      maxQty: l.maxQty,
    })),
  });
}
