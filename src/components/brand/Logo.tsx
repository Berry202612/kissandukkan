import { cn } from "@/lib/utils";

/** Shop awning (3 scallops) over a seedling whose stem forms the letter K. */
export function LogoIcon({ className, title = "KissanDukkan" }: { className?: string; title?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} {...(title ? { role: "img", "aria-label": title } : { "aria-hidden": true })}>
      <rect x="4" y="4" width="56" height="6" rx="3" fill="#14502A" />
      <path d="M6 9H23.3V20A8.65 8.65 0 0 1 6 20Z" fill="#1E6B3A" />
      <path d="M23.3 9H40.7V20A8.7 8.7 0 0 1 23.3 20Z" fill="#F4B400" />
      <path d="M40.7 9H58V20A8.65 8.65 0 0 1 40.7 20Z" fill="#1E6B3A" />
      <path d="M22 60V32" stroke="#1E6B3A" strokeWidth="6" strokeLinecap="round" />
      <path d="M24 45C27 35 34 30 45 30C43 40 36 45 24 45Z" fill="#1E6B3A" />
      <path d="M24 46C34 46 41 51 44 60H33C29 57 26 52 24 46Z" fill="#F4B400" stroke="#14502A" strokeWidth="1.2" strokeLinejoin="round" />
      <path d="M14 61H50" stroke="#14502A" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

export function Logo({ className, variant = "default", showHindi = false }: { className?: string; variant?: "default" | "white"; showHindi?: boolean }) {
  const white = variant === "white";
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <LogoIcon className="h-10 w-10 shrink-0" title="" />
      <span className="flex flex-col leading-none">
        {/* Logotype as SVG text: "Kissan" in Khet Green, "Dukkan" in Harvest Gold with a thin dark outline */}
        <svg viewBox="0 0 172 34" className="h-[30px] w-[152px] shrink-0" role="img" aria-label="KissanDukkan">
          <text x="1" y="26" textLength="168" lengthAdjust="spacingAndGlyphs" fontFamily="var(--font-baloo), 'Baloo 2', system-ui, sans-serif" fontSize="29" fontWeight="700">
            <tspan fill={white ? "#FFFFFF" : "#1E6B3A"}>Kissan</tspan>
            <tspan fill="#F4B400" stroke={white ? "none" : "#14502A"} strokeWidth="0.7" paintOrder="stroke">
              Dukkan
            </tspan>
          </text>
        </svg>
        {showHindi && (
          // System font on purpose: keeps the Devanagari web font off English pages
          <span className={cn("text-xs font-semibold", white ? "text-white/80" : "text-soil")} style={{ fontFamily: "system-ui, sans-serif" }}>
            किसान दुकान
          </span>
        )}
      </span>
    </span>
  );
}
