"use client";

import { useTranslations } from "next-intl";
import { Illustration } from "@/components/brand/Illustration";
import { Button } from "@/components/ui/button";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useTranslations("errors");
  return (
    <div className="container mt-12">
      <div className="mx-auto flex max-w-xl flex-col items-center text-center">
        <div className="relative">
          <Illustration name="wheel" className="h-40 w-40 text-soil/70" strokeWidth={2.2} />
          <span className="absolute -right-4 top-0 rounded-full bg-danger px-3 py-1 font-heading text-lg font-bold text-white">500</span>
        </div>
        <h1 className="mt-4 font-heading text-3xl font-bold">{t("serverTitle")}</h1>
        <p className="mt-2 text-muted">{t("serverText")}</p>
        <Button className="mt-6" onClick={reset}>
          {t("retry")}
        </Button>
      </div>
    </div>
  );
}
