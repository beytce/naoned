import type { Rarity } from "./types.js";

/**
 * The battle's chart (its cases on the island's square) and the relics' colours: kept apart from
 * Battle3D so that the 2D screen and the Porta's place need not load three.js with it (audit of
 * 4 November, 3D B1).
 */

/** Chart units a case of the battle's map (a small tile is about one case across). */
export const CASE = 10;

/** The battle's points (cases, around the disc's middle) on the chart (units, from its corner). */
export const toChart = (b: { radius: number }, x: number, y: number): [number, number] => [
  (x + b.radius + 1.5) * CASE,
  (y + b.radius + 1.5) * CASE,
];
export const fromChart = (b: { radius: number }, X: number, Y: number): [number, number] => [
  X / CASE - b.radius - 1.5,
  Y / CASE - b.radius - 1.5,
];
/** The island's chart, its whole square. */
export const extentOf = (b: { radius: number }) => {
  const w = (2 * b.radius + 3) * CASE;
  return { w, h: w };
};

export const RARITY_HEX: Record<Rarity, string> = {
  common: "#C9B89A",
  rare: "#6EE0B8",
  precious: "#6EC8F5",
  legendary: "#F2C24F",
};
