/**
 * The 3D map prototype (?map=3d): what stands on the board, out of the house's map, as plain data.
 * The same input as the night board's SVG (art/plateau/board.ts), the same grid (art/hexmap.ts,
 * pointy-top, HEX_SIZE across the corners), the same seeds: a sector dressed in SVG is dressed alike
 * in 3D. Everything here is in chart units (x east, y south); the renderer lays y along its z axis.
 * Pure and deterministic: no three.js here, it is tested as is.
 */
import { DRESS } from "../../art/plateau/board.js";
import { hashOf, rng } from "../../art/plateau/geom.js";
import { HEX_SIZE, cellCentre, neighbours } from "../../art/hexmap.js";

export interface SceneInput {
  cells: Record<string, { region: string; coast?: boolean }>;
  revealed: string[];
  unlocked: string[];
  cities: { code: string; region: string; x: number; y: number; size?: number }[];
  home: { x: number; y: number } | null;
  posts: { x: number; y: number }[];
  depot: string | null;
}

export type TileKind = "own" | "seen" | "water" | "fog";

export interface Tile {
  key: string;
  x: number;
  y: number;
  kind: TileKind;
}

export type PropKind = "pine" | "rock" | "mountain" | "plots" | "dock" | "house";

/** A thing of the dressing: where, how big (a share of the model's own size), turned how. */
export interface Prop {
  kind: PropKind;
  x: number;
  y: number;
  s: number;
  rot: number;
  /** Which of the model's variants (0, 1, 2…). */
  variant: number;
  /** On a sector seen, not one's own: its colours muted. */
  muted: boolean;
}

export interface Town {
  code: string;
  x: number;
  y: number;
  size: number;
  muted: boolean;
  /** Its houses around, and its campanile. */
  houses: { x: number; y: number; rot: number; variant: number; s: number }[];
  campanile: { x: number; y: number; s: number };
}

export interface Scene3D {
  tiles: Tile[];
  props: Prop[];
  towns: Town[];
  home: { x: number; y: number } | null;
  posts: { x: number; y: number }[];
  depot: { x: number; y: number } | null;
  /** The ground seen, in chart units: the camera keeps over it. */
  bounds: { minX: number; maxX: number; minY: number; maxY: number };
}

/** What stands keeps this clear around it (chart units). */
const CLEAR = { town: 7, home: 8, depot: 6 } as const;

export function scene3d(m: SceneInput): Scene3D {
  const own = new Set(m.unlocked);
  const seen = new Set(m.revealed);
  const land = (k: string) => k in m.cells;
  const sea = (k: string) => seen.has(k) && !land(k);
  const tiles: Tile[] = [];
  for (const k of m.revealed) {
    const [x, y] = cellCentre(k);
    tiles.push({ key: k, x, y, kind: land(k) ? (own.has(k) ? "own" : "seen") : "water" });
  }
  for (const k of new Set(m.revealed.flatMap(neighbours)))
    if (!seen.has(k)) {
      const [x, y] = cellCentre(k);
      tiles.push({ key: k, x, y, kind: "fog" });
    }

  const stands: [number, number, number][] = [];
  const clearOf = (x: number, y: number, d: number) =>
    stands.every(([sx, sy, sr]) => Math.hypot(sx - x, sy - y) > Math.max(d, sr));

  const towns: Town[] = [];
  for (const c of m.cities) {
    const k = cellOf(c.x, c.y, m.revealed);
    if (!k) continue;
    const size = c.size ?? 1;
    const r = rng(hashOf(c.code));
    const n = Math.min(5, 1 + size);
    const s = 0.75 + size * 0.06;
    const houses: Town["houses"] = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + r();
      const d = 2.4 + r() * (0.6 + size * 0.35);
      houses.push({
        x: c.x + Math.cos(a) * d,
        y: c.y + Math.sin(a) * d * 0.85,
        rot: Math.floor(r() * 6) * (Math.PI / 3),
        variant: r() > 0.5 ? 1 : 0,
        s: s * (0.85 + r() * 0.25),
      });
    }
    towns.push({
      code: c.code,
      x: c.x,
      y: c.y,
      size,
      muted: !own.has(k),
      houses,
      campanile: { x: c.x + 0.6, y: c.y - 0.8, s: 0.8 + size * 0.07 },
    });
    stands.push([c.x, c.y, CLEAR.town]);
  }
  const home = m.home ? { x: m.home.x, y: m.home.y } : null;
  if (home) stands.push([home.x, home.y, CLEAR.home]);
  for (const p of m.posts) stands.push([p.x, p.y, CLEAR.home * 0.7]);
  let depot: Scene3D["depot"] = null;
  if (m.depot) {
    const [x, y] = cellCentre(m.depot);
    depot = { x: x - 9, y: y + 9 };
    stands.push([depot.x, depot.y, CLEAR.depot]);
  }

  // The dressing of each land sector seen, drawn as the SVG board draws it.
  const props: Prop[] = [];
  for (const k of Object.keys(m.cells)) {
    if (!seen.has(k)) continue;
    const { region, coast } = m.cells[k] as { region: string; coast?: boolean };
    const [cx, cy] = cellCentre(k);
    const r = rng(hashOf(k));
    const muted = !own.has(k);
    const [mo, pi, ro, fi] = DRESS[region] ?? [0, 3, 1, 1];
    const spot = (clear: number): [number, number] | null => {
      for (let i = 0; i < 8; i++) {
        const a = r() * Math.PI * 2;
        const d = Math.sqrt(r()) * HEX_SIZE * 0.68;
        const x = cx + Math.cos(a) * d;
        const y = cy + Math.sin(a) * d * 0.9;
        if (clearOf(x, y, clear)) {
          stands.push([x, y, 0]);
          return [x, y];
        }
      }
      return null;
    };
    const turn = () => r() * Math.PI * 2;
    for (let i = 0; i < mo; i++) {
      const at = spot(14);
      if (at)
        props.push({
          kind: "mountain",
          x: at[0],
          y: at[1],
          s: 0.38 + r() * 0.14,
          rot: turn(),
          variant: i % 3,
          muted,
        });
    }
    for (let i = 0; i < fi; i++) {
      const at = spot(9);
      if (at) props.push({ kind: "plots", x: at[0], y: at[1], s: 0.4, rot: turn(), variant: 0, muted });
    }
    for (let i = 0; i < pi; i++) {
      const at = spot(5);
      if (!at) continue;
      // A small wood: a few pines together.
      const n = 1 + Math.floor(r() * 3);
      for (let j = 0; j < n; j++)
        props.push({
          kind: "pine",
          x: at[0] + (r() - 0.5) * 4,
          y: at[1] + (r() - 0.5) * 3.5,
          s: 0.42 + r() * 0.18,
          rot: turn(),
          variant: j % 2,
          muted,
        });
    }
    for (let i = 0; i < ro; i++) {
      const at = spot(5);
      if (at)
        props.push({
          kind: "rock",
          x: at[0],
          y: at[1],
          s: 0.35 + r() * 0.25,
          rot: turn(),
          variant: i % 3,
          muted,
        });
    }
    if (coast) {
      const water = neighbours(k).findIndex((n) => sea(n));
      if (water >= 0) {
        const [wx, wy] = cellCentre(neighbours(k)[water] as string);
        const x = cx + (wx - cx) * 0.48;
        const y = cy + (wy - cy) * 0.48;
        if (clearOf(x, y, 8))
          props.push({
            kind: "dock",
            x,
            y,
            s: 0.4,
            rot: Math.atan2(wy - cy, wx - cx),
            variant: 0,
            muted,
          });
      }
    }
    // A house or two in the countryside of one's own.
    if (!muted && r() > 0.5) {
      const at = spot(7);
      if (at)
        props.push({
          kind: "house",
          x: at[0],
          y: at[1],
          s: 0.36,
          rot: r() * 1.5,
          variant: r() > 0.5 ? 1 : 0,
          muted,
        });
    }
  }

  const xs = tiles.filter((t) => t.kind !== "fog").map((t) => t.x);
  const ys = tiles.filter((t) => t.kind !== "fog").map((t) => t.y);
  const pad = HEX_SIZE;
  const bounds = {
    minX: Math.min(...xs) - pad,
    maxX: Math.max(...xs) + pad,
    minY: Math.min(...ys) - pad,
    maxY: Math.max(...ys) + pad,
  };
  return { tiles, props, towns, home, posts: m.posts, depot, bounds };
}

