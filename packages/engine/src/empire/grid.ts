import { DENIERS_PER_DUCAT, type Deniers, applyBpsFloor } from "../money.js";

/**
 * The square grid (docs/plan-porcellana.md § 2 bis, decision of the owner, 5 November 2026): the
 * map in square tiles « i,j », `tileSize` of the chart's units across, the tile the unit of
 * everything — what is bought (one at a time, next to one's own by a side), where a place stands
 * (a town, a fondaco, a workshop: one a tile, never two side by side), what a road walks through
 * (from tile to tile by their sides). The tiles listed are land, with their region; the others are
 * the sea. Pure: no settings, no state; the map is given.
 */
export interface SquareMap {
  tileSize: number;
  tiles: Record<string, { region: string; coast?: boolean }>;
}

export const tileKey = (i: number, j: number) => `${i},${j}`;

export function parseTile(key: string): [number, number] {
  const [i = Number.NaN, j = Number.NaN] = key.split(",").map(Number);
  return [i, j];
}

/** The tile under a point of the chart. */
export function tileAt(x: number, y: number, size: number): string {
  return tileKey(Math.floor(x / size) + 0, Math.floor(y / size) + 0);
}

/** A tile's middle on the chart. */
export function tileCentre(key: string, size: number): [number, number] {
  const [i, j] = parseTile(key);
  return [(i + 0.5) * size, (j + 0.5) * size];
}

/** The four tiles by its sides: north, east, south, west. */
export function neighbours4(key: string): string[] {
  const [i, j] = parseTile(key);
  return [tileKey(i, j - 1), tileKey(i + 1, j), tileKey(i, j + 1), tileKey(i - 1, j)];
}

/** The steps by the sides from one tile to another. */
export function tileDistance(a: string, b: string): number {
  const [ai, aj] = parseTile(a);
  const [bi, bj] = parseTile(b);
  return Math.abs(ai - bi) + Math.abs(aj - bj);
}

/** Two distinct tiles side by side (a corner is not a side). */
export const tilesTouch = (a: string, b: string) => tileDistance(a, b) === 1;

/**
 * The tiles one may buy: land one does not own, next to one's own by a side, or a coast within
 * `seaHops` steps of a coast one owns. Sorted.
 */
export function buyableTiles(owned: string[], map: SquareMap, seaHops: number): string[] {
  const mine = new Set(owned);
  const coasts = owned.filter((t) => map.tiles[t]?.coast);
  return Object.keys(map.tiles)
    .filter((t) => !mine.has(t))
    .filter(
      (t) =>
        neighbours4(t).some((n) => mine.has(n)) ||
        (seaHops > 0 &&
          map.tiles[t]?.coast === true &&
          coasts.some((c) => tileDistance(c, t) <= seaHops)),
    )
    .sort();
}

/** The price of the next tile, for `owned` tiles owned: `stepBps` dearer for each beyond the first. */
export function tileCost(owned: number, costDucats: number, stepBps: number): Deniers {
  let price = BigInt(costDucats) * DENIERS_PER_DUCAT;
  for (let i = 1; i < owned; i++) price = applyBpsFloor(price, 10_000 + stepBps);
  return price;
}

/**
 * Whether a place may stand on a tile: land, not a town's nor next to one by a side, not next to
 * another place by a side. The error to fail with, or null.
 */
export function placeFault(
  map: SquareMap,
  tile: string,
  towns: string[],
  places: string[],
): "unknown_tile" | "on_city" | "too_close" | null {
  if (!map.tiles[tile]) return "unknown_tile";
  if (towns.some((t) => t === tile || tilesTouch(t, tile))) return "on_city";
  if (places.some((p) => p === tile || tilesTouch(p, tile))) return "too_close";
  return null;
}

/**
 * The towns put on the land, each on a tile of its own, none next to another by a side: the
 * largest first (then by code), each on the tile under its point if it may, else on the nearest
 * land tile that may (nearest its point, then by key). Its point becomes its tile's middle. The
 * same at every call, whatever the order given.
 */
export function placeTowns<C extends { code: string; x: number; y: number; size?: number }>(
  towns: C[],
  map: SquareMap,
): (C & { tile: string })[] {
  const size = map.tileSize;
  const order = [...towns].sort(
    (a, b) => (b.size ?? 0) - (a.size ?? 0) || a.code.localeCompare(b.code),
  );
  const land = Object.keys(map.tiles).sort();
  const taken: string[] = [];
  const placed = new Map<string, string>();
  const free = (t: string) => !taken.some((u) => u === t || tilesTouch(u, t));
  for (const c of order) {
    const under = tileAt(c.x, c.y, size);
    let tile = map.tiles[under] && free(under) ? under : null;
    if (!tile) {
      let best = Number.POSITIVE_INFINITY;
      for (const t of land) {
        if (!free(t)) continue;
        const [mx, my] = tileCentre(t, size);
        const d = Math.hypot(mx - c.x, my - c.y);
        if (d < best - 1e-9) {
          best = d;
          tile = t;
        }
      }
    }
    if (!tile) tile = under;
    taken.push(tile);
    placed.set(c.code, tile);
  }
  return towns.map((c) => {
    const tile = placed.get(c.code) as string;
    const [x, y] = tileCentre(tile, size);
    return { ...c, tile, x: Math.round(x), y: Math.round(y) };
  });
}

