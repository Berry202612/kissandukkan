import { Illustration } from "@/components/brand/Illustration";

export function AuthShell({ title, text, children }: { title: string; text?: string; children: React.ReactNode }) {
  return (
    <div className="container mt-8">
      <div className="mx-auto grid max-w-4xl overflow-hidden rounded-3xl border border-line bg-white shadow-soft md:grid-cols-[1fr_1.2fr]">
        <div className="relative hidden flex-col justify-end bg-primary p-8 text-white md:flex">
          <Illustration name="field" className="absolute left-6 top-6 h-40 w-40 text-white/25" strokeWidth={2} />
          <p className="font-heading text-2xl font-bold text-white">किसान दुकान</p>
          <p className="mt-1 text-white/80">Kheti ka Har Saaman, Ek Bharosemand Dukaan</p>
        </div>
        <div className="p-6 md:p-10">
          <h1 className="font-heading text-2xl font-bold">{title}</h1>
          {text && <p className="mt-1 text-sm text-muted">{text}</p>}
          <div className="mt-6">{children}</div>
        </div>
      </div>
    </div>
  );
}
