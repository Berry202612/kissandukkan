import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { Toaster } from "sonner";
import { fontVars } from "@/app/fonts";
import enMessages from "@/messages/en.json";
import "../globals.css";

export const metadata: Metadata = { title: { default: "Admin", template: "%s · KissanDukkan Admin" }, robots: { index: false, follow: false } };

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={fontVars}>
      <body className="min-h-screen bg-[#F4F1E8] font-sans">
        <NextIntlClientProvider locale="en" messages={enMessages} timeZone="Asia/Kolkata">
          {children}
        </NextIntlClientProvider>
        <Toaster position="top-center" richColors />
      </body>
    </html>
  );
}
