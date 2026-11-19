import { db } from "@/lib/db";
import { requireAdmin, requireStaff } from "@/lib/session";
import { profitReport } from "@/lib/reports";
import { toCsv } from "@/lib/csv";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const type = url.searchParams.get("type");
  const file = (name: string, body: string) => new Response(body, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="${name}-${new Date().toISOString().slice(0, 10)}.csv"` } });

  if (type === "orders") {
    await requireStaff();
    const orders = await db.order.findMany({ orderBy: { createdAt: "desc" }, take: 5000, include: { user: { select: { name: true, email: true, mobile: true } } } });
    return file(
      "orders",
      toCsv(
        orders.map((o) => ({
          order: o.orderNumber,
          created: o.createdAt.toISOString(),
          status: o.status,
          payment: o.paymentStatus,
          customer: o.user.name,
          email: o.user.email ?? "",
          mobile: o.user.mobile ?? "",
          state: (o.shippingAddress as { state?: string }).state ?? "",
          subtotal: o.subtotal.toString(),
          discount: o.discount.toString(),
          shipping: o.shippingFee.toString(),
          handling_fee: o.handlingFee.toString(),
          total: o.total.toString(),
          refunded: o.refundedAmount.toString(),
          invoice: o.invoiceNumber ?? "",
        })),
      ),
    );
  }

  await requireAdmin();
  const from = new Date(`${url.searchParams.get("from") ?? new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10)}T00:00:00+05:30`);
  const to = new Date(`${url.searchParams.get("to") ?? new Date().toISOString().slice(0, 10)}T23:59:59+05:30`);
  const by = (url.searchParams.get("by") ?? "day") as "day";
  const rows = await profitReport(from, to, by);
  return file(`profit-by-${by}`, toCsv(rows.map((r) => ({ [by]: r.key, count: r.orders, revenue: r.revenue.toFixed(2), refunds: r.refunds.toFixed(2), cost: r.cost.toFixed(2), razorpay_fees: r.fees.toFixed(2), shipping: r.shipping.toFixed(2), net: r.net.toFixed(2) }))));
}
