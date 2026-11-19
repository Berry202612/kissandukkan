import Link from "next/link";
import Image from "next/image";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/session";
import { PageHeader, Panel, Pill, inputCls } from "@/components/admin/ui";
import { SubmitButton } from "@/components/admin/SubmitButton";
import { answerQuestion, moderateReview } from "@/app/admin/actions/catalog";

export const metadata = { title: "Reviews & Q&A" };

export default async function ReviewsAdmin({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  await requireStaff();
  const { tab = "reviews" } = await searchParams;
  const [reviews, questions] = await Promise.all([
    db.review.findMany({ orderBy: [{ status: "asc" }, { createdAt: "desc" }], take: 100, include: { product: { select: { name_en: true, id: true } }, user: { select: { name: true } } } }),
    db.question.findMany({ orderBy: [{ answeredAt: { sort: "asc", nulls: "first" } }, { createdAt: "desc" }], take: 100, include: { product: { select: { name_en: true, id: true } }, user: { select: { name: true } } } }),
  ]);
  return (
    <>
      <PageHeader title="Reviews & Q&A" description="Only customers with a delivered order can review. You can publish, hide or reply – never edit a customer's words." />
      <div className="mb-4 flex gap-2">
        <Link href="?tab=reviews" className={`rounded-full px-4 py-2 text-sm font-semibold ${tab === "reviews" ? "bg-primary text-white" : "bg-white"}`}>Reviews ({reviews.filter((r) => r.status === "PENDING").length} pending)</Link>
        <Link href="?tab=qa" className={`rounded-full px-4 py-2 text-sm font-semibold ${tab === "qa" ? "bg-primary text-white" : "bg-white"}`}>Questions ({questions.filter((q) => !q.answer).length} unanswered)</Link>
      </div>
      {tab === "reviews" ? (
        <div className="space-y-3">
          {!reviews.length && <Panel><p className="text-muted">No reviews yet.</p></Panel>}
          {reviews.map((r) => (
            <Panel key={r.id}>
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <Link href={`/admin/products/${r.product.id}`} className="font-semibold text-primary-dark underline">{r.product.name_en}</Link>
                <span>{"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}</span>
                <span className="text-muted">by {r.user.name} · {r.createdAt.toLocaleDateString("en-IN")}</span>
                <Pill tone={r.status === "PUBLISHED" ? "green" : r.status === "HIDDEN" ? "gray" : "gold"}>{r.status}</Pill>
              </div>
              {r.title && <p className="mt-2 font-semibold">{r.title}</p>}
              <p className="mt-1 whitespace-pre-line text-sm">{r.body}</p>
              {r.photos.length > 0 && (
                <div className="mt-2 flex gap-2">
                  {r.photos.map((p) => (
                    <a key={p} href={p} target="_blank" rel="noopener noreferrer" className="relative h-16 w-16 overflow-hidden rounded-lg border border-line">
                      <Image src={p} alt="" fill sizes="64px" className="object-cover" />
                    </a>
                  ))}
                </div>
              )}
              <form action={moderateReview} className="mt-3 flex flex-wrap items-end gap-2">
                <input type="hidden" name="id" value={r.id} />
                <input name="adminReply" defaultValue={r.adminReply ?? ""} placeholder="Optional reply as KissanDukkan Team" className={`${inputCls} min-w-[280px] flex-1`} />
                <select name="status" defaultValue={r.status === "PENDING" ? "PUBLISHED" : r.status} className={inputCls}>
                  <option value="PUBLISHED">Publish</option>
                  <option value="HIDDEN">Hide</option>
                  <option value="PENDING">Pending</option>
                </select>
                <SubmitButton>Save</SubmitButton>
              </form>
            </Panel>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {!questions.length && <Panel><p className="text-muted">No questions yet.</p></Panel>}
          {questions.map((q) => (
            <Panel key={q.id}>
              <p className="text-sm">
                <Link href={`/admin/products/${q.product.id}`} className="font-semibold text-primary-dark underline">{q.product.name_en}</Link>{" "}
                <span className="text-muted">· {q.user.name} · {q.createdAt.toLocaleDateString("en-IN")}</span>
              </p>
              <p className="mt-1 font-semibold">Q: {q.body}</p>
              <form action={answerQuestion} className="mt-2 flex flex-wrap items-end gap-2">
                <input type="hidden" name="id" value={q.id} />
                <textarea name="answer" defaultValue={q.answer ?? ""} placeholder="Answer" className={`${inputCls} h-20 min-w-[320px] flex-1 py-2`} />
                <label className="flex items-center gap-1 text-sm"><input type="checkbox" name="publish" defaultChecked={q.isPublished || !q.answer} className="accent-primary" /> Publish on product page</label>
                <SubmitButton>Save</SubmitButton>
              </form>
            </Panel>
          ))}
        </div>
      )}
    </>
  );
}
