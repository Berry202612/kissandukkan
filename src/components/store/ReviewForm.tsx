"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input, Notice, Textarea } from "@/components/ui/form";
import { submitReview } from "@/app/actions/account";
import { cn } from "@/lib/utils";
import { Uploader } from "./Uploader";

export function ReviewForm({ productId }: { productId: string }) {
  const t = useTranslations("review");
  const tc = useTranslations("common");
  const [rating, setRating] = React.useState(0);
  const [title, setTitle] = React.useState("");
  const [body, setBody] = React.useState("");
  const [photos, setPhotos] = React.useState<string[]>([]);
  const [state, setState] = React.useState<"idle" | "busy" | "done" | "error">("idle");
  if (state === "done") return <Notice tone="success">{t("thanks")}</Notice>;
  return (
    <form
      className="max-w-xl space-y-5"
      onSubmit={async (e) => {
        e.preventDefault();
        setState("busy");
        const r = await submitReview({ productId, rating, title, body, photos });
        setState(r.ok ? "done" : "error");
      }}
    >
      <fieldset>
        <legend className="mb-1 text-sm font-semibold">{t("rating")}</legend>
        <div className="flex gap-1" role="radiogroup">
          {[1, 2, 3, 4, 5].map((n) => (
            <button key={n} type="button" role="radio" aria-checked={rating === n} aria-label={`${n}/5`} onClick={() => setRating(n)} className="tap inline-flex items-center justify-center">
              <Star className={cn("h-8 w-8", n <= rating ? "fill-accent text-accent" : "text-line")} />
            </button>
          ))}
        </div>
      </fieldset>
      <Field label={t("headline")} htmlFor="r-title">
        <Input id="r-title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={100} />
      </Field>
      <Field label={t("body")} hint={t("bodyHint")} htmlFor="r-body">
        <Textarea id="r-body" value={body} onChange={(e) => setBody(e.target.value)} required minLength={10} maxLength={3000} />
      </Field>
      <Uploader purpose="review" max={4} accept="image/jpeg,image/png,image/webp" value={photos} onChange={setPhotos} label={t("photos")} />
      {state === "error" && <Notice tone="error">{tc("somethingWrong")}</Notice>}
      <Button type="submit" disabled={state === "busy" || rating === 0 || body.trim().length < 10}>
        {t("submit")}
      </Button>
    </form>
  );
}
