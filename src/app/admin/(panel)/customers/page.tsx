import Link from "next/link";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/session";
import { formatINR } from "@/lib/utils";
import { FilterBar, PageHeader, Pill, Table, Td, btnCls, inputCls } from "@/components/admin/ui";
import { SubmitButton } from "@/components/admin/SubmitButton";
import { setBlocked } from "@/app/admin/actions/settings";

export const metadata = { title: "Customers" };

export default async function Customers({ searchParams }: { searchParams: Promise<{ q?: string; msg?: string; err?: string }> }) {
  await requireStaff();
  const sp = await searchParams;
  const users = await db.user.findMany({
    where: { role: "CUSTOMER", ...(sp.q ? { OR: [{ name: { contains: sp.q, mode: "insensitive" } }, { email: { contains: sp.q, mode: "insensitive" } }, { mobile: { contains: sp.q } }] } : {}) },
    orderBy: { createdAt: "desc" },
    take: 100,
    select: { id: true, name: true, email: true, mobile: true, createdAt: true, isBlocked: true, orders: { where: { paymentStatus: { in: ["CAPTURED", "PARTIALLY_REFUNDED"] } }, select: { total: true, orderNumber: true, id: true }, orderBy: { createdAt: "desc" } } },
  });
  return (
    <>
      <PageHeader title="Customers" />
      {sp.msg && <p className="mb-4 rounded-xl bg-primary-light p-3 text-sm text-primary-dark">{sp.msg}</p>}
      {sp.err && <p className="mb-4 rounded-xl bg-[#fdecea] p-3 text-sm text-danger">{sp.err}</p>}
      <FilterBar>
        <input name="q" defaultValue={sp.q} placeholder="Name, email or mobile" className={`${inputCls} w-72`} />
        <button className={btnCls}>Search</button>
      </FilterBar>
      <Table head={["Customer", "Contact", "Joined", "Paid orders", "Spend", ""]} empty="No customers yet.">
        {users.map((u) => (
          <tr key={u.id}>
            <Td className="font-semibold">{u.name} {u.isBlocked && <Pill tone="red">Blocked</Pill>}</Td>
            <Td>{u.email}<span className="block text-xs text-muted">{u.mobile}</span></Td>
            <Td>{u.createdAt.toLocaleDateString("en-IN")}</Td>
            <Td className="text-xs">
              {u.orders.slice(0, 5).map((o) => (
                <Link key={o.id} href={`/admin/orders/${o.id}`} className="block text-primary underline">{o.orderNumber}</Link>
              ))}
              {u.orders.length > 5 && <span className="text-muted">+{u.orders.length - 5} more</span>}
            </Td>
            <Td>{formatINR(u.orders.reduce((s, o) => s + Number(o.total), 0))}</Td>
            <Td>
              <form action={setBlocked}>
                <input type="hidden" name="id" value={u.id} />
                <input type="hidden" name="blocked" value={u.isBlocked ? "0" : "1"} />
                <SubmitButton confirm={u.isBlocked ? "Unblock this customer?" : "Block this customer? They will not be able to log in."}>{u.isBlocked ? "Unblock" : "Block"}</SubmitButton>
              </form>
            </Td>
          </tr>
        ))}
      </Table>
    </>
  );
}
