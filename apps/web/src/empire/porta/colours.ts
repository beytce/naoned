import type { Rarity } from "./types.js";

/** Each rarity's colour (the gems, the chests, the battle's relics): one place, no 3D needed. */
export const RARITY_HEX: Record<Rarity, string> = {
  common: "#C9B89A",
  rare: "#6EE0B8",
  precious: "#6EC8F5",
  legendary: "#F2C24F",
};

/**
 * The lands of Rome in biscuit (docs/plan-porcellana.md D5, decision of the owner of 5 November
 * 2026, replacing the dusk of the refonte claire's lot 4): the same porcelain as the trade's world,
 * unglazed — a warmer, paler earth, Rome's things in ink —, one knows one has changed lands without
 * changing worlds. The name stays: every scene of the Porta reads it.
 */
export const ROME_DUSK = {
  /** The sky behind the scene: the biscuit's background. */
  sky: "#E3D9CB",
  /** The lands' earth, and its deeper tone (the far side of the gate, the sea's bed). */
  earth: "#E7DCCD",
  deep: "#D8C8B2",
  /** The light: Porcellana's, a white sky over a warm ground, a sun from the front left. */
  hemiSky: "#FFFFFF",
  hemiGround: "#D6CDBF",
  sun: "#FFFAF1",
} as const;
