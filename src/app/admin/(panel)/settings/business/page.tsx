import { requireAdmin } from "@/lib/session";
import { getBusiness } from "@/lib/settings";
import { L, PageHeader, Panel, inputCls } from "@/components/admin/ui";
import { SubmitButton } from "@/components/admin/SubmitButton";
import { saveBusiness } from "@/app/admin/actions/settings";

export const metadata = { title: "Business details" };

const groups: { title: string; fields: [string, string, string?][] }[] = [
  {
    title: "Legal entity",
    fields: [
      ["legalName", "Legal name (as on GST certificate)"],
      ["parentCompany", "Parent company (optional)"],
      ["tradeName", "Trade name"],
      ["gstin", "GSTIN", "15 characters"],
      ["cin", "CIN (optional)"],
      ["pan", "PAN", "Shown masked"],
      ["registeredAddress", "Registered address"],
    ],
  },
  {
    title: "Dealer licences",
    fields: [
      ["pesticideLicenceNo", "Insecticide (pesticide) licence no."],
      ["fertilizerLicenceNo", "Fertilizer licence no."],
      ["seedLicenceNo", "Seed licence no."],
      ["licenceIssuingAuthority", "Issuing authority"],
    ],
  },
  {
    title: "Grievance officer (E-Commerce Rules 2020)",
    fields: [
      ["grievanceOfficerName", "Name"],
      ["grievanceOfficerEmail", "Email"],
      ["grievanceOfficerPhone", "Phone (optional)"],
    ],
  },
  {
    title: "Customer support",
    fields: [
      ["supportEmail", "Support email"],
      ["supportPhone", "Support phone (optional)", "Razorpay website review usually needs a phone number on the Contact page"],
      ["whatsappNumber", "WhatsApp number with country code (optional)", "e.g. 919876543210"],
      ["supportHours", "Support hours", "e.g. Mon–Sat, 9 am – 6 pm"],
    ],
  },
  {
    title: "Shipping origin",
    fields: [
      ["pickupAddress", "Pickup / warehouse address"],
      ["pickupPincode", "Pickup pincode", "Used for Shiprocket serviceability"],
      ["shiprocketPickupLocation", "Shiprocket pickup location name", "Exactly as created in Shiprocket → Settings → Pickup addresses"],
    ],
  },
  {
    title: "Social & apps (all optional – icons appear only when filled)",
    fields: [
      ["instagram", "Instagram URL"],
      ["facebook", "Facebook URL"],
      ["youtube", "YouTube URL"],
      ["androidAppUrl", "Android app URL"],
      ["iosAppUrl", "iOS app URL"],
    ],
  },
];

export default async function BusinessPage({ searchParams }: { searchParams: Promise<{ msg?: string; err?: string }> }) {
  await requireAdmin();
  const [b, sp] = await Promise.all([getBusiness(), searchParams]);
  return (
    <>
      <PageHeader title="Business details" description="Drives the footer, contact page, policies, invoices, product legal info and trust badges. Any empty field is simply not shown anywhere – no placeholders." />
      {sp.msg && <p className="mb-4 rounded-xl bg-primary-light p-3 text-sm text-primary-dark">{sp.msg}</p>}
      {sp.err && <p className="mb-4 rounded-xl bg-[#fdecea] p-3 text-sm text-danger">{sp.err}</p>}
      <form action={saveBusiness} className="space-y-6">
        {groups.map((g) => (
          <Panel key={g.title} title={g.title}>
            <div className="grid gap-4 md:grid-cols-2">
              {g.fields.map(([k, label, hint]) => (
                <L key={k} label={label} hint={hint} className={k.toLowerCase().includes("address") ? "md:col-span-2" : ""}>
                  <input name={k} defaultValue={(b as Record<string, string>)[k] ?? ""} className={`${inputCls} w-full`} />
                </L>
              ))}
            </div>
          </Panel>
        ))}
        <SubmitButton>Save business details</SubmitButton>
      </form>
    </>
  );
}
