import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { mapShiprocketStatus } from "@/lib/shiprocket";
import { syncOrderFromShipments } from "@/lib/orders";

export const dynamic = "force-dynamic";

/**
 * Shiprocket tracking webhook. Configure in Shiprocket → Settings → API → Webhooks with
 * URL /api/shiprocket/webhook and set the "x-api-key" token to SHIPROCKET_WEBHOOK_TOKEN.
 */
export async function POST(req: Request) {
  const token = process.env.SHIPROCKET_WEBHOOK_TOKEN;
  if (!token || req.headers.get("x-api-key") !== token) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = (await req.json().catch(() => null)) as { awb?: string | number; current_status?: string; shipment_status?: string; scans?: { date?: string; activity?: string; location?: string }[] } | null;
  if (!body?.awb) return NextResponse.json({ ok: true });
  const shipment = await db.shipment.findFirst({ where: { awb: String(body.awb) } });
  if (!shipment) return NextResponse.json({ ok: true });
  const raw = body.current_status ?? body.shipment_status ?? "";
  const status = mapShiprocketStatus(raw);
  const last = body.scans?.[body.scans.length - 1];
  await db.shipment.update({
    where: { id: shipment.id },
    data: { status, events: { create: { status: raw || status, location: last?.location, note: last?.activity, occurredAt: last?.date ? new Date(last.date) : new Date() } } },
  });
  await syncOrderFromShipments(shipment.orderId);
  return NextResponse.json({ ok: true });
}
