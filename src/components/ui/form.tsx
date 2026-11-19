import * as React from "react";
import { cn } from "@/lib/utils";

const field =
  "w-full rounded-xl border border-line bg-white px-3.5 text-[15px] text-ink placeholder:text-muted/80 transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:bg-cream disabled:opacity-70 aria-[invalid=true]:border-danger";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(({ className, ...props }, ref) => (
  <input ref={ref} className={cn(field, "h-11", className)} {...props} />
));
Input.displayName = "Input";

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(({ className, ...props }, ref) => (
  <textarea ref={ref} className={cn(field, "min-h-[110px] py-2.5", className)} {...props} />
));
Textarea.displayName = "Textarea";

export const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(({ className, ...props }, ref) => (
  <select ref={ref} className={cn(field, "h-11 appearance-none bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 20 20%22 fill=%22%231E6B3A%22><path d=%22M5 7l5 6 5-6z%22/></svg>')] bg-[length:18px] bg-[right_0.75rem_center] bg-no-repeat pr-9", className)} {...props} />
));
Select.displayName = "Select";

export function Label({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={cn("mb-1.5 block text-sm font-semibold text-ink", className)} {...props} />;
}

export function FieldError({ children }: { children?: React.ReactNode }) {
  if (!children) return null;
  return <p className="mt-1 text-sm text-danger" role="alert">{children}</p>;
}

export function Field({ label, error, hint, children, className, htmlFor }: { label?: string; error?: string; hint?: string; children: React.ReactNode; className?: string; htmlFor?: string }) {
  return (
    <div className={className}>
      {label && <Label htmlFor={htmlFor}>{label}</Label>}
      {children}
      {hint && !error && <p className="mt-1 text-xs text-muted">{hint}</p>}
      <FieldError>{error}</FieldError>
    </div>
  );
}

export function Checkbox({ label, className, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label: React.ReactNode }) {
  return (
    <label className={cn("flex min-h-[36px] cursor-pointer items-center gap-2.5 text-[15px]", className)}>
      <input type="checkbox" className="h-5 w-5 rounded border-line accent-primary" {...props} />
      <span>{label}</span>
    </label>
  );
}

export function Badge({ className, tone = "green", ...props }: React.HTMLAttributes<HTMLSpanElement> & { tone?: "green" | "gold" | "soil" | "red" | "gray" }) {
  const tones = {
    green: "bg-primary-light text-primary-dark",
    gold: "bg-accent-light text-[#7a5a00]",
    soil: "bg-soil-light text-soil",
    red: "bg-[#fdecea] text-danger",
    gray: "bg-[#eef0ee] text-muted",
  };
  return <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold", tones[tone], className)} {...props} />;
}

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("card", className)} {...props} />;
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-xl bg-[#ece7dc]", className)} />;
}

export function Notice({ tone = "info", children, className }: { tone?: "info" | "warn" | "error" | "success"; children: React.ReactNode; className?: string }) {
  const tones = {
    info: "border-primary/20 bg-primary-light text-primary-dark",
    warn: "border-accent/40 bg-accent-light text-[#6b4f00]",
    error: "border-danger/30 bg-[#fdecea] text-danger",
    success: "border-success/30 bg-[#e8f5e9] text-success",
  };
  return <div className={cn("rounded-xl border px-4 py-3 text-sm", tones[tone], className)}>{children}</div>;
}
