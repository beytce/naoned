/**
 * The small tiles (docs/plateau-reprise.md § 8, decision of the owner, 3 November 2026): each
 * sector of the map cut in seven small hexagonal tiles, one in its middle and six around, and a
 * place (a town, a fondaco) on a tile of its own, never next to another's. The seven tiles of every
 * sector make one board without a gap: small hexagons on their own lattice, `SLOT_STEP` of a
 * sector's size apart, turned by `SLOT_TURN` (seven small hexagons fill one sector).
 */
import {
  gridRoad,
  gridRoadTiles,
  placeFault,
  placeTowns,
  tileAt,
  tileCentre,
  tileDistance,
} from "./grid.js";
import { cellAtPoint, cellCentreOf, cellsWithin, squareGrid } from "./map.js";
import type { EmpireSettings } from "./settings.js";

/** Two small tiles side by side, their middles this many sector sizes apart (√3 / √7). */
export const SLOT_STEP = Math.sqrt(3) / Math.sqrt(7);
/** The small tiles' lattice turned from the sectors': atan(√3 / 5), about 19.1°. */
export const SLOT_TURN = Math.atan(Math.sqrt(3) / 5);

/** A small tile's middle: `k` = 0 the sector's middle, 1 to 6 around it. */
export function slotPoint(cell: string, k: number, s: EmpireSettings): [number, number] {
  // On square tiles, a cell is its one tile: its middle.
  if (squareGrid(s)) return tileCentre(cell, s.map.tileSize);
  const [cx, cy] = cellCentreOf(cell, s);
  if (k === 0) return [cx, cy];
  const a = -SLOT_TURN + ((k - 1) * Math.PI) / 3;
  const step = SLOT_STEP * s.map.hexSize;
  return [cx + step * Math.cos(a), cy + step * Math.sin(a)];
}

/** Two points on small tiles side by side (or on the same tile). */
export function slotsTouch(a: [number, number], b: [number, number], s: EmpireSettings): boolean {
  if (squareGrid(s))
    return (
      tileDistance(tileAt(a[0], a[1], s.map.tileSize), tileAt(b[0], b[1], s.map.tileSize)) <= 1
    );
  return Math.hypot(a[0] - b[0], a[1] - b[1]) < 1.5 * SLOT_STEP * s.map.hexSize;
}

/** The small tile under a point: its sector and its rank there. */
export function slotAt(x: number, y: number, s: EmpireSettings): { cell: string; k: number } {
  if (squareGrid(s)) return { cell: tileAt(x, y, s.map.tileSize), k: 0 };
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
  // On square tiles: each town on a land tile of its own, none side by side (grid.ts).
  if (squareGrid(s)) {
    const at = (c: C): [number, number] =>
      c.x !== undefined && c.y !== undefined ? [c.x, c.y] : tileCentre(c.cell, s.map.tileSize);
    return placeTowns(
      cities.map((c) => ({ ...c, x: at(c)[0], y: at(c)[1] })),
      { tileSize: s.map.tileSize, tiles: s.map.cells },
    ).map(({ tile, ...c }) => ({ ...(c as unknown as C), cell: tile, x: c.x, y: c.y }));
  }
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
  if (squareGrid(s)) {
    const size = s.map.tileSize;
    const tile = tileAt(at[0], at[1], size);
    const [mx, my] = tileCentre(tile, size);
    if (tile !== cell || Math.round(mx) !== at[0] || Math.round(my) !== at[1])
      return "unknown_cell";
    const f = placeFault(
      { tileSize: size, tiles: s.map.cells },
      tile,
      towns.map((p) => tileAt(p[0], p[1], size)),
      fondaci.map((p) => tileAt(p[0], p[1], size)),
    );
    return f === "unknown_tile" ? "unknown_cell" : f === "too_close" ? "post_too_close" : f;
  }
  const t = slotAt(at[0], at[1], s);
  const [mx, my] = slotPoint(t.cell, t.k, s);
  if (t.cell !== cell || Math.round(mx) !== at[0] || Math.round(my) !== at[1])
    return "unknown_cell";
  if ((s.map.water ?? []).includes(`${t.cell}#${t.k}`)) return "unknown_cell";
  if (towns.some((p) => slotsTouch(p, at, s))) return "on_city";
  if (fondaci.some((p) => slotsTouch(p, at, s))) return "post_too_close";
  return null;
}

const tileId = (t: { cell: string; k: number }) => `${t.cell}#${t.k}`;

/** The six small tiles around one, by their middles one step off (the lattice's own six ways). */
function tilesAround(t: { cell: string; k: number }, s: EmpireSettings) {
  const [x, y] = slotPoint(t.cell, t.k, s);
  const step = SLOT_STEP * s.map.hexSize;
  return [0, 1, 2, 3, 4, 5].map((j) => {
    const a = -SLOT_TURN + (j * Math.PI) / 3;
    return slotAt(x + step * Math.cos(a), y + step * Math.sin(a), s);
  });
}

