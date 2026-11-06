/** @type {import('tailwindcss').Config} */
const v = (name) => `rgb(var(--${name}) / <alpha-value>)`;

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      // Colours come from the active palette (CSS variables, see index.css): the screens are the
      // same whatever palette the player picks.
      colors: {
        night: { DEFAULT: v("night"), 2: v("night-2"), 3: v("night-3"), 4: v("night-4") },
        line: v("line"),
        /** The outline of what can be touched (3:1); line stays for rules and dividers. */
        edge: v("edge"),
        cream: { DEFAULT: v("cream"), dim: v("cream-dim") },
        muted: v("muted"),
        /** Text on gold or lagoon fills. */
        ink: v("ink"),
        "on-lagoon": v("on-lagoon"),
        gold: { DEFAULT: v("gold"), deep: v("gold-deep"), soft: v("gold-soft") },
        lagoon: { DEFAULT: v("lagoon"), deep: v("lagoon-deep"), soft: v("lagoon-soft") },
        vermilion: { DEFAULT: v("vermilion"), deep: v("vermilion-deep") },
        /** Selection, the guide, the active tab: never money nor a gain. */
        info: { DEFAULT: v("info"), deep: v("info-deep") },
        /** The one action's red (Porcellana), and the badges that ask to be touched. */
        face: {
          DEFAULT: "rgb(var(--face, var(--vermilion)) / <alpha-value>)",
          deep: "rgb(var(--face-deep, var(--vermilion-deep)) / <alpha-value>)",
        },
        /** A rumour or the auctions on the map: their halo and dot (refonte UX). */
        rumour: v("rumour"),
      },
      fontFamily: {
        // The playful Porcellana (docs/plan-porcellana.md D4 bis, 6 November 2026): a round, heavy
        // face for names, titles, figures and buttons; a plain modern grotesque for the rest.
        display: ["Nunito", "Segoe UI", "system-ui", "sans-serif"],
        sans: ["Manrope", "Segoe UI", "system-ui", "sans-serif"],
        mono: ["Manrope", "Segoe UI", "system-ui", "sans-serif"],
        place: ["Nunito", "Segoe UI", "system-ui", "sans-serif"],
      },
      keyframes: {
        floaty: {
          "0%,100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-6px)" },
        },
        rise: {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "none" },
        },
        fade: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        sheet: {
          "0%": { transform: "translateY(100%)" },
          "100%": { transform: "none" },
        },
        pop: {
          "0%": { opacity: "0", transform: "scale(0.96)" },
          "100%": { opacity: "1", transform: "none" },
        },
      },
      animation: {
        floaty: "floaty 4s ease-in-out infinite",
        rise: "rise 0.35s ease-out both",
        fade: "fade 0.2s ease-out both",
        // Decelerating curve: windows arrive fast and settle, never bounce.
        sheet: "sheet 0.28s cubic-bezier(0.22, 1, 0.36, 1) both",
        pop: "pop 0.2s cubic-bezier(0.22, 1, 0.36, 1) both",
      },
    },
  },
  plugins: [],
};
