import type { Rarity } from "./types.js";

/** Each rarity's colour (the gems, the chests, the battle's relics): one place, no 3D needed. */
export const RARITY_HEX: Record<Rarity, string> = {
  common: "#BFAE8E",
  rare: "#3FAE8C",
  precious: "#3C8FC4",
  legendary: "#D49A16",
};

/**
 * The lands of Rome in biscuit (docs/plan-porcellana.md D5, decision of the owner of 5 November
 * 2026, replacing the dusk of the refonte claire's lot 4): the same porcelain as the trade's world,
 * unglazed — a warmer, paler earth, Rome's things in ink —, one knows one has changed lands without
 * changing worlds. The name stays: every scene of the Porta reads it.
 */
export const ROME_DUSK = {
  /** The sky behind the scene: the biscuit's background. */
  sky: "#E9E6E0",
  /** The lands' earth, and its deeper tone (the far side of the gate, the sea's bed). */
  earth: "#EEEBE5",
  deep: "#D8C8B2",
  /** The light: Porcellana's, a white sky over a warm ground, a sun from the front left. */
  hemiSky: "#FFFFFF",
  hemiGround: "#D6CDBF",
  sun: "#FFFAF1",
} as const;
