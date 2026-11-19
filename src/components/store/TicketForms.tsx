"use client";

import * as React from "react";
import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Field, Input, Notice, Textarea } from "@/components/ui/form";
import { createTicket, replyTicket } from "@/app/actions/account";

export function NewTicketForm() {
  const t = useTranslations("account");
  const tc = useTranslations("common");
  const router = useRouter();
  const [state, action, pending] = useActionState(createTicket, null);
  React.useEffect(() => {
    if (state?.ok && state.id) router.push(`/account/tickets/${state.id}`);
  }, [state, router]);
  return (
    <form action={action} className="grid max-w-xl gap-4">
      {state && !state.ok && <Notice tone="error">{tc("somethingWrong")}</Notice>}
      <Field label={t("subject")} htmlFor="t-subject">
        <Input id="t-subject" name="subject" required minLength={3} />
      </Field>
      <Field label={t("orderNumberOptional")} htmlFor="t-order">
        <Input id="t-order" name="orderNumber" className="uppercase" />
      </Field>
      <Field label={t("message")} htmlFor="t-msg">
        <Textarea id="t-msg" name="message" required minLength={5} />
      </Field>
      <div>
        <Button type="submit" disabled={pending}>{tc("submit")}</Button>
      </div>
    </form>
  );
}

export function ReplyTicketForm({ ticketId }: { ticketId: string }) {
  const t = useTranslations("account");
  const tc = useTranslations("common");
  const ref = React.useRef<HTMLFormElement>(null);
  const [state, action, pending] = useActionState(replyTicket, null);
  React.useEffect(() => {
    if (state?.ok) ref.current?.reset();
  }, [state]);
  return (
    <form ref={ref} action={action} className="space-y-3">
      <input type="hidden" name="ticketId" value={ticketId} />
      {state && !state.ok && <Notice tone="error">{tc("somethingWrong")}</Notice>}
      <Textarea name="message" required aria-label={t("reply")} />
      <Button type="submit" disabled={pending}>{t("reply")}</Button>
    </form>
  );
}
