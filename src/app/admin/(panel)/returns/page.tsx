import Link from "next/link";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/session";
import { PageHeader, Panel, Pill, inputCls } from "@/components/admin/ui";
import { SubmitButton } from "@/components/admin/SubmitButton";
import { decideReturn } from "@/app/admin/actions/orders";

export const metadata = { title: "Replacements & refunds" };

export default async function Returns() {
  await requireStaff();
  const list = await db.returnRequest.findMany({
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    take: 100,
    include: { order: { select: { id: true, orderNumber: true, items: { select: { id: true, name_en: true, packLabel: true, quantity: true } } } }, user: { select: { name: true } } },
  });
  return (
    <>
      <PageHeader title="Replacements & refunds" description="Approve to start a replacement. For refunds, open the order and use the Refund panel (partial refunds supported)." />
      <div className="space-y-3">
        {!list.length && <Panel><p className="text-muted">No requests.</p></Panel>}
        {list.map((r) => (
          <Panel key={r.id}>
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <Link href={`/admin/orders/${r.order.id}`} className="font-semibold text-primary-dark underline">{r.order.orderNumber}</Link>
              <Pill tone="soil">{r.type}</Pill>
              <Pill tone={r.status === "REQUESTED" ? "gold" : r.status === "REJECTED" ? "red" : "green"}>{r.status}</Pill>
              <span className="text-muted">{r.user.name} · {r.createdAt.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}</span>
            </div>
            <p className="mt-2 text-sm"><strong>Reason:</strong> {r.reason}</p>
            <p className="text-sm">{r.details}</p>
            <p className="mt-1 text-xs text-muted">Items: {r.order.items.filter((i) => r.itemIds.includes(i.id)).map((i) => `${i.name_en} ${i.packLabel} ×${i.quantity}`).join(", ")}</p>
            <div className="mt-2 flex flex-wrap gap-2 text-xs">
              {r.media.map((m, i) => (
                <a key={m} href={m} target="_blank" rel="noopener noreferrer" className="rounded-lg bg-primary-light px-2 py-1 font-semibold text-primary-dark underline">Evidence {i + 1}</a>
              ))}
            </div>
            {r.status !== "COMPLETED" && r.status !== "REJECTED" && (
              <form action={decideReturn} className="mt-3 flex flex-wrap gap-2">
                <input type="hidden" name="id" value={r.id} />
                <select name="status" className={inputCls} defaultValue={r.status === "REQUESTED" ? "APPROVED" : "COMPLETED"}>
                  {r.status === "REQUESTED" && <option value="APPROVED">Approve</option>}
                  {r.status === "REQUESTED" && <option value="REJECTED">Reject</option>}
                  {r.status === "APPROVED" && <option value="COMPLETED">Mark completed</option>}
                </select>
                <input name="adminNote" placeholder="Message to customer" className={`${inputCls} w-80`} />
                <SubmitButton>Save</SubmitButton>
              </form>
            )}
            {r.adminNote && <p className="mt-2 text-xs text-muted">Note: {r.adminNote}</p>}
          </Panel>
        ))}
      </div>
    </>
  );
}
