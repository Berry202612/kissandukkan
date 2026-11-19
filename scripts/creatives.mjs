// Generates ORIGINAL flat-style SVG creatives (homepage banners + category headers) into /public/creatives.
// Run: node scripts/creatives.mjs
import fs from "fs";
import path from "path";

const out = path.join(process.cwd(), "public", "creatives");
fs.mkdirSync(out, { recursive: true });

const C = { green: "#1E6B3A", dark: "#14502A", light: "#E8F3EC", gold: "#F4B400", goldL: "#FDF3D3", soil: "#7A4E2D", soilL: "#F3E9DF", cream: "#FBF8F1", sky: "#DCEFE3", white: "#FFFFFF" };

const sun = (x, y, r, c = C.gold) =>
  `<circle cx="${x}" cy="${y}" r="${r}" fill="${c}"/>` +
  Array.from({ length: 12 }, (_, i) => {
    const a = (i * Math.PI) / 6;
    return `<line x1="${x + Math.cos(a) * (r + 10)}" y1="${y + Math.sin(a) * (r + 10)}" x2="${x + Math.cos(a) * (r + 26)}" y2="${y + Math.sin(a) * (r + 26)}" stroke="${c}" stroke-width="6" stroke-linecap="round"/>`;
  }).join("");

const hills = (w, h, cols) =>
  cols.map((c, i) => {
    const y = h * (0.55 + i * 0.13);
    return `<path d="M0 ${y} C ${w * 0.25} ${y - 60 + i * 15}, ${w * 0.55} ${y + 40}, ${w} ${y - 30 + i * 10} L ${w} ${h} L 0 ${h} Z" fill="${c}"/>`;
  }).join("");

const wheat = (x, y, s = 1, c = C.gold) => {
  let g = `<g transform="translate(${x} ${y}) scale(${s})"><path d="M0 0 V-120" stroke="${C.soil}" stroke-width="4" stroke-linecap="round"/>`;
  for (let i = 0; i < 6; i++) {
    const yy = -40 - i * 14;
    g += `<ellipse cx="-9" cy="${yy}" rx="7" ry="13" transform="rotate(-30 -9 ${yy})" fill="${c}"/><ellipse cx="9" cy="${yy}" rx="7" ry="13" transform="rotate(30 9 ${yy})" fill="${c}"/>`;
  }
  return g + `<ellipse cx="0" cy="-128" rx="6" ry="12" fill="${c}"/></g>`;
};

const plant = (x, y, s = 1, leaf = C.green, fruit = null) => {
  let g = `<g transform="translate(${x} ${y}) scale(${s})"><path d="M0 0 V-90" stroke="${C.dark}" stroke-width="5" stroke-linecap="round"/>`;
  g += `<path d="M0 -40 C -30 -45 -45 -70 -40 -85 C -15 -80 -2 -60 0 -40Z" fill="${leaf}"/>`;
  g += `<path d="M0 -60 C 30 -65 45 -90 40 -105 C 15 -100 2 -80 0 -60Z" fill="${leaf}"/>`;
  if (fruit) g += `<path d="M-6 -30 C -14 -10 -10 12 2 22 C 4 6 4 -12 -6 -30Z" fill="${fruit}"/><path d="M8 -52 C 18 -34 16 -14 6 -4 C 2 -20 2 -36 8 -52Z" fill="${fruit}"/>`;
  return g + "</g>";
};

const sprayer = (x, y, s = 1) => `<g transform="translate(${x} ${y}) scale(${s})">
<rect x="-45" y="-130" width="90" height="130" rx="18" fill="${C.green}"/><rect x="-25" y="-150" width="50" height="24" rx="6" fill="${C.dark}"/>
<rect x="-45" y="-80" width="90" height="14" fill="${C.gold}"/><path d="M45 -90 C 90 -90 100 -60 100 -20 L 100 10" stroke="${C.dark}" stroke-width="8" fill="none" stroke-linecap="round"/>
<path d="M100 10 L 140 40" stroke="${C.dark}" stroke-width="8" stroke-linecap="round"/>
${[0, 1, 2, 3, 4].map((i) => `<circle cx="${150 + i * 10}" cy="${48 + i * 6}" r="${4 - i * 0.5}" fill="${C.sky}"/>`).join("")}</g>`;

const shield = (x, y, s = 1) => `<g transform="translate(${x} ${y}) scale(${s})"><path d="M0 -70 L 55 -50 C 55 0 30 35 0 50 C -30 35 -55 0 -55 -50 Z" fill="${C.white}" stroke="${C.dark}" stroke-width="6"/><path d="M-22 -8 L -5 10 L 26 -24" stroke="${C.green}" stroke-width="10" fill="none" stroke-linecap="round" stroke-linejoin="round"/></g>`;

