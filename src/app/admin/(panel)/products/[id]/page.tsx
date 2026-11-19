import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { canViewCosts, requireStaff } from "@/lib/session";
import { getPricing } from "@/lib/settings";
import { computeHandlingFee, computeShipping, estimatePaymentGatewayFee } from "@/lib/pricing";
import { formatINR, toNum } from "@/lib/utils";
import { PageHeader, Panel, Pill, Table, Td, btnDangerCls, btnOutlineCls, inputCls } from "@/components/admin/ui";
import { SubmitButton } from "@/components/admin/SubmitButton";
import { ProductForm } from "@/components/admin/ProductForm";
import { ProductImagesEditor } from "@/components/admin/ProductImagesEditor";
import { deleteProduct, deleteSupplierListing, deleteVariant, saveProduct, saveSupplierListing, saveVariant, setProductStatusForm } from "@/app/admin/actions/products";

export const metadata = { title: "Edit product" };

export default async function EditProduct({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ err?: string }> }) {
  const u = await requireStaff();
  const costs = canViewCosts(u);
  const { id } = await params;
  const { err } = await searchParams;
  const [p, categories, subCategories, brands, crops, suppliers, pricing] = await Promise.all([
    db.product.findUnique({
      where: { id },
      include: {
        crops: { select: { cropId: true } },
        category: { select: { slug: true } },
        variants: {
          orderBy: { sortOrder: "asc" },
          include: { supplierListings: { include: { supplier: { select: { name: true } } }, orderBy: { supplierPrice: "asc" } }, priceHistory: { orderBy: { createdAt: "desc" }, take: 5 } },
        },
      },
    }),
    db.category.findMany({ orderBy: { sortOrder: "asc" }, select: { id: true, name_en: true } }),
    db.subCategory.findMany({ orderBy: { sortOrder: "asc" }, select: { id: true, name_en: true, categoryId: true } }),
    db.brand.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    db.crop.findMany({ orderBy: { sortOrder: "asc" }, select: { id: true, name_en: true } }),
    db.supplier.findMany({ where: { isActive: true }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    getPricing(),
  ]);
  if (!p) notFound();

  return (
    <>
      <PageHeader
        title={p.name_en}
        description={`Status: ${p.status}${p.publishedAt ? ` · first published ${p.publishedAt.toLocaleDateString("en-IN")}` : ""}`}
        actions={
          <>
            {p.status === "PUBLISHED" && (
              <a href={`/en/product/${p.slug}`} target="_blank" className={btnOutlineCls}>
                View on store ↗
              </a>
            )}
            <form action={setProductStatusForm}>
              <input type="hidden" name="ids" value={p.id} />
              <input type="hidden" name="back" value={`/admin/products/${p.id}`} />
              <input type="hidden" name="status" value={p.status === "PUBLISHED" ? "DRAFT" : "PUBLISHED"} />
              <SubmitButton>{p.status === "PUBLISHED" ? "Unpublish" : "Publish"}</SubmitButton>
            </form>
          </>
        }
      />
      {err && <p className="mb-4 rounded-xl bg-[#fdecea] p-3 text-sm text-danger">{err}</p>}
      <div className="mb-4 flex flex-wrap gap-2">
        {p.restrictedFlag && <Pill tone="red">Restricted ingredient: {p.restrictedReason}</Pill>}
        {!p.mrpVerified && <Pill tone="red">MRP not verified – could not be read from the source. Check the printed pack, correct MRPs below and tick “MRP checked” before publishing.</Pill>}
        {p.marginFlag && <Pill tone="soil">Margin below target – price capped at MRP</Pill>}
        {!p.hiReviewed && <Pill tone="gold">Hindi not yet reviewed</Pill>}
        {!p.images.length && <Pill tone="red">No product image – showing category illustration</Pill>}
      </div>

      <div className="grid gap-6">
        <ProductForm
          action={saveProduct}
          product={{ ...p, gstRate: p.gstRate?.toString(), dosePerAcre: p.dosePerAcre?.toString(), dosePerLitre: p.dosePerLitre?.toString(), expiryDate: p.expiryDate?.toISOString() }}
          categories={categories.map((c) => ({ id: c.id, name: c.name_en }))}
          subCategories={subCategories.map((s) => ({ id: s.id, name: s.name_en, categoryId: s.categoryId }))}
          brands={brands}
          crops={crops.map((c) => ({ id: c.id, name: c.name_en }))}
        />

        <Panel title="Images">
          <ProductImagesEditor productId={p.id} images={p.images} imageStatus={p.imageStatus} />
        </Panel>

        <Panel title="Pack sizes, prices & stock">
          <p className="mb-3 text-sm text-muted">
            Selling price = cost × (1 + {pricing.markupPercent}%) rounded to ₹1, never above MRP. With supplier listings, cost = preferred supplier&apos;s price.
          </p>
          <div className="space-y-4">
            {p.variants.map((v) => {
              const sell = toNum(v.sellingPrice);
              const cost = toNum(v.costPrice);
              const handling = computeHandlingFee(sell, pricing) ; // fee if this item were the whole cart
              const rp = estimatePaymentGatewayFee(sell + handling, pricing.razorpayFeePercent, pricing.razorpayGstPercent);
              const ship = computeShipping(1, v.weightGrams, { ...pricing, freeShippingThreshold: Infinity });
              const net = sell + handling - cost - rp - ship;
              return (
                <div key={v.id} className="rounded-2xl border border-line p-4">
                  <form action={saveVariant} className="grid items-end gap-3 sm:grid-cols-3 lg:grid-cols-6">
                    <input type="hidden" name="productId" value={p.id} />
                    <input type="hidden" name="id" value={v.id} />
                    <label className="text-xs font-semibold">Pack size<input name="packSize" defaultValue={v.packSize} className={`${inputCls} mt-1 w-full`} /></label>
                    <label className="text-xs font-semibold">Unit
                      <select name="unit" defaultValue={v.unit} className={`${inputCls} mt-1 w-full`}>{["ml", "L", "g", "kg", "pcs", "packet", "m", "set"].map((x) => <option key={x}>{x}</option>)}</select>
                    </label>
                    <label className="text-xs font-semibold">MRP ₹<input name="mrp" type="number" step="0.01" defaultValue={toNum(v.mrp)} className={`${inputCls} mt-1 w-full`} /></label>
                    {costs && <label className="text-xs font-semibold">Cost ₹ (if no supplier)<input name="costPrice" type="number" step="0.01" defaultValue={cost} className={`${inputCls} mt-1 w-full`} /></label>}
                    <label className="text-xs font-semibold">SKU<input name="sku" defaultValue={v.sku} className={`${inputCls} mt-1 w-full`} /></label>
                    <label className="text-xs font-semibold">Weight (g)<input name="weightGrams" type="number" defaultValue={v.weightGrams} className={`${inputCls} mt-1 w-full`} /></label>
                    {p.fulfilledBy === "OWN_STOCK" && <label className="text-xs font-semibold">Stock<input name="stock" type="number" defaultValue={v.stock} className={`${inputCls} mt-1 w-full`} /></label>}
                    {p.fulfilledBy === "OWN_STOCK" && <label className="text-xs font-semibold">Low-stock alert at<input name="lowStockAt" type="number" defaultValue={v.lowStockAt} className={`${inputCls} mt-1 w-full`} /></label>}
                    <label className="text-xs font-semibold">Sort<input name="sortOrder" type="number" defaultValue={v.sortOrder} className={`${inputCls} mt-1 w-full`} /></label>
                    <label className="flex h-10 items-center gap-2 text-sm"><input type="checkbox" name="isActive" defaultChecked={v.isActive} className="accent-primary" /> Active</label>
                    <SubmitButton>Save</SubmitButton>
                  </form>
                  <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1 text-sm">
                    <span>Selling price: <strong>{formatINR(sell)}</strong> (MRP {formatINR(v.mrp)})</span>
                    {sell > toNum(v.mrp) && <Pill tone="red">ABOVE MRP</Pill>}
                    {costs && (
                      <span className="text-muted">
                        Margin view (single item, worst case free shipping): cost {formatINR(cost, { decimals: true })} · handling +{formatINR(handling)} · Razorpay −{formatINR(rp, { decimals: true })} · shipping est. −{formatINR(ship)} ·{" "}
                        <strong className={net < 0 ? "text-danger" : "text-success"}>net {formatINR(net, { decimals: true })}</strong>
                      </span>
                    )}
                    <form action={deleteVariant}>
                      <input type="hidden" name="id" value={v.id} />
                      <SubmitButton className={btnDangerCls} confirm="Remove this pack size? (It is deactivated if it was ever ordered.)">Remove</SubmitButton>
                    </form>
                  </div>

                  {costs && (
                    <div className="mt-4">
                      <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted">Suppliers (private)</p>
                      <Table head={["Supplier", "Price", "Link", "Last checked", "In stock", "Preferred", ""]} empty="No supplier listing yet.">
                        {v.supplierListings.map((l) => (
                          <tr key={l.id}>
                            <Td>{l.supplier.name}</Td>
                            <Td>{formatINR(l.supplierPrice, { decimals: true })}</Td>
                            <Td>{l.supplierProductUrl ? <a href={l.supplierProductUrl} target="_blank" rel="noopener noreferrer" className="text-primary underline">Open ↗</a> : "—"}</Td>
                            <Td>{l.lastCheckedAt.toLocaleDateString("en-IN")}</Td>
                            <Td>{l.inStockAtSupplier ? "Yes" : <span className="text-danger">No</span>}</Td>
                            <Td>{l.isPreferred ? <Pill tone="green">Preferred</Pill> : ""}</Td>
                            <Td>
                              <form action={deleteSupplierListing}>
                                <input type="hidden" name="id" value={l.id} />
                                <button className="text-xs text-danger underline">Remove</button>
                              </form>
                            </Td>
                          </tr>
                        ))}
                      </Table>
                      {suppliers.length > 0 ? (
                        <form action={saveSupplierListing} className="mt-2 flex flex-wrap items-end gap-2 text-xs">
                          <input type="hidden" name="variantId" value={v.id} />
                          <select name="supplierId" className={inputCls}>{suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
                          <input name="supplierPrice" type="number" step="0.01" placeholder="Price ₹" required className={`${inputCls} w-28`} />
                          <input name="supplierProductUrl" type="url" placeholder="Supplier product URL" className={`${inputCls} w-64`} />
                          <label className="flex items-center gap-1"><input type="checkbox" name="inStockAtSupplier" defaultChecked className="accent-primary" /> In stock</label>
                          <label className="flex items-center gap-1"><input type="checkbox" name="isPreferred" className="accent-primary" /> Preferred</label>
                          <SubmitButton>Add / update</SubmitButton>
                        </form>
                      ) : (
                        <p className="mt-2 text-xs text-muted"><Link href="/admin/suppliers" className="underline">Add a supplier</Link> first.</p>
                      )}
                      {v.priceHistory.length > 0 && (
                        <p className="mt-2 text-xs text-muted">
                          Price history: {v.priceHistory.map((h) => `${h.createdAt.toLocaleDateString("en-IN")} ${formatINR(h.sellingPrice)} (cost ${formatINR(h.costPrice)}) – ${h.reason}`).join(" · ")}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          {costs && (
            <form action={saveVariant} className="mt-4 grid items-end gap-3 rounded-2xl border border-dashed border-line p-4 sm:grid-cols-3 lg:grid-cols-7">
              <input type="hidden" name="productId" value={p.id} />
              <label className="text-xs font-semibold">Pack size<input name="packSize" required className={`${inputCls} mt-1 w-full`} /></label>
              <label className="text-xs font-semibold">Unit<select name="unit" className={`${inputCls} mt-1 w-full`}>{["ml", "L", "g", "kg", "pcs", "packet", "m", "set"].map((x) => <option key={x}>{x}</option>)}</select></label>
              <label className="text-xs font-semibold">MRP ₹<input name="mrp" type="number" step="0.01" required className={`${inputCls} mt-1 w-full`} /></label>
              <label className="text-xs font-semibold">Cost ₹<input name="costPrice" type="number" step="0.01" required className={`${inputCls} mt-1 w-full`} /></label>
              <label className="text-xs font-semibold">SKU<input name="sku" required className={`${inputCls} mt-1 w-full`} /></label>
              <label className="text-xs font-semibold">Weight (g)<input name="weightGrams" type="number" defaultValue={500} className={`${inputCls} mt-1 w-full`} /></label>
              <input type="hidden" name="isActive" value="on" />
              <SubmitButton>+ Add pack size</SubmitButton>
            </form>
          )}
        </Panel>

        <Panel title="Danger zone">
          <form action={deleteProduct}>
            <input type="hidden" name="id" value={p.id} />
            <SubmitButton className={btnDangerCls} confirm="Delete this product? Products with orders are archived instead.">Delete product</SubmitButton>
          </form>
        </Panel>
      </div>
    </>
  );
}
