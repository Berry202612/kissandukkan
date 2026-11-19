"use client";

import { useFormStatus } from "react-dom";
import { cn } from "@/lib/utils";
import { btnCls } from "./ui";

export function SubmitButton({ children, className, confirm }: { children: React.ReactNode; className?: string; confirm?: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className={cn(btnCls, className)}
      onClick={(e) => {
        if (confirm && !window.confirm(confirm)) e.preventDefault();
      }}
    >
      {pending ? "Working…" : children}
    </button>
  );
}
