import "server-only";

const API = "https://apiv2.shiprocket.in/v1/external";

let cachedToken: { token: string; exp: number } | null = null;

export const shiprocketConfigured = () => Boolean(process.env.SHIPROCKET_EMAIL && process.env.SHIPROCKET_PASSWORD);

async function token() {
  if (cachedToken && cachedToken.exp > Date.now()) return cachedToken.token;
  const res = await fetch(`${API}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: process.env.SHIPROCKET_EMAIL, password: process.env.SHIPROCKET_PASSWORD }),
    cache: "no-store",
  });
  const json = await res.json();
  if (!res.ok || !json.token) throw new Error("Shiprocket login failed");
  cachedToken = { token: json.token, exp: Date.now() + 9 * 24 * 3600 * 1000 }; // tokens last 10 days
  return json.token as string;
}

async function call<T>(path: string, init: RequestInit = {}): Promise<T> {
  const t = await token();
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${t}`, ...(init.headers ?? {}) },
    cache: "no-store",
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`Shiprocket ${path} failed: ${json?.message ?? res.status}`);
  return json as T;
}

export type Serviceability = { serviceable: boolean; etdDays?: number; courier?: string };

/** Real serviceability check from pickup pincode → delivery pincode. */
export async function checkServiceability(pickupPincode: string, deliveryPincode: string, weightKg: number): Promise<Serviceability> {
  const q = new URLSearchParams({
    pickup_postcode: pickupPincode,
    delivery_postcode: deliveryPincode,
    weight: String(Math.max(0.1, weightKg)),
    cod: "0",
  });
  const json = await call<{ status: number; data?: { available_courier_companies?: { estimated_delivery_days?: string; courier_name?: string; rating?: number }[] } }>(
    `/courier/serviceability/?${q}`,
  );
  const list = json.data?.available_courier_companies ?? [];
  if (!list.length) return { serviceable: false };
  const best = [...list].sort((a, b) => Number(a.estimated_delivery_days ?? 99) - Number(b.estimated_delivery_days ?? 99))[0];
  return { serviceable: true, etdDays: Number(best.estimated_delivery_days) || undefined, courier: best.courier_name };
}

export type ShiprocketOrderInput = {
  orderNumber: string;
  orderDate: Date;
  pickupLocation: string;
  address: { name: string; phone: string; line1: string; line2?: string | null; city: string; state: string; pincode: string; email?: string | null };
  items: { name: string; sku: string; units: number; sellingPrice: number; hsn?: string }[];
  subTotal: number;
  weightKg: number;
};

export async function createShiprocketOrder(i: ShiprocketOrderInput) {
  return call<{ order_id: number; shipment_id: number; status: string }>("/orders/create/adhoc", {
    method: "POST",
    body: JSON.stringify({
      order_id: i.orderNumber,
      order_date: i.orderDate.toISOString().slice(0, 16).replace("T", " "),
      pickup_location: i.pickupLocation,
      billing_customer_name: i.address.name,
      billing_last_name: "",
      billing_address: i.address.line1,
      billing_address_2: i.address.line2 ?? "",
      billing_city: i.address.city,
      billing_pincode: i.address.pincode,
      billing_state: i.address.state,
      billing_country: "India",
      billing_email: i.address.email ?? "",
      billing_phone: i.address.phone,
      shipping_is_billing: true,
      order_items: i.items.map((it) => ({ name: it.name, sku: it.sku, units: it.units, selling_price: it.sellingPrice, hsn: it.hsn ?? "" })),
      payment_method: "Prepaid",
      sub_total: i.subTotal,
      length: 20,
      breadth: 15,
      height: 10,
      weight: Math.max(0.1, i.weightKg),
    }),
  });
}

export async function assignAwb(shipmentId: string) {
  return call<{ awb_assign_status: number; response?: { data?: { awb_code?: string; courier_name?: string } } }>("/courier/assign/awb", {
    method: "POST",
    body: JSON.stringify({ shipment_id: shipmentId }),
  });
}

export async function generateLabel(shipmentId: string) {
  return call<{ label_created: number; label_url?: string }>("/courier/generate/label", {
    method: "POST",
    body: JSON.stringify({ shipment_id: [shipmentId] }),
  });
}

export async function requestPickup(shipmentId: string) {
  return call<unknown>("/courier/generate/pickup", { method: "POST", body: JSON.stringify({ shipment_id: [shipmentId] }) });
}

/** Map Shiprocket's free-text status to our ShipmentStatus. */
export function mapShiprocketStatus(s: string): "CREATED" | "PICKED_UP" | "IN_TRANSIT" | "OUT_FOR_DELIVERY" | "DELIVERED" | "RTO" | "CANCELLED" {
  const x = s.toUpperCase();
  if (x.includes("RTO")) return "RTO";
  if (x.includes("CANCEL")) return "CANCELLED";
  if (x.includes("OUT FOR DELIVERY")) return "OUT_FOR_DELIVERY";
  if (x.includes("DELIVERED")) return "DELIVERED";
  if (x.includes("PICKED")) return "PICKED_UP";
  if (x.includes("TRANSIT") || x.includes("SHIPPED") || x.includes("REACHED")) return "IN_TRANSIT";
  return "CREATED";
}
