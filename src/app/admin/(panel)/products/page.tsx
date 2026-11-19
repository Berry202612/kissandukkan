import Link from "next/link";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/session";
import { formatINR, toNum } from "@/lib/utils";
import { isDemoImage } from "@/lib/demo-images";
import { FilterBar, PageHeader, Pill, Table, Td, btnCls, btnOutlineCls, inputCls } from "@/components/admin/ui";
import { setProductStatusForm } from "@/app/admin/actions/products";
import { SubmitButton } from "@/components/admin/SubmitButton";

export const metadata = { title: "Products" };

type SP = Record<string, string | undefined>;

export default async function ProductsAdmin({ searchParams }: { searchParams: Promise<SP> }) {
  await requireStaff();
  const sp = await searchParams;
  const where: Prisma.ProductWhereInput = {
    ...(sp.status ? { status: sp.status as "DRAFT" } : {}),
    ...(sp.category ? { categoryId: sp.category } : {}),
    ...(sp.image === "missing" ? { images: { isEmpty: true } } : sp.image ? { imageStatus: sp.image as "NONE" } : {}),
    ...(sp.hi === "no" ? { hiReviewed: false } : {}),
    ...(sp.fulfil ? { fulfilledBy: sp.fulfil as "OWN_STOCK" } : {}),
    ...(sp.flag === "restricted" ? { restrictedFlag: true } : sp.flag === "margin" ? { marginFlag: true } : {}),
    ...(sp.q ? { OR: [{ name_en: { contains: sp.q, mode: "insensitive" } }, { technicalContent: { contains: sp.q, mode: "insensitive" } }, { variants: { some: { sku: { contains: sp.q, mode: "insensitive" } } } }] } : {}),
  };
  const page = Math.max(1, Number(sp.page ?? 1));
  const [products, total, categories] = await Promise.all([
    db.product.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * 50,
      take: 50,
      select: {
        id: true,
        name_en: true,
        status: true,
        images: true,
        imageStatus: true,
        hiReviewed: true,
        fulfilledBy: true,
        restrictedFlag: true,
        marginFlag: true,
        mrpVerified: true,
        brand: { select: { name: true } },
        category: { select: { name_en: true } },
        variants: { where: { isActive: true }, select: { mrp: true, sellingPrice: true, stock: true, lowStockAt: true } },
      },
    }),
    db.product.count({ where }),
    db.category.findMany({ orderBy: { sortOrder: "asc" } }),
  ]);
  const qs = new URLSearchParams(Object.entries(sp).filter(([k, v]) => v && k !== "err") as [string, string][]).toString();

  return (
    <>
      <PageHeader
        title="Products"
        description={`${total} products. Imported products start as DRAFT – review content, Hindi, images and prices before publishing.`}
        actions={
          <>
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- file download from a route handler */}
            <a href="/admin/products/export" className={btnOutlineCls}>Export CSV</a>
            <Link href="/admin/products/new" className={btnCls}>+ New product</Link>
          </>
        }
      />
      {sp.err && <p className="mb-4 rounded-xl bg-[#fdecea] p-3 text-sm text-danger">{sp.err}</p>}
      <FilterBar>
        <input name="q" defaultValue={sp.q} placeholder="Search name, content, SKU" className={inputCls} />
        <select name="status" defaultValue={sp.status ?? ""} className={inputCls}>
          <option value="">Any status</option>
          <option>DRAFT</option>
          <option>PUBLISHED</option>
          <option>ARCHIVED</option>
        </select>
        <select name="category" defaultValue={sp.category ?? ""} className={inputCls}>
          <option value="">Any category</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name_en}</option>
          ))}
        </select>
        <select name="image" defaultValue={sp.image ?? ""} className={inputCls}>
          <option value="">Any image status</option>
          <option value="missing">Images missing</option>
          <option value="CATEGORY_FALLBACK">Category fallback</option>
          <option value="DISTRIBUTOR">Distributor</option>
          <option value="OWN_PHOTO">Own photo</option>
        </select>
        <select name="hi" defaultValue={sp.hi ?? ""} className={inputCls}>
          <option value="">Hindi: any</option>
          <option value="no">Hindi not yet reviewed</option>
        </select>
        <select name="fulfil" defaultValue={sp.fulfil ?? ""} className={inputCls}>
          <option value="">Any fulfilment</option>
          <option value="OWN_STOCK">Own stock</option>
          <option value="SUPPLIER_DIRECT">Supplier direct</option>
        </select>
        <select name="flag" defaultValue={sp.flag ?? ""} className={inputCls}>
          <option value="">No flag filter</option>
          <option value="restricted">Flagged: restricted ingredient</option>
          <option value="margin">Flagged: margin below target</option>
        </select>
        <button className={btnCls}>Filter</button>
      </FilterBar>

      <form action={setProductStatusForm}>
        <input type="hidden" name="back" value={`/admin/products${qs ? `?${qs}` : ""}`} />
        <div className="mb-2 flex flex-wrap items-center gap-2 text-sm">
          <span className="text-muted">With selected:</span>
          <select name="status" className={inputCls} defaultValue="PUBLISHED">
            <option value="PUBLISHED">Publish</option>
            <option value="DRAFT">Unpublish (draft)</option>
            <option value="ARCHIVED">Archive</option>
          </select>
          <SubmitButton>Apply</SubmitButton>
        </div>
        <Table head={["", "Product", "Category", "Status", "Price", "Fulfilment", "Checks"]} empty="No products match. Run the import script or create one.">
          {products.map((p) => {
            const lowStock = p.fulfilledBy === "OWN_STOCK" && p.variants.some((v) => v.stock <= v.lowStockAt);
            const minP = p.variants.length ? Math.min(...p.variants.map((v) => toNum(v.sellingPrice))) : 0;
            return (
              <tr key={p.id} className="hover:bg-cream">
                <Td>
                  <input type="checkbox" name="ids" value={p.id} className="h-4 w-4 accent-primary" aria-label={`Select ${p.name_en}`} />
                </Td>
                <Td>
                  <Link href={`/admin/products/${p.id}`} className="font-semibold text-primary-dark hover:underline">{p.name_en}</Link>
                  <span className="block text-xs text-muted">{p.brand?.name ?? "—"}</span>
                </Td>
                <Td>{p.category.name_en}</Td>
                <Td>
                  <Pill tone={p.status === "PUBLISHED" ? "green" : p.status === "DRAFT" ? "gold" : "gray"}>{p.status}</Pill>
                </Td>
                <Td>{p.variants.length ? formatINR(minP) : <span className="text-danger">No pack</span>}</Td>
                <Td>{p.fulfilledBy === "OWN_STOCK" ? "Own stock" : "Supplier"}</Td>
                <Td className="space-x-1 space-y-1">
                  {!p.images.length && <Pill tone="red">No image</Pill>}
                  {p.images.some(isDemoImage) && <Pill tone="gold">Demo image</Pill>}
                  {!p.hiReviewed && <Pill tone="gold">Hindi</Pill>}
                  {p.restrictedFlag && <Pill tone="red">Restricted</Pill>}
                  {p.marginFlag && <Pill tone="soil">Margin</Pill>}
                  {!p.mrpVerified && <Pill tone="red">MRP?</Pill>}
                  {lowStock && <Pill tone="red">Low stock</Pill>}
                </Td>
              </tr>
            );
          })}
        </Table>
      </form>
      {total > 50 && (
        <div className="mt-4 flex gap-2">
          {page > 1 && <Link className={btnOutlineCls} href={`?${new URLSearchParams({ ...sp, page: String(page - 1) } as Record<string, string>)}`}>← Prev</Link>}
          {page * 50 < total && <Link className={btnOutlineCls} href={`?${new URLSearchParams({ ...sp, page: String(page + 1) } as Record<string, string>)}`}>Next →</Link>}
        </div>
      )}
    </>
  );
}
