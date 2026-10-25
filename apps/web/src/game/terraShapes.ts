/**
 * The Terraferma's map drawn (docs/plan-terraferme.md, "Direction artistique"): the hexagonal
 * cells never drawn one by one, but each holder's ground as one outline with its corners
 * rounded, the colours given so that two neighbours never share one. Map units, pure.
 */

import { P } from "../art/palette.js";

export interface HexMap {
  width: number;
  height: number;
  /** Centre of the first cell and the cells' radius. */
  origin: [number, number];
  size: number;
}

/** The six cells around one (odd rows shifted right), as the engine counts them. */
export function hexNeighbors(map: Pick<HexMap, "width" | "height">, i: number): number[] {
  const row = Math.floor(i / map.width);
  const col = i % map.width;
  const steps =
    row & 1
      ? [
          [1, 0],
          [-1, 0],
          [0, -1],
          [1, -1],
          [0, 1],
          [1, 1],
        ]
      : [
          [1, 0],
          [-1, 0],
          [-1, -1],
          [0, -1],
          [-1, 1],
          [0, 1],
        ];
  const out: number[] = [];
  for (const [dc = 0, dr = 0] of steps) {
    const c = col + dc;
    const r = row + dr;
    if (c >= 0 && c < map.width && r >= 0 && r < map.height) out.push(r * map.width + c);
  }
  return out;
}

export function hexCenter(map: HexMap, i: number): [number, number] {
  const row = Math.floor(i / map.width);
  const col = i % map.width;
  return [
    map.origin[0] + map.size * Math.sqrt(3) * (col + 0.5 * (row & 1)),
    map.origin[1] + map.size * 1.5 * row,
  ];
}

/** The corners' directions from a cell's centre, clockwise on screen from the upper right. */
const CORNERS = Array.from({ length: 6 }, (_, k) => {
  const a = ((60 * k - 30) * Math.PI) / 180;
  return [Math.cos(a), Math.sin(a)] as const;
});

/** The corners of a pointed-top cell, clockwise on screen from the upper right. */
export function hexCorners(map: HexMap, i: number, scale = 1): [number, number][] {
  const [x, y] = hexCenter(map, i);
  const r = map.size * scale;
  return CORNERS.map(([cx, cy]) => [x + cx * r, y + cy * r]);
}

/**
 * Which neighbour lies across each of a cell's six edges (edge k joins corners k and k+1, its
 * middle at 60 k degrees): east, south-east, south-west, west, north-west, north-east, the odd
 * rows shifted right.
 */
const ACROSS = {
  even: [
    [1, 0],
    [0, 1],
    [-1, 1],
    [-1, 0],
    [-1, -1],
    [0, -1],
  ],
  odd: [
    [1, 0],
    [1, 1],
    [0, 1],
    [-1, 0],
    [0, -1],
    [1, -1],
  ],
} as const;
function across(map: HexMap, i: number): (number | null)[] {
  const row = Math.floor(i / map.width);
  const col = i % map.width;
  return (row & 1 ? ACROSS.odd : ACROSS.even).map(([dc, dr]) => {
    const c = col + dc;
    const r = row + dr;
    return c >= 0 && c < map.width && r >= 0 && r < map.height ? r * map.width + c : null;
  });
}

/** A corner as a number (to the hundredth of a map unit): three cells share each one. */
const key = ([x, y]: [number, number]) =>
  (Math.round(x * 100) + 50_000_000) * 100_000_000 + Math.round(y * 100) + 50_000_000;

/**
 * The outline of a set of cells, its corners rounded: one SVG path (every loop of it, islands
 * and holes alike), drawn through the middles of the border's edges.
 */
