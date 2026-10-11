import { store } from "./game/store.js";

/** The three palettes of the identity guide; the first one is the default. */
export const PALETTES = [
  { id: "lagune", name: "Lagune & Ducat", swatch: ["#0F1B1E", "#E0AD4B", "#6DB3A2", "#E2694F"] },
  { id: "pourpre", name: "Pourpre du Doge", swatch: ["#1C1016", "#DDB054", "#6FB5AA", "#F07A5C"] },
  {
    id: "parchemin",
    name: "Parchemin & Lapis",
    swatch: ["#F3E9D4", "#C9952F", "#2D5486", "#B2412D"],
  },
] as const;

export type PaletteId = (typeof PALETTES)[number]["id"];

export function currentPalette(): PaletteId {
  const saved = store.get("palette");
  return PALETTES.find((p) => p.id === saved)?.id ?? "lagune";
}

/** Sets the palette on the page (and the browser bar), and remembers it on this device. */
export function applyPalette(id: PaletteId = currentPalette()): void {
  document.documentElement.dataset.palette = id;
  const meta = document.querySelector('meta[name="theme-color"]');
  meta?.setAttribute("content", PALETTES.find((p) => p.id === id)?.swatch[0] ?? "#0F1B1E");
  store.set("palette", id);
}
