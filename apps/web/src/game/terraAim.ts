/** What the camp's advice reads of the Terraferma's view. */
export interface AimView {
  /** What a front pays for each cell along the merchant's border. */
  costs: Record<string, number>;
  /** Who holds each cell (-1: free land). */
  owner: number[];
  holders: { ally?: boolean }[];
  fronts: { mine: boolean; aim: number }[];
  me: { troops: number } | null;
}

export interface Aim {
  cell: number;
  holder: number;
  cost: number;
  /** The share of the troops (basis points) that sends at least the cell's cost. */
  shareBps: number;
}

/**
 * Where a front goes first (refonte UX lot 8, the camp's sheet): the cheapest cell along the
 * border, never an ally's nor one the merchant's fronts already aim at, with the smallest share of
 * the troops that pays for it. Null when nothing is in reach or the troops cannot pay.
 */
export function bestAim(v: AimView): Aim | null {
  const me = v.me;
  if (!me || me.troops <= 0) return null;
  const aimed = new Set(v.fronts.filter((f) => f.mine).map((f) => f.aim));
  let best: { cell: number; cost: number } | null = null;
  for (const [key, cost] of Object.entries(v.costs)) {
    const cell = Number(key);
    const holder = v.owner[cell] ?? -1;
    if (aimed.has(cell) || (holder >= 0 && v.holders[holder]?.ally)) continue;
    if (!best || cost < best.cost || (cost === best.cost && cell < best.cell))
      best = { cell, cost };
  }
  if (!best || best.cost > me.troops) return null;
  const shareBps = Math.min(10_000, Math.ceil((best.cost * 10_000) / me.troops));
  return { ...best, holder: v.owner[best.cell] ?? -1, shareBps };
}