const drip = (w, y) => {
  let g = `<rect x="0" y="${y}" width="${w}" height="10" rx="5" fill="${C.dark}"/>`;
  for (let x = 60; x < w; x += 120) g += `<circle cx="${x}" cy="${y + 5}" r="9" fill="${C.soil}"/><path d="M${x} ${y + 22} c -8 12 -8 22 0 22 s 8 -10 0 -22z" fill="#5BA3D9"/>` + plant(x, y - 4, 0.8);
  return g;
};

const sack = (x, y, s = 1, label = C.gold) => `<g transform="translate(${x} ${y}) scale(${s})"><path d="M-50 -140 C -30 -130 30 -130 50 -140 L 40 -110 C 65 -80 75 -40 70 -10 C 66 18 40 30 0 30 C -40 30 -66 18 -70 -10 C -75 -40 -65 -80 -40 -110 Z" fill="${C.soilL}" stroke="${C.soil}" stroke-width="5"/><rect x="-40" y="-70" width="80" height="50" rx="10" fill="${label}"/><path d="M-22 -45 h44 M-22 -32 h28" stroke="${C.dark}" stroke-width="5" stroke-linecap="round"/></g>`;

const bottle = (x, y, s = 1, body = C.green) => `<g transform="translate(${x} ${y}) scale(${s})"><rect x="-14" y="-150" width="28" height="26" rx="5" fill="${C.dark}"/><path d="M-20 -124 h40 l 12 26 v 98 a 12 12 0 0 1 -12 12 h-40 a 12 12 0 0 1 -12 -12 v-98 z" fill="${body}"/><rect x="-26" y="-80" width="52" height="46" rx="6" fill="${C.white}"/><path d="M-14 -62 h28 M-14 -50 h18" stroke="${C.green}" stroke-width="5" stroke-linecap="round"/></g>`;

const packet = (x, y, s = 1) => `<g transform="translate(${x} ${y}) scale(${s})"><path d="M-45 -130 h90 v130 a8 8 0 0 1 -8 8 h-74 a8 8 0 0 1 -8 -8z" fill="${C.goldL}" stroke="${C.soil}" stroke-width="5"/><path d="M-45 -112 h90" stroke="${C.soil}" stroke-width="5"/>${plant(0, -20, 0.6)}</g>`;

const pot = (x, y, s = 1) => `<g transform="translate(${x} ${y}) scale(${s})"><path d="M-50 -50 h100 l-14 60 h-72 z" fill="${C.soil}"/><rect x="-58" y="-62" width="116" height="16" rx="5" fill="${C.soil}" opacity="0.85"/>${plant(0, -60, 0.9)}</g>`;

const can = (x, y, s = 1) => `<g transform="translate(${x} ${y}) scale(${s})"><rect x="-26" y="-150" width="52" height="20" rx="5" fill="#9AA5A0"/><path d="M-30 -130 h60 l-4 22 c20 12 26 26 26 48 v60 a10 10 0 0 1 -10 10 h-80 a10 10 0 0 1 -10 -10 v-60 c0 -22 6 -36 26 -48z" fill="#C9D1CC" stroke="#7E8A84" stroke-width="5"/><rect x="-46" y="-70" width="92" height="12" fill="${C.green}"/></g>`;

const glove = (x, y, s = 1) => `<g transform="translate(${x} ${y}) scale(${s})"><path d="M-30 30 V-30 l-14 -28 a8 8 0 0 1 14 -7 l10 20 V-110 a9 9 0 0 1 18 0 V-70 v-50 a9 9 0 0 1 18 0 v50 -42 a9 9 0 0 1 18 0 v46 -30 a9 9 0 0 1 18 0 v62 c0 34 -14 52 -34 58 v10z" fill="${C.gold}" stroke="${C.soil}" stroke-width="5" stroke-linejoin="round"/></g>`;

const tray = (x, y, s = 1) => `<g transform="translate(${x} ${y}) scale(${s})"><rect x="-90" y="-20" width="180" height="30" rx="6" fill="${C.dark}"/>${[-60, -20, 20, 60].map((px) => plant(px, -18, 0.45)).join("")}</g>`;

const svg = (w, h, bg, body) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" preserveAspectRatio="xMidYMid slice"><rect width="${w}" height="${h}" fill="${bg}"/>${body}</svg>`;

