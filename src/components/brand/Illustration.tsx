import { cn } from "@/lib/utils";

const ray = (cx: number, cy: number, r1: number, r2: number, a: number, k: number) => (
  <path key={k} d={`M${(cx + r1 * Math.cos(a)).toFixed(1)} ${(cy + r1 * Math.sin(a)).toFixed(1)}L${(cx + r2 * Math.cos(a)).toFixed(1)} ${(cy + r2 * Math.sin(a)).toFixed(1)}`} />
);

/** Original, simple hand-drawn style line illustrations (brand line-art). */
const paths: Record<string, React.ReactNode> = {
  wheat: (
    <>
      <path d="M60 110V30" />
      {[38, 52, 66, 80].map((y) => (
        <g key={y}>
          <path d={`M60 ${y}c-10-2-16-9-17-18 10 1 16 8 17 18z`} />
          <path d={`M60 ${y}c10-2 16-9 17-18-10 1-16 8-17 18z`} />
        </g>
      ))}
      <path d="M60 30c-3-6-3-12 0-18 3 6 3 12 0 18z" />
    </>
  ),
  chilli: (
    <>
      <path d="M60 112V58" />
      <path d="M60 78c-14 0-24-8-26-20 14-2 24 6 26 20z" />
      <path d="M60 66c12-2 20-10 20-22-12 0-20 8-20 22z" />
      <path d="M48 88c-4 10-2 20 6 24 0-9 2-16-6-24z" />
      <path d="M72 84c6 8 6 18-2 24-2-8-4-14 2-24z" />
      <path d="M40 112h40" />
    </>
  ),
  drip: (
    <>
      <path d="M10 70h100" />
      {[25, 55, 85].map((x) => (
        <g key={x}>
          <path d={`M${x} 70v8`} />
          <path d={`M${x} 86c-4 6-4 10 0 10s4-4 0-10z`} />
          <path d={`M${x + 6} 66c0-12 6-22 14-26`} />
          <path d={`M${x + 20} 40c-6 2-8 8-6 12 6-2 8-6 6-12z`} />
        </g>
      ))}
      <path d="M6 104c20-6 88-6 108 0" />
    </>
  ),
  wheel: (
    <>
      <circle cx="60" cy="60" r="44" />
      <circle cx="60" cy="60" r="30" />
      <circle cx="60" cy="60" r="8" />
      {Array.from({ length: 12 }).map((_, i) => ray(60, 60, 44, 52, (i * Math.PI) / 6, i))}
      {Array.from({ length: 6 }).map((_, i) => ray(60, 60, 8, 30, (i * Math.PI) / 3, i + 20))}
    </>
  ),
  field: (
    <>
      <circle cx="84" cy="36" r="14" />
      {Array.from({ length: 8 }).map((_, i) => ray(84, 36, 19, 25, (i * Math.PI) / 4, i))}
      <path d="M4 74c30-10 80-10 112 0" />
      <path d="M8 90c24-8 80-8 104 0" />
      <path d="M14 106c20-6 72-6 92 0" />
      <path d="M30 74v-12M30 62c-5 0-8-4-8-8 5 0 8 4 8 8zM30 62c5 0 8-4 8-8-5 0-8 4-8 8z" />
      <path d="M58 72v-10M58 62c-5 0-8-4-8-8 5 0 8 4 8 8zM58 62c5 0 8-4 8-8-5 0-8 4-8 8z" />
    </>
  ),
  sprout: (
    <>
      <path d="M60 108V60" />
      <path d="M60 72c-18 0-30-10-32-28 18 0 30 10 32 28z" />
      <path d="M60 62c16-2 26-14 26-30-16 2-26 14-26 30z" />
      <path d="M30 108h60" />
      <path d="M38 108c2-8 10-12 22-12s20 4 22 12" />
    </>
  ),
  leaf: (
    <>
      <path d="M24 96c0-44 28-72 72-72 0 44-28 72-72 72z" />
      <path d="M24 96L80 40" />
      <path d="M44 76h18M56 64h16M44 76V58M56 64V48" />
    </>
  ),
  bottle: (
    <>
      <path d="M50 14h20v12H50z" />
      <path d="M48 26h24l6 14v62a8 8 0 0 1-8 8H50a8 8 0 0 1-8-8V40z" />
      <path d="M42 56h36v32H42" />
      <path d="M52 72c4-8 12-8 16 0" />
    </>
  ),
  dropper: (
    <>
      <path d="M54 12h12v14H54z" />
      <path d="M48 26h24v6l4 6v58a8 8 0 0 1-8 8H52a8 8 0 0 1-8-8V38l4-6z" />
      <path d="M60 58c-6 8-8 12-8 16a8 8 0 0 0 16 0c0-4-2-8-8-16z" />
    </>
  ),
  "seed-packet": (
    <>
      <path d="M30 18h60v84a6 6 0 0 1-6 6H36a6 6 0 0 1-6-6z" />
      <path d="M30 30h60" />
      <path d="M36 18l4-6h40l4 6" />
      <path d="M60 92V62M60 74c-10 0-16-6-17-14 10 0 16 6 17 14zM60 68c9-1 15-7 15-15-9 1-15 7-15 15z" />
    </>
  ),
  sack: (
    <>
      <path d="M38 22c8 4 36 4 44 0l-4 12c8 10 14 28 14 46 0 18-10 28-32 28S28 98 28 80c0-18 6-36 14-46z" />
      <path d="M42 34h36" />
      <path d="M46 72h28M46 82h20" />
      <path d="M50 62l4-6 4 6 4-6 4 6" />
    </>
  ),
  sprayer: (
    <>
      <path d="M40 36h36a8 8 0 0 1 8 8v50a10 10 0 0 1-10 10H42a10 10 0 0 1-10-10V44a8 8 0 0 1 8-8z" />
      <path d="M50 36V24h16v12" />
      <path d="M84 54c14 0 18 10 18 22v20" />
      <path d="M102 96l8 8M98 100l-4 6" />
      <path d="M32 60h52" />
    </>
  ),
  pot: (
    <>
      <path d="M30 66h60l-8 42H38z" />
      <path d="M26 58h68v8H26z" />
      <path d="M60 58V30M60 42c-10 0-16-6-18-16 10 0 16 6 18 16zM60 36c9-1 15-8 16-18-9 1-15 8-16 18z" />
    </>
  ),
  "milk-can": (
    <>
      <path d="M46 14h28v10H46z" />
      <path d="M44 24h32l-2 12c10 6 14 14 14 26v38a6 6 0 0 1-6 6H38a6 6 0 0 1-6-6V62c0-12 4-20 14-26z" />
      <path d="M34 58h52M34 90h52" />
    </>
  ),
  gloves: (
    <>
      <path d="M36 104V64l-8-18a5 5 0 0 1 9-4l7 14V24a5 5 0 0 1 10 0v26-34a5 5 0 0 1 10 0v34-28a5 5 0 0 1 10 0v30-20a5 5 0 0 1 10 0v40c0 20-8 32-20 36v6z" />
      <path d="M36 92h46" />
    </>
  ),
  tomato: (
    <>
      <circle cx="60" cy="70" r="34" />
      <path d="M60 36c-6-8-16-10-24-6 8 2 12 6 14 10M60 36c6-8 16-10 24-6-8 2-12 6-14 10M60 36V22" />
      <path d="M44 62c4-8 10-12 18-12" />
    </>
  ),
  cotton: (
    <>
      <path d="M60 112V78" />
      <circle cx="46" cy="52" r="14" />
      <circle cx="74" cy="52" r="14" />
      <circle cx="60" cy="36" r="14" />
      <path d="M36 66l24 12 24-12" />
    </>
  ),
  onion: (
    <>
      <path d="M60 30c22 18 34 34 34 52a34 26 0 0 1-68 0c0-18 12-34 34-52z" />
      <path d="M60 30V12M54 16l6-6 6 6" />
      <path d="M60 46c-10 12-14 24-14 36M60 46c10 12 14 24 14 36" />
      <path d="M50 108l-4 6M60 108v8M70 108l4 6" />
    </>
  ),
  grapes: (
    <>
      <path d="M60 30V14M60 22c8-8 18-8 24-4" />
      {[[48, 40], [72, 40], [36, 58], [60, 58], [84, 58], [48, 76], [72, 76], [60, 94]].map(([x, y]) => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r="11" />
      ))}
    </>
  ),
  banana: (
    <>
      <path d="M30 40c4 40 30 62 66 58 6-1 8-6 4-8-30 2-50-16-58-52-2-6-12-6-12 2z" />
      <path d="M30 40l-6-10" />
      <path d="M44 52c8 22 24 34 46 38" />
    </>
  ),
  sugarcane: (
    <>
      <path d="M48 112V20M72 112V30" />
      <path d="M44 44h8M44 70h8M44 94h8M68 54h8M68 80h8" />
      <path d="M48 24c-10-4-18-2-24 4M48 24c8-10 18-12 26-10M72 34c10-6 20-6 26-2" />
    </>
  ),
  soybean: (
    <>
      <path d="M36 92c-8-30 12-60 44-66 10-2 14 6 10 14-14 26-28 44-46 54-4 2-7 2-8-2z" />
      <circle cx="56" cy="74" r="6" />
      <circle cx="66" cy="58" r="6" />
      <circle cx="76" cy="42" r="6" />
    </>
  ),
  paddy: (
    <>
      <path d="M60 112V40c0-12 8-22 20-26" />
      {[[70, 26], [64, 40], [62, 56], [60, 72]].map(([x, y], k) => (
        <g key={k}>
          <path d={`M${x} ${y}c8-2 14 0 18 6-8 2-14 0-18-6z`} />
          <path d={`M${x - 2} ${y + 4}c-8-2-14 0-18 6 8 2 14 0 18-6z`} />
        </g>
      ))}
      <path d="M40 112c6-14 14-22 20-24M80 112c-6-14-14-22-20-24" />
    </>
  ),
  spade: (
    <>
      <path d="M60 10v58" />
      <path d="M50 10h20" />
      <path d="M44 68h32v18c0 12-8 22-16 24-8-2-16-12-16-24z" />
    </>
  ),
};

export const illustrationKeys = Object.keys(paths);

export function Illustration({ name, className, strokeWidth = 3 }: { name: string; className?: string; strokeWidth?: number }) {
  const content = paths[name] ?? paths.sprout;
  return (
    <svg
      viewBox="0 0 120 120"
      className={cn("text-primary", className)}
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {content}
    </svg>
  );
}

/** Category → generic, unbranded fallback illustration for products without a real photo. */
export const categoryFallback: Record<string, string> = {
  seeds: "seed-packet",
  "crop-nutrition": "sack",
  "crop-protection": "bottle",
  "plant-growth-regulators": "dropper",
  "organic-farming": "leaf",
  irrigation: "drip",
  "farm-tools-equipment": "sprayer",
  "gardening-nursery": "pot",
  "animal-husbandry": "milk-can",
  "protection-gear-farm-supplies": "gloves",
};
