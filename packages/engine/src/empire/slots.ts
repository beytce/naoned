/**
 * The small tiles (docs/plateau-reprise.md § 8, decision of the owner, 3 November 2026): each
 * sector of the map cut in seven small hexagonal tiles, one in its middle and six around, and a
 * place (a town, a fondaco) on a tile of its own, never next to another's. The seven tiles of every
 * sector make one board without a gap: small hexagons on their own lattice, `SLOT_STEP` of a
 * sector's size apart, turned by `SLOT_TURN` (seven small hexagons fill one sector).
 */
import { cellAtPoint, cellCentreOf, cellsWithin } from "./map.js";
import type { EmpireSettings } from "./settings.js";

/** Two small tiles side by side, their middles this many sector sizes apart (√3 / √7). */
export const SLOT_STEP = Math.sqrt(3) / Math.sqrt(7);
/** The small tiles' lattice turned from the sectors': atan(√3 / 5), about 19.1°. */
export const SLOT_TURN = Math.atan(Math.sqrt(3) / 5);

/** A small tile's middle: `k` = 0 the sector's middle, 1 to 6 around it. */
export function slotPoint(cell: string, k: number, s: EmpireSettings): [number, number] {
  const [cx, cy] = cellCentreOf(cell, s);
  if (k === 0) return [cx, cy];
  const a = -SLOT_TURN + ((k - 1) * Math.PI) / 3;
  const step = SLOT_STEP * s.map.hexSize;
  return [cx + step * Math.cos(a), cy + step * Math.sin(a)];
}

/** Two points on small tiles side by side (or on the same tile). */
export function slotsTouch(a: [number, number], b: [number, number], s: EmpireSettings): boolean {
  return Math.hypot(a[0] - b[0], a[1] - b[1]) < 1.5 * SLOT_STEP * s.map.hexSize;
}

/** The small tile under a point: its sector and its rank there. */
export function slotAt(x: number, y: number, s: EmpireSettings): { cell: string; k: number } {
  const home = cellAtPoint(x, y, s);
  let best = { cell: home, k: 0 };
  let bestD = Number.POSITIVE_INFINITY;
  for (const cell of cellsWithin(home, 1))
    for (let k = 0; k < 7; k++) {
      const [px, py] = slotPoint(cell, k, s);
      const dd = Math.hypot(px - x, py - y);
      if (dd < bestD - 1e-9) {
        bestD = dd;
        best = { cell, k };
      }
    }
  return best;
}

/**
 * The towns put on the small tiles of their sector (on the ring: the middle touches every tile),
 * each on a tile of its own, so that no two towns ever touch, the next sectors' towns counted; in
 * the sectors of `keepFree` (where the first fondaco is put down), a tile is also kept free for it,
 * touching no town. Not every sector can keep one: tiles that never touch cover a third of the
 * board at most, and a sector of two towns and a fondaco would take three of its seven. Of the ways
 * that hold, the one nearest the towns' old points; the sectors are searched one after the other,
 * going back when a sector has no way left. Their points rounded to the chart's units.
 */
export function placeCities<
  C extends { code: string; cell: string; x?: number; y?: number; size?: number },
