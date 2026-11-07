/**
 * The Terraferma's fronts (docs/plan-terraferme-porcellana.md § 1, lot T3), the pure part: where a
 * front's head stands, how thick its ribbon is for the men it carries, the tapering strip with its
 * arrow, and its tone (the merchant's in red, what threatens it in ink, the others faint).
 */
import { terraNeighbors } from "@comptoirs/engine";
import type { GridOf } from "./glaze.js";

export interface FrontLike {
  owner: number;
  /** The next cells it takes, the first first. */
  next: number[];
  aim: number;
}

const toMap = (g: GridOf) => ({
  width: g.width,
  height: g.height,
  ...(g.grid === "square" ? { grid: "square" as const } : {}),
});

/**
 * The cell the front's head stands on: the holder's cell touching the next cell it takes (else its
 * aim), the nearest to its camp; the camp when none does.
 */
export function frontHead(g: GridOf, owner: number[], f: FrontLike, camp: number): number {
  const map = toMap(g);
  const d = (a: number, b: number) =>
    Math.abs((a % g.width) - (b % g.width)) +
    Math.abs(Math.floor(a / g.width) - Math.floor(b / g.width));
  for (const target of [f.next[0], f.aim]) {
    if (target === undefined || target < 0) continue;
    const touching = terraNeighbors(map, target).filter((n) => owner[n] === f.owner);
    if (touching.length > 0)
      return touching.sort((a, b) => d(a, camp) - d(b, camp) || a - b)[0] as number;
  }
  return camp;
}

/**
 * The ribbon's width at the camp and at the head, in world units (a tile is 6 across): the square
 * root of the men, a little ribbon for a few, never past four hundred men's worth.
 */
export function frontWidths(troops: number): [number, number] {
  const k = Math.sqrt(Math.min(400, Math.max(0, troops)) / 150);
  return [0.5 + 1.5 * k, 0.32 + 0.7 * k];
}

/**
 * A flat strip along the points (y kept), its width going from `w0` to `w1`, then an arrow; u in
 * chevron periods of `period` along the way, v across. Two vertices a point, then the arrow's two
 * wings and its tip.
 */
export function arrowStrip(
  pts: [number, number, number][],
  w0: number,
  w1: number,
  period: number,
): { positions: number[]; uvs: number[]; indices: number[] } {
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  const n = pts.length;
  let dist = 0;
  let dir: [number, number] = [1, 0];
  for (let i = 0; i < n; i++) {
    const p = pts[i] as [number, number, number];
    const a = pts[Math.max(0, i - 1)] as [number, number, number];
    const b = pts[Math.min(n - 1, i + 1)] as [number, number, number];
    const tx = b[0] - a[0];
    const tz = b[2] - a[2];
    const tl = Math.hypot(tx, tz) || 1;
    dir = [tx / tl, tz / tl];
    if (i > 0) {
      const q = pts[i - 1] as [number, number, number];
      dist += Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]);
    }
    const w = (w0 + (w1 - w0) * (n > 1 ? i / (n - 1) : 1)) / 2;
    const nx = -dir[1] * w;
    const nz = dir[0] * w;
    positions.push(p[0] + nx, p[1], p[2] + nz, p[0] - nx, p[1], p[2] - nz);
    uvs.push(dist / period, 1, dist / period, 0);
    if (i < n - 1) {
      const k = i * 2;
      indices.push(k, k + 2, k + 1, k + 1, k + 2, k + 3);
    }
  }
  // The arrow: two wings a little wider than the ribbon's end, the tip ahead.
  const last = pts[n - 1] as [number, number, number];
  const wing = Math.max(w1 * 1.15, 0.6);
  const ahead = Math.max(w1 * 1.5, 0.9);
  const base = n * 2;
  positions.push(
    last[0] - dir[1] * wing,
    last[1],
    last[2] + dir[0] * wing,
    last[0] + dir[1] * wing,
    last[1],
    last[2] - dir[0] * wing,
    last[0] + dir[0] * ahead,
    last[1],
    last[2] + dir[1] * ahead,
  );
  // The arrow takes the plain colour of the chevron's tile (its edge, away from the chevron).
  uvs.push(0.02, 0.02, 0.02, 0.02, 0.02, 0.02);
  indices.push(base, base + 2, base + 1);
  return { positions, uvs, indices };
}

export type FrontTone = "mine" | "threat" | "other";

export function frontTone(f: { mine: boolean; threat: boolean }): FrontTone {
  return f.mine ? "mine" : f.threat ? "threat" : "other";
}
