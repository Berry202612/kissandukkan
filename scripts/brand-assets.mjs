// Generates /public logo files, favicons and the OpenGraph image from the hand-coded SVG logo.
// Run: node scripts/brand-assets.mjs   (uses sharp, bundled with Next.js)
import fs from "fs";
import path from "path";
import sharp from "sharp";

const pub = path.join(process.cwd(), "public");
fs.mkdirSync(pub, { recursive: true });

const ICON = `<rect x="4" y="4" width="56" height="6" rx="3" fill="#14502A"/>
<path d="M6 9H23.3V20A8.65 8.65 0 0 1 6 20Z" fill="#1E6B3A"/>
<path d="M23.3 9H40.7V20A8.7 8.7 0 0 1 23.3 20Z" fill="#F4B400"/>
<path d="M40.7 9H58V20A8.65 8.65 0 0 1 40.7 20Z" fill="#1E6B3A"/>
<path d="M22 60V32" stroke="#1E6B3A" stroke-width="6" stroke-linecap="round"/>
<path d="M24 45C27 35 34 30 45 30C43 40 36 45 24 45Z" fill="#1E6B3A"/>
<path d="M24 46C34 46 41 51 44 60H33C29 57 26 52 24 46Z" fill="#F4B400" stroke="#14502A" stroke-width="1.2" stroke-linejoin="round"/>
<path d="M14 61H50" stroke="#14502A" stroke-width="2.5" stroke-linecap="round"/>`;

const FONT = "'Baloo 2', 'Baloo', 'Arial Rounded MT Bold', Arial, sans-serif";
const icon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">${ICON}</svg>`;
const wordmark = (white) => `<text x="76" y="44" font-family="${FONT}" font-size="34" font-weight="700"><tspan fill="${white ? "#FFFFFF" : "#1E6B3A"}">Kissan</tspan><tspan fill="#F4B400" ${white ? "" : 'stroke="#14502A" stroke-width="0.8" paint-order="stroke"'}>Dukkan</tspan></text>`;
const logo = (white) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 64" width="300" height="64">${white ? `<rect x="2" y="2" width="60" height="60" rx="12" fill="#FFFFFF"/>` : ""}<g>${ICON}</g>${wordmark(white)}</svg>`;
const stacked = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 150" width="220" height="150"><g transform="translate(78 4)">${ICON}</g>
<text x="110" y="102" text-anchor="middle" font-family="${FONT}" font-size="32" font-weight="700"><tspan fill="#1E6B3A">Kissan</tspan><tspan fill="#F4B400" stroke="#14502A" stroke-width="0.8" paint-order="stroke">Dukkan</tspan></text>
<text x="110" y="132" text-anchor="middle" font-family="${FONT}, 'Noto Sans Devanagari'" font-size="20" font-weight="600" fill="#7A4E2D">किसान दुकान</text></svg>`;

fs.writeFileSync(path.join(pub, "icon.svg"), icon);
fs.writeFileSync(path.join(pub, "logo.svg"), logo(false));
fs.writeFileSync(path.join(pub, "logo-white.svg"), logo(true));
fs.writeFileSync(path.join(pub, "logo-stacked.svg"), stacked);

const png = (svg, size, bg) =>
  sharp(Buffer.from(svg), { density: 600 })
    .resize(size, size, { fit: "contain", background: bg ?? { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();

const sizes = [16, 32, 48];
const pngs = [];
for (const s of sizes) {
  const b = await png(icon, s);
  pngs.push(b);
  fs.writeFileSync(path.join(pub, `favicon-${s}x${s}.png`), b);
}
// ICO container with embedded PNG images
const header = Buffer.alloc(6);
header.writeUInt16LE(0, 0);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(pngs.length, 4);
let offset = 6 + 16 * pngs.length;
const dir = pngs.map((b, i) => {
  const e = Buffer.alloc(16);
  e.writeUInt8(sizes[i], 0);
  e.writeUInt8(sizes[i], 1);
  e.writeUInt8(0, 2);
  e.writeUInt8(0, 3);
  e.writeUInt16LE(1, 4);
  e.writeUInt16LE(32, 6);
  e.writeUInt32LE(b.length, 8);
  e.writeUInt32LE(offset, 12);
  offset += b.length;
  return e;
});
fs.writeFileSync(path.join(pub, "favicon.ico"), Buffer.concat([header, ...dir, ...pngs]));

const appleSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 180 180"><rect width="180" height="180" rx="36" fill="#FBF8F1"/><g transform="translate(26 22) scale(2)">${ICON}</g></svg>`;
await sharp(Buffer.from(appleSvg), { density: 300 }).resize(180, 180).png().toFile(path.join(pub, "apple-touch-icon.png"));

// OpenGraph 1200×630: brand green panel, logo, bilingual tagline, simple original field line-art
const og = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
<rect width="1200" height="630" fill="#FBF8F1"/>
<rect x="0" y="0" width="1200" height="630" fill="#1E6B3A"/>
<g fill="none" stroke="#FFFFFF" stroke-opacity="0.18" stroke-width="6" stroke-linecap="round">
  <circle cx="1010" cy="170" r="70"/><path d="M700 470c160-50 400-50 520 0M740 530c140-40 360-40 480 0M800 590c120-30 300-30 400 0"/>
  <path d="M880 470v-60M880 410c-25 0-40-20-40-40 25 0 40 20 40 40zM880 410c25 0 40-20 40-40-25 0-40 20-40 40z"/>
</g>
<rect x="80" y="150" width="150" height="150" rx="32" fill="#FBF8F1"/>
<g transform="translate(95 165) scale(1.875)">${ICON}</g>
<text x="260" y="250" font-family="${FONT}" font-size="96" font-weight="700"><tspan fill="#FFFFFF">Kissan</tspan><tspan fill="#F4B400">Dukkan</tspan></text>
<text x="84" y="390" font-family="${FONT}, 'Noto Sans Devanagari'" font-size="46" font-weight="600" fill="#FFFFFF">खेती का हर सामान, एक भरोसेमंद दुकान</text>
<text x="84" y="450" font-family="Arial, sans-serif" font-size="34" fill="#E8F3EC">Every farm need, one trusted shop</text>
<rect x="84" y="500" width="540" height="56" rx="14" fill="#F4B400"/>
<text x="110" y="537" font-family="Arial, sans-serif" font-size="26" font-weight="700" fill="#1C2420">Genuine agri-inputs · Never above MRP</text>
</svg>`;
await sharp(Buffer.from(og)).png().toFile(path.join(pub, "og.png"));
console.log("Brand assets written to /public");
