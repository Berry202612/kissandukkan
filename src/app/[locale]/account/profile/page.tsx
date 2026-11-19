import { setRequestLocale } from "next-intl/server";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { ProfileForms } from "@/components/store/ProfileForms";

export default async function ProfilePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const u = await requireUser();
  const user = await db.user.findUniqueOrThrow({ where: { id: u.id }, select: { name: true, email: true, mobile: true, locale: true, emailOptIn: true, orderUpdatesOptIn: true } });
  return <ProfileForms user={user} />;
}
