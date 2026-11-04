/**
 * The 3D map (docs/plateau-reprise.md § 7 and 8): what stands on the board, out of the house's map,
 * as plain data. Each sector seen is cut in seven small tiles (the engine's, slots.ts: one board
 * without a gap), each of one kind (decision of the owner, 3 November 2026, after his references):
 * a town, a fondaco, a forest, a mountain, fields, rocks, a plain, a farm; the sea in small tiles of
 * lagoon, the unknown in small tiles of glass. The kinds are drawn after the region (`DRESS`) and a
 * seed by tile: the same board at every call. Chart units (x east, y south); the renderer lays y
 * along its z axis. Pure and deterministic: no three.js here, it is tested as is.
 */
import {
  type EmpireSettings,
  SLOT_STEP,
  SLOT_TURN,
  roadBetween,
  slotAt,
  slotPoint,
} from "@comptoirs/engine";
import { HEX_SIZE, cellCentre, neighbours } from "../../art/hexmap.js";
import { DRESS } from "../../art/plateau/board.js";
import { hashOf, rng } from "../../art/plateau/geom.js";
import type { EmpirePayload } from "../types.js";

export interface SceneInput {
  cells: Record<string, { region: string; coast?: boolean }>;
  revealed: string[];
  unlocked: string[];
  cities: { code: string; region: string; x: number; y: number; size?: number }[];
  home: { x: number; y: number } | null;
  posts: { x: number; y: number }[];
  depot: string | null;
  /** The Campo's sector, and the Porta's (docs/plan-porta.md). */
  camp?: string | null;
  porta?: string | null;
  /** The small tiles of lagoon (`<cell>#<k>`): water among the land. */
  water?: string[];
}

/** The scene's input out of the house's view (the 3D board, its touches, the map's marks). */
export function sceneInputOf(p: EmpirePayload): SceneInput {
  const map = p.view?.map;
  return {
    cells: map?.cells ?? {},
    revealed: map?.revealed ?? [],
    unlocked: map?.unlocked ?? [],
    cities: map?.cities ?? [],
    home: !map || map.home?.placed === false ? null : map.home,
    posts: map?.posts ?? [],
    depot: map?.depot ?? null,
    camp: map?.camp ?? null,
    porta: p.view?.porta?.cell ?? null,
    water: map?.water ?? [],
  };
}

/**
 * What the board is built from, as a string: the same for two payloads of the same map (the server
 * sends a new object at each refresh, every 30 seconds and at each action), so that the scene is
 * built again only when the map did change.
 */
export function sceneKey(p: EmpirePayload): string {
  return JSON.stringify(sceneInputOf(p));
}

export type TileKind = "own" | "seen" | "water" | "fog";

/** What a small tile holds: one thing each, after the owner's references. */
export type Theme =
  | "town"
  | "fondaco"
  | "depot"
  | "camp"
  | "porta"
  | "forest"
  | "mountain"
  | "field"
  | "rocks"
  | "plain"
  | "farm"
  | "water"
  | "fog";

/** A small tile: its sector, its rank there, its middle, its ground, what it holds. */
export interface Tile {
  key: string;
  cell: string;
  k: number;
  x: number;
  y: number;
  kind: TileKind;
  theme: Theme;
}

/** A small tile's size across its corners, and how far it is turned (the engine's lattice). */
export const TILE_R = (SLOT_STEP * HEX_SIZE) / Math.sqrt(3);

export type PropKind =
  | "pine"
  | "rock"
  | "mountain"
  | "plots"
  | "dock"
  | "house"
  | "mill"
  | "field"
  | "mine"
  | "barrel"
  | "tuft"
  | "pebble"
  | "sand"
  | "cart"
  | "smoke";

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
  /** Its houses around, and its monument (Venice's campanile, Padua's domes, a church else). */
  houses: { x: number; y: number; rot: number; variant: number; s: number }[];
  campanile: { x: number; y: number; s: number };
  monument: "campanile" | "basilica" | "church";
}

export interface Scene3D {
  tiles: Tile[];
  props: Prop[];
  towns: Town[];
  home: { x: number; y: number } | null;
  posts: { x: number; y: number }[];
  depot: { x: number; y: number } | null;
  /** The lanes walked from the fondaci to the towns (the dressing keeps off them). */
  lanes: [number, number][][];
  camp: { x: number; y: number } | null;
  porta: { x: number; y: number } | null;
  /** The ground seen, in chart units: the camera keeps over it. */
  bounds: { minX: number; maxX: number; minY: number; maxY: number };
}

