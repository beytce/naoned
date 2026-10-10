/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Night lagoon: the canvas.
        night: { DEFAULT: "#13101A", 2: "#1B1724", 3: "#241E2F", 4: "#2E2740" },
        line: "#3D3450",
        cream: { DEFAULT: "#F7EAD7", dim: "#C9BBA6" },
        muted: "#9C8FB0",
        // Ducat gold, lagoon turquoise, Venetian vermilion.
        gold: { DEFAULT: "#F4B740", deep: "#C68618", soft: "#F9D88E" },
        lagoon: { DEFAULT: "#2FC6B4", deep: "#168A7E", soft: "#9FEBE0" },
        vermilion: { DEFAULT: "#EF5A4C", deep: "#B23A2F" },
      },
      fontFamily: {
        display: ["Unbounded", "system-ui", "sans-serif"],
        sans: ["Space Grotesk", "system-ui", "sans-serif"],
        mono: ["Space Mono", "ui-monospace", "monospace"],
      },
      keyframes: {
        floaty: {
          "0%,100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-6px)" },
        },
        pulsering: {
          "0%": { boxShadow: "0 0 0 0 rgba(244,183,64,0.7)" },
          "100%": { boxShadow: "0 0 0 14px rgba(244,183,64,0)" },
        },
        shine: {
          "0%": { backgroundPosition: "200% 0" },
          "100%": { backgroundPosition: "-200% 0" },
        },
        rise: {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "none" },
        },
      },
      animation: {
        floaty: "floaty 4s ease-in-out infinite",
        pulsering: "pulsering 1.4s ease-out infinite",
        shine: "shine 6s linear infinite",
        rise: "rise 0.35s ease-out both",
      },
    },
  },
  plugins: [],
};
