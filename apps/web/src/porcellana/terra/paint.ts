/**
 * The Terraferma's glaze painted on a sheet (a canvas, `ppc` pixels a cell): each cell's top in its
 * porcelain (the mountains a shade darker, the marshes with their reeds of water), then each
 * holder's glaze with its outline and the white glint of its edge. The 3D board lays this sheet on
 * the tops of its tiles; the flat board shows it as it is.
 */
import { COL } from "../tokens.js";
import {
  type Flow,
  type GridOf,
  type HolderStyle,
  REACH,
  type Region,
  THRESHOLD,
  contour,
  glazeFields,
} from "./glaze.js";

export interface TerraPicture extends GridOf {
  /** One letter a cell: p plain, h hill, m marsh, M mountain, w water. */
  terrain: string;
  /** The holder of each cell (an index in `styles`), -1 for free land or water. */
  owner: number[];
  styles: HolderStyle[];
}

const SAMPLES = 5;
const hatches = new Map<string, CanvasPattern | null>();

function hatchOf(ctx: CanvasRenderingContext2D, colour: string): CanvasPattern | null {
  const had = hatches.get(colour);
  if (had !== undefined) return had;
  const tile = document.createElement("canvas");
  tile.width = tile.height = 10;
  const g = tile.getContext("2d");
  if (!g) return null;
  g.strokeStyle = colour;
  g.globalAlpha = 0.45;
  g.lineWidth = 1.6;
  g.beginPath();
  g.moveTo(-2, 12);
  g.lineTo(12, -2);
  g.moveTo(8, 12);
  g.lineTo(12, 8);
  g.moveTo(-2, 2);
  g.lineTo(2, -2);
  g.stroke();
  const pat = ctx.createPattern(tile, "repeat");
  hatches.set(colour, pat);
  return pat;
}

/** The top of a bare cell: porcelain, the mountains a shade darker, the marshes watered. */
function bareTop(ctx: CanvasRenderingContext2D, letter: string, x: number, y: number, s: number) {
  ctx.fillStyle = letter === "M" ? COL.wall2 : letter === "w" ? COL.water : COL.wall;
  ctx.fillRect(x, y, s, s);
  if (letter === "m") {
    ctx.strokeStyle = COL.water;
    ctx.lineWidth = Math.max(1.5, s * 0.05);
    ctx.lineCap = "round";
    for (const [dx, dy, l] of [
      [0.22, 0.32, 0.24],
      [0.46, 0.52, 0.3],
      [0.28, 0.72, 0.2],
    ] as const) {
      ctx.beginPath();
      ctx.moveTo(x + dx * s, y + dy * s);
      ctx.lineTo(x + (dx + l) * s, y + dy * s);
      ctx.stroke();
    }
  }
}

/** Paints a region of the sheet (the whole map by default), the flows as they stand at `now`. */
export function paintGlaze(
  ctx: CanvasRenderingContext2D,
  pic: TerraPicture,
  flows: Flow[],
  now: number,
  ppc: number,
  region: Region = { i0: 0, j0: 0, i1: pic.width, j1: pic.height },
): void {
  const r = {
    i0: Math.max(0, region.i0),
    j0: Math.max(0, region.j0),
    i1: Math.min(pic.width, region.i1),
    j1: Math.min(pic.height, region.j1),
  };
  if (r.i0 >= r.i1 || r.j0 >= r.j1) return;
  ctx.save();
  ctx.beginPath();
  ctx.rect(r.i0 * ppc, r.j0 * ppc, (r.i1 - r.i0) * ppc, (r.j1 - r.j0) * ppc);
  ctx.clip();
  for (let j = r.j0; j < r.j1; j++)
    for (let i = r.i0; i < r.i1; i++)
      bareTop(ctx, pic.terrain[j * pic.width + i] ?? "p", i * ppc, j * ppc, ppc);
  // The fields over the region and a margin (an outline is cut by the region's edge otherwise).
  const m = Math.ceil(REACH);
  const wide = {
    i0: Math.max(0, r.i0 - m),
    j0: Math.max(0, r.j0 - m),
    i1: Math.min(pic.width, r.i1 + m),
    j1: Math.min(pic.height, r.j1 + m),
  };
  const fields = glazeFields(pic, pic.owner, flows, now, SAMPLES, wide);
  const nx = (wide.i1 - wide.i0) * SAMPLES + 1;
  const ny = (wide.j1 - wide.j0) * SAMPLES + 1;
  const step = ppc / SAMPLES;
  ctx.translate(wide.i0 * ppc, wide.j0 * ppc);
  // The merchant's own glaze last, on top.
  const order = [...fields.keys()].sort(
    (a, b) =>
      Number(pic.styles[a]?.colour === "#C23B2E") - Number(pic.styles[b]?.colour === "#C23B2E"),
  );
  for (const h of order) {
    const st = pic.styles[h];
    const f = fields.get(h);
    if (!st || !f) continue;
    const { fill, line } = contour(f, nx, ny, step, THRESHOLD);
    if (fill.length === 0) continue;
    const area = new Path2D();
    for (const poly of fill) {
      const [first, ...rest] = poly;
      if (!first) continue;
      area.moveTo(first[0], first[1]);
      for (const p of rest) area.lineTo(p[0], p[1]);
      area.closePath();
    }
    const edge = new Path2D();
    for (const [a, b] of line) {
      edge.moveTo(a[0], a[1]);
      edge.lineTo(b[0], b[1]);
    }
    ctx.globalAlpha = st.alpha;
    ctx.fillStyle = st.colour;
    ctx.fill(area);
    ctx.globalAlpha = 1;
    if (st.hatch) {
      const pat = hatchOf(ctx, st.colour);
      if (pat) {
        ctx.save();
        ctx.clip(area);
        ctx.fillStyle = pat;
        ctx.fillRect(0, 0, nx * step, ny * step);
        ctx.restore();
      }
    }
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.strokeStyle = st.edge ?? st.colour;
    // The edge a little darker than the glaze, thin: on a lone cell (a drop), a thick dark edge
    // would blacken it.
    ctx.globalAlpha = st.edge ? 0.8 : Math.min(0.9, st.alpha * 1.6);
    ctx.lineWidth = Math.max(1, ppc * 0.04);
    ctx.stroke(edge);
    // The glint of the glaze's edge, toward the light.
    ctx.translate(-ppc * 0.03, -ppc * 0.035);
    ctx.globalAlpha = 0.6;
    ctx.strokeStyle = "#FFFFFF";
    ctx.lineWidth = Math.max(1, ppc * 0.03);
    ctx.stroke(edge);
    ctx.translate(ppc * 0.03, ppc * 0.035);
    ctx.globalAlpha = 1;
  }
  ctx.restore();
}

/** The cells the live flows touch, and a margin: what must be painted again this frame. */
export function flowRegion(pic: GridOf, flows: Flow[], now: number, wait: number): Region | null {
  let r: Region | null = null;
  for (const f of flows) {
    if (now > f.start + wait) continue;
    for (const c of [f.cell, f.src]) {
      if (c < 0) continue;
      const i = c % pic.width;
      const j = Math.floor(c / pic.width);
      r = r
        ? {
            i0: Math.min(r.i0, i - 2),
            j0: Math.min(r.j0, j - 2),
            i1: Math.max(r.i1, i + 3),
            j1: Math.max(r.j1, j + 3),
          }
        : { i0: i - 2, j0: j - 2, i1: i + 3, j1: j + 3 };
    }
  }
  return r;
}
