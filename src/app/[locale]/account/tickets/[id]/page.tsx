import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { Badge, Card } from "@/components/ui/form";
import { ReplyTicketForm } from "@/components/store/TicketForms";
import { cn } from "@/lib/utils";

export default async function TicketPage({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const u = await requireUser();
  const ticket = await db.ticket.findFirst({ where: { id, userId: u.id }, include: { messages: { orderBy: { createdAt: "asc" } } } });
  if (!ticket) notFound();
  const [t, tp] = await Promise.all([getTranslations("account"), getTranslations("product")]);
  const fmt = new Intl.DateTimeFormat(locale === "hi" ? "hi-IN" : "en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" });
  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="font-heading text-2xl font-bold">{ticket.subject}</h1>
        <Badge>{t(`ticketStatus.${ticket.status}`)}</Badge>
      </div>
      {ticket.orderNumber && <p className="text-sm text-muted">{ticket.orderNumber}</p>}
      <ul className="mt-5 space-y-3">
        {ticket.messages.map((m) => (
          <li key={m.id} className={cn("max-w-[85%] rounded-2xl p-3 text-sm", m.fromStaff ? "bg-primary-light" : "ml-auto bg-cream")}>
            {m.fromStaff && <p className="font-semibold text-primary-dark">{tp("teamReply")}</p>}
            <p className="whitespace-pre-line">{m.body}</p>
            <p className="mt-1 text-xs text-muted">{fmt.format(m.createdAt)}</p>
          </li>
        ))}
      </ul>
      {ticket.status !== "CLOSED" && (
        <div className="mt-5">
          <ReplyTicketForm ticketId={ticket.id} />
        </div>
      )}
    </Card>
  );
}
