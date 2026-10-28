import type { WorldSettings } from "./settings.js";

/**
 * The Lustre (R6 of the audit of 27 October 2026, docs/plan-rupture.md): a rank that lasts from
 * season to season, in the social ranks of Venice. Each week a merchant meets one of neighbouring
 * Lustre in a Sfida (the week's net sales, one against the other), or the ghost of another
 * merchant's past week when nobody is free. Pure: the server keeps the Lustre of the accounts and
 * the curves of the ghosts. It never touches the economy.
 */

export type LustreRules = NonNullable<WorldSettings["lustre"]>;

export interface Tier {
  code: string;
  index: number;
  from: number;
  /** Where the next tier starts (null: the top). */
  next: number | null;
}

/** The tier of a Lustre. */
export function tierOf(rules: LustreRules, lustre: number): Tier {
  let index = 0;
  rules.tiers.forEach((t, i) => {
    if (lustre >= t.from) index = i;
  });
  const t = rules.tiers[index] ?? { code: "", from: 0 };
  return { code: t.code, index, from: t.from, next: rules.tiers[index + 1]?.from ?? null };
}

/**
 * Pairs merchants by neighbouring Lustre, the highest first (ties by id); the one left over (an
 * odd field) meets a ghost.
 */
export function pairByLustre(field: { id: string; lustre: number }[]): {
  pairs: [string, string][];
  left: string[];
} {
  const sorted = [...field].sort((a, b) => b.lustre - a.lustre || a.id.localeCompare(b.id));
  const pairs: [string, string][] = [];
  for (let i = 0; i + 1 < sorted.length; i += 2)
    pairs.push([sorted[i]?.id ?? "", sorted[i + 1]?.id ?? ""]);
  return { pairs, left: sorted.length % 2 === 1 ? [sorted[sorted.length - 1]?.id ?? ""] : [] };
}

/** What a Sfida moves: the winner up, the loser down, the stake of a challenge on top. */
export function sfidaDelta(
  rules: LustreRules,
  aGain: bigint,
  bGain: bigint,
  stake = 0,
): { a: number; b: number } {
  if (aGain === bGain) return { a: 0, b: 0 };
  const s = Math.max(0, Math.min(rules.maxStake, stake));
  const win = rules.win + s;
  const loss = -(rules.loss + s);
  return aGain > bGain ? { a: win, b: loss } : { a: loss, b: win };
}

/** A Lustre moved, never below zero. */
export function applyLustre(lustre: number, delta: number): number {
  return Math.max(0, lustre + delta);
}

/** At the month's change: `resetTiers` tiers down, to that tier's threshold, never below zero. */
export function softReset(rules: LustreRules, lustre: number): number {
  const index = tierOf(rules, lustre).index - rules.resetTiers;
  return index < 0 ? 0 : (rules.tiers[index]?.from ?? 0);
}

/** A ghost's net sales of the week at an hour of it (its last value past its end). */
export function ghostAt(curve: bigint[], hour: number): bigint {
  if (curve.length === 0) return 0n;
  return curve[Math.max(0, Math.min(hour, curve.length - 1))] ?? 0n;
}
