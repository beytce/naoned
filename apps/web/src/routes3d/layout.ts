import { PLACES, pointOn, roadCurve } from "../art/veneto.js";

/**
 * The Veneto in world units: the drawn map's points (360 × 440) scaled by a tenth, x to the east
 * and z to the south, y up. Pure geometry, shared by the scene and its tests.
 */

export const SCALE = 0.1;

export interface Spot {
  x: number;
  z: number;
}

export function toWorld([x, y]: [number, number]): Spot {
  return { x: round(x * SCALE), z: round(y * SCALE) };
}

function round(v: number): number {
  return Math.round(v * 1000) / 1000;
}

/**
 * The points of an SVG path (M, L, H, V, Q and Z, absolute), each curve sampled in `steps`
 * pieces; a closed path ends on its first point.
 */
export function parsePath(d: string, steps = 8): [number, number][] {
  const tokens = d.match(/[MLHVQZ]|-?\d*\.?\d+/gi) ?? [];
  const pts: [number, number][] = [];
  let i = 0;
  let cmd = "";
  let cur: [number, number] = [0, 0];
  let start: [number, number] = [0, 0];
  const num = () => Number(tokens[i++]);
  while (i < tokens.length) {
    const tok = tokens[i] ?? "";
    if (/[A-Za-z]/.test(tok)) {
      cmd = tok.toUpperCase();
      i++;
      if (cmd === "Z") {
        pts.push([start[0], start[1]]);
        cur = start;
        continue;
      }
    }
    if (cmd === "M" || cmd === "L") {
      cur = [num(), num()];
      if (cmd === "M") start = cur;
      pts.push(cur);
      if (cmd === "M") cmd = "L";
    } else if (cmd === "H") {
      cur = [num(), cur[1]];
      pts.push(cur);
    } else if (cmd === "V") {
      cur = [cur[0], num()];
      pts.push(cur);
    } else if (cmd === "Q") {
      const c: [number, number] = [num(), num()];
      const to: [number, number] = [num(), num()];
      for (let k = 1; k <= steps; k++) {
        const t = k / steps;
        const a = 1 - t;
        pts.push(
          k === steps
            ? to
            : [
                a * a * cur[0] + 2 * a * t * c[0] + t * t * to[0],
                a * a * cur[1] + 2 * a * t * c[1] + t * t * to[1],
              ],
        );
      }
      cur = to;
    } else {
      i++;
    }
  }
  return pts;
}

/** The road `region:city` in `n` pieces, from the depot to the city. */
export function roadPoints(route: string, n = 24): Spot[] {
  const c = roadCurve(route);
  if (!c) return [];
  return Array.from({ length: n + 1 }, (_, i) => {
    const p = pointOn(c, i / n);
    return toWorld([p.x, p.y]);
  });
}

/** The point at a share of a road, and the way it runs there (a unit vector on the ground). */
export function onRoute(route: string, share: number): { at: Spot; dir: Spot } | null {
  const c = roadCurve(route);
  if (!c) return null;
  const p = pointOn(c, share);
  const len = Math.hypot(p.dx, p.dy) || 1;
  return { at: toWorld([p.x, p.y]), dir: { x: p.dx / len, z: p.dy / len } };
}

/** Where a vehicle is on its road: 0 at the depot, 1 at the city, back to 0 on its return. */
export function shareAt(
  dv: { departAt: number; arriveAt: number; backAt: number; halted: boolean },
  now: number,
): { share: number; out: boolean } {
  if (now <= dv.arriveAt) {
    if (dv.halted) return { share: 0.5, out: true };
    const k = (now - dv.departAt) / Math.max(1, dv.arriveAt - dv.departAt);
    return { share: Math.max(0, Math.min(1, k)), out: true };
  }
  const k = 1 - (now - dv.arriveAt) / Math.max(1, dv.backAt - dv.arriveAt);
  return { share: Math.max(0, Math.min(1, k)), out: false };
}

/** What the camera frames: the given cities and the merchant's depot, with a margin. */
export function cityFrame(
  cities: string[],
  depot: string,
  margin: number,
): { minX: number; maxX: number; minZ: number; maxZ: number } {
  const spots = [...cities, depot]
    .map((c) => PLACES[c])
    .filter((p): p is [number, number] => !!p)
    .map(toWorld);
  return {
    minX: Math.min(...spots.map((s) => s.x)) - margin,
    maxX: Math.max(...spots.map((s) => s.x)) + margin,
    minZ: Math.min(...spots.map((s) => s.z)) - margin,
    maxZ: Math.max(...spots.map((s) => s.z)) + margin,
  };
}