/** The dressing keeps this far off a road (chart units). */
const ROAD_CLEAR = 2.2;
/** A lane is drawn from a fondaco to a town at most this far (chart units). */
const LANE_MAX = 60;

const S = { map: { hexSize: HEX_SIZE } } as EmpireSettings;
const tileKey = (cell: string, k: number) => `${cell}#${k}`;
/** The small tiles' lattice turned (the engine's SLOT_TURN), in degrees. */
const SLOT_TURN_DEG = (Math.atan(Math.sqrt(3) / 5) * 180) / Math.PI;
/** The towns with a monument of their own (decision of the owner, 3 November 2026). */
const MONUMENTS: Record<string, Town["monument"]> = { venezia: "campanile", padova: "basilica" };

export function scene3d(m: SceneInput): Scene3D {
  const own = new Set(m.unlocked);
  const seen = new Set(m.revealed);
  const land = (k: string) => k in m.cells;
  const sea = (k: string) => seen.has(k) && !land(k);

  // The places stand on their small tiles: the towns and the fondaci on theirs (the engine put them
  // there), the Remise, the Campo and the Porta on the free tile of their sector nearest their old
  // point.
  const held = new Map<string, Theme>();
  const at = (x: number, y: number) => {
    const t = slotAt(x, y, S);
    return tileKey(t.cell, t.k);
  };
  const middle = (cell: string, k: number): [number, number] => slotPoint(cell, k, S);
  const towns: Town[] = [];
  for (const c of m.cities) {
    const t = slotAt(c.x, c.y, S);
    if (!seen.has(t.cell)) continue;
    held.set(tileKey(t.cell, t.k), "town");
    const size = c.size ?? 1;
    const r = rng(hashOf(c.code));
    // Two houses a size (decision of the owner, 3 November: the towns larger, up to ten for
    // Venice), in two rings round the monument.
    const n = Math.min(10, 2 * size);
    const s = 0.75 + size * 0.06;
    const houses: Town["houses"] = [];
    const inner = Math.ceil(n / 2);
    for (let i = 0; i < n; i++) {
      const ring = i < inner ? 0 : 1;
      const m = ring ? n - inner : inner;
      const j = ring ? i - inner : i;
      const a = (j / Math.max(1, m)) * Math.PI * 2 + r() * 0.5 + ring * 0.6;
      const d = ring ? 3.6 + r() * 0.5 : 2.2 + r() * 0.4;
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
      muted: !own.has(t.cell),
      houses,
      campanile: { x: c.x + 0.6, y: c.y - 0.8, s: 0.8 + size * 0.07 },
      monument: MONUMENTS[c.code] ?? "church",
    });
  }
  const home = m.home ? { x: m.home.x, y: m.home.y } : null;
  if (home) held.set(at(home.x, home.y), "fondaco");
  for (const p of m.posts) held.set(at(p.x, p.y), "fondaco");
  const sites = sitesOf(m);
  for (const [theme, at] of Object.entries(sites))
    if (at) held.set(tileKey(at.cell, at.k), theme as Theme);
  const depot = sites.depot && { x: sites.depot.x, y: sites.depot.y };
  const camp = sites.camp && { x: sites.camp.x, y: sites.camp.y };
  const porta = sites.porta && { x: sites.porta.x, y: sites.porta.y };

  // The roads the vehicles walk, tile after tile, from a fondaco to a town (the engine's
  // `roadBetween`, as logic.ts's `vehiclePose` follows them).
  const lanes: [number, number][][] = [];
  const fondaci = [...(home ? [home] : []), ...m.posts];
  const ways = {
    map: { hexSize: HEX_SIZE, tiles: true, cities: m.cities, cells: m.cells },
  } as unknown as EmpireSettings;
  for (const f of fondaci)
    for (const tw of towns) {
      const d = Math.hypot(tw.x - f.x, tw.y - f.y);
      if (d > LANE_MAX || d < 1) continue;
      lanes.push(roadBetween([f.x, f.y], [tw.x, tw.y], ways));
    }
  // A tile a road crosses holds nothing tall: a plain or rocks, the road through it.
  const crossed = (x: number, y: number) =>
    lanes.some((l) => l.some(([lx, ly]) => Math.hypot(lx - x, ly - y) < TILE_R * 0.6));
  // The small tiles: seven a sector seen, land, sea or unknown; the free ones of the land drawn a
  // kind after their region.
  const tiles: Tile[] = [];
  const props: Prop[] = [];
  const wet = new Set(m.water ?? []);
  const add = (cell: string, kindOf: TileKind) => {
    for (let k = 0; k < 7; k++) {
      const [x, y] = middle(cell, k);
      const key = tileKey(cell, k);
      // A small tile of lagoon among the land (Venice's): water as the sea's.
      const kind: TileKind = kindOf !== "fog" && wet.has(key) ? "water" : kindOf;
      let theme: Theme =
        kind === "water" ? "water" : kind === "fog" ? "fog" : (held.get(key) ?? "plain");
      if ((kind === "own" || kind === "seen") && !held.has(key))
        theme = crossed(x, y) ? lowTheme(m, cell, k) : drawTheme(m, cell, k, kind === "own");
      tiles.push({ key, cell, k, x, y, kind, theme });
    }
  };
  for (const cell of m.revealed) add(cell, land(cell) ? (own.has(cell) ? "own" : "seen") : "water");
  for (const cell of new Set(m.revealed.flatMap(neighbours))) if (!seen.has(cell)) add(cell, "fog");

  const onLane = (x: number, y: number) =>
    lanes.some((l) => l.some(([lx, ly]) => Math.hypot(lx - x, ly - y) < ROAD_CLEAR));

  // Each tile's dressing, after its kind, kept inside it and off the lanes.
  const water = new Set(tiles.filter((t) => t.theme === "water").map((t) => t.key));
  for (const t of tiles) {
    if (t.kind === "water" || t.kind === "fog") continue;
    const muted = t.kind === "seen";
    const r = rng(hashOf(t.key));
    const turn = () => r() * Math.PI * 2;
    const inside = (rad: number): [number, number] => {
      const a = r() * Math.PI * 2;
      const d = Math.sqrt(r()) * rad;
      return [t.x + Math.cos(a) * d, t.y + Math.sin(a) * d];
    };
    const put = (kind: PropKind, p: [number, number], s: number, variant = 0, rot = turn()) => {
      if (onLane(p[0], p[1]) && kind !== "mountain") return;
      props.push({ kind, x: p[0], y: p[1], s, rot, variant, muted });
    };
    // The little things of the ground: tufts of grass, pebbles, now and then a patch of sand.
    const ground = (tufts: number, pebbles: number) => {
      for (let i = 0; i < tufts; i++) put("tuft", inside(TILE_R * 0.8), 0.9 + r() * 0.5, 0);
      for (let i = 0; i < pebbles; i++) put("pebble", inside(TILE_R * 0.8), 0.7 + r() * 0.6, 0);
    };
    const across = SLOT_TURN_DEG + Math.floor(r() * 6) * 60;
    switch (t.theme) {
      case "forest": {
        // A dense wood: pines close together, of every size.
        const n = 11 + Math.floor(r() * 6);
        for (let i = 0; i < n; i++) put("pine", inside(TILE_R * 0.74), 0.42 + r() * 0.34, i % 2);
        ground(3, 1);
        break;
      }
      case "mountain":
        put("mountain", [t.x, t.y - 1], 0.58 + r() * 0.1, Math.floor(r() * 3));
        // A mine at its foot, now and then, its rails toward the eye.
        if (r() > 0.45) put("mine", [t.x + 1.5, t.y + 3.6], 0.62, 0, 0);
        ground(1, 3);
        break;
      case "field":
        put("field", [t.x, t.y], 1, 0, (across * Math.PI) / 180);
        ground(2, 1);
        break;
      case "rocks":
        for (let i = 0; i < 3; i++) put("rock", inside(TILE_R * 0.6), 0.5 + r() * 0.3, i % 3);
        put("pine", inside(TILE_R * 0.7), 0.5, 1);
        ground(3, 4);
        break;
      case "farm":
        put(
          "house",
          [t.x - 1.2, t.y - 2],
          0.42,
          r() > 0.5 ? 1 : 0,
          ((SLOT_TURN_DEG + 180) * Math.PI) / 180,
        );
        put("smoke", [t.x - 0.4, t.y - 2.6], 1, 0, 0);
        put("mill", [t.x + 3.4, t.y - 1.8], 0.62, 0, (Math.round(r() * 2) * Math.PI) / 3);
        put("barrel", [t.x + 0.8, t.y + 1.2], 1, 0);
        put("barrel", [t.x + 1.7, t.y + 1.6], 0.9, 0);
        put("cart", [t.x - 3.2, t.y + 2.4], 0.8, 0);
        put("sand", [t.x, t.y + 0.5], 1, 0);
        ground(3, 2);
        break;
      case "plain":
        put("sand", inside(TILE_R * 0.3), 0.8 + r() * 0.3, 0);
        for (let i = 0; i < 2; i++) put("pine", inside(TILE_R * 0.7), 0.45 + r() * 0.2, i % 2);
        put("rock", inside(TILE_R * 0.7), 0.4, 0);
        ground(5, 3);
        break;
      default:
        break;
    }
    // A landing on a tile by the lagoon, at its edge on the water's side.
    const wet = tiles.find(
      (o) => water.has(o.key) && Math.hypot(o.x - t.x, o.y - t.y) < 1.2 * SLOT_STEP * HEX_SIZE,
    );
    if (wet && (t.theme === "plain" || t.theme === "rocks" || t.theme === "field")) {
      const a = Math.atan2(wet.y - t.y, wet.x - t.x);
      props.push({
        kind: "dock",
        x: t.x + Math.cos(a) * TILE_R * 0.55,
        y: t.y + Math.sin(a) * TILE_R * 0.55,
        s: 0.4,
        rot: a,
        variant: 0,
        muted,
      });
    }
  }

  const solid = tiles.filter((t) => t.kind !== "fog");
  const pad = HEX_SIZE;
  const bounds = {
    minX: Math.min(...solid.map((t) => t.x)) - pad,
    maxX: Math.max(...solid.map((t) => t.x)) + pad,
    minY: Math.min(...solid.map((t) => t.y)) - pad,
    maxY: Math.max(...solid.map((t) => t.y)) + pad,
  };
  return { tiles, props, towns, home, posts: m.posts, depot, camp, porta, lanes, bounds };
}

