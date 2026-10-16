/**
 * The world map's geometry, pure: the drawn Veneto (360 × 440 map units) laid out in world pixels,
 * the camera that looks at it (pan and zoom), and where the carts park around the merchant's
 * counter. Shared by the map and its tests.
 */

/** World pixels per map unit: the map is drawn large and the camera scales it down. */
export const RES = 3;

export interface Point {
  x: number;
  y: number;
}

export interface Box {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

/** What the camera does: world pixels are scaled by `s`, then moved by (tx, ty) screen pixels. */
export interface Camera {
  s: number;
  tx: number;
  ty: number;
}

export interface Viewport {
  w: number;
  h: number;
}

/** Screen space kept clear by the HUD and the panel. */
export interface Insets {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

/** A map point in world pixels. */
export function toWorld([x, y]: readonly [number, number]): Point {
  return { x: x * RES, y: y * RES };
}

/** The smallest box around points, grown by a margin (world pixels). */
export function boxOf(points: Point[], margin = 0): Box {
  if (points.length === 0) return { x0: 0, y0: 0, x1: 0, y1: 0 };
  let x0 = Number.POSITIVE_INFINITY;
  let y0 = Number.POSITIVE_INFINITY;
  let x1 = Number.NEGATIVE_INFINITY;
  let y1 = Number.NEGATIVE_INFINITY;
  for (const p of points) {
    x0 = Math.min(x0, p.x);
    y0 = Math.min(y0, p.y);
    x1 = Math.max(x1, p.x);
    y1 = Math.max(y1, p.y);
  }
  return { x0: x0 - margin, y0: y0 - margin, x1: x1 + margin, y1: y1 + margin };
}

/**
 * The campaign's frames, from its lands (world pixels): `box` holds them all, to keep the map in
 * reach; `fitBox` only those within the drawn map (`width` wide), where the camera opens, so that
 * the lands beyond its edge (Lombardy) are a pan away on a narrow screen instead of shrinking the
 * whole map (see `fitLands`).
 */
export function landFrames(lands: Point[], width: number): { box: Box; fitBox: Box } {
  const inside = lands.filter((p) => p.x >= 0 && p.x <= width);
  return { box: boxOf(lands), fitBox: boxOf(inside.length > 0 ? inside : lands) };
}

/** The camera that shows the whole box, centred, in the screen minus the insets. */
export function fitCamera(box: Box, view: Viewport, insets: Insets): Camera {
  const w = Math.max(1, view.w - insets.left - insets.right);
  const h = Math.max(1, view.h - insets.top - insets.bottom);
  const bw = Math.max(1, box.x1 - box.x0);
  const bh = Math.max(1, box.y1 - box.y0);
  const s = Math.min(w / bw, h / bh);
  const cx = (box.x0 + box.x1) / 2;
  const cy = (box.y0 + box.y1) / 2;
  return {
    s,
    tx: insets.left + w / 2 - cx * s,
    ty: insets.top + h / 2 - cy * s,
  };
}

/**
 * The camera of the campaign: all its lands when the screen has room for them (a wide screen,
 * where the height sets the scale), the drawn map's alone when showing them all would shrink it.
 */
export function fitLands(box: Box, fitBox: Box, view: Viewport, insets: Insets): Camera {
  const all = fitCamera(box, view, insets);
  const drawn = fitCamera(fitBox, view, insets);
  return all.s >= drawn.s * 0.85 ? all : drawn;
}

/** Where a world point lands on screen. */
export function project(cam: Camera, p: Point): Point {
  return { x: p.x * cam.s + cam.tx, y: p.y * cam.s + cam.ty };
}

/** The world point under a screen point. */
export function unproject(cam: Camera, p: Point): Point {
  return { x: (p.x - cam.tx) / cam.s, y: (p.y - cam.ty) / cam.s };
}

/** Zooms by `factor` around a screen point (it stays under the finger), within [min, max]. */
export function zoomAt(cam: Camera, factor: number, at: Point, min: number, max: number): Camera {
  const s = Math.min(max, Math.max(min, cam.s * factor));
  const k = s / cam.s;
  return { s, tx: at.x - (at.x - cam.tx) * k, ty: at.y - (at.y - cam.ty) * k };
}

/**
 * Keeps the box of interest on screen: its centre may not leave the visible area, so a pan never
 * loses the map.
 */
export function clampCamera(cam: Camera, box: Box, view: Viewport, insets: Insets): Camera {
  const left = insets.left - (box.x1 - box.x0) * cam.s * 0.5;
  const right = view.w - insets.right + (box.x1 - box.x0) * cam.s * 0.5;
  const top = insets.top - (box.y1 - box.y0) * cam.s * 0.5;
  const bottom = view.h - insets.bottom + (box.y1 - box.y0) * cam.s * 0.5;
  const cx = ((box.x0 + box.x1) / 2) * cam.s + cam.tx;
  const cy = ((box.y0 + box.y1) / 2) * cam.s + cam.ty;
  const dx = cx < left ? left - cx : cx > right ? right - cx : 0;
  const dy = cy < top ? top - cy : cy > bottom ? bottom - cy : 0;
  return { s: cam.s, tx: cam.tx + dx, ty: cam.ty + dy };
}

/**
 * The camera that brings a world point into the visible area (at least `pad` inside its edges),
 * moving no more than needed and keeping the zoom; unchanged when the point is already there.
 */
export function reveal(cam: Camera, p: Point, view: Viewport, insets: Insets, pad = 60): Camera {
  const q = project(cam, p);
  const x0 = insets.left + pad;
  const x1 = view.w - insets.right - pad;
  const y0 = insets.top + pad;
  const y1 = view.h - insets.bottom - pad;
  const dx = q.x < x0 ? x0 - q.x : q.x > x1 ? x1 - q.x : 0;
  const dy = q.y < y0 ? y0 - q.y : q.y > y1 ? y1 - q.y : 0;
  if (dx === 0 && dy === 0) return cam;
  return { s: cam.s, tx: cam.tx + dx, ty: cam.ty + dy };
}

/** A step of an eased move between two cameras (t from 0 to 1). */
export function blend(a: Camera, b: Camera, t: number): Camera {
  const k = 1 - (1 - Math.min(1, Math.max(0, t))) ** 3;
  return { s: a.s + (b.s - a.s) * k, tx: a.tx + (b.tx - a.tx) * k, ty: a.ty + (b.ty - a.ty) * k };
}

/**
 * The direction (radians, y down) where the carts park beside the counter: the middle of a wide
 * free sector between the neighbouring cities, keeping clear of the name under it, and leaning
 * toward `inward` (the map's middle) so that a counter near the edge parks its carts on the map.
 */
export function parkingAngle(
  center: Point,
  others: Point[],
  reach: number,
  inward?: Point,
): number {
  // The name under the counter takes a wide sector.
  const blocked: number[] = [Math.PI / 4, Math.PI / 2, (3 * Math.PI) / 4];
  for (const o of others) {
    if (Math.hypot(o.x - center.x, o.y - center.y) <= reach)
      blocked.push(Math.atan2(o.y - center.y, o.x - center.x));
  }
  const toward =
    inward && Math.hypot(inward.x - center.x, inward.y - center.y) > 1
      ? Math.atan2(inward.y - center.y, inward.x - center.x)
      : null;
  const sorted = blocked.map((a) => (a + 2 * Math.PI) % (2 * Math.PI)).sort((a, b) => a - b);
  let best = Math.PI;
  let score = Number.NEGATIVE_INFINITY;
  for (let i = 0; i < sorted.length; i++) {
    const a = sorted[i] ?? 0;
    const b = i + 1 < sorted.length ? (sorted[i + 1] ?? 0) : (sorted[0] ?? 0) + 2 * Math.PI;
    const gap = b - a;
    // Inside the sector, as close to the middle of the map as its edges allow.
    const margin = Math.min(gap / 2, Math.PI / 6);
    let mid = (a + b) / 2;
    if (toward !== null) {
      let t = toward;
      while (t < a) t += 2 * Math.PI;
      while (t > a + 2 * Math.PI) t -= 2 * Math.PI;
      mid = Math.min(b - margin, Math.max(a + margin, t));
    }
    const lean = toward === null ? 0 : Math.cos(mid - toward);
    const s = Math.min(gap, Math.PI / 2) * (1 + 0.8 * lean);
    if (s > score) {
      score = s;
      best = mid;
    }
  }
  best = ((best % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
  return best > Math.PI ? best - 2 * Math.PI : best;
}

/**
 * Where the carts at the counter stand, like ships beside their planet: side by side in rows
 * across the chosen direction (`angle`), the first row at `radius` (screen pixels), three per
 * row, the first one in the middle.
 */
export function parkingSpots(
  n: number,
  center: Point,
  radius: number,
  angle = Math.PI / 2,
  gap = 46,
): Point[] {
  const dir = { x: Math.cos(angle), y: Math.sin(angle) };
  const across = { x: -dir.y, y: dir.x };
  const out: Point[] = [];
  for (let i = 0; i < n; i++) {
    const row = Math.floor(i / 3);
    const j = i % 3;
    const side = j === 0 ? 0 : j === 1 ? 1 : -1;
    // A row of two keeps both carts off the middle line.
    const inRow = Math.min(3, n - row * 3);
    const shift = inRow === 2 ? (j === 0 ? -0.5 : 0.5) : side;
    const along = radius + row * gap;
    out.push({
      x: round(center.x + dir.x * along + across.x * shift * gap),
      y: round(center.y + dir.y * along + across.y * shift * gap),
    });
  }
  return out;
}

function round(v: number): number {
  return Math.round(v * 100) / 100;
}

/** The point at `t` (0 to 1) along a broken line, by length; the direction it heads there. */
export function pointAlong(points: Point[], t: number): { p: Point; dx: number } {
  const first = points[0] ?? { x: 0, y: 0 };
  if (points.length < 2) return { p: first, dx: 0 };
  const lengths = points.slice(1).map((q, i) => {
    const a = points[i] ?? q;
    return Math.hypot(q.x - a.x, q.y - a.y);
  });
  const total = lengths.reduce((s, l) => s + l, 0);
  let left = Math.min(1, Math.max(0, t)) * total;
  for (let i = 0; i < lengths.length; i++) {
    const a = points[i] ?? first;
    const b = points[i + 1] ?? a;
    const l = lengths[i] ?? 0;
    if (left <= l || i === lengths.length - 1) {
      const k = l > 0 ? Math.min(1, left / l) : 0;
      return { p: { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k }, dx: b.x - a.x };
    }
    left -= l;
  }
  return { p: points[points.length - 1] ?? first, dx: 0 };
}

/**
 * A round trip's place on its route from the share of the time gone (0 to 1): out to the far end
 * at half time, then back; `back` once it has turned.
 */
export function roundTrip(share: number): { t: number; back: boolean } {
  const s = Math.min(1, Math.max(0, share));
  return s <= 0.5 ? { t: s * 2, back: false } : { t: (1 - s) * 2, back: true };
}
