import { store } from "./game/store.js";

/** The palettes of the identity guide, two dark and a light one; the first one is the default. */
export const PALETTES = [
  { id: "lagune", name: "Lagune & Ducat", swatch: ["#16263E", "#F4C554", "#6EE0B8", "#6EC8F5"] },
  { id: "noyer", name: "Noyer & Ducat", swatch: ["#1E1611", "#E8B24C", "#7DB596", "#E36A4A"] },
  {
    id: "parchemin",
    name: "Parchemin & Lapis",
    swatch: ["#F3E9D4", "#845A0E", "#284EA0", "#B2412D"],
  },
  // The Pass Négociant's own palette.
  {
    id: "or",
    name: "Or de Venise",
    swatch: ["#12100C", "#ECBE50", "#80B696", "#DE684C"],
    pass: true,
  },
] as const;

export type PaletteId = (typeof PALETTES)[number]["id"];

export function needsPass(id: PaletteId): boolean {
  return PALETTES.some((p) => p.id === id && "pass" in p && p.pass);
}

export const DEFAULT_PALETTE: PaletteId = "lagune";

export function currentPalette(): PaletteId {
  // Only a palette the player picked is kept: a device that merely remembered the old default
  // (Noyer, until 20 October 2026) takes the new one.
  const saved = store.get("paletteChosen") ? store.get("palette") : null;
  return PALETTES.find((p) => p.id === saved)?.id ?? DEFAULT_PALETTE;
}

/** Sets the palette on the page (and the browser bar), and remembers it on this device. */
export function applyPalette(id: PaletteId = currentPalette()): void {
  document.documentElement.dataset.palette = id;
  const meta = document.querySelector('meta[name="theme-color"]');
  meta?.setAttribute("content", PALETTES.find((p) => p.id === id)?.swatch[0] ?? "#16263E");
  store.set("palette", id);
}

/** The player's own choice, from the Profil. */
export function choosePalette(id: PaletteId): void {
  store.set("paletteChosen", "1");
  applyPalette(id);
}

/**
 * The size of the text, chosen in the Profil (E3-11 of the experts): 100, 115 or 130 % of the
 * browser's own, on the page's root, so that every size in rem follows.
 */
export const TEXT_SIZES = [100, 115, 130] as const;
export type TextSize = (typeof TEXT_SIZES)[number];

export function currentTextSize(): TextSize {
  const saved = Number(store.get("textSize"));
  return (TEXT_SIZES as readonly number[]).includes(saved) ? (saved as TextSize) : 100;
}

export function applyTextSize(size: TextSize = currentTextSize()): void {
  // Under 360 px of width (an iPhone SE), the usual size: larger, Lorenzo's bubble has no room left
  // beside what it points at. The choice is kept, and holds on a wider screen.
  const shown = typeof window !== "undefined" && window.innerWidth < 360 ? 100 : size;
  document.documentElement.style.fontSize = shown === 100 ? "" : `${shown}%`;
  // For the few places a larger text must make room (index.css, « data-text-size »).
  document.documentElement.dataset.textSize = String(shown);
  store.set("textSize", String(size));
}
