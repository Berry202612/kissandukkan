import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { PageHeader, Panel, Table, Td, inputCls } from "@/components/admin/ui";
import { SubmitButton } from "@/components/admin/SubmitButton";
import { createStaff, resetStaffPassword, updateStaff } from "@/app/admin/actions/settings";

export const metadata = { title: "Staff & permissions" };

export default async function Staff({ searchParams }: { searchParams: Promise<{ msg?: string; err?: string }> }) {
  const me = await requireAdmin();
  const [staff, sp] = await Promise.all([db.user.findMany({ where: { role: { in: ["STAFF", "ADMIN"] } }, orderBy: { createdAt: "asc" } }), searchParams]);
  return (
    <>
      <PageHeader title="Staff & permissions" description="STAFF can manage orders, procurement and products. Settings, refunds, tax and staff are ADMIN only. Supplier costs are visible to STAFF only with the 'view costs' permission." />
      {sp.msg && <p className="mb-4 rounded-xl bg-primary-light p-3 text-sm text-primary-dark">{sp.msg}</p>}
      {sp.err && <p className="mb-4 rounded-xl bg-[#fdecea] p-3 text-sm text-danger">{sp.err}</p>}
      <Table head={["Name", "Email", "Role & permissions", ""]}>
        {staff.map((s) => (
          <tr key={s.id}>
            <Td className="font-semibold">{s.name}{s.id === me.id ? " (you)" : ""}</Td>
            <Td>{s.email}</Td>
            <Td>
              <form action={updateStaff} className="flex flex-wrap items-center gap-2">
                <input type="hidden" name="id" value={s.id} />
                <select name="role" defaultValue={s.role} className={inputCls}>
                  <option value="STAFF">STAFF</option>
                  <option value="ADMIN">ADMIN</option>
                  <option value="CUSTOMER">Remove staff access</option>
                </select>
                <label className="flex items-center gap-1 text-sm"><input type="checkbox" name="viewCosts" defaultChecked={s.permissions.includes("view_costs")} className="accent-primary" /> View costs & suppliers</label>
                <label className="flex items-center gap-1 text-sm"><input type="checkbox" name="isBlocked" defaultChecked={s.isBlocked} className="accent-primary" /> Blocked</label>
                <SubmitButton>Save</SubmitButton>
              </form>
            </Td>
            <Td>
              {s.id !== me.id && (
                <form action={resetStaffPassword}>
                  <input type="hidden" name="id" value={s.id} />
                  <SubmitButton confirm="Generate a new temporary password for this user?">Reset password</SubmitButton>
                </form>
              )}
            </Td>
          </tr>
        ))}
      </Table>
      <Panel title="Add staff member" className="mt-6">
        <form action={createStaff} className="flex flex-wrap items-end gap-2">
          <input name="name" placeholder="Name" required className={inputCls} />
          <input name="email" type="email" placeholder="Email" required className={inputCls} />
          <input name="password" type="password" placeholder="Initial password" required className={inputCls} autoComplete="new-password" />
          <select name="role" className={inputCls}><option value="STAFF">STAFF</option><option value="ADMIN">ADMIN</option></select>
          <label className="flex items-center gap-1 text-sm"><input type="checkbox" name="viewCosts" className="accent-primary" /> View costs</label>
          <SubmitButton>Create</SubmitButton>
        </form>
      </Panel>
    </>
  );
}
