/**
 * The night board laid over the house's map (docs/plan-plateau.md, lot 2): a tile per sector seen
 * (one's own sand-gold, the others mist-blue, the sea next to them a lagoon), the unknown in
 * outline, each sector dressed after its region and its seed, the towns, the fondaci, the Remise,
 * the Campo and the Porta as models. What changes with the clock (orders, vehicles) is not here:
 * the board changes only with the map.
 */
import { HEX_SIZE, cellCentre, neighbours } from "../hexmap.js";
import { type Shape, hashOf, project, rng } from "./geom.js";
import {
  C,
  Scene,
  barn,
  dock,
  fogTile,
  fondaco,
  house,
  mountain,
  pine,
  plots,
  rock,
  tile,
  tower,
  town,
} from "./props.js";

export interface BoardInput {
  /** The land sectors seen, with their region and whether the sea touches them. */
  cells: Record<string, { region: string; coast: boolean }>;
  /** Every sector seen, land or sea. */
  revealed: string[];
  /** The sectors the house owns. */
  unlocked: string[];
  cities: { code: string; region: string; x: number; y: number; size?: number }[];
  home: { x: number; y: number } | null;
  posts: { x: number; y: number }[];
  depot: string | null;
  camp: string | null;
  porta: string | null;
}

/** What each region grows: mountains, pines, rocks, fields (out of a sector's draw). */
const DRESS: Record<string, [number, number, number, number]> = {
  veneto: [0, 4, 1, 2],
  lombardia: [1, 4, 1, 2],
  friuli: [1, 5, 2, 1],
  romagna: [0, 3, 1, 2],
  dalmazia: [1, 3, 3, 0],
  germania: [2, 6, 2, 0],
  grecia: [1, 1, 4, 1],
  levante: [0, 1, 3, 1],
  costantinopoli: [0, 2, 2, 1],
  fiandra: [0, 3, 1, 3],
};

/** The board's shapes, in the order they are drawn. */
export function board(m: BoardInput): Shape[] {
  const sc = new Scene();
  const own = new Set(m.unlocked);
  const seen = new Set(m.revealed);
  const land = (k: string) => k in m.cells;
  const sea = (k: string) => seen.has(k) && !land(k);
  // The tiles: land seen, and the sea seen next to land.
  for (const k of m.revealed) {
    const [x, y] = cellCentre(k);
    if (land(k)) tile(sc, x, y, HEX_SIZE, own.has(k) ? "own" : "seen");
    else {
      // The sea seen: one lagoon, without walls between its tiles.
      const nb = neighbours(k);
      // Its two front faces look at « 0,+1 » (6th neighbour) and « −1,+1 » (5th).
      tile(sc, x, y, HEX_SIZE, "water", [sea(nb[5] as string), sea(nb[4] as string)]);
    }
  }
  // The unknown next to what is seen.
  for (const k of new Set(m.revealed.flatMap(neighbours)))
    if (!seen.has(k)) {
      const [x, y] = cellCentre(k);
      fogTile(sc, x, y, HEX_SIZE);
    }
  // What stands: towns, fondaci, buildings. The dressing keeps clear of them.
  const stands: [number, number][] = [];
  for (const c of m.cities) {
    const k = cellOfPoint(c.x, c.y, m);
    if (!k) continue;
    town(sc, c.x, c.y, c.size ?? 1, hashOf(c.code), !own.has(k), 0.5);
    stands.push([c.x, c.y]);
  }
  if (m.home) {
    fondaco(sc, m.home.x, m.home.y, 0.58);
    stands.push([m.home.x, m.home.y]);
  }
  for (const p of m.posts) {
    fondaco(sc, p.x, p.y, 0.34);
    stands.push([p.x, p.y]);
  }
  if (m.depot) {
    const [x, y] = cellCentre(m.depot);
    barn(sc, x - 9, y + 9, 0.42);
    stands.push([x - 9, y + 9]);
  }
  if (m.camp) {
    const [x, y] = cellCentre(m.camp);
    plots(sc, x, y + 7, 0.45);
    tower(sc, x + 3, y + 5, 0.4, 0.4, 10, C.roof);
    stands.push([x, y + 7]);
  }
  if (m.porta) {
    const [x, y] = cellCentre(m.porta);
    portaGate(sc, x + 9, y - 9);
    stands.push([x + 9, y - 9]);
  }
  // The dressing of each land sector seen.
  for (const k of Object.keys(m.cells)) {
    const { region, coast } = m.cells[k] as { region: string; coast: boolean };
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
        if (stands.every(([sx, sy]) => Math.hypot(sx - x, sy - y) > clear)) {
          stands.push([x, y]);
          return [x, y];
        }
      }
      return null;
    };
    for (let i = 0; i < mo; i++) {
      const at = spot(14);
      if (at) mountain(sc, at[0], at[1], 0.38 + r() * 0.14, hashOf(k) + i, muted);
    }
    for (let i = 0; i < fi; i++) {
      const at = spot(9);
      if (at) plots(sc, at[0], at[1], 0.4);
    }
    for (let i = 0; i < pi; i++) {
      const at = spot(5);
      if (!at) continue;
      // A small wood: a few pines together.
      const n = 1 + Math.floor(r() * 3);
      for (let j = 0; j < n; j++)
        pine(sc, at[0] + (r() - 0.5) * 4, at[1] + (r() - 0.5) * 3.5, 0.42 + r() * 0.18, muted);
    }
    for (let i = 0; i < ro; i++) {
      const at = spot(5);
      if (at) rock(sc, at[0], at[1], 0.35 + r() * 0.25, hashOf(k) + 7 * i, muted);
    }
    if (coast) {
      const water = neighbours(k).findIndex((n) => sea(n));
      if (water >= 0) {
        const [wx, wy] = cellCentre(neighbours(k)[water] as string);
        const x = cx + (wx - cx) * 0.48;
        const y = cy + (wy - cy) * 0.48;
        if (stands.every(([sx, sy]) => Math.hypot(sx - x, sy - y) > 8)) dock(sc, x, y, 0.4);
      }
    }
    // A house or two in the countryside of one's own.
    if (!muted && r() > 0.5) {
      const at = spot(7);
      if (at) house(sc, at[0], at[1], 0.36, r() * 1.5, C.roof, r() > 0.5);
    }
  }
  return sc.shapes();
}

/** The Porta: an old gate of stone, its arch glowing. */
function portaGate(sc: Scene, x: number, y: number) {
  tower(sc, x - 3, y, 0.5, 0, 9, C.rockSeen);
  tower(sc, x + 3, y, 0.5, 0, 9, C.rockSeen);
  const [ax, ay] = project([x, y + 1.6, 0]);
  sc.add(y + 2, [
    {
      points: `M${(ax - 1.8).toFixed(1)} ${ay.toFixed(1)}v-2.4a1.8 1.8 0 0 1 3.6 0v2.4z`,
      path: true,
      fill: "#E06A4A",
      stroke: "#5A1A0E",
      strokeWidth: 0.4,
    },
  ]);
}

function cellOfPoint(x: number, y: number, m: BoardInput): string | null {
  let best: string | null = null;
  let bestD = Number.POSITIVE_INFINITY;
  for (const k of m.revealed) {
    const [cx, cy] = cellCentre(k);
    const d = Math.hypot(cx - x, cy - y);
    if (d < bestD) {
      bestD = d;
      best = k;
    }
  }
  return bestD <= HEX_SIZE ? best : null;
}
