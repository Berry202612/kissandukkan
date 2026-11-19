import { getTranslations, setRequestLocale } from "next-intl/server";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { AddressBook } from "@/components/store/AddressBook";

export default async function AddressesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const u = await requireUser();
  const t = await getTranslations("address");
  const addresses = await db.address.findMany({ where: { userId: u.id }, orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }] });
  return (
    <div>
      <h1 className="mb-4 font-heading text-2xl font-bold">{t("title")}</h1>
      <AddressBook addresses={addresses} />
    </div>
  );
}
