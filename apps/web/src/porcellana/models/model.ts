import type { Group } from "three";

/**
 * A model of the catalogue (docs/plan-porcellana.md § 4): its group on a tile (the tile's middle at
 * the origin, the ground at y = 0, a tile `BOARD.tile` across), where its pin stands, and what moves
 * in it, at the game's say only (`tick` is called only while the scene is live).
 */
export interface Built {
  group: Group;
  pin: [number, number, number];
  tick?: (t: number, dt: number) => void;
  /** A model of the « + » plot: its plus, raised while hovered or chosen. */
  plus?: Group;
}
