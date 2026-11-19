import localFont from "next/font/local";

/*
 * Self-hosted Google Fonts (SIL Open Font License): Baloo 2, Noto Sans, Noto Sans Devanagari.
 * Only the subsets we use are declared, with explicit unicode ranges. Google's latin-ext and devanagari
 * subsets both include the ₹ sign (U+20B9), so with next/font/google every price on a page pulled
 * ~380 KB of extra fonts. Here ₹ falls back to the system font (all phones ship it) instead.
 * - Hindi/Devanagari font downloads only on pages that contain Devanagari text (not preloaded).
 * - display "optional": text paints at once with the fallback on slow networks; the font is cached for later pages.
 */

const baloo = localFont({
  src: [{ path: "./fonts/baloo2-latin-700.woff2", weight: "700", style: "normal" }],
  variable: "--font-baloo",
  display: "swap", // small preloaded heading font: keep the brand look on first visit
  declarations: [{ prop: "unicode-range", value: "U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD" }],
  fallback: ["system-ui", "sans-serif"],
});

const noto = localFont({
  src: [{ path: "./fonts/notosans-latin-var.woff2", weight: "100 900", style: "normal" }],
  variable: "--font-noto",
  display: "optional",
  declarations: [{ prop: "unicode-range", value: "U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD" }],
  fallback: ["system-ui", "sans-serif"],
});

const notoDeva = localFont({
  src: [{ path: "./fonts/notosansdevanagari-devanagari-var.woff2", weight: "100 900", style: "normal" }],
  variable: "--font-noto-deva",
  display: "optional",
  preload: false,
  declarations: [{ prop: "unicode-range", value: "U+0900-097F, U+1CD0-1CF4, U+1CF7-1CF9, U+200C-200D, U+20F0, U+25CC, U+A830-A839, U+A8E0-A8FF, U+11B00-11B0A" }],
  fallback: ["system-ui", "sans-serif"],
});

export const fontVars = `${baloo.variable} ${noto.variable} ${notoDeva.variable}`;
