import Link from "next/link";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/session";
import { rawRecordSchema } from "@/lib/importer";
import { formatINR } from "@/lib/utils";
import { FilterBar, PageHeader, Panel, Pill, Table, Td, btnCls, btnDangerCls, inputCls } from "@/components/admin/ui";
import { SubmitButton } from "@/components/admin/SubmitButton";
import { approveImportAction, rejectImportAction, uploadImportCsv } from "@/app/admin/actions/catalog";

export const metadata = { title: "Import queue" };

export default async function ImportQueue({ searchParams }: { searchParams: Promise<{ status?: string; err?: string; msg?: string }> }) {
  await requireStaff("view_costs");
  const sp = await searchParams;
  const status = (sp.status ?? "PENDING") as "PENDING" | "APPROVED" | "REJECTED";
  const items = await db.importItem.findMany({ where: { status }, orderBy: [{ flagged: "desc" }, { updatedAt: "desc" }], take: 200 });
  const counts = await db.importItem.groupBy({ by: ["status"], _count: true });
  const c = (s: string) => counts.find((x) => x.status === s)?._count ?? 0;

  return (
    <>
      <PageHeader
        title="Import queue"
        description="Facts collected by the local scraper (scripts/scrape) or uploaded as CSV. Approving creates a DRAFT product with original generated copy (EN + HI, needs review), pack sizes and a private supplier listing. Flagged items match the restricted-ingredient list and cannot be auto-imported."
      />
      {sp.err && <p className="mb-4 rounded-xl bg-[#fdecea] p-3 text-sm text-danger">{sp.err}</p>}
      {sp.msg && <p className="mb-4 rounded-xl bg-primary-light p-3 text-sm text-primary-dark">{sp.msg}</p>}
      <div className="mb-4 flex flex-wrap gap-2">
        {(["PENDING", "APPROVED", "REJECTED"] as const).map((s) => (
          <Link key={s} href={`/admin/import?status=${s}`} className={`rounded-full px-4 py-2 text-sm font-semibold ${status === s ? "bg-primary text-white" : "bg-white text-ink"}`}>
            {s} ({c(s)})
          </Link>
        ))}
      </div>
      <Panel title="Upload CSV" className="mb-6">
        <form action={uploadImportCsv} className="flex flex-wrap items-center gap-2">
          <input type="file" name="file" accept=".csv,text/csv" required className={inputCls} />
          <SubmitButton>Queue rows</SubmitButton>
        </form>
        <p className="mt-2 text-xs text-muted">
          Columns: sourceSite, sourceUrl, name, brand, category (our slug), subCategory, technicalContent, formulation, activeIngredients (a;b), packs (size|unit|mrp|supplierPrice;…), crops (a;b), pests (a;b), dosage. The output of <code>npm run scrape</code> (products-raw.csv) uses this format.
        </p>
      </Panel>
      <FilterBar>
        <input type="hidden" name="status" value={status} />
        <span className="text-sm text-muted">Showing up to 200 items, flagged first.</span>
      </FilterBar>
      <Table head={["Product", "Source", "Packs (MRP / supplier)", "Flags", ""]} empty="Queue is empty.">
        {items.map((i) => {
          const r = rawRecordSchema.safeParse(i.raw);
          const rec = r.success ? r.data : null;
          const pc = i.priceChange as { pack: string; oldCost: number; newCost: number; oldMrp: number; newMrp: number }[] | null;
          return (
            <tr key={i.id}>
              <Td>
                <span className="font-semibold">{rec?.name ?? "Invalid record"}</span>
                <span className="block text-xs text-muted">
                  {rec?.brand} · {rec?.category}
                  {rec?.subCategory ? ` / ${rec.subCategory}` : ""} · {rec?.technicalContent}
                </span>
                {i.productId && (
                  <Link href={`/admin/products/${i.productId}`} className="text-xs text-primary underline">
                    Linked product
                  </Link>
                )}
              </Td>
              <Td>
                <a href={i.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-primary underline">
                  {i.sourceSite}
                </a>
              </Td>
              <Td className="text-xs">
                {rec?.packs.map((p) => (
                  <span key={`${p.size}${p.unit}`} className="block">
                    {p.size} {p.unit}: {formatINR(p.mrp)} / {formatINR(p.price)}
                  </span>
                ))}
                {pc?.map((x) => (
                  <span key={x.pack} className="block font-semibold text-soil">
                    Price change {x.pack}: cost {formatINR(x.oldCost)} → {formatINR(x.newCost)}, MRP {formatINR(x.oldMrp)} → {formatINR(x.newMrp)}
                  </span>
                ))}
              </Td>
              <Td>{i.flagged ? <Pill tone="red">{i.flagReason}</Pill> : rec ? <Pill tone="green">OK</Pill> : <Pill tone="red">Invalid</Pill>}</Td>
              <Td className="whitespace-nowrap">
                {status === "PENDING" && rec && (!i.flagged || i.productId) && (
                  <form action={approveImportAction} className="mb-1 inline-block">
                    <input type="hidden" name="id" value={i.id} />
                    <SubmitButton className={btnCls}>{i.productId ? "Apply prices" : "Approve → Draft"}</SubmitButton>
                  </form>
                )}{" "}
                {status !== "REJECTED" && (
                  <form action={rejectImportAction} className="inline-block">
                    <input type="hidden" name="id" value={i.id} />
                    <SubmitButton className={btnDangerCls}>Reject</SubmitButton>
                  </form>
                )}
              </Td>
            </tr>
          );
        })}
      </Table>
    </>
  );
}
