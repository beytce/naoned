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
        cream: { DEFAULT: v("cream"), dim: v("cream-dim") },
        muted: v("muted"),
        /** Text on gold or lagoon fills. */
        ink: v("ink"),
        "on-lagoon": v("on-lagoon"),
        gold: { DEFAULT: v("gold"), deep: v("gold-deep"), soft: v("gold-soft") },
        lagoon: { DEFAULT: v("lagoon"), deep: v("lagoon-deep"), soft: v("lagoon-soft") },
        vermilion: { DEFAULT: v("vermilion"), deep: v("vermilion-deep") },
      },
      fontFamily: {
        display: ["Archivo Variable", "Archivo", "system-ui", "sans-serif"],
        sans: ["Space Grotesk", "system-ui", "sans-serif"],
        mono: ["Space Mono", "ui-monospace", "monospace"],
      },
      keyframes: {
        floaty: {
          "0%,100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-6px)" },
        },
        pulsering: {
          "0%": { boxShadow: "0 0 0 0 rgb(var(--gold) / 0.7)" },
          "100%": { boxShadow: "0 0 0 14px rgb(var(--gold) / 0)" },
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
        screen: {
          "0%": { opacity: "0", transform: "translateY(6px)" },
          "100%": { opacity: "1", transform: "none" },
        },
        "screen-right": {
          "0%": { opacity: "0", transform: "translateX(28px)" },
          "100%": { opacity: "1", transform: "none" },
        },
        "screen-left": {
          "0%": { opacity: "0", transform: "translateX(-28px)" },
          "100%": { opacity: "1", transform: "none" },
        },
        bump: {
          "0%,100%": { transform: "scale(1)" },
          "40%": { transform: "scale(1.12)" },
        },
      },
      animation: {
        floaty: "floaty 4s ease-in-out infinite",
        pulsering: "pulsering 1.4s ease-out infinite",
        rise: "rise 0.35s ease-out both",
        fade: "fade 0.2s ease-out both",
        // Decelerating curve: windows arrive fast and settle, never bounce.
        sheet: "sheet 0.28s cubic-bezier(0.22, 1, 0.36, 1) both",
        pop: "pop 0.2s cubic-bezier(0.22, 1, 0.36, 1) both",
        screen: "screen 0.22s cubic-bezier(0.22, 1, 0.36, 1) both",
        // A section slides in from the side of the tab one comes from.
        "screen-right": "screen-right 0.32s cubic-bezier(0.22, 1, 0.36, 1) both",
        "screen-left": "screen-left 0.32s cubic-bezier(0.22, 1, 0.36, 1) both",
        bump: "bump 0.35s ease-out",
      },
    },
  },
  plugins: [],
};
