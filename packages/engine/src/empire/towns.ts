/**
 * Some thirty towns (the gameplay audit, 5 November 2026, P2b, decision of the owner): the map
 * keeps a few towns a region, each town left out merged into a kept neighbour, so that a region's
 * book is the same and the orders gather where the rounds go. The cells of the map do not change
 * (a house's sectors and fondaci stay where they are).
 */
export interface TownInput {
  code: string;
  cell: string;
  region: string;
  x?: number;
  y?: number;
  size?: number;
  weight?: number;
}

/**
 * The towns kept (pure): each with the weight of those merged into it added to its own (1 by
 * default), and a size larger, by one for one or two merged, by two for three or more, five at
 * most. `merged` maps a town left out to the kept one it joins.
 */
export function mergeCities<T extends TownInput>(towns: T[], merged: Record<string, string>): T[] {
  const kept = new Set(towns.filter((t) => !(t.code in merged)).map((t) => t.code));
  for (const [from, to] of Object.entries(merged))
    if (!kept.has(to)) throw new Error(`town ${from} merged into ${to}, which is not kept`);
  return towns
    .filter((t) => kept.has(t.code))
    .map((t) => {
      const into = towns.filter((x) => merged[x.code] === t.code);
      if (into.length === 0) return t;
      const weight = (t.weight ?? 1) + into.reduce((n, x) => n + (x.weight ?? 1), 0);
      const size = Math.min(5, (t.size ?? 1) + (into.length >= 3 ? 2 : 1));
      return { ...t, weight, size };
    });
}
