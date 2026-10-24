/**
 * The map's labels kept apart (the owner's word of 24 October 2026: the Terraferma's map could
 * not be read). Greedy, in order of importance: each label takes its place if free, else the first
 * free of three others (above, below, to the right), else it is hidden. Nothing goes under the
 * HUD's blocks (`blocked`) but the merchant's own. Screen pixels, pure and deterministic.
 */

export interface Label {
  key: string;
  /** Centre, in screen pixels. */
  x: number;
  y: number;
  w: number;
  h: number;
  /** 0 first: always shown where it stands. The larger, the sooner it gives way. */
  priority: number;
}

/** Where each label goes, moved by (dx, dy), or null when hidden. */
export type Placement = Map<string, { dx: number; dy: number } | null>;

/** Two labels may touch by this much (px) without being said to cover each other. */
const SLACK = 2;

/** A rectangle no label may cover (a block of the HUD), in screen pixels. */
export interface Rect {
  x0: number;
  x1: number;
  y0: number;
  y1: number;
}

export function declutter(labels: Label[], blocked: Rect[] = []): Placement {
  const out: Placement = new Map();
  const taken: Rect[] = [...blocked];
  const order = [...labels].sort(
    (a, b) => a.priority - b.priority || (a.key < b.key ? -1 : a.key > b.key ? 1 : 0),
  );
  const free = (x0: number, x1: number, y0: number, y1: number) =>
    taken.every(
      (r) =>
        Math.min(x1, r.x1) - Math.max(x0, r.x0) <= SLACK ||
        Math.min(y1, r.y1) - Math.max(y0, r.y0) <= SLACK,
    );
  for (const l of order) {
    const tries =
      l.priority === 0
        ? [{ dx: 0, dy: 0 }]
        : [
            { dx: 0, dy: 0 },
            { dx: 0, dy: -(l.h + SLACK) },
            { dx: 0, dy: l.h + SLACK },
            { dx: (l.w + SLACK) * 0.6, dy: 0 },
          ];
    let placed: { dx: number; dy: number } | null = null;
    for (const t of tries) {
      const x0 = l.x + t.dx - l.w / 2;
      const y0 = l.y + t.dy - l.h / 2;
      if (l.priority === 0 || free(x0, x0 + l.w, y0, y0 + l.h)) {
        placed = t;
        taken.push({ x0, x1: x0 + l.w, y0, y1: y0 + l.h });
        break;
      }
    }
    out.set(l.key, placed);
  }
  return out;
}
