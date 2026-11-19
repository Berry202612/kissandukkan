"use client";

import { Heart, Home, LifeBuoy, MapPin, Package, Star, UserCog } from "lucide-react";
import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

export function AccountNav({ labels }: { labels: Record<"overview" | "orders" | "wishlist" | "addresses" | "profile" | "reviews" | "tickets", string> }) {
  const pathname = usePathname();
  const items = [
    { href: "/account", label: labels.overview, icon: Home, exact: true },
    { href: "/account/orders", label: labels.orders, icon: Package },
    { href: "/account/wishlist", label: labels.wishlist, icon: Heart },
    { href: "/account/addresses", label: labels.addresses, icon: MapPin },
    { href: "/account/reviews", label: labels.reviews, icon: Star },
    { href: "/account/tickets", label: labels.tickets, icon: LifeBuoy },
    { href: "/account/profile", label: labels.profile, icon: UserCog },
  ];
  return (
    <nav className="no-scrollbar flex gap-1 overflow-x-auto lg:flex-col">
      {items.map(({ href, label, icon: Icon, exact }) => {
        const active = exact ? pathname === href : pathname.startsWith(href);
        return (
          <Link key={href} href={href} className={cn("flex min-h-[44px] shrink-0 items-center gap-2.5 rounded-xl px-3 text-sm font-semibold", active ? "bg-primary text-white" : "text-ink hover:bg-primary-light")}>
            <Icon className="h-4 w-4" /> {label}
          </Link>
        );
      })}
    </nav>
  );
}
