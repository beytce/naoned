import { createContext, useContext, useEffect, useState, useSyncExternalStore } from "react";

/**
 * « One action in gold » (Lagune direction, audit of 4 November, UI U-1): every gold slab on the
 * screen claims the gold; the deepest layer wins (a sheet over a panel over Lorenzo over the
 * map), and among equals the first one shown. The others are drawn as ghosts, still touchable.
 */
export const GOLD = { map: 1, guide: 1.5, panel: 2, scene: 2.5, sheet: 3, moment: 4 } as const;

export const GoldDepth = createContext<number>(GOLD.map);

interface Claim {
  depth: number;
  order: number;
}
const claims = new Map<symbol, Claim>();
const listeners = new Set<() => void>();
let counter = 0;
let owner: symbol | null = null;

function elect() {
  let best: [symbol, Claim] | null = null;
  for (const entry of claims) {
    const [, c] = entry;
    if (!best || c.depth > best[1].depth || (c.depth === best[1].depth && c.order < best[1].order))
      best = entry;
  }
  const next = best?.[0] ?? null;
  if (next === owner) return;
  owner = next;
  for (const f of listeners) f();
}

const subscribe = (f: () => void) => {
  listeners.add(f);
  return () => listeners.delete(f);
};
const current = () => owner;

/** Whether this gold slab is the screen's one (a slab that claims nothing never is). */
export function useGold(claiming: boolean, boost = 0): boolean {
  const depth = useContext(GoldDepth) + boost;
  const [me] = useState(() => Symbol("gold"));
  useEffect(() => {
    if (!claiming) return;
    claims.set(me, { depth, order: counter++ });
    elect();
    return () => {
      claims.delete(me);
      elect();
    };
  }, [claiming, depth, me]);
  return useSyncExternalStore(subscribe, current, current) === me;
}
