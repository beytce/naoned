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