/**
 * The road's tiles from one tile to another, by their sides: the cheapest way, a step costing one,
 * a town's tile on the way four (the road goes around a town when it can), a tile of the sea five
 * (a ford, a ferry). The same at every call (ties broken by the tiles' keys).
 */
export function gridRoadTiles(
  from: string,
  to: string,
  map: SquareMap,
  towns: Set<string>,
): string[] {
  if (from === to) return [from];
  const left = (t: string) => tileDistance(t, to);
  const cost = new Map<string, number>([[from, 0]]);
  const back = new Map<string, string>();
  const open: { t: string; g: number; f: number }[] = [{ t: from, g: 0, f: left(from) }];
  const done = new Set<string>();
  // The search stays within a margin around the two ends (the sea beyond is never cheaper).
  const [fi, fj] = parseTile(from);
  const [ti, tj] = parseTile(to);
  const pad = 6 + Math.ceil(tileDistance(from, to) / 2);
  const inBox = (t: string) => {
    const [i, j] = parseTile(t);
    return (
      i >= Math.min(fi, ti) - pad &&
      i <= Math.max(fi, ti) + pad &&
      j >= Math.min(fj, tj) - pad &&
      j <= Math.max(fj, tj) + pad
    );
  };
  while (open.length > 0) {
    open.sort((p, q) => p.f - q.f || p.g - q.g || p.t.localeCompare(q.t));
    const cur = open.shift() as (typeof open)[number];
    if (done.has(cur.t)) continue;
    done.add(cur.t);
    if (cur.t === to) break;
    for (const n of neighbours4(cur.t)) {
      if (done.has(n) || !inBox(n)) continue;
      const extra = n === to ? 0 : towns.has(n) ? 3 : map.tiles[n] ? 0 : 4;
      const g = cur.g + 1 + extra;
      if (g < (cost.get(n) ?? Number.POSITIVE_INFINITY)) {
        cost.set(n, g);
        back.set(n, cur.t);
        open.push({ t: n, g, f: g + left(n) });
      }
    }
  }
  const path = [to];
  for (let t = to; t !== from; ) {
    const prev = back.get(t);
    if (!prev) return [from, to];
    path.unshift(prev);
    t = prev;
  }
  return path;
}

/**
 * The road as it is walked and drawn: from point `a` to point `b` through the middles of the tiles
 * between, its corners rounded (two passes of Chaikin's cutting).
 */
export function gridRoad(
  a: [number, number],
  b: [number, number],
  map: SquareMap,
  towns: Set<string>,
): [number, number][] {
  const size = map.tileSize;
  const mids = gridRoadTiles(tileAt(a[0], a[1], size), tileAt(b[0], b[1], size), map, towns)
    .slice(1, -1)
    .map((t) => tileCentre(t, size));
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

/** A line's length, in the chart's units. */
export function roadLength(pts: [number, number][]): number {
  let n = 0;
  for (let i = 1; i < pts.length; i++) {
    const [ax, ay] = pts[i - 1] as [number, number];
    const [bx, by] = pts[i] as [number, number];
    n += Math.hypot(bx - ax, by - ay);
  }
  return n;
}

/** The point at a share (0 to 1) of a line's length, and its heading there (radians). */
export function alongRoad(
  pts: [number, number][],
  k: number,
): { x: number; y: number; angle: number } {
  const total = roadLength(pts);
  let want = Math.min(1, Math.max(0, k)) * total;
  for (let i = 1; i < pts.length; i++) {
    const [ax, ay] = pts[i - 1] as [number, number];
    const [bx, by] = pts[i] as [number, number];
    const seg = Math.hypot(bx - ax, by - ay);
    if (want <= seg || i === pts.length - 1) {
      const u = seg > 0 ? Math.min(1, want / seg) : 0;
      return { x: ax + (bx - ax) * u, y: ay + (by - ay) * u, angle: Math.atan2(by - ay, bx - ax) };
    }
    want -= seg;
  }
  const [x, y] = pts[0] ?? [0, 0];
  return { x, y, angle: 0 };
}
