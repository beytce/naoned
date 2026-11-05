import type { Rarity } from "./types.js";

/** Each rarity's colour (the gems, the chests, the battle's relics): one place, no 3D needed. */
export const RARITY_HEX: Record<Rarity, string> = {
  common: "#C9B89A",
  rare: "#6EE0B8",
  precious: "#6EC8F5",
  legendary: "#F2C24F",
};

/**
 * The lands of Rome at dusk (the refonte claire, lot 4, 5 November 2026): the Porta and its battles
 * no longer on the cream board of the trade, but on their own ground, terracotta earth under a
 * violet sky, a low amber sun; one look one knows one has left the empire.
 */
export const ROME_DUSK = {
  /** The sky behind the scene. */
  sky: "#3B2F52",
  /** The lands' earth, and its deeper tone (the far side of the gate, the sea's bed). */
  earth: "#B58E72",
  deep: "#7E4A36",
  /** The light: an amber sky, a red earth bouncing, a low sun. */
  hemiSky: "#F6D3B0",
  hemiGround: "#7C3B28",
  sun: "#FFDCB4",
} as const;