// ── Homepage banners (right-side art, 800×520) ──
const banners = {
  "banner-rabi.svg": svg(800, 520, C.sky, sun(640, 110, 48) + hills(800, 520, ["#BFDCC8", "#8CC09D", C.green]) + [90, 170, 250, 330, 410, 490, 570, 650, 730].map((x, i) => wheat(x, 470 + (i % 2) * 18, 1.05)).join("") + packet(170, 470, 0.95) + sack(660, 400, 0.9)),
  "banner-protection.svg": svg(800, 520, C.goldL, hills(800, 520, ["#F7DE8A", "#E9C35A", C.soil]) + [120, 260, 400].map((x) => plant(x, 470, 1.4, C.green, "#C62828")).join("") + sprayer(560, 430, 1.3) + shield(690, 160, 1.2) + bottle(480, 455, 0.75, C.dark)),
  "banner-irrigation.svg": svg(800, 520, "#E3F1F8", sun(680, 100, 40) + hills(800, 520, ["#CFE7D6", "#A7D1B4", "#7FB892"]) + drip(800, 300) + drip(800, 420) + `<rect x="40" y="150" width="70" height="120" rx="10" fill="${C.dark}"/><rect x="52" y="168" width="46" height="30" rx="4" fill="#5BA3D9"/>`),
};

// ── Category headers (1200×300, art on the right) ──
const scene = (bg, hillCols, art) => svg(1200, 300, bg, hills(1200, 300, hillCols) + art);
const cats = {
  seeds: scene(C.goldL, ["#F7DE8A", "#E9C35A"], packet(860, 240, 0.9) + packet(980, 250, 0.75) + [700, 760, 1080, 1140].map((x) => plant(x, 290, 0.7)).join("")),
  "crop-nutrition": scene(C.soilL, ["#E2CDB8", "#C9A882"], sack(900, 260, 0.9) + sack(1050, 270, 0.7, C.green) + plant(760, 290, 0.8)),
  "crop-protection": scene(C.light, ["#BFDCC8", "#8CC09D"], bottle(860, 270, 0.9) + bottle(960, 280, 0.75, C.dark) + shield(1090, 150, 0.9) + plant(740, 295, 0.8, C.green, "#C62828")),
  "plant-growth-regulators": scene(C.light, ["#CFE7D6", "#A7D1B4"], bottle(900, 270, 0.85, C.gold) + [760, 1040, 1120].map((x, i) => plant(x, 295, 0.6 + i * 0.15)).join("")),
  "organic-farming": scene("#EEF6E8", ["#CFE3BF", "#9CC583"], [720, 820, 920, 1020, 1120].map((x) => plant(x, 295, 0.9, "#4E8F3A")).join("") + sun(1100, 70, 26)),
  irrigation: scene("#E3F1F8", ["#CFE7D6", "#A7D1B4"], `<g transform="translate(600 0)">${drip(600, 200)}</g>`),
  "farm-tools-equipment": scene(C.light, ["#BFDCC8", "#8CC09D"], sprayer(880, 270, 0.9) + `<g transform="translate(1100 290)"><path d="M0 0 V-150" stroke="${C.soil}" stroke-width="8"/><path d="M-26 -150 h52" stroke="${C.soil}" stroke-width="8" stroke-linecap="round"/><path d="M-24 -10 h48 v-36 h-48z" fill="#9AA5A0"/></g>`),
  "gardening-nursery": scene(C.goldL, ["#F3DFA6", "#E3C77A"], pot(820, 270, 0.9) + pot(960, 275, 0.7) + tray(1100, 280, 0.7)),
  "animal-husbandry": scene(C.soilL, ["#E2CDB8", "#C9A882"], can(880, 280, 0.9) + sack(1040, 270, 0.7) + `<g transform="translate(740 270)"><ellipse cx="0" cy="-40" rx="70" ry="40" fill="${C.white}" stroke="${C.soil}" stroke-width="5"/><circle cx="-20" cy="-50" r="10" fill="${C.soil}"/><circle cx="25" cy="-35" r="14" fill="${C.soil}"/><path d="M-50 -10 v30 M-20 -5 v28 M25 -5 v28 M50 -10 v30" stroke="${C.soil}" stroke-width="8" stroke-linecap="round"/><ellipse cx="78" cy="-58" rx="22" ry="18" fill="${C.white}" stroke="${C.soil}" stroke-width="5"/></g>`),
  "protection-gear-farm-supplies": scene(C.goldL, ["#F7DE8A", "#E9C35A"], glove(860, 270, 0.9) + `<g transform="translate(1000 180)"><rect x="-40" y="-60" width="80" height="110" rx="6" fill="${C.gold}" stroke="${C.soil}" stroke-width="5"/>${[0, 1, 2].map((i) => `<circle cx="${-14 + i * 14}" cy="${-20 + i * 18}" r="4" fill="${C.dark}"/>`).join("")}</g>` + shield(1110, 160, 0.8)),
};

for (const [name, content] of Object.entries(banners)) fs.writeFileSync(path.join(out, name), content);
for (const [slug, content] of Object.entries(cats)) fs.writeFileSync(path.join(out, `category-${slug}.svg`), content);
console.log(`Wrote ${Object.keys(banners).length} banners and ${Object.keys(cats).length} category headers to public/creatives`);