/** The sector under a point, among those seen. */
export function cellOf(x: number, y: number, revealed: string[]): string | null {
  let best: string | null = null;
  let bestD = Number.POSITIVE_INFINITY;
  for (const k of revealed) {
    const [cx, cy] = cellCentre(k);
    const d = Math.hypot(cx - x, cy - y);
    if (d < bestD) {
      bestD = d;
      best = k;
    }
  }
  return bestD <= HEX_SIZE ? best : null;
}

/**
 * A road between two points of the board, as the mules walk it: a gentle bend to one side (its
 * seed), sampled at `n` points from `a` to `b`. Chart units.
 */
export function road(
  a: [number, number],
  b: [number, number],
  bend = 0.18,
  n = 24,
): [number, number][] {
  const [dx, dy] = [b[0] - a[0], b[1] - a[1]];
  const len = Math.hypot(dx, dy) || 1;
  const [nx, ny] = [-dy / len, dx / len];
  const out: [number, number][] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const off = Math.sin(Math.PI * t) * bend * len;
    out.push([a[0] + dx * t + nx * off, a[1] + dy * t + ny * off]);
  }
  return out;
}

/**
 * The Veneto seen wider, for the prototype's second view (?map=3d&scene=veneto): the game's own
 * map (the engine's cells and towns), every sector within two of the house's seen, the sea among
 * them a lagoon, the house's sector and the Veneto's two nearest its own, a Remise put down.
 */
export function wider(
  m: SceneInput,
  map: {
    cells: Record<string, { region: string; coast?: boolean }>;
    cities: (SceneInput["cities"][number] & { cell: string })[];
  },
): SceneInput {
  const start = m.revealed[0] ?? "2,4";
  const ring = new Set([start]);
  for (let i = 0; i < 2; i++) for (const k of [...ring]) for (const n of neighbours(k)) ring.add(n);
  const revealed = [...ring].sort();
  const cells: SceneInput["cells"] = {};
  for (const k of revealed) if (map.cells[k]) cells[k] = map.cells[k] as SceneInput["cells"][string];
  const veneto = revealed.filter((k) => cells[k]?.region === "veneto" && k !== start).slice(0, 2);
  const unlocked = [...new Set([...m.unlocked, ...veneto])];
  return {
    ...m,
    cells,
    revealed,
    unlocked,
    cities: map.cities.filter((c) => ring.has(c.cell)),
    depot: m.depot ?? veneto[0] ?? null,
  };
}
