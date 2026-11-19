"use client";

import { useActionState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/form";
import { Illustration } from "@/components/brand/Illustration";
import { subscribeNewsletter } from "@/app/actions/public";

export function Newsletter() {
  const t = useTranslations("home");
  const tc = useTranslations("common");
  const locale = useLocale();
  const [state, action, pending] = useActionState(subscribeNewsletter, null);
  return (
    <section className="container mt-14">
      <div className="relative overflow-hidden rounded-3xl bg-accent-light px-6 py-10 md:px-12">
        <Illustration name="sprout" className="pointer-events-none absolute -right-4 bottom-0 h-40 w-40 text-soil/20" />
        <div className="relative max-w-2xl">
          <h2 className="section-title">{t("newsletterTitle")}</h2>
          <p className="mt-2 text-muted">{t("newsletterText")}</p>
          {state?.ok ? (
            <p className="mt-5 font-semibold text-success" role="status">{t("newsletterDone")}</p>
          ) : (
            <form action={action} className="mt-5 flex flex-col gap-2 sm:flex-row">
              <input type="hidden" name="locale" value={locale} />
              <Input type="email" name="email" required placeholder={t("newsletterPlaceholder")} aria-label={t("newsletterPlaceholder")} className="sm:max-w-sm" />
              <Button type="submit" disabled={pending}>
                {pending ? tc("loading") : t("newsletterCta")}
              </Button>
            </form>
          )}
          {state && !state.ok && <p className="mt-2 text-sm text-danger">{tc("somethingWrong")}</p>}
        </div>
      </div>
    </section>
  );
}
