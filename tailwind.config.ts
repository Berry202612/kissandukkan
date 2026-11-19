import type { Config } from "tailwindcss";
import typography from "@tailwindcss/typography";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    container: { center: true, padding: { DEFAULT: "1rem", lg: "2rem" }, screens: { "2xl": "1320px" } },
    extend: {
      colors: {
        primary: { DEFAULT: "#1E6B3A", dark: "#14502A", light: "#E8F3EC", foreground: "#FFFFFF" },
        accent: { DEFAULT: "#F4B400", dark: "#C99300", light: "#FDF3D3", foreground: "#1C2420" },
        soil: { DEFAULT: "#7A4E2D", light: "#F3E9DF" },
        cream: "#FBF8F1",
        ink: "#1C2420",
        muted: "#56655B",
        line: "#E4DFD3",
        danger: "#C62828",
        success: "#2E7D32",
      },
      fontFamily: {
        heading: ["var(--font-baloo)", "var(--font-noto-deva)", "system-ui", "sans-serif"],
        sans: ["var(--font-noto)", "var(--font-noto-deva)", "system-ui", "sans-serif"],
      },
      borderRadius: { "2xl": "1rem", "3xl": "1.5rem" },
      boxShadow: {
        soft: "0 1px 2px rgba(28,36,32,0.04), 0 4px 16px rgba(28,36,32,0.06)",
        lift: "0 2px 4px rgba(28,36,32,0.06), 0 12px 32px rgba(28,36,32,0.10)",
      },
      typography: {
        DEFAULT: {
          css: {
            "--tw-prose-body": "#1C2420",
            "--tw-prose-headings": "#14502A",
            "--tw-prose-links": "#1E6B3A",
            "--tw-prose-bullets": "#7A4E2D",
            h2: { fontFamily: "var(--font-baloo)" },
            h3: { fontFamily: "var(--font-baloo)" },
          },
        },
      },
    },
  },
  plugins: [typography],
};
export default config;