export function outline(map: HexMap, cells: Iterable<number>): string {
  const set = new Set(cells);
  // The border's edges, each from one corner to the next, keyed by where they start. Around a
  // corner three cells meet: at most one border edge leaves it.
  const next = new Map<number, { from: [number, number]; to: [number, number] }>();
  for (const i of set) {
    const corners = hexCorners(map, i);
    across(map, i).forEach((n, k) => {
      if (n !== null && set.has(n)) return;
      const from = corners[k] as [number, number];
      next.set(key(from), { from, to: corners[(k + 1) % 6] as [number, number] });
    });
  }
  const parts: string[] = [];
  const mid = (a: [number, number], b: [number, number]) =>
    `${((a[0] + b[0]) / 2).toFixed(2)} ${((a[1] + b[1]) / 2).toFixed(2)}`;
  for (const first of next.keys()) {
    const loop: [number, number][] = [];
    // Follow the edges until back at the start.
    for (let k = first, e = next.get(k); e; e = next.get(k)) {
      next.delete(k);
      loop.push(e.from);
      k = key(e.to);
    }
    if (loop.length < 3) continue;
    const n = loop.length;
    // The hexagons' zigzag halved: each corner drawn towards its two neighbours. Two holders
    // walk their shared border's corners alike, so their outlines still meet.
    const soft = loop.map((p, j) => {
      const a = loop[(j + n - 1) % n] as [number, number];
      const b = loop[(j + 1) % n] as [number, number];
      return [(a[0] + 2 * p[0] + b[0]) / 4, (a[1] + 2 * p[1] + b[1]) / 4] as [number, number];
    });
    let d = `M${mid(soft[n - 1] as [number, number], soft[0] as [number, number])}`;
    for (let j = 0; j < n; j++) {
      const p = soft[j] as [number, number];
      const q = soft[(j + 1) % n] as [number, number];
      d += `Q${p[0].toFixed(2)} ${p[1].toFixed(2)} ${mid(p, q)}`;
    }
    parts.push(`${d}Z`);
  }
  return parts.join("");
}

/** The cells of each holder (by its index; -1 is neutral land, never drawn). */
export function cellsByHolder(owner: number[]): Map<number, number[]> {
  const out = new Map<number, number[]>();
  owner.forEach((o, i) => {
    if (o < 0) return;
    const list = out.get(o) ?? [];
    list.push(i);
    out.set(o, list);
  });
  return out;
}

/** Holders whose ground touches, by index. */
export function neighbours(map: HexMap, owner: number[]): Map<number, Set<number>> {
  const out = new Map<number, Set<number>>();
  owner.forEach((o, i) => {
    if (o < 0) return;
    for (const n of hexNeighbors(map, i)) {
      const p = owner[n] ?? -1;
      if (p < 0 || p === o) continue;
      const a = out.get(o) ?? new Set<number>();
      a.add(p);
      out.set(o, a);
    }
  });
  return out;
}

/**
 * Eight muted tones for the other merchants, kept away (ΔE ≥ 20) from the colours the map gives a
 * role: gold for the merchant's own land, lagoon for allies, vermilion for enemies, lapis for the
 * cell touched, and the water's blues. Violet, plum, olive, rose, walnut, sand, dusk, terracotta.
 */
export const TERRA_TONES = [
  "#8E6BD8",
  "#A0558A",
  "#8C9440",
  "#C97B95",
  "#A8743F",
  "#9A8466",
  "#7E6A8C",
  "#A36F6F",
];

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

/**
 * A tone for each holder, two neighbours never the same: the largest first, each taking its own
 * tone (from its name, so it keeps it from one visit to the next) unless a neighbour has it.
 */
export function tones(
  names: string[],
  sizes: number[],
  touching: Map<number, Set<number>>,
): string[] {
  const out: string[] = names.map(() => "");
  const order = names.map((_, i) => i).sort((a, b) => (sizes[b] ?? 0) - (sizes[a] ?? 0) || a - b);
  for (const i of order) {
    const taken = new Set([...(touching.get(i) ?? [])].map((n) => out[n]).filter(Boolean));
    const own = hash(names[i] ?? String(i)) % TERRA_TONES.length;
    let pick = TERRA_TONES[own] as string;
    for (let k = 0; k < TERRA_TONES.length; k++) {
      const tone = TERRA_TONES[(own + k) % TERRA_TONES.length] as string;
      if (!taken.has(tone)) {
        pick = tone;
        break;
      }
    }
    out[i] = pick;
  }
  return out;
}

