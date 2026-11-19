import "server-only";

/** Pincode → district/state via India Post public API. Returns null when unknown. */
export async function lookupPincode(pin: string): Promise<{ city: string; district: string; state: string } | null> {
  if (!/^[1-9][0-9]{5}$/.test(pin)) return null;
  try {
    const res = await fetch(`https://api.postalpincode.in/pincode/${pin}`, { next: { revalidate: 60 * 60 * 24 * 30 }, signal: AbortSignal.timeout(5000) });
    if (!res.ok) return null;
    const data = (await res.json()) as { Status: string; PostOffice?: { Block?: string; District: string; State: string; Name: string }[] }[];
    const po = data?.[0]?.Status === "Success" ? data[0].PostOffice?.[0] : undefined;
    if (!po) return null;
    return { city: po.Block && po.Block !== "NA" ? po.Block : po.District, district: po.District, state: po.State };
  } catch {
    return null;
  }
}
