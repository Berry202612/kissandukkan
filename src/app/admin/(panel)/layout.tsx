import { redirect } from "next/navigation";
import { currentUser } from "@/lib/session";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { logoutAction } from "@/app/actions/auth";

export const dynamic = "force-dynamic";

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const u = await currentUser();
  if (!u || (u.role !== "ADMIN" && u.role !== "STAFF")) redirect("/admin/login");
  return (
    <div className="flex min-h-screen">
      <AdminSidebar role={u.role} name={u.name ?? ""} logout={logoutAction} />
      <main className="min-w-0 flex-1 p-4 md:p-8">{children}</main>
    </div>
  );
}
