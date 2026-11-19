import { db } from "@/lib/db";
import { requireStaff } from "@/lib/session";
import { PageHeader, Panel, Pill, Table, Td, inputCls } from "@/components/admin/ui";
import { SubmitButton } from "@/components/admin/SubmitButton";
import { deleteRestricted, saveRestricted } from "@/app/admin/actions/catalog";

export const metadata = { title: "Restricted ingredients" };

export default async function Restricted() {
  const u = await requireStaff();
  const [list, flagged] = await Promise.all([db.restrictedIngredient.findMany({ orderBy: { name: "asc" } }), db.product.count({ where: { restrictedFlag: true } })]);
  return (
    <>
      <PageHeader title="Restricted ingredients" description="Banned, restricted and state-restricted pesticide active ingredients. Matching products are flagged, kept in DRAFT and cannot be published or auto-imported." />
      <div className="mb-4 rounded-2xl border border-accent bg-accent-light p-4 text-sm">
        <strong>Owner action required:</strong> this list ships empty on purpose. Fill it from the current CIB&amp;RC / Ministry of Agriculture &amp; Farmers Welfare notifications (banned and restricted pesticides) and any state-level bans for the states you deliver to. Review it whenever a new notification is issued.
        {flagged > 0 && <span className="mt-1 block font-semibold text-danger">{flagged} product(s) currently flagged.</span>}
      </div>
      <Table head={["Ingredient", "Status", "States", "Notification / reference", ""]} empty="No restricted ingredients entered yet.">
        {list.map((r) => (
          <tr key={r.id}>
            <Td className="font-semibold">{r.name}</Td>
            <Td><Pill tone={r.status === "BANNED" ? "red" : "gold"}>{r.status}</Pill></Td>
            <Td>{r.states.join(", ") || "All India"}</Td>
            <Td>{r.notification}</Td>
            <Td>
              {u.role === "ADMIN" && (
                <form action={deleteRestricted}>
                  <input type="hidden" name="id" value={r.id} />
                  <button className="text-xs text-danger underline">Remove</button>
                </form>
              )}
            </Td>
          </tr>
        ))}
      </Table>
      {u.role === "ADMIN" && (
        <Panel title="Add / update ingredient" className="mt-6">
          <form action={saveRestricted} className="flex flex-wrap gap-2">
            <input name="name" placeholder="Active ingredient (e.g. as on label)" required className={inputCls} />
            <select name="status" className={inputCls}>
              <option>BANNED</option>
              <option>RESTRICTED</option>
              <option>STATE_RESTRICTED</option>
            </select>
            <input name="states" placeholder="States (comma separated, if state-restricted)" className={`${inputCls} w-72`} />
            <input name="notification" placeholder="Gazette / order reference" className={`${inputCls} w-72`} />
            <SubmitButton>Save</SubmitButton>
          </form>
        </Panel>
      )}
    </>
  );
}
