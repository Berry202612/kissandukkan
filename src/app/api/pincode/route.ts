import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getBusiness, getDelivery } from "@/lib/settings";
import { checkServiceability, shiprocketConfigured } from "@/lib/shiprocket";
import { lookupPincode } from "@/lib/pincode";

/**
 * Real delivery check. Never answers "ok" without a real check:
 * - Own stock → Shiprocket serviceability API
 * - Supplier direct → admin-managed serviceable regions (pincode prefix or state)
 * Returns { status: "ok" | "no" | "unknown" }.
 * Without `variant`, returns only the pincode lookup (used for address autofill).
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const pin = url.searchParams.get("pin") ?? "";
  const variantId = url.searchParams.get("variant");
  if (!/^[1-9][0-9]{5}$/.test(pin)) return NextResponse.json({ status: "invalid" }, { status: 400 });

  if (!variantId) {
    const place = await lookupPincode(pin);
    return NextResponse.json(place ? { status: "ok", ...place } : { status: "unknown" });
  }

  const variant = await db.productVariant.findFirst({
    where: { id: variantId, isActive: true, product: { status: "PUBLISHED" } },
    select: { weightGrams: true, product: { select: { fulfilledBy: true, surfaceOnly: true } } },
  });
  if (!variant) return NextResponse.json({ status: "unknown" });
  const delivery = await getDelivery();
  const extra = variant.product.surfaceOnly ? delivery.surfaceExtraDays : 0;

  if (variant.product.fulfilledBy === "OWN_STOCK") {
    const b = await getBusiness();
    if (!shiprocketConfigured() || !b.pickupPincode) return NextResponse.json({ status: "unknown" });
    try {
      const s = await checkServiceability(b.pickupPincode, pin, variant.weightGrams / 1000);
      if (!s.serviceable) return NextResponse.json({ status: "no" });
      return NextResponse.json(s.etdDays ? { status: "ok", days: s.etdDays + extra } : { status: "ok", min: delivery.ownStockMinDays + extra, max: delivery.ownStockMaxDays + extra });
    } catch (e) {
      console.error("[pincode] shiprocket", e);
      return NextResponse.json({ status: "unknown" });
    }
  }

  const regions = await db.serviceableRegion.findMany({ where: { isActive: true } });
  if (!regions.length) return NextResponse.json({ status: "unknown" });
  let ok = regions.some((r) => r.pincodePrefix && pin.startsWith(r.pincodePrefix));
  if (!ok && regions.some((r) => r.state)) {
    const place = await lookupPincode(pin);
    if (!place) return NextResponse.json({ status: "unknown" });
    ok = regions.some((r) => r.state && r.state.toLowerCase() === place.state.toLowerCase());
  }
  return NextResponse.json(ok ? { status: "ok", min: delivery.supplierMinDays + extra, max: delivery.supplierMaxDays + extra } : { status: "no" });
}
