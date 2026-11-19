import Link from "next/link";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/session";
import { expirePendingOrders } from "@/lib/orders";
import { formatINR } from "@/lib/utils";
import { FilterBar, PageHeader, Pill, Table, Td, btnCls, btnOutlineCls, inputCls } from "@/components/admin/ui";

export const metadata = { title: "Orders" };

const STATUSES = ["PAYMENT_PENDING", "PLACED", "CONFIRMED", "PACKED", "ORDERED_FROM_SUPPLIER", "SHIPPED", "OUT_FOR_DELIVERY", "DELIVERED", "CANCELLED", "REPLACEMENT", "REFUNDED"];

export default async function OrdersAdmin({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  await requireStaff();
  await expirePendingOrders();
  const sp = await searchParams;
  const where: Prisma.OrderWhereInput = {
    ...(sp.status ? { status: sp.status as "PLACED" } : {}),
    ...(sp.proc === "todo" ? { items: { some: { procurement: { status: "TO_ORDER" } } }, OR: [{ paymentStatus: "CAPTURED" }, { paymentMethod: "COD", status: { notIn: ["CANCELLED", "PAYMENT_PENDING"] } }] } : {}),
    ...(sp.ship === "pending" ? { items: { some: { shipmentId: null } }, status: { in: ["CONFIRMED", "PACKED", "ORDERED_FROM_SUPPLIER", "PLACED"] } } : {}),
    ...(sp.q ? { OR: [{ orderNumber: { contains: sp.q, mode: "insensitive" } }, { user: { email: { contains: sp.q, mode: "insensitive" } } }, { user: { mobile: { contains: sp.q } } }, { user: { name: { contains: sp.q, mode: "insensitive" } } }] } : {}),
  };
  const page = Math.max(1, Number(sp.page ?? 1));
  const [orders, total] = await Promise.all([
    db.order.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * 50,
      take: 50,
      select: { id: true, orderNumber: true, createdAt: true, status: true, paymentStatus: true, paymentMethod: true, total: true, user: { select: { name: true } }, items: { select: { fulfilledBy: true, shipmentId: true, procurement: { select: { status: true } } } } },
    }),
    db.order.count({ where }),
  ]);
  return (
    <>
      <PageHeader title="Orders" description={`${total} orders`} actions={
          // eslint-disable-next-line @next/next/no-html-link-for-pages -- file download from a route handler
          <a href="/admin/reports/export?type=orders" className={btnOutlineCls}>Export CSV</a>
        } />
      <FilterBar>
        <input name="q" defaultValue={sp.q} placeholder="Order no., customer name, email, mobile" className={`${inputCls} w-72`} />
        <select name="status" defaultValue={sp.status ?? ""} className={inputCls}>
          <option value="">Any status</option>
          {STATUSES.map((s) => <option key={s}>{s}</option>)}
        </select>
        <select name="proc" defaultValue={sp.proc ?? ""} className={inputCls}>
          <option value="">Any procurement</option>
          <option value="todo">Needs ordering from supplier</option>
        </select>
        <select name="ship" defaultValue={sp.ship ?? ""} className={inputCls}>
          <option value="">Any shipping</option>
          <option value="pending">Has unshipped items</option>
        </select>
        <button className={btnCls}>Filter</button>
      </FilterBar>
      <Table head={["Order", "Customer", "Date", "Status", "Payment", "Fulfilment", "Total"]} empty="No orders yet.">
        {orders.map((o) => {
          const own = o.items.filter((i) => i.fulfilledBy === "OWN_STOCK").length;
          const sup = o.items.length - own;
          const todo = o.items.filter((i) => i.procurement?.status === "TO_ORDER").length;
          return (
            <tr key={o.id} className="hover:bg-cream">
              <Td><Link href={`/admin/orders/${o.id}`} className="font-semibold text-primary-dark underline">{o.orderNumber}</Link></Td>
              <Td>{o.user.name}</Td>
              <Td>{o.createdAt.toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" })}</Td>
              <Td><Pill tone={o.status === "DELIVERED" ? "green" : o.status === "CANCELLED" || o.status === "REFUNDED" ? "red" : "gold"}>{o.status}</Pill></Td>
              <Td><Pill tone={o.paymentStatus === "CAPTURED" ? "green" : o.paymentStatus === "PENDING" ? "gold" : "red"}>{o.paymentStatus}</Pill></Td>
              <Td className="text-xs">
                {own > 0 && <span className="block">Own stock: {own}</span>}
                {sup > 0 && <span className="block">Supplier: {sup}{todo && (o.paymentStatus === "CAPTURED" || o.paymentMethod === "COD") ? <strong className="text-danger"> ({todo} to order)</strong> : ""}</span>}
              </Td>
              <Td className="font-semibold">{formatINR(o.total)}</Td>
            </tr>
          );
        })}
      </Table>
      {total > 50 && (
        <div className="mt-4 flex gap-2">
          {page > 1 && <Link className={btnOutlineCls} href={`?${new URLSearchParams({ ...sp, page: String(page - 1) } as Record<string, string>)}`}>← Prev</Link>}
          {page * 50 < total && <Link className={btnOutlineCls} href={`?${new URLSearchParams({ ...sp, page: String(page + 1) } as Record<string, string>)}`}>Next →</Link>}
        </div>
      )}
    </>
  );
}
