"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card, Checkbox, Field, Input, Notice, Select } from "@/components/ui/form";
import { changePassword, saveProfile } from "@/app/actions/account";
import { PasswordInput } from "./AuthForms";

export function ProfileForms({ user }: { user: { name: string; email: string | null; mobile: string | null; locale: string; emailOptIn: boolean; orderUpdatesOptIn: boolean } }) {
  const t = useTranslations("account");
  const ta = useTranslations("auth");
  const tc = useTranslations("common");
  const [pState, pAction, pPending] = useActionState(saveProfile, null);
  const [wState, wAction, wPending] = useActionState(changePassword, null);
  const wErr = wState && !wState.ok ? (wState.error === "wrong" ? t("wrongPassword") : wState.error === "mismatch" ? ta("mismatch") : wState.error === "rule" ? ta("passwordRule") : tc("somethingWrong")) : null;
  return (
    <div className="space-y-5">
      <Card className="p-5">
        <h1 className="font-heading text-2xl font-bold">{t("profile")}</h1>
        <form action={pAction} className="mt-4 grid max-w-xl gap-4">
          {pState?.ok && <Notice tone="success">{t("profileSaved")}</Notice>}
          <Field label={ta("name")} htmlFor="p-name">
            <Input id="p-name" name="name" defaultValue={user.name} required />
          </Field>
          {user.email && (
            <Field label={ta("email")}>
              <Input value={user.email} disabled readOnly />
            </Field>
          )}
          {user.mobile && (
            <Field label={ta("mobile")}>
              <Input value={user.mobile} disabled readOnly />
            </Field>
          )}
          <Field label={t("preferredLanguage")} htmlFor="p-locale">
            <Select id="p-locale" name="locale" defaultValue={user.locale}>
              <option value="en">English</option>
              <option value="hi">हिंदी</option>
            </Select>
          </Field>
          <fieldset>
            <legend className="mb-1 text-sm font-semibold">{t("notifications")}</legend>
            <Checkbox name="orderUpdatesOptIn" defaultChecked={user.orderUpdatesOptIn} label={t("orderUpdatesOptIn")} />
            <Checkbox name="emailOptIn" defaultChecked={user.emailOptIn} label={t("emailOptIn")} />
          </fieldset>
          <div>
            <Button type="submit" disabled={pPending}>{pPending ? tc("saving") : tc("save")}</Button>
          </div>
        </form>
      </Card>
      <Card className="p-5">
        <h2 className="font-heading text-xl font-bold">{t("changePassword")}</h2>
        <form action={wAction} className="mt-4 grid max-w-xl gap-4">
          {wState?.ok && <Notice tone="success">{t("passwordChanged")}</Notice>}
          {wErr && <Notice tone="error">{wErr}</Notice>}
          <Field label={t("currentPassword")} htmlFor="current">
            <PasswordInput id="current" name="current" autoComplete="current-password" />
          </Field>
          <Field label={ta("newPassword")} hint={ta("passwordRule")} htmlFor="next">
            <PasswordInput id="next" name="next" autoComplete="new-password" />
          </Field>
          <Field label={ta("confirmPassword")} htmlFor="confirm">
            <PasswordInput id="confirm" name="confirm" autoComplete="new-password" />
          </Field>
          <div>
            <Button type="submit" disabled={wPending}>{t("changePassword")}</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
