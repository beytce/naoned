import { type WorldContext, type WorldState, isActive } from "@comptoirs/engine";

/** Fewer active people than this in the world: no region is recommended (a small world sways). */
export const RECOMMEND_MIN_PEOPLE = 10;
/** The least peopled region must lag the most peopled by more than this share (bps). */
export const RECOMMEND_GAP_BPS = 2_000;

/**
 * The trade to recommend this month (E3-5 of the experts): the region with the fewest active
 * people, only when at least ten are active and it lags the most peopled by more than 20 %.
 * Otherwise none, so that the badge does not sway in a small world.
 */
export function recommendedRegion(counts: Record<string, number>): string | null {
  const regions = Object.entries(counts).sort(([a], [b]) => (a < b ? -1 : 1));
  const total = regions.reduce((n, [, c]) => n + c, 0);
  if (regions.length < 2 || total < RECOMMEND_MIN_PEOPLE) return null;
  const most = Math.max(...regions.map(([, c]) => c));
  const [least, fewest] = regions.reduce((low, r) => (r[1] < low[1] ? r : low));
  return (most - fewest) * 10_000 > most * RECOMMEND_GAP_BPS ? least : null;
}

/** Active people (never the computer's houses) per region of the theme. */
export function activePeopleByRegion(
  ctx: WorldContext,
  state: WorldState,
  now: number,
): Record<string, number> {
  const counts: Record<string, number> = Object.fromEntries(
    ctx.theme.regions.map((r) => [r.code, 0]),
  );
  for (const p of Object.values(state.players)) {
    if (p.npc || !isActive(ctx, p, now) || counts[p.region] === undefined) continue;
    counts[p.region] = (counts[p.region] ?? 0) + 1;
  }
  return counts;
}
