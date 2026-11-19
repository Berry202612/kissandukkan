import { db } from "@/lib/db";
import { requireStaff } from "@/lib/session";
import { PageHeader } from "@/components/admin/ui";
import { ProductForm } from "@/components/admin/ProductForm";
import { saveProduct } from "@/app/admin/actions/products";

export const metadata = { title: "New product" };

export default async function NewProduct() {
  await requireStaff();
  const [categories, subCategories, brands, crops] = await Promise.all([
    db.category.findMany({ orderBy: { sortOrder: "asc" }, select: { id: true, name_en: true } }),
    db.subCategory.findMany({ orderBy: { sortOrder: "asc" }, select: { id: true, name_en: true, categoryId: true } }),
    db.brand.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    db.crop.findMany({ orderBy: { sortOrder: "asc" }, select: { id: true, name_en: true } }),
  ]);
  return (
    <>
      <PageHeader title="New product" description="Created as DRAFT. Add pack sizes, supplier listings and images on the next screen." />
      <ProductForm
        action={saveProduct}
        categories={categories.map((c) => ({ id: c.id, name: c.name_en }))}
        subCategories={subCategories.map((s) => ({ id: s.id, name: s.name_en, categoryId: s.categoryId }))}
        brands={brands}
        crops={crops.map((c) => ({ id: c.id, name: c.name_en }))}
      />
    </>
  );
}
