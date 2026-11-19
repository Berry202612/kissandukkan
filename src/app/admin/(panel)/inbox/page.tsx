import { db } from "@/lib/db";
import { requireStaff } from "@/lib/session";
import { PageHeader, Panel, Pill, inputCls } from "@/components/admin/ui";
import { SubmitButton } from "@/components/admin/SubmitButton";
import { markMessageRead, staffReplyTicket } from "@/app/admin/actions/settings";

export const metadata = { title: "Inbox & tickets" };

export default async function Inbox({ searchParams }: { searchParams: Promise<{ msg?: string }> }) {
  await requireStaff();
  const [messages, tickets, sp] = await Promise.all([
    db.contactMessage.findMany({ orderBy: [{ isRead: "asc" }, { createdAt: "desc" }], take: 100 }),
    db.ticket.findMany({ where: { status: { not: "CLOSED" } }, orderBy: { updatedAt: "desc" }, include: { user: { select: { name: true, email: true } }, messages: { orderBy: { createdAt: "asc" } } } }),
    searchParams,
  ]);
  return (
    <>
      <PageHeader title="Inbox & support tickets" description="Contact form and bulk enquiries are also emailed to the support address (if Resend is configured). Reply to contact messages by email." />
      {sp.msg && <p className="mb-4 rounded-xl bg-primary-light p-3 text-sm text-primary-dark">{sp.msg}</p>}
      <div className="grid gap-6 xl:grid-cols-2">
        <div className="space-y-3">
          <h2 className="font-heading text-lg font-bold">Open tickets ({tickets.length})</h2>
          {!tickets.length && <Panel><p className="text-sm text-muted">No open tickets.</p></Panel>}
          {tickets.map((t) => (
            <Panel key={t.id} title={t.subject} actions={<Pill tone={t.status === "OPEN" ? "gold" : "green"}>{t.status}</Pill>}>
              <p className="text-xs text-muted">{t.user.name} · {t.user.email} {t.orderNumber ? `· ${t.orderNumber}` : ""}</p>
              <ul className="mt-2 space-y-2 text-sm">
                {t.messages.map((m) => (
                  <li key={m.id} className={`rounded-xl p-2 ${m.fromStaff ? "bg-primary-light" : "bg-cream"}`}>
                    <span className="text-xs font-semibold">{m.fromStaff ? "Team" : "Customer"} · {m.createdAt.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}</span>
                    <p className="whitespace-pre-line">{m.body}</p>
                  </li>
                ))}
              </ul>
              <form action={staffReplyTicket} className="mt-2 space-y-2">
                <input type="hidden" name="ticketId" value={t.id} />
                <textarea name="body" placeholder="Reply" className={`${inputCls} h-20 w-full py-2`} />
                <label className="flex items-center gap-1 text-sm"><input type="checkbox" name="close" className="accent-primary" /> Close ticket</label>
                <SubmitButton>Send</SubmitButton>
              </form>
            </Panel>
          ))}
        </div>
        <div className="space-y-3">
          <h2 className="font-heading text-lg font-bold">Contact & bulk messages</h2>
          {!messages.length && <Panel><p className="text-sm text-muted">No messages.</p></Panel>}
          {messages.map((m) => (
            <Panel key={m.id} title={m.subject} actions={<span className="flex gap-1"><Pill tone={m.kind === "BULK" ? "soil" : "gray"}>{m.kind}</Pill>{!m.isRead && <Pill tone="gold">New</Pill>}</span>}>
              <p className="text-xs text-muted">{m.name} · <a href={`mailto:${m.email}`} className="underline">{m.email}</a> {m.phone ? `· ${m.phone}` : ""} · {m.createdAt.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}</p>
              <p className="mt-2 whitespace-pre-line text-sm">{m.message}</p>
              {m.meta && <p className="mt-1 text-xs text-muted">{Object.entries(m.meta as Record<string, string>).filter(([, v]) => v).map(([k, v]) => `${k}: ${v}`).join(" · ")}</p>}
              {!m.isRead && (
                <form action={markMessageRead} className="mt-2">
                  <input type="hidden" name="id" value={m.id} />
                  <SubmitButton>Mark as read</SubmitButton>
                </form>
              )}
            </Panel>
          ))}
        </div>
      </div>
    </>
  );
}
