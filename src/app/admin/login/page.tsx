import { Logo } from "@/components/brand/Logo";
import { LoginForm } from "@/components/store/AuthForms";

export const metadata = { title: "Staff login" };

export default async function AdminLogin({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="card w-full max-w-md p-8">
        <Logo />
        <h1 className="mt-6 font-heading text-2xl font-bold">Staff & admin login</h1>
        <p className="mt-1 text-sm text-muted">Only staff accounts can sign in here.</p>
        <div className="mt-6">
          <LoginForm scope="admin" next={next?.startsWith("/admin") ? next : "/admin"} />
        </div>
      </div>
    </div>
  );
}
