"use client";

import * as React from "react";
import { useActionState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Field, Input, Notice } from "@/components/ui/form";
import { forgotPasswordAction, loginAction, registerAction, resetPasswordAction } from "@/app/actions/auth";

export function PasswordInput({ id, name, autoComplete, required = true }: { id: string; name: string; autoComplete: string; required?: boolean }) {
  const t = useTranslations("auth");
  const [show, setShow] = React.useState(false);
  return (
    <div className="relative">
      <Input id={id} name={name} type={show ? "text" : "password"} autoComplete={autoComplete} required={required} className="pr-20" />
      <button type="button" onClick={() => setShow((s) => !s)} className="absolute right-1 top-1/2 h-9 -translate-y-1/2 rounded-lg px-3 text-sm font-semibold text-primary hover:bg-primary-light" aria-pressed={show}>
        {show ? t("hide") : t("show")}
      </button>
    </div>
  );
}

function useRedirectOnSuccess(state: { ok: boolean; redirectTo?: string } | null) {
  React.useEffect(() => {
    if (state?.ok && state.redirectTo) window.location.assign(state.redirectTo);
  }, [state]);
}

export function LoginForm({ next, scope = "customer" }: { next?: string; scope?: "customer" | "admin" }) {
  const t = useTranslations("auth");
  const locale = useLocale();
  const [state, action, pending] = useActionState(loginAction, null);
  useRedirectOnSuccess(state);
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="scope" value={scope} />
      <input type="hidden" name="locale" value={locale} />
      {next && <input type="hidden" name="next" value={next} />}
      {state && !state.ok && <Notice tone="error">{t(state.error === "rateLimited" ? "rateLimited" : "invalid")}</Notice>}
      <Field label={t("identifier")} htmlFor="identifier">
        <Input id="identifier" name="identifier" required autoComplete="username" />
      </Field>
      <Field label={t("password")} htmlFor="password">
        <PasswordInput id="password" name="password" autoComplete="current-password" />
      </Field>
      <Button type="submit" size="lg" className="w-full" disabled={pending || Boolean(state?.ok)}>
        {pending ? "…" : t("login")}
      </Button>
      {scope === "customer" && (
        <div className="flex flex-wrap justify-between gap-2 text-sm">
          <Link href="/forgot-password" className="link">
            {t("forgot")}
          </Link>
          <span>
            {t("noAccount")}{" "}
            <Link href={next ? `/register?next=${encodeURIComponent(next)}` : "/register"} className="link">
              {t("register")}
            </Link>
          </span>
        </div>
      )}
    </form>
  );
}

export function RegisterForm({ next }: { next?: string }) {
  const t = useTranslations("auth");
  const locale = useLocale();
  const [state, action, pending] = useActionState(registerAction, null);
  useRedirectOnSuccess(state);
  const msg = state && !state.ok ? (["exists", "mismatch", "needEmailOrMobile", "passwordRule", "rateLimited"].includes(state.error ?? "") ? t(state.error as "exists") : t("invalid")) : null;
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="locale" value={locale} />
      {next && <input type="hidden" name="next" value={next} />}
      {msg && <Notice tone="error">{msg}</Notice>}
      <Field label={t("name")} htmlFor="name">
        <Input id="name" name="name" required autoComplete="name" />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t("email")} htmlFor="email">
          <Input id="email" name="email" type="email" autoComplete="email" />
        </Field>
        <Field label={t("mobile")} htmlFor="mobile">
          <Input id="mobile" name="mobile" inputMode="tel" autoComplete="tel" />
        </Field>
      </div>
      <Field label={t("password")} hint={t("passwordRule")} htmlFor="password">
        <PasswordInput id="password" name="password" autoComplete="new-password" />
      </Field>
      <Field label={t("confirmPassword")} htmlFor="confirm">
        <PasswordInput id="confirm" name="confirm" autoComplete="new-password" />
      </Field>
      <Button type="submit" size="lg" className="w-full" disabled={pending || Boolean(state?.ok)}>
        {pending ? "…" : t("register")}
      </Button>
      <p className="text-sm">
        {t("haveAccount")}{" "}
        <Link href="/login" className="link">
          {t("login")}
        </Link>
      </p>
    </form>
  );
}

export function ForgotForm() {
  const t = useTranslations("auth");
  const locale = useLocale();
  const [state, action, pending] = useActionState(forgotPasswordAction, null);
  if (state?.ok) return <Notice tone="success">{t("linkSent")}</Notice>;
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="locale" value={locale} />
      {state && !state.ok && <Notice tone="error">{t("invalid")}</Notice>}
      <Field label={t("email")} htmlFor="email">
        <Input id="email" name="email" type="email" required autoComplete="email" />
      </Field>
      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {t("sendLink")}
      </Button>
      <p className="text-sm text-muted">{t("mobileNoEmail")}</p>
    </form>
  );
}

export function ResetForm({ token }: { token: string }) {
  const t = useTranslations("auth");
  const [state, action, pending] = useActionState(resetPasswordAction, null);
  if (state?.ok)
    return (
      <Notice tone="success">
        {t("resetDone")}{" "}
        <Link href="/login" className="font-semibold underline">
          {t("login")}
        </Link>
      </Notice>
    );
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="token" value={token} />
      {state && !state.ok && <Notice tone="error">{t((state.error ?? "invalid") as "invalid")}</Notice>}
      <Field label={t("newPassword")} hint={t("passwordRule")} htmlFor="password">
        <PasswordInput id="password" name="password" autoComplete="new-password" />
      </Field>
      <Field label={t("confirmPassword")} htmlFor="confirm">
        <PasswordInput id="confirm" name="confirm" autoComplete="new-password" />
      </Field>
      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {t("resetTitle")}
      </Button>
    </form>
  );
}
