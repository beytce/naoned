import type { Rarity } from "./types.js";

/** Each rarity's colour (the gems, the chests, the battle's relics): one place, no 3D needed. */
export const RARITY_HEX: Record<Rarity, string> = {
  common: "#C9B89A",
  rare: "#6EE0B8",
  precious: "#6EC8F5",
  legendary: "#F2C24F",
};
