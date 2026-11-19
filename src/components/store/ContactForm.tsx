"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Field, Input, Notice, Textarea } from "@/components/ui/form";
import { sendContact } from "@/app/actions/public";

export function ContactForm({ kind = "CONTACT" }: { kind?: "CONTACT" | "BULK" }) {
  const t = useTranslations("contact");
  const tb = useTranslations("bulk");
  const ta = useTranslations("auth");
  const tc = useTranslations("common");
  const [state, action, pending] = useActionState(sendContact, null);
  if (state?.ok) return <Notice tone="success">{kind === "BULK" ? tb("sent") : t("sent")}</Notice>;
  const fe = state?.fieldErrors ?? {};
  const err = (k: string) => (fe[k]?.length ? tc("required") : undefined);
  return (
    <form action={action} className="grid gap-4 sm:grid-cols-2">
      <input type="hidden" name="kind" value={kind} />
      <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />
      {state && !state.ok && !state.fieldErrors && <Notice tone="error" className="sm:col-span-2">{tc("somethingWrong")}</Notice>}
      <Field label={t("name")} error={err("name")} htmlFor="c-name">
        <Input id="c-name" name="name" required autoComplete="name" />
      </Field>
      <Field label={ta("email")} error={err("email")} htmlFor="c-email">
        <Input id="c-email" name="email" type="email" required autoComplete="email" />
      </Field>
      <Field label={`${ta("mobile")}`} htmlFor="c-phone">
        <Input id="c-phone" name="phone" inputMode="tel" autoComplete="tel" />
      </Field>
      {kind === "BULK" ? (
        <>
          <Field label={tb("organisation")} htmlFor="c-org">
            <Input id="c-org" name="organisation" />
          </Field>
          <Field label={tb("pincode")} htmlFor="c-pin">
            <Input id="c-pin" name="pincode" inputMode="numeric" maxLength={6} />
          </Field>
          <input type="hidden" name="subject" value="Bulk enquiry" />
        </>
      ) : (
        <Field label={t("subject")} error={err("subject")} htmlFor="c-subject">
          <Input id="c-subject" name="subject" required />
        </Field>
      )}
      <Field label={kind === "BULK" ? tb("products") : t("message")} error={err("message")} className="sm:col-span-2" htmlFor="c-msg">
        <Textarea id="c-msg" name="message" required minLength={10} />
      </Field>
      <div className="sm:col-span-2">
        <Button type="submit" disabled={pending}>
          {pending ? tc("loading") : kind === "BULK" ? tc("submit") : t("send")}
        </Button>
      </div>
    </form>
  );
}
