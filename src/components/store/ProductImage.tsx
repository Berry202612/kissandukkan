import Image from "next/image";
import { Illustration, categoryFallback } from "@/components/brand/Illustration";
import { isDemoImage } from "@/lib/demo-images";
import { cn } from "@/lib/utils";

/** Real product photo, a clearly-labelled demo photo, or a generic unbranded category illustration. */
export function ProductImage({
  src,
  alt,
  categorySlug,
  className,
  sizes = "(max-width: 768px) 50vw, 25vw",
  priority,
}: {
  src?: string | null;
  alt: string;
  categorySlug: string;
  className?: string;
  sizes?: string;
  priority?: boolean;
}) {
  if (src && isDemoImage(src)) {
    return (
      <div className={cn("relative aspect-square overflow-hidden rounded-xl bg-white", className)}>
        {/* eslint-disable-next-line @next/next/no-img-element -- demo photo linked from its source site */}
        <img src={src} alt={alt} loading={priority ? "eager" : "lazy"} referrerPolicy="no-referrer" className="h-full w-full object-contain p-2" />
      </div>
    );
  }
  if (src) {
    return (
      <div className={cn("relative aspect-square overflow-hidden rounded-xl bg-white", className)}>
        <Image src={src} alt={alt} fill sizes={sizes} className="object-contain p-2" priority={priority} />
      </div>
    );
  }
  return (
    <div className={cn("relative flex aspect-square items-center justify-center overflow-hidden rounded-xl bg-primary-light/60", className)} role="img" aria-label={alt}>
      <Illustration name={categoryFallback[categorySlug] ?? "sprout"} className="h-1/2 w-1/2 text-primary/70" strokeWidth={2.5} />
    </div>
  );
}
