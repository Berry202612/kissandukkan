"use client";

import * as React from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { isDemoImage } from "@/lib/demo-images";
import { ProductImage } from "./ProductImage";

export function ProductGallery({ images, alt, categorySlug, genericNote }: { images: string[]; alt: string; categorySlug: string; genericNote: string }) {
  const [active, setActive] = React.useState(0);
  const [zoom, setZoom] = React.useState<{ x: number; y: number } | null>(null);
  if (!images.length) {
    return (
      <div>
        <ProductImage alt={alt} categorySlug={categorySlug} className="rounded-3xl border border-line" />
        <p className="mt-2 text-center text-xs text-muted">{genericNote}</p>
      </div>
    );
  }
  const src = images[active];
  const demo = isDemoImage(src);
  const zoomStyle = zoom ? { transform: "scale(2)", transformOrigin: `${zoom.x}% ${zoom.y}%` } : undefined;
  return (
    <div>
      <div
        className="relative aspect-square cursor-zoom-in overflow-hidden rounded-3xl border border-line bg-white"
        onMouseMove={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          setZoom({ x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 });
        }}
        onMouseLeave={() => setZoom(null)}
      >
        {demo ? (
          // eslint-disable-next-line @next/next/no-img-element -- demo photo linked from its source site
          <img src={src} alt={alt} referrerPolicy="no-referrer" className="absolute inset-0 h-full w-full object-contain p-4 transition-transform duration-150" style={zoomStyle} />
        ) : (
          <Image src={src} alt={alt} fill priority sizes="(max-width: 768px) 100vw, 45vw" className="object-contain p-4 transition-transform duration-150" style={zoomStyle} />
        )}
      </div>
      {images.length > 1 && (
        <div className="no-scrollbar mt-3 flex gap-2 overflow-x-auto">
          {images.map((img, i) => (
            <button key={img} type="button" onClick={() => setActive(i)} className={cn("relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border-2 bg-white", i === active ? "border-primary" : "border-line")} aria-label={`Image ${i + 1}`}>
              {isDemoImage(img) ? (
                // eslint-disable-next-line @next/next/no-img-element -- demo photo
                <img src={img} alt="" referrerPolicy="no-referrer" className="h-full w-full object-contain p-1" />
              ) : (
                <Image src={img} alt="" fill sizes="64px" className="object-contain p-1" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
