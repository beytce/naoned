/**
 * The way into the Terraferma (the owner's decision of 8 November 2026,
 * docs/audit-terraferme-2026-11-08/00-synthese.md § 7): from the Campo, every tile of the map turns
 * over in a wave, the Terraferma's land on its back, while the camera draws far back; then the
 * Terraferma's own board fades in and settles on the merchant's lands. The way back plays it
 * backwards, faster. Pure: times in seconds since the way started.
 */
import { easeOutBack, easeOutCubic } from "./arrival.js";
import { FLIP } from "./tokens.js";

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));

export const easeInOutCubic = (x: number) => {
  const t = clamp01(x);
  return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
};

/** When a tile starts to turn: by its distance (in tiles) from the Campo, the wave capped. */
export function flipDelay(distance: number): number {
  return Math.min(FLIP.spread, Math.max(0, distance) * FLIP.step);
}

/**
 * A tile's angle at a time, from 0 (face up) to π (on its back), with a slight overshoot as it
 * lands. Backwards (the way out), from π to 0, the far tiles first.
 */
export function flipAngle(t: number, delay: number, backwards = false): number {
  if (!backwards) return Math.PI * easeOutBack((t - delay) / FLIP.turn, FLIP.overshoot);
  const late = FLIP.spread - delay;
  return Math.PI * (1 - easeOutBack((t * FLIP.back - late) / FLIP.turn, FLIP.overshoot));
}

/** How high a tile stands at an angle: up at mid-turn, down on either face. */
export function flipLift(angle: number): number {
  return Math.sin(Math.min(Math.PI, Math.max(0, angle))) * FLIP.lift;
}

/** The tile's back shows past the half turn. */
export const showsBack = (angle: number) => angle > Math.PI / 2;

/** The camera's zoom as a share of its zoom at the start: 1, then far back. */
export function flipZoom(t: number, backwards = false): number {
  const k = backwards
    ? 1 - easeInOutCubic((t * FLIP.back - FLIP.zoomFrom) / FLIP.zoomFor)
    : easeInOutCubic((t - FLIP.zoomFrom) / FLIP.zoomFor);
  return 1 + (FLIP.zoomTo - 1) * k;
}

/** The Terraferma's board over the map: 0, then 1 from the handoff (backwards: 1, then 0 at once). */
export function stageOpacity(t: number, backwards = false): number {
  if (backwards) return 1 - easeOutCubic(t / (FLIP.fade / FLIP.back));
  return easeInOutCubic((t - FLIP.handoff) / FLIP.fade);
}

/** How long the way lasts, in or out. */
export const flipTotal = (backwards = false) =>
  backwards ? (FLIP.spread + FLIP.turn) / FLIP.back + 0.15 : FLIP.total;

/** What the Terraferma's back of a tile needs of the week's view. */
export interface TerraBackView {
  map: { width: number; height: number; terrain: string };
  owner: number[];
  holders: { me: boolean; ally: boolean; nation: string | null }[];
  me: { capital: number } | null;
}

const PORCELAIN: [number, number, number] = [0xee, 0xeb, 0xe5];
const WATER: [number, number, number] = [0xc9, 0xd3, 0xd6];
const rgb = (hex: string): [number, number, number] => [
  Number.parseInt(hex.slice(1, 3), 16),
  Number.parseInt(hex.slice(3, 5), 16),
  Number.parseInt(hex.slice(5, 7), 16),
];
const mix = (a: [number, number, number], b: [number, number, number], k: number) =>
  (Math.round(a[0] + (b[0] - a[0]) * k) << 16) |
  (Math.round(a[1] + (b[1] - a[1]) * k) << 8) |
  Math.round(a[2] + (b[2] - a[2]) * k);

/**
 * The back of the map's tile at (dx, dz) tiles from the Campo: the Terraferma's cell as far from the
 * merchant's camp (the map's middle without one), glazed as on its board: the merchant in red, its
 * allies pale, the nations in biscuit, the others in ink; free land porcelain, water lagoon. A
 * colour as a number (0xRRGGBB).
 */
export function terraBack(v: TerraBackView | null, dx: number, dz: number): number {
  if (!v) return mix(PORCELAIN, PORCELAIN, 0);
  const W = v.map.width;
  const home = v.me?.capital ?? Math.floor(v.map.height / 2) * W + Math.floor(W / 2);
  const i = (home % W) + dx;
  const j = Math.floor(home / W) + dz;
  if (i < 0 || j < 0 || i >= W || j >= v.map.height) return mix(WATER, WATER, 0);
  const c = j * W + i;
  if (v.map.terrain[c] === "w") return mix(WATER, WATER, 0);
  const h = v.holders[v.owner[c] ?? -1];
  if (!h) return mix(PORCELAIN, PORCELAIN, 0);
  if (h.me) return mix(PORCELAIN, rgb("#C23B2E"), 0.85);
  if (h.ally) return mix(PORCELAIN, rgb("#16897A"), 0.35);
  if (h.nation) return mix(PORCELAIN, rgb("#B39470"), 0.55);
  return mix(PORCELAIN, rgb("#2A2725"), 0.3);
}
