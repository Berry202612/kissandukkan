import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Clock, Mail, MapPin, Phone, UserCheck } from "lucide-react";
import { getBusiness } from "@/lib/settings";
import { Breadcrumbs } from "@/components/store/Breadcrumbs";
import { ContactForm } from "@/components/store/ContactForm";
import { WhatsAppIcon } from "@/components/store/icons";

export const revalidate = 600;

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "contact" });
  return { title: t("title"), alternates: { canonical: `/${locale}/contact`, languages: { en: "/en/contact", hi: "/hi/contact" } } };
}

export default async function ContactPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [t, b] = await Promise.all([getTranslations("contact"), getBusiness()]);
  const rows = [
    b.supportEmail && { icon: <Mail />, label: t("email"), value: <a href={`mailto:${b.supportEmail}`} className="link">{b.supportEmail}</a> },
    b.supportPhone && { icon: <Phone />, label: t("phone"), value: <a href={`tel:${b.supportPhone.replace(/\s/g, "")}`} className="link">{b.supportPhone}</a> },
    b.whatsappNumber && {
      icon: <WhatsAppIcon className="h-5 w-5" />,
      label: t("whatsapp"),
      value: (
        <a href={`https://wa.me/${b.whatsappNumber.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer" className="link">
          {b.whatsappNumber}
        </a>
      ),
    },
    b.supportHours && { icon: <Clock />, label: t("hours"), value: b.supportHours },
    b.registeredAddress && { icon: <MapPin />, label: t("address"), value: [b.legalName, b.registeredAddress].filter(Boolean).join(", ") },
    (b.grievanceOfficerName || b.grievanceOfficerEmail) && {
      icon: <UserCheck />,
      label: t("grievance"),
      value: [b.grievanceOfficerName, b.grievanceOfficerEmail, b.grievanceOfficerPhone].filter(Boolean).join(" · "),
    },
  ].filter(Boolean) as { icon: React.ReactNode; label: string; value: React.ReactNode }[];

  return (
    <>
      <Breadcrumbs items={[{ name: t("title") }]} />
      <div className="container mt-4 grid gap-6 lg:grid-cols-[1fr_1.3fr]">
        <div className="card p-6">
          <h1 className="font-heading text-3xl font-bold">{t("title")}</h1>
          <p className="mt-2 text-muted">{t("intro")}</p>
          <ul className="mt-6 space-y-4">
            {rows.map((r) => (
              <li key={r.label} className="flex gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-light text-primary [&_svg]:h-5 [&_svg]:w-5">{r.icon}</span>
                <span>
                  <span className="block text-sm font-semibold text-muted">{r.label}</span>
                  <span className="block">{r.value}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
        <div className="card p-6">
          <h2 className="font-heading text-2xl font-bold">{t("formTitle")}</h2>
          <div className="mt-4">
            <ContactForm />
          </div>
        </div>
      </div>
    </>
  );
}