>(cities: C[], s: EmpireSettings, keepFree: string[] = []): (C & { x: number; y: number })[] {
  const keep = new Set(keepFree);
  const byCell = new Map<string, C[]>();
  for (const c of cities) byCell.set(c.cell, [...(byCell.get(c.cell) ?? []), c]);
  // Row after row, west to east: a sector's neighbours come soon after it, so that a way that
  // cannot hold is found out early.
  const rq = (cell: string) => cell.split(",").map(Number) as [number, number];
  const cells = [...byCell.keys()].sort((a, b) => {
    const [aq, ar] = rq(a);
    const [bq, br] = rq(b);
    return ar - br || aq + ar / 2 - (bq + br / 2);
  });
  for (const cell of keep) if (!byCell.has(cell)) byCell.set(cell, []);
  type Way = { towns: [string, [number, number]][]; free: [number, number] | null; cost: number };
  // Every way of a sector: its towns on distinct tiles of the ring, a tile left free for a fondaco.
  const waysOf = (cell: string): Way[] => {
    const here = [...(byCell.get(cell) ?? [])].sort((a, b) => a.code.localeCompare(b.code));
    const want = here.map((c): [number, number] =>
      c.x !== undefined && c.y !== undefined ? [c.x, c.y] : cellCentreOf(cell, s),
    );
    // A town alone in its sector may stand in its middle (unless a fondaco is to be put there).
    const alone = here.length === 1 && !keep.has(cell);
    const ring = (alone ? [1, 2, 3, 4, 5, 6, 0] : [1, 2, 3, 4, 5, 6]).map((k) =>
      slotPoint(cell, k, s),
    );
    const out: Way[] = [];
    const pick = (i: number, used: number[]) => {
      if (i === here.length) {
        const towns = here.map((c, j): [string, [number, number]] => [
          c.code,
          ring[used[j] as number] as [number, number],
        ]);
        const cost = towns.reduce((n, [, p], j) => {
          const w = want[j] as [number, number];
          return n + Math.hypot(p[0] - w[0], p[1] - w[1]);
        }, 0);
        if (!keep.has(cell)) {
          out.push({ towns, free: null, cost });
          return;
        }
        for (let f = 0; f < 6; f++) {
          if (used.includes(f)) continue;
          const free = ring[f] as [number, number];
          if (used.some((u) => slotsTouch(ring[u] as [number, number], free, s))) continue;
          out.push({ towns, free, cost });
        }
        return;
      }
      for (let k = 0; k < ring.length; k++) {
        if (used.includes(k)) continue;
        if (
          used.some((u) => slotsTouch(ring[u] as [number, number], ring[k] as [number, number], s))
        )
          continue;
        pick(i + 1, [...used, k]);
      }
    };
    pick(0, []);
    return out.sort(
      (a, b) =>
        a.cost - b.cost ||
        (a.free?.[0] ?? 0) - (b.free?.[0] ?? 0) ||
        (a.free?.[1] ?? 0) - (b.free?.[1] ?? 0),
    );
  };
  const ways = new Map(cells.map((c) => [c, waysOf(c)]));
  // Every sector its nearest way first; then, sector after sector, the way that touches the least
  // (a town next to another town, or to a fondaco's tile kept free), the nearest among those, until
  // no sector can do better. A few towns may still touch across a sector's edge, where the board is
  // too crowded (`clashes` counts them).
  const near = (p: [number, number], q: [number, number] | null) =>
    q !== null && slotsTouch(p, q, s);
  const chosen = new Map(cells.map((c) => [c, (ways.get(c) ?? [])[0] as Way]));
  const clashesOf = (cell: string, w: Way) => {
    let n = 0;
    for (const [other, o] of chosen) {
      if (other === cell) continue;
      for (const [, p] of w.towns) {
        for (const [, q] of o.towns) if (slotsTouch(p, q, s)) n++;
        if (near(p, o.free)) n++;
      }
      for (const [, q] of o.towns) if (near(q, w.free)) n++;
    }
    return n;
  };
  for (let pass = 0; pass < 40; pass++) {
    let better = false;
    for (const cell of cells) {
      const now = chosen.get(cell) as Way;
      let best = now;
      let bestScore = clashesOf(cell, now) * 1_000 + now.cost;
      for (const w of ways.get(cell) ?? []) {
        const score = clashesOf(cell, w) * 1_000 + w.cost;
        if (score < bestScore - 1e-9) {
          best = w;
          bestScore = score;
        }
      }
      if (best !== now) {
        chosen.set(cell, best);
        better = true;
      }
    }
    if (!better) break;
  }
  const placed = new Map([...chosen.values()].flatMap((w) => w.towns));
  return cities.map((c) => {
    const p = placed.get(c.code) as [number, number];
    return { ...c, x: Math.round(p[0]), y: Math.round(p[1]) };
  });
}

/** The towns that stand on small tiles side by side (none, where the board allows). */
export function townClashes(
  cities: { code: string; x: number; y: number }[],
  s: EmpireSettings,
): [string, string][] {
  const out: [string, string][] = [];
  for (let i = 0; i < cities.length; i++)
    for (let j = i + 1; j < cities.length; j++) {
      const a = cities[i] as (typeof cities)[number];
      const b = cities[j] as (typeof cities)[number];
      if (slotsTouch([a.x, a.y], [b.x, b.y], s)) out.push([a.code, b.code]);
    }
  return out;
}

/**
 * Where a fondaco may be put down on the small tiles: on a tile's middle (its point rounded to the
 * chart's units), in the cell asked, the tile touching no town's and no other fondaco's. The error
 * to fail with, or null.
 */
export function tileFault(
  s: EmpireSettings,
  cell: string,
  at: [number, number],
  towns: [number, number][],
  fondaci: [number, number][],
): "unknown_cell" | "on_city" | "post_too_close" | null {
  const t = slotAt(at[0], at[1], s);
  const [mx, my] = slotPoint(t.cell, t.k, s);
  if (t.cell !== cell || Math.round(mx) !== at[0] || Math.round(my) !== at[1])
    return "unknown_cell";
  if (towns.some((p) => slotsTouch(p, at, s))) return "on_city";
  if (fondaci.some((p) => slotsTouch(p, at, s))) return "post_too_close";
  return null;
}
