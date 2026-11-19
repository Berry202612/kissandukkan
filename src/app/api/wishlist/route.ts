import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { currentUser } from "@/lib/session";

export async function GET(req: Request) {
  const productId = new URL(req.url).searchParams.get("productId");
  const u = await currentUser();
  if (!u || !productId) return NextResponse.json({ saved: false });
  const row = await db.wishlistItem.findUnique({ where: { userId_productId: { userId: u.id, productId } } });
  return NextResponse.json({ saved: Boolean(row) });
}