/** The land cell under a point of the map, if any (within a cell's radius of its centre). */
export function cellAt(map: HexMap, land: boolean[], x: number, y: number): number | null {
  const row = Math.round((y - map.origin[1]) / (map.size * 1.5));
  let best: number | null = null;
  let bestD = map.size;
  for (let r = row - 1; r <= row + 1; r++) {
    if (r < 0 || r >= map.height) continue;
    const col = Math.round((x - map.origin[0]) / (map.size * Math.sqrt(3)) - 0.5 * (r & 1));
    for (let c = col - 1; c <= col + 1; c++) {
      if (c < 0 || c >= map.width) continue;
      const i = r * map.width + c;
      if (!land[i]) continue;
      const [cx, cy] = hexCenter(map, i);
      const d = Math.hypot(cx - x, cy - y);
      if (d <= bestD) {
        bestD = d;
        best = i;
      }
    }
  }
  return best;
}

/**
 * Whether a replay of the week was recorded on the map shown: the same cells, one by one. Played on
 * another (another week's, another world's), its cells would land anywhere.
 */
export function replayFits(initial: readonly number[], owner: readonly number[]): boolean {
  return initial.length > 0 && initial.length === owner.length;
}

/**
 * The map as it stood with only the first `shown` of the changes made (the others undone, back
 * to who held the cell before): the frames of the replay of what a merchant missed.
 */
export function replayed(
  owner: number[],
  missed: { cell: number; from: number }[],
  shown: number,
): number[] {
  const out = owner.slice();
  for (let j = missed.length - 1; j >= shown; j--) {
    const c = missed[j];
    if (c) out[c.cell] = c.from;
  }
  return out;
}

/**
 * Where a holder's name and troops are written, as OpenFront does: in its largest piece of land,
 * the cell farthest from its borders (the nearest its middle among equals), avoiding the cells
 * kept for a marker (its war counter, the cities) while another will do.
 */
export function labelCell(
  map: HexMap,
  cells: number[],
  avoid: Set<number> = new Set(),
): number | null {
  const set = new Set(cells);
  // The largest piece.
  let piece: number[] = [];
  const seen = new Set<number>();
  for (const start of cells) {
    if (seen.has(start)) continue;
    const part = [start];
    seen.add(start);
    for (let k = 0; k < part.length; k++) {
      for (const n of hexNeighbors(map, part[k] as number)) {
        if (set.has(n) && !seen.has(n)) {
          seen.add(n);
          part.push(n);
        }
      }
    }
    if (part.length > piece.length) piece = part;
  }
  if (piece.length === 0) return null;
  // Each cell's distance to the border: from the cells along it, inwards.
  const inside = new Set(piece);
  const depth = new Map<number, number>();
  let ring = piece.filter((i) => {
    const around = hexNeighbors(map, i);
    return around.length < 6 || around.some((n) => !inside.has(n));
  });
  for (const i of ring) depth.set(i, 0);
  for (let level = 1; ring.length > 0; level++) {
    const next: number[] = [];
    for (const i of ring) {
      for (const n of hexNeighbors(map, i)) {
        if (inside.has(n) && !depth.has(n)) {
          depth.set(n, level);
          next.push(n);
        }
      }
    }
    ring = next;
  }
  const mx = piece.reduce((s, i) => s + hexCenter(map, i)[0], 0) / piece.length;
  const my = piece.reduce((s, i) => s + hexCenter(map, i)[1], 0) / piece.length;
  const far = (i: number) => Math.hypot(hexCenter(map, i)[0] - mx, hexCenter(map, i)[1] - my);
  const free = piece.filter((i) => !avoid.has(i));
  const pool = free.length > 0 ? free : piece;
  return pool.reduce((best, i) => {
    const di = depth.get(i) ?? 0;
    const db = depth.get(best) ?? 0;
    return di > db || (di === db && far(i) < far(best)) ? i : best;
  });
}

