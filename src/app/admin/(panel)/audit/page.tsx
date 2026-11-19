import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { PageHeader, Table, Td } from "@/components/admin/ui";

export const metadata = { title: "Audit log" };

export default async function Audit() {
  await requireAdmin();
  const logs = await db.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 300, include: { user: { select: { name: true } } } });
  return (
    <>
      <PageHeader title="Audit log" description="Last 300 admin and staff actions." />
      <Table head={["When", "Who", "Action", "Entity", "Details"]} empty="No actions logged yet.">
        {logs.map((l) => (
          <tr key={l.id}>
            <Td className="whitespace-nowrap">{l.createdAt.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}</Td>
            <Td>{l.user?.name ?? "system"}</Td>
            <Td>{l.action}</Td>
            <Td>{l.entity} <span className="text-xs text-muted">{l.entityId}</span></Td>
            <Td className="max-w-xs truncate text-xs text-muted">{l.meta ? JSON.stringify(l.meta) : ""}</Td>
          </tr>
        ))}
      </Table>
    </>
  );
}
