/**
 * The map's names never on each other (the refonte claire, lot 2, 5 November 2026): once the
 * camera rests, the marks that overlap give way to the more important, which stay readable: the
 * house's fondaco, its other places, the towns « Livrer » would serve now, the towns with orders,
 * the larger towns, then the regions' names. What gives way comes back as soon as there is room.
 */

export interface Box {
  key: string;
  x: number;
  y: number;
  w: number;
  h: number;
  /** The higher, the more it keeps its place. */
  rank: number;
}

/** The keys of the boxes that give way (pure, tested): greedy, the highest rank first. */
export function crowded(boxes: Box[], pad = 4): Set<string> {
  const kept: Box[] = [];
  const out = new Set<string>();
  const order = [...boxes].sort((a, b) => b.rank - a.rank || a.key.localeCompare(b.key));
  for (const b of order) {
    const hits = kept.some(
      (k) =>
        b.x < k.x + k.w + pad &&
        k.x < b.x + b.w + pad &&
        b.y < k.y + k.h + pad &&
        k.y < b.y + b.h + pad,
    );
    if (hits) out.add(b.key);
    else kept.push(b);
  }
  return out;
}

/**
 * On the page: each mark of the layer with a `data-rank` is measured by what it shows (its name
 * and its pill), and gets `data-crowded` when it gives way (the CSS fades its labels, its place
 * still touchable on the board).
 */
export function declutter(layer: HTMLElement | null): void {
  if (!layer) return;
  const marks = [...layer.querySelectorAll<HTMLElement>("[data-rank]")];
  const boxes: Box[] = [];
  marks.forEach((el, i) => {
    el.dataset.declutterKey = String(i);
    const parts = el.querySelectorAll<HTMLElement>(".map-name, .city-pill, [data-region-name]");
    let x0 = Number.POSITIVE_INFINITY;
    let y0 = Number.POSITIVE_INFINITY;
    let x1 = Number.NEGATIVE_INFINITY;
    let y1 = Number.NEGATIVE_INFINITY;
    for (const part of parts) {
      const r = part.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;
      x0 = Math.min(x0, r.left);
      y0 = Math.min(y0, r.top);
      x1 = Math.max(x1, r.right);
      y1 = Math.max(y1, r.bottom);
    }
    // A mark hidden on purpose (out of sight, a sector shut) takes no room.
    if (!Number.isFinite(x0) || getComputedStyle(el).opacity === "0") return;
    boxes.push({
      key: String(i),
      x: x0,
      y: y0,
      w: x1 - x0,
      h: y1 - y0,
      rank: Number(el.dataset.rank),
    });
  });
  const out = crowded(boxes);
  for (const el of marks) {
    const gives = out.has(el.dataset.declutterKey ?? "");
    if (gives) el.setAttribute("data-crowded", "");
    else el.removeAttribute("data-crowded");
  }
}
