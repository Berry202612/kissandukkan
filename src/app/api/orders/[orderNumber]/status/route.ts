import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { currentUser } from "@/lib/session";

export async function GET(_: Request, { params }: { params: Promise<{ orderNumber: string }> }) {
  const { orderNumber } = await params;
  const u = await currentUser();
  if (!u) return NextResponse.json({ error: "login" }, { status: 401 });
  const o = await db.order.findFirst({ where: { orderNumber, userId: u.id }, select: { status: true, paymentStatus: true } });
  if (!o) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json(o);
}