/**
 * The road between two places, tile after tile (decision of the owner, 3 November 2026: the mules
 * walk roads, not straight lines): the shortest way across the small tiles, a town's tile on the
 * way counting four steps (the road goes around a town when it can) and a tile of the sea five
 * (a ford, a bridge). From the tile under `a` to the tile under `b`; the same at every call.
 */
export function roadTiles(
  a: [number, number],
  b: [number, number],
  s: EmpireSettings,
): { cell: string; k: number }[] {
  if (squareGrid(s)) {
    const size = s.map.tileSize;
    return gridRoadTiles(
      tileAt(a[0], a[1], size),
      tileAt(b[0], b[1], size),
      { tileSize: size, tiles: s.map.cells },
      townTiles(s),
    ).map((cell) => ({ cell, k: 0 }));
  }
  const from = slotAt(a[0], a[1], s);
  const to = slotAt(b[0], b[1], s);
  const goal = tileId(to);
  const towns = new Set(
    s.map.cities.map((c) => {
      const [cx, cy] =
        c.x !== undefined && c.y !== undefined ? [c.x, c.y] : cellCentreOf(c.cell, s);
      return tileId(slotAt(cx, cy, s));
    }),
  );
  const step = SLOT_STEP * s.map.hexSize;
  const [gx, gy] = slotPoint(to.cell, to.k, s);
  // Dijkstra, guided toward the goal (A*: the straight way left, in steps, never more than it is).
  const left = (t: { cell: string; k: number }) => {
    const [x, y] = slotPoint(t.cell, t.k, s);
    return Math.hypot(gx - x, gy - y) / step;
  };
  const cost = new Map<string, number>([[tileId(from), 0]]);
  const back = new Map<string, { cell: string; k: number }>();
  const open: { t: { cell: string; k: number }; g: number; f: number }[] = [
    { t: from, g: 0, f: left(from) },
  ];
  const done = new Set<string>();
  for (let guard = 0; open.length > 0 && guard < 20_000; guard++) {
    open.sort((p, q) => p.f - q.f || tileId(p.t).localeCompare(tileId(q.t)));
    const cur = open.shift() as (typeof open)[number];
    const id = tileId(cur.t);
    if (done.has(id)) continue;
    done.add(id);
    if (id === goal) break;
    for (const n of tilesAround(cur.t, s)) {
      const nid = tileId(n);
      if (done.has(nid)) continue;
      const wet = !s.map.cells[n.cell] || (s.map.water ?? []).includes(nid);
      const extra = nid === goal ? 0 : towns.has(nid) ? 3 : wet ? 4 : 0;
      const g = cur.g + 1 + extra;
      if (g < (cost.get(nid) ?? Number.POSITIVE_INFINITY)) {
        cost.set(nid, g);
        back.set(nid, cur.t);
        open.push({ t: n, g, f: g + left(n) });
      }
    }
  }
  const path = [to];
  for (let id = goal; id !== tileId(from); ) {
    const prev = back.get(id);
    if (!prev) return [from, to];
    path.unshift(prev);
    id = tileId(prev);
  }
  return path;
}

/**
 * The road as it is walked and drawn: from `a` to `b` through the middles of the tiles between,
 * its corners rounded (two passes of Chaikin's cutting), its ends where the places stand.
 */
export function roadBetween(
  a: [number, number],
  b: [number, number],
  s: EmpireSettings,
): [number, number][] {
  if (squareGrid(s))
    return gridRoad(a, b, { tileSize: s.map.tileSize, tiles: s.map.cells }, townTiles(s));
  const mids = roadTiles(a, b, s)
    .slice(1, -1)
    .map((t) => slotPoint(t.cell, t.k, s));
  let pts: [number, number][] = [a, ...mids, b];
  for (let pass = 0; pass < 2 && pts.length > 2; pass++) {
    const out: [number, number][] = [pts[0] as [number, number]];
    for (let i = 0; i < pts.length - 1; i++) {
      const [px, py] = pts[i] as [number, number];
      const [qx, qy] = pts[i + 1] as [number, number];
      if (i > 0) out.push([0.75 * px + 0.25 * qx, 0.75 * py + 0.25 * qy]);
      if (i < pts.length - 2) out.push([0.25 * px + 0.75 * qx, 0.25 * py + 0.75 * qy]);
    }
    out.push(pts.at(-1) as [number, number]);
    pts = out;
  }
  return pts;
}

/** The towns' tiles, on square tiles (the roads go round them). */
const townSets = new WeakMap<EmpireSettings, Set<string>>();
function townTiles(s: EmpireSettings): Set<string> {
  let t = townSets.get(s);
  if (!t) {
    const size = s.map.tileSize;
    t = new Set(
      s.map.cities.map((c) =>
        c.x !== undefined && c.y !== undefined ? tileAt(c.x, c.y, size) : c.cell,
      ),
    );
    townSets.set(s, t);
  }
  return t;
}
