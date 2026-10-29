/** The Market's moves, pure: the change of a price over its history, the day's biggest move. */

/** Change over the visible history, in percent. */
export function change(points: number[]): number {
  const first = points[0];
  const last = points.at(-1);
  if (!first || !last || points.length < 2) return 0;
  return ((last - first) / first) * 100;
}

/** The good whose price moved the most, up or down (null: nothing moved). Venice's Market moon. */
export function topMove(
  series: Record<string, number[]>,
): { resource: string; change: number } | null {
  let best: { resource: string; change: number } | null = null;
  for (const [resource, points] of Object.entries(series)) {
    const c = change(points);
    if (c !== 0 && (!best || Math.abs(c) > Math.abs(best.change))) best = { resource, change: c };
  }
  return best;
}