/**
 * Where the Remise, the Campo and the Porta stand on the small tiles: each on the free tile of its
 * sector (no town's, no fondaco's, no other site's) nearest the point the SVG board gives it. The
 * 3D board, its touches and the map's marks all stand them so.
 */
export function sitesOf(
  m: SceneInput,
): Record<"depot" | "camp" | "porta", { cell: string; k: number; x: number; y: number } | null> {
  const taken = new Set<string>();
  for (const c of m.cities) {
    const t = slotAt(c.x, c.y, S);
    taken.add(tileKey(t.cell, t.k));
  }
  for (const f of [...(m.home ? [m.home] : []), ...m.posts]) {
    const t = slotAt(f.x, f.y, S);
    taken.add(tileKey(t.cell, t.k));
  }
  const one = (cell: string | null | undefined, dx: number, dy: number) => {
    if (!cell) return null;
    const [cx, cy] = cellCentre(cell);
    const old: [number, number] = [cx + dx, cy + dy];
    const free = [0, 1, 2, 3, 4, 5, 6]
      .filter((k) => !taken.has(tileKey(cell, k)))
      .map((k) => ({ k, p: slotPoint(cell, k, S) }))
      .sort(
        (a, b) =>
          Math.hypot(a.p[0] - old[0], a.p[1] - old[1]) -
          Math.hypot(b.p[0] - old[0], b.p[1] - old[1]),
      )[0];
    const k = free?.k ?? 0;
    taken.add(tileKey(cell, k));
    const [x, y] = slotPoint(cell, k, S);
    return { cell, k, x, y };
  };
  return { depot: one(m.depot, -9, 9), camp: one(m.camp, 0, 7), porta: one(m.porta, 9, -9) };
}

