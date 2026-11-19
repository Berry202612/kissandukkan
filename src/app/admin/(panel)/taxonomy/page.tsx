import { db } from "@/lib/db";
import { requireStaff } from "@/lib/session";
import { illustrationKeys } from "@/components/brand/Illustration";
import { PageHeader, Panel, inputCls } from "@/components/admin/ui";
import { SubmitButton } from "@/components/admin/SubmitButton";
import { saveBrand, saveCategory, saveCrop, saveSubCategory } from "@/app/admin/actions/catalog";

export const metadata = { title: "Categories, crops & brands" };

const ta = `${inputCls} h-20 w-full py-2`;

export default async function Taxonomy() {
  await requireStaff();
  const [cats, crops, brands] = await Promise.all([
    db.category.findMany({ orderBy: { sortOrder: "asc" }, include: { subCategories: { orderBy: { sortOrder: "asc" } }, _count: { select: { products: true } } } }),
    db.crop.findMany({ orderBy: { sortOrder: "asc" } }),
    db.brand.findMany({ orderBy: { name: "asc" }, include: { _count: { select: { products: true } } } }),
  ]);
  const CatForm = ({ c }: { c?: (typeof cats)[number] }) => (
    <form action={saveCategory} className="grid gap-2 md:grid-cols-4">
      {c && <input type="hidden" name="id" value={c.id} />}
      <input name="name_en" defaultValue={c?.name_en} placeholder="Name (EN)" required className={inputCls} />
      <input name="name_hi" defaultValue={c?.name_hi} placeholder="नाम (HI)" required className={inputCls} />
      <input name="slug" defaultValue={c?.slug} placeholder="slug" required className={inputCls} />
      <div className="flex gap-2">
        <select name="illustration" defaultValue={c?.illustration ?? "leaf"} className={inputCls}>
          {illustrationKeys.map((k) => <option key={k}>{k}</option>)}
        </select>
        <input name="sortOrder" type="number" defaultValue={c?.sortOrder ?? 0} className={`${inputCls} w-20`} aria-label="Sort" />
      </div>
      <textarea name="description_en" defaultValue={c?.description_en} placeholder="Intro (EN)" className={ta} />
      <textarea name="description_hi" defaultValue={c?.description_hi} placeholder="Intro (HI)" className={ta} />
      <textarea name="seoText_en" defaultValue={c?.seoText_en} placeholder="SEO text (EN)" className={ta} />
      <textarea name="seoText_hi" defaultValue={c?.seoText_hi} placeholder="SEO text (HI)" className={ta} />
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="isActive" defaultChecked={c?.isActive ?? true} className="accent-primary" /> Active</label>
      <SubmitButton>{c ? "Save" : "Add category"}</SubmitButton>
    </form>
  );
  return (
    <>
      <PageHeader title="Categories, crops & brands" description="Brand names are shown as text badges only – do not upload brand logo artwork." />
      <div className="space-y-6">
        <Panel title="Categories & sub-categories">
          <div className="space-y-4">
            {cats.map((c) => (
              <details key={c.id} className="rounded-2xl border border-line p-4">
                <summary className="cursor-pointer font-semibold">
                  {c.name_en} / {c.name_hi} <span className="text-xs text-muted">({c._count.products} products{c.isActive ? "" : ", inactive"})</span>
                </summary>
                <div className="mt-3 space-y-4">
                  <CatForm c={c} />
                  <div className="rounded-xl bg-cream p-3">
                    <p className="mb-2 text-xs font-bold uppercase text-muted">Sub-categories</p>
                    {c.subCategories.map((s) => (
                      <form key={s.id} action={saveSubCategory} className="mb-2 flex flex-wrap gap-2">
                        <input type="hidden" name="id" value={s.id} />
                        <input type="hidden" name="categoryId" value={c.id} />
                        <input name="name_en" defaultValue={s.name_en} className={inputCls} required />
                        <input name="name_hi" defaultValue={s.name_hi} className={inputCls} required />
                        <input name="slug" defaultValue={s.slug} className={inputCls} required />
                        <input name="sortOrder" type="number" defaultValue={s.sortOrder} className={`${inputCls} w-20`} />
                        <label className="flex items-center gap-1 text-sm"><input type="checkbox" name="isActive" defaultChecked={s.isActive} className="accent-primary" /> Active</label>
                        <SubmitButton>Save</SubmitButton>
                      </form>
                    ))}
                    <form action={saveSubCategory} className="flex flex-wrap gap-2">
                      <input type="hidden" name="categoryId" value={c.id} />
                      <input name="name_en" placeholder="New sub-category (EN)" className={inputCls} required />
                      <input name="name_hi" placeholder="HI" className={inputCls} required />
                      <input name="slug" placeholder="slug" className={inputCls} required />
                      <input type="hidden" name="isActive" value="on" />
                      <SubmitButton>Add</SubmitButton>
                    </form>
                  </div>
                </div>
              </details>
            ))}
            <div className="rounded-2xl border border-dashed border-line p-4">
              <p className="mb-2 text-sm font-semibold">New category</p>
              <CatForm />
            </div>
          </div>
        </Panel>

        <Panel title="Crops (Shop by crop)">
          {crops.map((c) => (
            <form key={c.id} action={saveCrop} className="mb-2 flex flex-wrap gap-2">
              <input type="hidden" name="id" value={c.id} />
              <input name="name_en" defaultValue={c.name_en} className={inputCls} required />
              <input name="name_hi" defaultValue={c.name_hi} className={inputCls} required />
              <input name="slug" defaultValue={c.slug} className={inputCls} required />
              <input name="sortOrder" type="number" defaultValue={c.sortOrder} className={`${inputCls} w-20`} />
              <input type="hidden" name="seoText_en" value={c.seoText_en} />
              <input type="hidden" name="seoText_hi" value={c.seoText_hi} />
              <label className="flex items-center gap-1 text-sm"><input type="checkbox" name="isActive" defaultChecked={c.isActive} className="accent-primary" /> Active</label>
              <SubmitButton>Save</SubmitButton>
            </form>
          ))}
          <form action={saveCrop} className="mt-3 flex flex-wrap gap-2">
            <input name="name_en" placeholder="New crop (EN)" className={inputCls} required />
            <input name="name_hi" placeholder="HI" className={inputCls} required />
            <input name="slug" placeholder="slug" className={inputCls} required />
            <input type="hidden" name="isActive" value="on" />
            <SubmitButton>Add crop</SubmitButton>
          </form>
        </Panel>

        <Panel title="Brands">
          <div className="grid gap-2 md:grid-cols-2">
            {brands.map((b) => (
              <form key={b.id} action={saveBrand} className="flex flex-wrap items-center gap-2">
                <input type="hidden" name="id" value={b.id} />
                <input name="name" defaultValue={b.name} className={inputCls} required />
                <label className="flex items-center gap-1 text-sm"><input type="checkbox" name="isActive" defaultChecked={b.isActive} className="accent-primary" /> Active</label>
                <span className="text-xs text-muted">{b._count.products} products</span>
                <SubmitButton>Save</SubmitButton>
              </form>
            ))}
          </div>
          <form action={saveBrand} className="mt-3 flex gap-2">
            <input name="name" placeholder="New brand name" className={inputCls} required />
            <input type="hidden" name="isActive" value="on" />
            <SubmitButton>Add brand</SubmitButton>
          </form>
        </Panel>
      </div>
    </>
  );
}
