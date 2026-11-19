"use client";

import * as React from "react";
import { toast } from "sonner";
import { Uploader } from "@/components/store/Uploader";
import { saveImages } from "@/app/admin/actions/products";
import { btnCls, inputCls } from "./ui";

type S = "NONE" | "CATEGORY_FALLBACK" | "DISTRIBUTOR" | "OWN_PHOTO";

export function ProductImagesEditor({ productId, images, imageStatus }: { productId: string; images: string[]; imageStatus: S }) {
  const [list, setList] = React.useState(images);
  const [status, setStatus] = React.useState<S>(imageStatus);
  const [busy, setBusy] = React.useState(false);
  return (
    <div className="space-y-3">
      <Uploader purpose="product" max={10} accept="image/jpeg,image/png,image/webp" value={list} onChange={setList} label="Product photos (official pack shots or your own photos – never copied images)" hint="First image is the main image. JPG/PNG/WebP, max 5 MB. See docs/PHOTO_GUIDE.md." />
      <div className="flex flex-wrap items-center gap-2">
        <select value={status} onChange={(e) => setStatus(e.target.value as S)} className={inputCls} aria-label="Image source">
          <option value="DISTRIBUTOR">Source: distributor / brand pack shot</option>
          <option value="OWN_PHOTO">Source: own photo</option>
          <option value="CATEGORY_FALLBACK">No photo – category illustration</option>
        </select>
        <button
          type="button"
          className={btnCls}
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              await saveImages(productId, list, status);
              toast.success("Images saved");
            } catch {
              toast.error("Could not save images");
            }
            setBusy(false);
          }}
        >
          Save images
        </button>
      </div>
    </div>
  );
}
