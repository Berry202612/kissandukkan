"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3, Boxes, ClipboardList, FileText, Gauge, Inbox, LayoutGrid, LogOut, Menu, MessageSquare, Package, Percent,
  RefreshCcw, Settings, ShieldAlert, ShieldCheck, Store, Tags, Truck, Upload, Users, X,
} from "lucide-react";
import { LogoIcon } from "@/components/brand/Logo";
import { cn } from "@/lib/utils";

type Item = { href: string; label: string; icon: React.ElementType; admin?: boolean };
const groups: { title: string; items: Item[] }[] = [
  { title: "Overview", items: [{ href: "/admin", label: "Dashboard", icon: Gauge }] },
  {
    title: "Sales",
    items: [
      { href: "/admin/orders", label: "Orders", icon: Package },
      { href: "/admin/returns", label: "Replacements & refunds", icon: RefreshCcw },
      { href: "/admin/customers", label: "Customers", icon: Users },
      { href: "/admin/inbox", label: "Inbox & tickets", icon: Inbox },
    ],
  },
  {
    title: "Catalogue",
    items: [
      { href: "/admin/products", label: "Products", icon: Boxes },
      { href: "/admin/import", label: "Import queue", icon: Upload },
      { href: "/admin/taxonomy", label: "Categories, crops, brands", icon: LayoutGrid },
      { href: "/admin/reviews", label: "Reviews & Q&A", icon: MessageSquare },
      { href: "/admin/coupons", label: "Coupons", icon: Percent },
    ],
  },
  {
    title: "Sourcing",
    items: [
      { href: "/admin/suppliers", label: "Suppliers", icon: Truck },
      { href: "/admin/restricted", label: "Restricted ingredients", icon: ShieldAlert },
    ],
  },
  {
    title: "Content",
    items: [
      { href: "/admin/content", label: "Banners, pages, FAQ, articles", icon: FileText },
      { href: "/admin/emails", label: "Email templates", icon: ClipboardList, admin: true },
    ],
  },
  {
    title: "Settings",
    items: [
      { href: "/admin/settings/business", label: "Business details", icon: Store, admin: true },
      { href: "/admin/settings/pricing", label: "Pricing & payments", icon: Tags, admin: true },
      { href: "/admin/settings/tax", label: "Tax (HSN / GST)", icon: FileText, admin: true },
      { href: "/admin/settings/delivery", label: "Delivery", icon: Truck, admin: true },
      { href: "/admin/reports", label: "Reports", icon: BarChart3, admin: true },
      { href: "/admin/staff", label: "Staff & permissions", icon: ShieldCheck, admin: true },
      { href: "/admin/audit", label: "Audit log", icon: Settings, admin: true },
    ],
  },
];

export function AdminSidebar({ role, name, logout }: { role: string; name: string; logout: (fd: FormData) => Promise<void> }) {
  const pathname = usePathname();
  const [open, setOpen] = React.useState(false);
  React.useEffect(() => setOpen(false), [pathname]);
  const nav = (
    <nav className="space-y-5 text-sm">
      {groups.map((g) => {
        const items = g.items.filter((i) => !i.admin || role === "ADMIN");
        if (!items.length) return null;
        return (
          <div key={g.title}>
            <p className="mb-1 px-3 text-[11px] font-bold uppercase tracking-wider text-white/50">{g.title}</p>
            {items.map(({ href, label, icon: Icon }) => {
              const active = href === "/admin" ? pathname === href : pathname.startsWith(href);
              return (
                <Link key={href} href={href} className={cn("flex min-h-[38px] items-center gap-2.5 rounded-lg px-3 font-medium", active ? "bg-accent text-ink" : "text-white/85 hover:bg-white/10")}>
                  <Icon className="h-4 w-4" /> {label}
                </Link>
              );
            })}
          </div>
        );
      })}
    </nav>
  );
  return (
    <>
      <button type="button" className="fixed left-3 top-3 z-50 rounded-xl bg-primary-dark p-2.5 text-white lg:hidden" onClick={() => setOpen((o) => !o)} aria-label="Menu">
        {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>
      <aside className={cn("fixed inset-y-0 left-0 z-40 flex w-64 flex-col overflow-y-auto bg-primary-dark p-4 transition-transform lg:sticky lg:top-0 lg:h-screen lg:translate-x-0", open ? "translate-x-0" : "-translate-x-full")}>
        <Link href="/admin" className="mb-6 mt-10 flex items-center gap-2 lg:mt-0">
          <LogoIcon className="h-9 w-9 rounded-lg bg-white p-0.5" />
          <span className="font-heading text-lg font-bold text-white">
            Kissan<span className="text-accent">Dukkan</span>
          </span>
        </Link>
        {nav}
        <div className="mt-auto border-t border-white/10 pt-4 text-sm text-white/80">
          <p className="truncate px-3">{name}</p>
          <p className="px-3 text-xs text-white/50">{role}</p>
          <Link href="/en" target="_blank" className="mt-2 flex min-h-[36px] items-center rounded-lg px-3 hover:bg-white/10">
            View store ↗
          </Link>
          <form action={logout}>
            <input type="hidden" name="to" value="admin" />
            <button type="submit" className="flex min-h-[36px] w-full items-center gap-2 rounded-lg px-3 hover:bg-white/10">
              <LogOut className="h-4 w-4" /> Log out
            </button>
          </form>
        </div>
      </aside>
    </>
  );
}