/**
 * A holder's place on the merchant's map, which sets how it is drawn: the merchant's own land,
 * his allies, his enemies (a front of theirs against him, or of his against them), his
 * neighbours, the others (« faint » when they hold almost nothing), Milan and the lords.
 */
export type Focus = "me" | "ally" | "enemy" | "neighbour" | "milan" | "other" | "faint";

/** Drawn from the bottom up: Milan under everyone, the merchant over all. */
export const FOCUS_ORDER: Record<Focus, number> = {
  milan: 0,
  faint: 1,
  other: 2,
  neighbour: 3,
  enemy: 4,
  ally: 5,
  me: 6,
};

/** Who is at war with the merchant: who marches on him, and whom his fronts march on. */
export function enemiesOf(
  fronts: { owner: number; against: number; mine: boolean; threat: boolean }[],
  me: number,
): Set<number> {
  const out = new Set<number>();
  for (const f of fronts) {
    if (f.threat || f.against === me) out.add(f.owner);
    if ((f.mine || f.owner === me) && f.against >= 0) out.add(f.against);
  }
  out.delete(me);
  out.delete(-1);
  return out;
}

export function focusOf(
  h: { me: boolean; ally: boolean; milan: boolean },
  i: number,
  cells: number,
  around: Set<number>,
  enemies: Set<number>,
): Focus {
  if (h.milan) return "milan";
  if (h.me) return "me";
  if (h.ally) return "ally";
  if (enemies.has(i)) return "enemy";
  if (around.has(i)) return "neighbour";
  return cells <= 3 ? "faint" : "other";
}

/**
 * How a territory is drawn: gold for the merchant's own land only (a dense wash, a thick rim kept
 * at the same width on screen), lagoon for his allies only, a vermilion rim for his enemies, his
 * neighbours in their tone, the others barely there, Milan and the lords hatched. The land a
 * finger touched takes the lapis of a selection.
 */
export function territoryLook(
  h: { focus: Focus; tone: string },
  touched: boolean,
): {
  fill: string;
  fillOpacity?: number;
  stroke: string;
  strokeOpacity: number;
  strokeWidth: number;
  strokeDasharray?: string;
  vectorEffect?: "non-scaling-stroke";
} {
  const edge = { vectorEffect: "non-scaling-stroke" as const };
  if (h.focus === "milan")
    return {
      fill: "url(#terra-hatch)",
      stroke: P.vermilionDeep,
      strokeOpacity: 0.7,
      strokeWidth: 0.8,
    };
  if (h.focus === "me")
    return {
      fill: P.gold,
      fillOpacity: 0.32,
      stroke: P.gold,
      strokeOpacity: 1,
      strokeWidth: 2.5,
      ...edge,
    };
  if (h.focus === "ally")
    return {
      fill: P.lagoon,
      fillOpacity: 0.18,
      stroke: P.lagoon,
      strokeOpacity: 0.95,
      strokeWidth: 1.6,
      strokeDasharray: "5 3",
      ...edge,
    };
  if (touched)
    return {
      fill: h.tone,
      fillOpacity: 0.24,
      stroke: P.info,
      strokeOpacity: 1,
      strokeWidth: 2,
      ...edge,
    };
  if (h.focus === "enemy")
    return {
      fill: h.tone,
      fillOpacity: 0.16,
      stroke: P.vermilion,
      strokeOpacity: 0.95,
      strokeWidth: 1.5,
      ...edge,
    };
  if (h.focus === "neighbour")
    return {
      fill: h.tone,
      fillOpacity: 0.16,
      stroke: h.tone,
      strokeOpacity: 0.8,
      strokeWidth: 1,
      ...edge,
    };
  return {
    fill: h.tone,
    fillOpacity: h.focus === "faint" ? 0.04 : 0.08,
    stroke: P.cream,
    strokeOpacity: h.focus === "faint" ? 0.07 : 0.14,
    strokeWidth: 0.6,
  };
}
