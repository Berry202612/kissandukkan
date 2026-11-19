"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Field, Notice, Select, Textarea } from "@/components/ui/form";
import { requestReturn } from "@/app/actions/account";
import { Uploader } from "./Uploader";

const REASONS = ["damaged", "wrong", "expired", "missing", "defective"] as const;

export function ReturnForm({ orderNumber, items }: { orderNumber: string; items: { id: string; label: string }[] }) {
  const t = useTranslations("account");
  const tc = useTranslations("common");
  const [type, setType] = React.useState<"REPLACEMENT" | "RETURN">("REPLACEMENT");
  const [reason, setReason] = React.useState<(typeof REASONS)[number]>("damaged");
  const [details, setDetails] = React.useState("");
  const [itemIds, setItemIds] = React.useState<string[]>(items.length === 1 ? [items[0].id] : []);
  const [media, setMedia] = React.useState<string[]>([]);
  const [state, setState] = React.useState<"idle" | "busy" | "done" | "error">("idle");

  if (state === "done") return <Notice tone="success">{t("returnSent")}</Notice>;
  return (
    <form
      className="space-y-5"
      onSubmit={async (e) => {
        e.preventDefault();
        setState("busy");
        const r = await requestReturn({ orderNumber, type, reason, details, media, itemIds });
        setState(r.ok ? "done" : "error");
      }}
    >
      <fieldset>
        <legend className="mb-2 text-sm font-semibold">{t("returnType")}</legend>
        <div className="flex flex-wrap gap-2">
          {(["REPLACEMENT", "RETURN"] as const).map((v) => (
            <label key={v} className={`flex min-h-[48px] cursor-pointer items-center gap-2 rounded-xl border-2 px-4 ${type === v ? "border-primary bg-primary-light" : "border-line bg-white"}`}>
              <input type="radio" name="type" checked={type === v} onChange={() => setType(v)} className="accent-primary" />
              {v === "REPLACEMENT" ? t("replacement") : t("return")}
            </label>
          ))}
        </div>
      </fieldset>
      <fieldset>
        <legend className="mb-2 text-sm font-semibold">{t("selectItems")}</legend>
        {items.map((i) => (
          <label key={i.id} className="flex min-h-[40px] items-center gap-2.5 text-sm">
            <input type="checkbox" className="h-5 w-5 accent-primary" checked={itemIds.includes(i.id)} onChange={(e) => setItemIds((s) => (e.target.checked ? [...s, i.id] : s.filter((x) => x !== i.id)))} />
            {i.label}
          </label>
        ))}
      </fieldset>
      <Field label={t("reason")} htmlFor="reason">
        <Select id="reason" value={reason} onChange={(e) => setReason(e.target.value as (typeof REASONS)[number])}>
          {REASONS.map((r) => (
            <option key={r} value={r}>
              {t(`reasons.${r}`)}
            </option>
          ))}
        </Select>
      </Field>
      <Field label={t("details")} htmlFor="details">
        <Textarea id="details" value={details} onChange={(e) => setDetails(e.target.value)} required minLength={10} />
      </Field>
      <Uploader purpose="return" max={5} accept="image/jpeg,image/png,image/webp,video/mp4" value={media} onChange={setMedia} label={t("evidence")} hint={t("evidenceHint")} />
      {state === "error" && <Notice tone="error">{tc("somethingWrong")}</Notice>}
      <Button type="submit" disabled={state === "busy" || !media.length || !itemIds.length || details.trim().length < 10}>
        {tc("submit")}
      </Button>
    </form>
  );
}
