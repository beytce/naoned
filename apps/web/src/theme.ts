import { store } from "./game/store.js";

/** The palettes of the identity guide, a dark and a light one; the first one is the default. */
export const PALETTES = [
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

export const DEFAULT_PALETTE: PaletteId = "noyer";

export function currentPalette(): PaletteId {
  const saved = store.get("palette");
  // Lagune and Pourpre are gone (UX audit of 19 October 2026): a device that kept one turns Noyer.
  return PALETTES.find((p) => p.id === saved)?.id ?? DEFAULT_PALETTE;
}

/** Sets the palette on the page (and the browser bar), and remembers it on this device. */
export function applyPalette(id: PaletteId = currentPalette()): void {
  document.documentElement.dataset.palette = id;
  const meta = document.querySelector('meta[name="theme-color"]');
  meta?.setAttribute("content", PALETTES.find((p) => p.id === id)?.swatch[0] ?? "#1E1611");
  store.set("palette", id);
}

/** The player's own choice, from the Profil. */
export function choosePalette(id: PaletteId): void {
  store.set("paletteChosen", "1");
  applyPalette(id);
}
