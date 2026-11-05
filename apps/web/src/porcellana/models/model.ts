import type { Group } from "three";
import type { Palette } from "../materials.js";

/** What a model is told by the game: its seed (its dressing), and whether it works now. */
export interface ModelOpts {
  seed: number;
  /** It works: its sails turn, its kiln glows, its smoke rises. Read at each frame. */
  running: boolean;
  /** Where the dressing must not stand (a road through the tile), in the tile's coordinates. */
  keepOff?: (x: number, z: number) => boolean;
}

/**
 * A model of the catalogue (docs/plan-porcellana.md § 4): its group on a tile (the tile's middle at
 * the origin, the ground at y = 0, a tile `BOARD.tile` across), where its pin stands, and what moves
 * in it, at the game's say only (`tick` is called only while the scene is live; what works moves
 * only while `running`).
 */
export interface Built {
  group: Group;
  pin: [number, number, number];
  tick?: (t: number, dt: number) => void;
  /** A model of the « + » plot: its plus, raised while hovered or chosen. */
  plus?: Group;
}

export type Maker = (P: Palette, o: ModelOpts) => Built;
