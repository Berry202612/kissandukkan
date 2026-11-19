import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/session";
import { PageHeader, btnOutlineCls } from "@/components/admin/ui";
import { ArticleForm } from "@/components/admin/ArticleForm";

export const metadata = { title: "Edit article" };

export default async function EditArticle({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ msg?: string }> }) {
  await requireStaff();
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  if (id === "new") {
    return (
      <>
        <PageHeader title="New article" />
        <ArticleForm />
      </>
    );
  }
  const a = await db.article.findUnique({ where: { id } });
  if (!a) notFound();
  return (
    <>
      <PageHeader title={a.title_en} actions={a.isPublished ? <a href={`/en/kisan-gyan/${a.slug}`} target="_blank" className={btnOutlineCls}>View ↗</a> : undefined} />
      {sp.msg && <p className="mb-4 rounded-xl bg-primary-light p-3 text-sm text-primary-dark">{sp.msg}</p>}
      <ArticleForm a={a} />
    </>
  );
}
