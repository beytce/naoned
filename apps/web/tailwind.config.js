/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  darkMode: "media",
  theme: {
    extend: {
      colors: {
        parchment: { DEFAULT: "#f7f0e1", dark: "#1c1712" },
        ink: { DEFAULT: "#2b2118", light: "#f3ead8" },
        rust: { DEFAULT: "#7c2d12", light: "#c2410c" },
        gold: "#b8860b",
      },
      fontFamily: {
        serif: ["Georgia", "Cambria", "Times New Roman", "serif"],
      },
    },
  },
  plugins: [],
};
