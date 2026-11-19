"use client";

import * as React from "react";
import Image from "next/image";
import { Loader2, Upload, X } from "lucide-react";

export function Uploader({
  purpose,
  max,
  accept,
  value,
  onChange,
  label,
  hint,
}: {
  purpose: "review" | "return" | "product" | "banner";
  max: number;
  accept: string;
  value: string[];
  onChange: (urls: string[]) => void;
  label: string;
  hint?: string;
}) {
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);
  const onFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    setBusy(true);
    setErr(null);
    const next = [...value];
    for (const f of Array.from(files).slice(0, max - value.length)) {
      const fd = new FormData();
      fd.set("purpose", purpose);
      fd.set("file", f);
      const r = await fetch("/api/upload", { method: "POST", body: fd });
      const d = await r.json().catch(() => ({}));
      if (r.ok && d.url) next.push(d.url);
      else setErr(d.error ?? "upload_failed");
    }
    onChange(next);
    setBusy(false);
  };
  return (
    <div>
      <p className="mb-1.5 text-sm font-semibold">{label}</p>
      <div className="flex flex-wrap gap-2">
        {value.map((u) => (
          <div key={u} className="relative h-20 w-20 overflow-hidden rounded-xl border border-line bg-white">
            {u.endsWith(".mp4") ? <video src={u} className="h-full w-full object-cover" /> : <Image src={u} alt="" fill sizes="80px" className="object-cover" />}
            <button type="button" onClick={() => onChange(value.filter((x) => x !== u))} className="absolute right-0.5 top-0.5 rounded-full bg-ink/70 p-1 text-white" aria-label="Remove">
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}
        {value.length < max && (
          <label className="flex h-20 w-20 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-line bg-white text-muted hover:border-primary hover:text-primary">
            {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Upload className="h-5 w-5" />}
            <input type="file" accept={accept} multiple className="sr-only" onChange={(e) => onFiles(e.target.files)} disabled={busy} />
          </label>
        )}
      </div>
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
      {err && <p className="mt-1 text-xs text-danger">{err === "storage_not_configured" ? "File storage is not configured yet." : err === "size" ? "File too large." : err === "type" ? "File type not allowed." : "Upload failed."}</p>}
    </div>
  );
}
