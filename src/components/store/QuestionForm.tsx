"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/form";
import { askQuestion } from "@/app/actions/public";
import { useSessionUser } from "./HeaderActions";

export function QuestionForm({ productId }: { productId: string }) {
  const t = useTranslations("product");
  const tc = useTranslations("common");
  const user = useSessionUser();
  const [state, action, pending] = useActionState(askQuestion, null);
  if (!user)
    return (
      <Link href="/login" className="link text-sm">
        {t("loginToAsk")}
      </Link>
    );
  if (state?.ok) return <p className="text-sm font-semibold text-success">{t("questionSent")}</p>;
  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="productId" value={productId} />
      <Textarea name="body" required minLength={5} maxLength={600} placeholder={t("questionPlaceholder")} aria-label={t("askQuestion")} />
      {state && !state.ok && <p className="text-sm text-danger">{tc("somethingWrong")}</p>}
      <Button type="submit" size="sm" disabled={pending}>
        {t("askQuestion")}
      </Button>
    </form>
  );
}
