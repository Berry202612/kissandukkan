"use client";

import * as React from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Illustration } from "@/components/brand/Illustration";
import { cn } from "@/lib/utils";

export type Slide = { id: string; title: string; subtitle: string; cta: string; href: string; illustration: string; imageUrl: string | null; theme: string };

const themes: Record<string, string> = {
  green: "bg-primary text-white",
  gold: "bg-accent text-ink",
  soil: "bg-soil text-white",
};

const fadeFrom: Record<string, string> = { green: "from-primary", gold: "from-accent", soil: "from-soil" };

export function HeroCarousel({ slides }: { slides: Slide[] }) {
  const [i, setI] = React.useState(0);
  const [paused, setPaused] = React.useState(false);
  React.useEffect(() => {
    if (paused || slides.length < 2) return;
    const id = setInterval(() => setI((x) => (x + 1) % slides.length), 6000);
    return () => clearInterval(id);
  }, [paused, slides.length]);
  if (!slides.length) return null;
  const s = slides[i];
  const go = (d: number) => setI((x) => (x + d + slides.length) % slides.length);

  return (
    <section className="container pt-4" aria-roledescription="carousel" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
      <div className={cn("relative overflow-hidden rounded-3xl", themes[s.theme] ?? themes.green)}>
        <div className="grid min-h-[260px] items-center gap-4 px-6 py-8 md:min-h-[340px] md:grid-cols-[1.2fr_1fr] md:px-12">
          <div className="relative z-10 max-w-xl" aria-live="polite">
            <h1 className={cn("font-heading text-3xl font-bold leading-tight md:text-5xl", s.theme === "gold" ? "text-primary-dark" : "text-white")}>{s.title}</h1>
            <p className="mt-3 text-base opacity-90 md:text-lg">{s.subtitle}</p>
            <Link
              href={s.href}
              className={cn(
                "mt-6 inline-flex h-12 items-center rounded-xl px-6 font-semibold shadow-sm",
                s.theme === "gold" ? "bg-primary text-white hover:bg-primary-dark" : "bg-accent text-ink hover:bg-accent-dark",
              )}
            >
              {s.cta}
            </Link>
          </div>
          {!s.imageUrl && (
            <div className="relative hidden h-full min-h-[220px] md:block">
              <Illustration name={s.illustration} className={cn("absolute inset-0 m-auto h-56 w-56", s.theme === "gold" ? "text-primary-dark/70" : "text-white/80")} strokeWidth={2.2} />
            </div>
          )}
        </div>
        {s.imageUrl ? (
          <>
            {/* Creative artwork: right half on desktop, a strip under the text on phones */}
            <div className="relative h-40 w-full md:absolute md:inset-y-0 md:right-0 md:h-auto md:w-[46%]">
              {s.imageUrl.endsWith(".svg") ? (
                // eslint-disable-next-line @next/next/no-img-element -- local SVG artwork
                <img src={s.imageUrl} alt="" className="h-full w-full object-cover" fetchPriority={i === 0 ? "high" : "auto"} />
              ) : (
                <Image src={s.imageUrl} alt="" fill className="object-cover" sizes="(max-width: 768px) 100vw, 46vw" priority={i === 0} />
              )}
              <div className={cn("pointer-events-none absolute inset-y-0 left-0 hidden w-24 bg-gradient-to-r md:block", fadeFrom[s.theme] ?? fadeFrom.green)} />
            </div>
          </>
        ) : (
          <Illustration name="field" className="pointer-events-none absolute -bottom-10 -left-6 h-40 w-40 opacity-10 md:hidden" />
        )}
        {slides.length > 1 && (
          <>
            <button type="button" onClick={() => go(-1)} className="tap absolute left-2 top-1/2 hidden -translate-y-1/2 items-center justify-center rounded-full bg-white/20 hover:bg-white/30 md:inline-flex" aria-label="Previous slide">
              <ChevronLeft />
            </button>
            <button type="button" onClick={() => go(1)} className="tap absolute right-2 top-1/2 hidden -translate-y-1/2 items-center justify-center rounded-full bg-white/20 hover:bg-white/30 md:inline-flex" aria-label="Next slide">
              <ChevronRight />
            </button>
            <div className="absolute bottom-1 left-1/2 flex -translate-x-1/2 gap-1">
              {slides.map((sl, idx) => (
                <button
                  key={sl.id}
                  type="button"
                  onClick={() => setI(idx)}
                  aria-label={`Slide ${idx + 1}`}
                  aria-current={idx === i}
                  className="flex h-10 w-10 items-center justify-center"
                >
                  <span className={cn("block h-2 rounded-full transition-all", idx === i ? "w-6 bg-current" : "w-2 bg-current opacity-40")} />
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
