import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { Badge, Card } from "@/components/ui/form";
import { NewTicketForm } from "@/components/store/TicketForms";

export default async function TicketsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const u = await requireUser();
  const t = await getTranslations("account");
  const tickets = await db.ticket.findMany({ where: { userId: u.id }, orderBy: { updatedAt: "desc" } });
  const fmt = new Intl.DateTimeFormat(locale === "hi" ? "hi-IN" : "en-IN", { dateStyle: "medium", timeZone: "Asia/Kolkata" });
  return (
    <div className="space-y-5">
      <Card className="p-5">
        <h1 className="font-heading text-2xl font-bold">{t("tickets")}</h1>
        {tickets.length === 0 ? (
          <p className="mt-2 text-muted">{t("noTickets")}</p>
        ) : (
          <ul className="mt-3 divide-y divide-line">
            {tickets.map((tk) => (
              <li key={tk.id}>
                <Link href={`/account/tickets/${tk.id}`} className="flex items-center justify-between gap-3 py-3 hover:bg-cream">
                  <span>
                    <span className="block font-semibold">{tk.subject}</span>
                    <span className="text-xs text-muted">
                      {fmt.format(tk.updatedAt)}
                      {tk.orderNumber ? ` · ${tk.orderNumber}` : ""}
                    </span>
                  </span>
                  <Badge tone={tk.status === "ANSWERED" ? "green" : tk.status === "CLOSED" ? "gray" : "gold"}>{t(`ticketStatus.${tk.status}`)}</Badge>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
      <Card className="p-5">
        <h2 className="font-heading text-xl font-bold">{t("newTicket")}</h2>
        <div className="mt-4">
          <NewTicketForm />
        </div>
      </Card>
    </div>
  );
}
