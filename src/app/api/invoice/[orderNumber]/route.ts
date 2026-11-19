import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { currentUser } from "@/lib/session";
import { renderInvoicePdf } from "@/lib/invoice";

export async function GET(_: Request, { params }: { params: Promise<{ orderNumber: string }> }) {
  const { orderNumber } = await params;
  const u = await currentUser();
  if (!u) return NextResponse.json({ error: "login" }, { status: 401 });
  const staff = u.role === "ADMIN" || u.role === "STAFF";
  const order = await db.order.findFirst({ where: { orderNumber, ...(staff ? {} : { userId: u.id }) }, select: { id: true, invoiceNumber: true } });
  if (!order?.invoiceNumber) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const pdf = await renderInvoicePdf(order.id);
  if (!pdf) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return new NextResponse(Buffer.from(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="Invoice-${order.invoiceNumber.replace(/\//g, "-")}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
