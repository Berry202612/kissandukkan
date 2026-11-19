"use client";

import * as React from "react";

export type CartItem = { variantId: string; qty: number };
type CartState = { items: CartItem[]; coupon: string | null };

type Ctx = CartState & {
  ready: boolean;
  count: number;
  open: boolean;
  setOpen: (v: boolean) => void;
  add: (variantId: string, qty?: number) => void;
  setQty: (variantId: string, qty: number) => void;
  remove: (variantId: string) => void;
  clear: () => void;
  setCoupon: (c: string | null) => void;
};

const CartContext = React.createContext<Ctx | null>(null);
const KEY = "kd_cart_v1";

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = React.useState<CartState>({ items: [], coupon: null });
  const [ready, setReady] = React.useState(false);
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as CartState;
        if (Array.isArray(parsed.items)) setState({ items: parsed.items.filter((i) => i.variantId && i.qty > 0), coupon: parsed.coupon ?? null });
      }
    } catch {
      /* storage unavailable */
    }
    setReady(true);
    const onStorage = (e: StorageEvent) => {
      if (e.key === KEY && e.newValue) {
        try {
          setState(JSON.parse(e.newValue));
        } catch {}
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  React.useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch {}
  }, [state, ready]);

  const value: Ctx = {
    ...state,
    ready,
    open,
    setOpen,
    count: state.items.reduce((s, i) => s + i.qty, 0),
    add: (variantId, qty = 1) =>
      setState((s) => {
        const existing = s.items.find((i) => i.variantId === variantId);
        const items = existing
          ? s.items.map((i) => (i.variantId === variantId ? { ...i, qty: Math.min(50, i.qty + qty) } : i))
          : [...s.items, { variantId, qty: Math.min(50, qty) }];
        return { ...s, items };
      }),
    setQty: (variantId, qty) =>
      setState((s) => ({ ...s, items: qty <= 0 ? s.items.filter((i) => i.variantId !== variantId) : s.items.map((i) => (i.variantId === variantId ? { ...i, qty: Math.min(50, qty) } : i)) })),
    remove: (variantId) => setState((s) => ({ ...s, items: s.items.filter((i) => i.variantId !== variantId) })),
    clear: () => setState({ items: [], coupon: null }),
    setCoupon: (coupon) => setState((s) => ({ ...s, coupon })),
  };
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = React.useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside CartProvider");
  return ctx;
}

export type QuoteResponse = {
  lines: {
    variantId: string;
    slug: string;
    name_en: string;
    name_hi: string;
    image: string | null;
    categorySlug: string;
    packLabel: string;
    mrp: number;
    unitPrice: number;
    qty: number;
    lineTotal: number;
    fulfilledBy: "OWN_STOCK" | "SUPPLIER_DIRECT";
    etaMinDays: number;
    etaMaxDays: number;
    available: boolean;
    maxQty: number;
  }[];
  unavailable: string[];
  subtotal: number;
  discount: number;
  couponCode: string | null;
  couponError: string | null;
  shippingFee: number;
  handlingFee: number;
  handlingFeePercent: number;
  codFee: number;
  total: number;
  freeShippingThreshold: number;
  amountToFreeShipping: number;
  taxBreakup: { rate: number; taxable: number; tax: number }[];
};

/** Fetches a server-side quote whenever the cart changes. Prices are never computed on the client. */
export function useQuote(enabled = true, opts: { cod?: boolean } = {}) {
  const { items, coupon, ready } = useCart();
  const [quote, setQuote] = React.useState<QuoteResponse | null>(null);
  const [loading, setLoading] = React.useState(false);
  const key = JSON.stringify({ items, coupon, cod: Boolean(opts.cod) });

  React.useEffect(() => {
    if (!ready || !enabled) return;
    if (!items.length) {
      setQuote(null);
      return;
    }
    const ctrl = new AbortController();
    setLoading(true);
    fetch("/api/cart/quote", { method: "POST", headers: { "Content-Type": "application/json" }, body: key, signal: ctrl.signal })
      .then((r) => (r.ok ? r.json() : null))
      .then((q) => q && setQuote(q))
      .catch(() => {})
      .finally(() => setLoading(false));
    return () => ctrl.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, ready, enabled]);

  return { quote, loading };
}