/** A kind for a tile a road crosses: a plain, or rocks now and then. */
function lowTheme(m: SceneInput, cell: string, k: number): Theme {
  const [, , ro] = DRESS[m.cells[cell]?.region ?? ""] ?? [0, 3, 1, 1];
  return rng(hashOf(`${cell}#${k}:low`))() < ro * 0.15 ? "rocks" : "plain";
}

/**
 * A free tile's kind, after its region's dressing (`DRESS`: mountains, pines, rocks, fields) and
 * its seed: a forest, a mountain, rocks, fields; a plain where the region holds little; on one's
 * own land, now and then a farm and its mill.
 */
function drawTheme(m: SceneInput, cell: string, k: number, mine: boolean): Theme {
  const region = m.cells[cell]?.region ?? "";
  const [mo, pi, ro, fi] = DRESS[region] ?? [0, 3, 1, 1];
  const weights: [Theme, number][] = [
    ["mountain", mo * 1.2],
    ["forest", pi * 0.6],
    ["rocks", ro * 0.5],
    ["field", fi * 0.8],
    ["plain", 1],
    ["farm", mine ? 0.9 : 0],
  ];
  const total = weights.reduce((n, [, w]) => n + w, 0);
  let x = rng(hashOf(`${cell}#${k}:kind`))() * total;
  for (const [theme, w] of weights) {
    if (x < w) return theme;
    x -= w;
  }
  return "plain";
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

/** A place's touch on the 3D board: a hexagon around it (chart units). */
export interface Zone {
  /** As the map names places: « home », a post's id, « city:<code> », « depot », « camp »… */
  id: string;
  x: number;
  y: number;
  r: number;
  /** How high it stands (chart units): as high as what is drawn there, its roof and its flag. */
  h: number;
}

/** How high a place's touch stands: the fondaco to its flag, a town to its monument. */
function zoneHeight(id: string): number {
  if (id === "home") return 16;
  if (id.startsWith("city:")) return 14;
  if (id === "depot" || id === "camp" || id === "porta" || id === "arsenal") return 9;
  // A fondaco of another region (drawn smaller).
  return 11;
}

/** A place's touch reaches at most this far, at least this far (chart units). */
const ZONE_MAX = 7;
const ZONE_MIN = 2.5;

/**
 * The places' touches: a hexagon each, as large as it may be without meeting its neighbour's (half
 * the way to the nearest place, between ZONE_MIN and ZONE_MAX). Two touches never overlap, unless
 * two places stand closer than twice ZONE_MIN.
 */
export function zones(places: { id: string; x: number; y: number }[]): Zone[] {
  return places.map((p) => {
    const nearest = Math.min(
      Number.POSITIVE_INFINITY,
      ...places.filter((q) => q !== p).map((q) => Math.hypot(q.x - p.x, q.y - p.y)),
    );
    // A hexagon's flat sides lie at r·cos 30° from its middle: half the way, to its corners.
    const r = Math.min(ZONE_MAX, Math.max(ZONE_MIN, nearest / 2));
    return { id: p.id, x: p.x, y: p.y, r, h: zoneHeight(p.id) };
  });
}

/** A small tile's corners (chart units), turned as the engine's lattice (SLOT_TURN). */
export function tileCorners(x: number, y: number, r = TILE_R): [number, number][] {
  return Array.from({ length: 6 }, (_, i) => {
    const a = (-(90 + 60 * i) * Math.PI) / 180 - SLOT_TURN;
    return [x + r * Math.cos(a), y + r * Math.sin(a)] as [number, number];
  });
}

/**
 * The outline of a group of small tiles (a sector's seven): their sides that no other tile of the
 * group shares, as segments.
 */
export function outlineOf(
  tiles: { x: number; y: number }[],
): [[number, number], [number, number]][] {
  const key = ([x, y]: [number, number]) => `${Math.round(x * 100)},${Math.round(y * 100)}`;
  const sides = new Map<string, { seg: [[number, number], [number, number]]; n: number }>();
  for (const t of tiles) {
    const c = tileCorners(t.x, t.y);
    for (let i = 0; i < 6; i++) {
      const a = c[i] as [number, number];
      const b = c[(i + 1) % 6] as [number, number];
      const k = [key(a), key(b)].sort().join(" ");
      const had = sides.get(k);
      if (had) had.n++;
      else sides.set(k, { seg: [a, b], n: 1 });
    }
  }
  return [...sides.values()].filter((x) => x.n === 1).map((x) => x.seg);
}
