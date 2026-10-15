/**
 * The ground of each land of the campaign, as on a war map: every point belongs to the nearest
 * land, within a radius (a cell, convex); borders are drawn where two holders meet and around the
 * edge of the held ground, never between two lands of the same holder. Map units, pure.
 */

export type Pt = [number, number];

export interface Site {
  code: string;
  x: number;
  y: number;
  /** A family, "milan", or null for the militia. */
  holder: string | null;
}

export interface Border {
  from: Pt;
  to: Pt;
  /** Whose ground this edge bounds. */
  holder: string | null;
  code: string;
}

/** Keeps the part of a convex polygon where (p − m)·n ≤ 0. */
function clip(poly: Pt[], m: Pt, n: Pt): Pt[] {
  const side = (p: Pt) => (p[0] - m[0]) * n[0] + (p[1] - m[1]) * n[1];
  const out: Pt[] = [];
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i] as Pt;
    const b = poly[(i + 1) % poly.length] as Pt;
    const sa = side(a);
    const sb = side(b);
    if (sa <= 0) out.push(a);
    if ((sa < 0 && sb > 0) || (sa > 0 && sb < 0)) {
      const k = sa / (sa - sb);
      out.push([a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k]);
    }
  }
  return out;
}

export function territories(
  sites: Site[],
  radius: number,
  sides = 28,
): { cells: Record<string, Pt[]>; borders: Border[] } {
  const cells: Record<string, Pt[]> = {};
  for (const s of sites) {
    let poly: Pt[] = Array.from({ length: sides }, (_, i) => {
      const a = (i / sides) * Math.PI * 2;
      return [s.x + Math.cos(a) * radius, s.y + Math.sin(a) * radius] as Pt;
    });
    for (const o of sites) {
      if (o === s) continue;
      const m: Pt = [(s.x + o.x) / 2, (s.y + o.y) / 2];
      poly = clip(poly, m, [o.x - s.x, o.y - s.y]);
      if (poly.length === 0) break;
    }
    cells[s.code] = poly;
  }
  const borders: Border[] = [];
  for (const s of sites) {
    const poly = cells[s.code] ?? [];
    for (let i = 0; i < poly.length; i++) {
      const a = poly[i] as Pt;
      const b = poly[(i + 1) % poly.length] as Pt;
      const mid: Pt = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
      const own = Math.hypot(mid[0] - s.x, mid[1] - s.y);
      // The edge a neighbour shares lies as far from both lands.
      const other = sites.find(
        (o) => o !== s && Math.abs(Math.hypot(mid[0] - o.x, mid[1] - o.y) - own) < 1e-6,
      );
      if (other && other.holder === s.holder) continue;
      borders.push({ from: a, to: b, holder: s.holder, code: s.code });
    }
  }
  return { cells, borders };
}
