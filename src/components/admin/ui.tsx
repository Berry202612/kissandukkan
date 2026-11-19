import Link from "next/link";
import { cn } from "@/lib/utils";

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3 pl-12 lg:pl-0">
      <div>
        <h1 className="font-heading text-2xl font-bold md:text-3xl">{title}</h1>
        {description && <p className="mt-1 max-w-3xl text-sm text-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Panel({ title, children, className, actions }: { title?: string; children: React.ReactNode; className?: string; actions?: React.ReactNode }) {
  return (
    <section className={cn("card p-5", className)}>
      {(title || actions) && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          {title && <h2 className="font-heading text-lg font-bold">{title}</h2>}
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}

export function Table({ head, children, empty }: { head: React.ReactNode[]; children: React.ReactNode; empty?: string }) {
  const rows = Array.isArray(children) ? children.flat().filter(Boolean) : children ? [children] : [];
  return (
    <div className="overflow-x-auto rounded-2xl border border-line bg-white">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead className="bg-primary-light text-xs uppercase tracking-wide text-primary-dark">
          <tr>
            {head.map((h, i) => (
              <th key={i} className="px-3 py-2.5 font-bold">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {rows.length ? (
            children
          ) : (
            <tr>
              <td colSpan={head.length} className="px-3 py-8 text-center text-muted">
                {empty ?? "Nothing here yet."}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export const Td = ({ children, className, colSpan }: { children?: React.ReactNode; className?: string; colSpan?: number }) => <td colSpan={colSpan} className={cn("px-3 py-2.5 align-top", className)}>{children}</td>;

export function Stat({ label, value, hint, href, tone = "default" }: { label: string; value: React.ReactNode; hint?: string; href?: string; tone?: "default" | "warn" | "good" }) {
  const inner = (
    <>
      <p className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</p>
      <p className={cn("mt-1 font-heading text-2xl font-bold", tone === "warn" ? "text-danger" : tone === "good" ? "text-success" : "text-ink")}>{value}</p>
      {hint && <p className="text-xs text-muted">{hint}</p>}
    </>
  );
  return href ? (
    <Link href={href} className="card block p-4 hover:shadow-lift">
      {inner}
    </Link>
  ) : (
    <div className="card p-4">{inner}</div>
  );
}

export function FilterBar({ children }: { children: React.ReactNode }) {
  return <form method="get" className="mb-4 flex flex-wrap items-end gap-2 rounded-2xl border border-line bg-white p-3">{children}</form>;
}

export const inputCls = "h-10 rounded-lg border border-line bg-white px-3 text-sm focus:border-primary focus:outline-none";
export const btnCls = "inline-flex h-10 items-center justify-center gap-1.5 rounded-lg bg-primary px-4 text-sm font-semibold text-white hover:bg-primary-dark disabled:opacity-50";
export const btnOutlineCls = "inline-flex h-10 items-center justify-center gap-1.5 rounded-lg border border-primary bg-white px-4 text-sm font-semibold text-primary hover:bg-primary-light";
export const btnDangerCls = "inline-flex h-10 items-center justify-center gap-1.5 rounded-lg bg-danger px-4 text-sm font-semibold text-white hover:opacity-90";

export function L({ label, children, className, hint }: { label: string; children: React.ReactNode; className?: string; hint?: string }) {
  return (
    <label className={cn("block text-sm", className)}>
      <span className="mb-1 block font-semibold">{label}</span>
      {children}
      {hint && <span className="mt-0.5 block text-xs text-muted">{hint}</span>}
    </label>
  );
}

export function Pill({ children, tone = "gray" }: { children: React.ReactNode; tone?: "green" | "gold" | "red" | "gray" | "soil" }) {
  const tones = { green: "bg-primary-light text-primary-dark", gold: "bg-accent-light text-[#7a5a00]", red: "bg-[#fdecea] text-danger", gray: "bg-[#eef0ee] text-muted", soil: "bg-soil-light text-soil" };
  return <span className={cn("inline-flex rounded-full px-2 py-0.5 text-xs font-semibold", tones[tone])}>{children}</span>;
}
