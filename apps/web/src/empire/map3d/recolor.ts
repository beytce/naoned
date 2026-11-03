/**
 * The KayKit models recoloured in the night board's palette, in code, without touching their files.
 * KayKit paints every model out of one atlas (`hexagons_medieval.png`): 8 × 4 swatches, each a
 * vertical gradient. A vertex's UV says which swatch it takes and how far down its gradient; we
 * give it instead the palette's colour for that swatch (`ROLE`), darkened a little down the
 * gradient, as a vertex colour. The atlas itself is never read.
 */
import { C } from "../../art/plateau/props.js";

/** What each swatch of the atlas is, row by row (top to bottom), left to right. */
export type Role =
  | "dark"
  | "wall"
  | "rock"
  | "rock2"
  | "brick"
  | "wood"
  | "trunk"
  | "water"
  | "roof"
  | "plot"
  | "leaf"
  | "grass"
  | "sand";

export const ROLE: Role[][] = [
  ["dark", "wall", "rock", "rock2", "dark", "brick", "wood", "brick"],
  ["water", "roof", "wood", "plot", "grass", "sand", "rock2", "trunk"],
  ["leaf", "leaf", "rock", "sand", "sand", "wall", "brick", "brick"],
  ["roof", "brick", "plot", "leaf", "brick", "wall", "wood", "trunk"],
];

/** The palette's colour of each role (art/plateau/props.ts, the board's only colours). */
export const PALETTE: Record<Role, string> = {
  dark: C.door,
  wall: C.wall,
  rock: C.rock,
  rock2: C.rock2,
  brick: C.brick,
  wood: C.wood,
  trunk: C.trunk,
  water: C.water,
  roof: C.roof,
  plot: C.plot,
  leaf: C.pine,
  grass: C.pine,
  sand: C.land,
};

/** A model's swatch and how far down its gradient (0 at the top, 1 at the bottom). */
export function swatchOf(u: number, v: number): { role: Role; t: number } {
  const col = Math.min(7, Math.max(0, Math.floor(frac(u) * 8)));
  const rf = Math.min(3.999, Math.max(0, frac(v) * 4));
  const row = Math.floor(rf);
  return { role: (ROLE[row] as Role[])[col] as Role, t: rf - row };
}

function frac(x: number) {
  // UVs exactly at 1 stay in the last swatch.
  if (x === 1) return 0.9999;
  return x - Math.floor(x);
}

/** "#RRGGBB" → linear RGB in 0..1 (three.js works in linear colours). */
export function linear(hex: string): [number, number, number] {
  const n = Number.parseInt(hex.slice(1), 16);
  const toLin = (c: number) => {
    const s = c / 255;
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return [toLin((n >> 16) & 255), toLin((n >> 8) & 255), toLin(n & 255)];
}

/**
 * The vertex colours of a model, out of its UVs: three floats per vertex. `over` swaps a role's
 * colour (the fondaco's roof in gold, a muted town's roofs).
 */
export function recolour(
  uv: ArrayLike<number>,
  over: Partial<Record<Role, string>> = {},
): Float32Array {
  const n = uv.length / 2;
  const out = new Float32Array(n * 3);
  const cache = new Map<Role, [number, number, number]>();
  for (let i = 0; i < n; i++) {
    const { role, t } = swatchOf(uv[2 * i] as number, uv[2 * i + 1] as number);
    let c = cache.get(role);
    if (!c) {
      c = linear(over[role] ?? PALETTE[role]);
      cache.set(role, c);
    }
    // The gradient kept, softly: clay is lighter where the light falls.
    const k = 1.04 - 0.16 * t;
    out[3 * i] = c[0] * k;
    out[3 * i + 1] = c[1] * k;
    out[3 * i + 2] = c[2] * k;
  }
  return out;
}
