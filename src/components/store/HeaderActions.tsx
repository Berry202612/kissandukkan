"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Heart, Home, LayoutGrid, Search, ShoppingCart, User } from "lucide-react";
import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { useCart } from "./cart-context";
import dynamic from "next/dynamic";

// Loaded only when the cart is first opened (keeps the dialog code out of the initial bundle)
const CartDrawer = dynamic(() => import("./CartDrawer").then((m) => m.CartDrawer), { ssr: false });

export function useSessionUser() {
  const [user, setUser] = React.useState<{ name: string; role: string } | null>(null);
  React.useEffect(() => {
    fetch("/api/auth/session")
      .then((r) => (r.ok ? r.json() : null))
      .then((s) => setUser(s?.user ? { name: s.user.name ?? "", role: s.user.role } : null))
      .catch(() => {});
  }, []);
  return user;
}

export function HeaderActions() {
  const t = useTranslations("nav");
  const tc = useTranslations("common");
  const cart = useCart();
  const user = useSessionUser();
  return (
    <nav className="ml-auto flex items-center gap-1 md:gap-2">
      <Link href={user ? "/account" : "/login"} className="tap hidden items-center gap-2 rounded-xl px-2 text-sm font-semibold text-primary-dark hover:bg-primary-light md:inline-flex">
        <User className="h-5 w-5" />
        <span className="max-w-[8rem] truncate">{user ? user.name.split(" ")[0] : t("login")}</span>
      </Link>
      <Link href="/account/wishlist" className="tap hidden items-center justify-center rounded-xl text-primary-dark hover:bg-primary-light md:inline-flex" aria-label={tc("wishlist")}>
        <Heart className="h-5 w-5" />
      </Link>
      <button
        type="button"
        onClick={() => cart.setOpen(true)}
        className="tap relative inline-flex items-center justify-center gap-2 rounded-xl px-2 text-sm font-semibold text-primary-dark hover:bg-primary-light"
        aria-label={`${t("cart")} (${cart.count})`}
      >
        <ShoppingCart className="h-5 w-5" />
        <span className="hidden md:inline">{t("cart")}</span>
        {cart.count > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1 text-[11px] font-bold text-ink md:static">{cart.count}</span>
        )}
      </button>
      {cart.open && <CartDrawer />}
    </nav>
  );
}

export function MobileBottomNav() {
  const t = useTranslations("nav");
  const tc = useTranslations("common");
  const pathname = usePathname();
  const cart = useCart();
  const items = [
    { href: "/", label: tc("home"), icon: Home },
    { href: "/categories", label: t("categories"), icon: LayoutGrid },
    { href: "/search", label: tc("search"), icon: Search },
  ];
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-line bg-white pb-[env(safe-area-inset-bottom)] md:hidden" aria-label="Mobile">
      {items.map(({ href, label, icon: Icon }) => (
        <Link key={href} href={href} className={cn("flex min-h-[56px] flex-col items-center justify-center gap-0.5 text-[11px] font-semibold", pathname === href ? "text-primary" : "text-muted")}>
          <Icon className="h-5 w-5" />
          {label}
        </Link>
      ))}
      <button type="button" onClick={() => cart.setOpen(true)} className="relative flex min-h-[56px] flex-col items-center justify-center gap-0.5 text-[11px] font-semibold text-muted">
        <ShoppingCart className="h-5 w-5" />
        {t("cart")}
        {cart.count > 0 && <span className="absolute right-[22%] top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-bold text-ink">{cart.count}</span>}
      </button>
      <Link href="/account" className={cn("flex min-h-[56px] flex-col items-center justify-center gap-0.5 text-[11px] font-semibold", pathname.startsWith("/account") ? "text-primary" : "text-muted")}>
        <User className="h-5 w-5" />
        {t("account")}
      </Link>
    </nav>
  );
}
