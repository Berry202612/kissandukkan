"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;

export function DialogContent({ className, children, title, side }: { className?: string; children: React.ReactNode; title: string; side?: "right" | "left" | "bottom" }) {
  const pos = side
    ? side === "right"
      ? "right-0 top-0 h-full w-[min(420px,100vw)] rounded-l-3xl data-[state=open]:animate-in"
      : side === "left"
        ? "left-0 top-0 h-full w-[min(360px,90vw)] rounded-r-3xl"
        : "bottom-0 left-0 max-h-[85vh] w-full rounded-t-3xl"
    : "left-1/2 top-1/2 max-h-[90vh] w-[min(560px,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 rounded-3xl";
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-ink/40 backdrop-blur-[2px]" />
      <DialogPrimitive.Content className={cn("fixed z-50 flex flex-col overflow-hidden bg-cream shadow-lift focus:outline-none", pos, className)}>
        <div className="flex items-center justify-between border-b border-line bg-white px-5 py-3">
          <DialogPrimitive.Title className="font-heading text-lg font-bold text-primary-dark">{title}</DialogPrimitive.Title>
          <DialogPrimitive.Close className="tap inline-flex items-center justify-center rounded-full text-muted hover:bg-primary-light" aria-label="Close">
            <X className="h-5 w-5" />
          </DialogPrimitive.Close>
        </div>
        <DialogPrimitive.Description className="sr-only">{title}</DialogPrimitive.Description>
        <div className="flex-1 overflow-y-auto">{children}</div>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

export const Tabs = TabsPrimitive.Root;

export function TabsList({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.List>) {
  return <TabsPrimitive.List className={cn("no-scrollbar flex gap-1 overflow-x-auto border-b border-line", className)} {...props} />;
}

export function TabsTrigger({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      className={cn(
        "tap shrink-0 border-b-[3px] border-transparent px-4 text-sm font-semibold text-muted transition hover:text-primary data-[state=active]:border-accent data-[state=active]:text-primary-dark",
        className,
      )}
      {...props}
    />
  );
}

export function TabsContent({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return <TabsPrimitive.Content className={cn("pt-5 focus:outline-none", className)} {...props} />;
}
