"use client";

import * as React from "react";
import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, Input, Select } from "@/components/ui/form";
import { saveAddress } from "@/app/actions/account";

export const INDIAN_STATES = [
  "Andaman and Nicobar Islands", "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chandigarh", "Chhattisgarh",
  "Dadra and Nagar Haveli and Daman and Diu", "Delhi", "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jammu and Kashmir",
  "Jharkhand", "Karnataka", "Kerala", "Ladakh", "Lakshadweep", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya",
  "Mizoram", "Nagaland", "Odisha", "Puducherry", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura",
  "Uttar Pradesh", "Uttarakhand", "West Bengal",
];

type Addr = { id?: string; name?: string; phone?: string; pincode?: string; line1?: string; line2?: string | null; landmark?: string | null; city?: string; district?: string | null; state?: string; isDefault?: boolean };

export function AddressForm({ initial, onSaved }: { initial?: Addr; onSaved?: (id: string) => void }) {
  const t = useTranslations("address");
  const tc = useTranslations("common");
  const [state, action, pending] = useActionState(saveAddress, null);
  const [pin, setPin] = React.useState(initial?.pincode ?? "");
  const [city, setCity] = React.useState(initial?.city ?? "");
  const [district, setDistrict] = React.useState(initial?.district ?? "");
  const [st, setSt] = React.useState(initial?.state ?? "");
  const [pinMsg, setPinMsg] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (state?.ok && state.id) onSaved?.(state.id);
  }, [state, onSaved]);

  React.useEffect(() => {
    if (!/^[1-9][0-9]{5}$/.test(pin) || pin === initial?.pincode) return;
    const ctrl = new AbortController();
    fetch(`/api/pincode?pin=${pin}`, { signal: ctrl.signal })
      .then((r) => r.json())
      .then((d) => {
        if (d.status === "ok") {
          setCity(d.city);
          setDistrict(d.district);
          const match = INDIAN_STATES.find((s) => s.toLowerCase() === String(d.state).toLowerCase());
          if (match) setSt(match);
          setPinMsg(null);
        } else setPinMsg(t("autofillFail"));
      })
      .catch(() => {});
    return () => ctrl.abort();
  }, [pin, initial?.pincode, t]);

  const fe = state?.fieldErrors ?? {};
  const err = (k: string) => (fe[k]?.length ? tc("required") : undefined);

  return (
    <form action={action} className="grid gap-4 sm:grid-cols-2">
      {initial?.id && <input type="hidden" name="id" value={initial.id} />}
      <Field label={t("name")} error={err("name")} htmlFor="a-name">
        <Input id="a-name" name="name" defaultValue={initial?.name} required autoComplete="name" />
      </Field>
      <Field label={t("phone")} error={err("phone")} htmlFor="a-phone">
        <Input id="a-phone" name="phone" defaultValue={initial?.phone} required inputMode="tel" autoComplete="tel" />
      </Field>
      <Field label={t("pincode")} error={err("pincode") ?? pinMsg ?? undefined} htmlFor="a-pin">
        <Input id="a-pin" name="pincode" value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))} required inputMode="numeric" autoComplete="postal-code" />
      </Field>
      <Field label={t("city")} error={err("city")} htmlFor="a-city">
        <Input id="a-city" name="city" value={city} onChange={(e) => setCity(e.target.value)} required />
      </Field>
      <Field label={t("line1")} error={err("line1")} className="sm:col-span-2" htmlFor="a-l1">
        <Input id="a-l1" name="line1" defaultValue={initial?.line1} required autoComplete="address-line1" />
      </Field>
      <Field label={t("line2")} htmlFor="a-l2">
        <Input id="a-l2" name="line2" defaultValue={initial?.line2 ?? ""} autoComplete="address-line2" />
      </Field>
      <Field label={t("landmark")} htmlFor="a-lm">
        <Input id="a-lm" name="landmark" defaultValue={initial?.landmark ?? ""} />
      </Field>
      <Field label={t("district")} htmlFor="a-dist">
        <Input id="a-dist" name="district" value={district} onChange={(e) => setDistrict(e.target.value)} />
      </Field>
      <Field label={t("state")} error={err("state")} htmlFor="a-state">
        <Select id="a-state" name="state" value={st} onChange={(e) => setSt(e.target.value)} required>
          <option value="">—</option>
          {INDIAN_STATES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </Select>
      </Field>
      <Checkbox name="isDefault" label={t("default")} defaultChecked={initial?.isDefault} className="sm:col-span-2" />
      <div className="sm:col-span-2">
        <Button type="submit" disabled={pending}>
          {pending ? tc("saving") : t("save")}
        </Button>
      </div>
    </form>
  );
}
