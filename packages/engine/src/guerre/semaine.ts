/**
 * The week of the War (docs/plan-guerre.md W4): the flotillas of six formed on Monday by bands of
 * Power (rule 6), filled with the computer's houses when people are few, paired with the
 * flotilla of the next band; on each port only the best assault counts; the Prestige of the week
 * by the owner's scale (12 November 2026), within the week's cap.
 *
 * Pure: the server keeps the assaults and settles the week with these.
 */

export interface GuerreCandidate {
  key: string;
  power: number;
  /** A person's house (else the computer's, which only fills). */
  person: boolean;
}

export interface GuerreWar {
  a: string[];
  b: string[];
}

export interface GuerreAssaultDone {
  by: string;
  target: string;
  seals: number;
  damageBps: number;
}

/**
 * The flotillas and their wars: the people, strongest first, in sixes; each flotilla filled with
 * the computer's houses nearest its Power; each paired with a flotilla of the computer's houses
 * of the same band (or with the next flotilla of people when there is one of the same band).
 */
export function guerreForm(houses: GuerreCandidate[], size: number): { wars: GuerreWar[] } {
  const people = houses
    .filter((h) => h.person)
    .sort((x, y) => y.power - x.power || (x.key < y.key ? -1 : 1));
  const spare = houses.filter((h) => !h.person);
  const used = new Set<string>();
  /** The computer's houses nearest a Power, not yet used. */
  const nearest = (power: number, n: number) => {
    const out = spare
      .filter((h) => !used.has(h.key))
      .sort(
        (x, y) => Math.abs(x.power - power) - Math.abs(y.power - power) || (x.key < y.key ? -1 : 1),
      )
      .slice(0, n)
      .map((h) => h.key);
    for (const k of out) used.add(k);
    return out;
  };
  const flotillas: { keys: string[]; power: number }[] = [];
  for (let i = 0; i < people.length; i += size) {
    const group = people.slice(i, i + size);
    const mean = group.reduce((n, h) => n + h.power, 0) / Math.max(1, group.length);
    const keys = [...group.map((h) => h.key), ...nearest(mean, size - group.length)];
    if (keys.length === size) flotillas.push({ keys, power: mean });
  }
  const wars: GuerreWar[] = [];
  for (let i = 0; i < flotillas.length; i++) {
    const a = flotillas[i];
    const b = flotillas[i + 1];
    if (!a) continue;
    // Two flotillas of people of a band close enough meet; else the computer's flotilla of the band.
    if (b && Math.abs(a.power - b.power) <= Math.max(50, a.power * 0.15)) {
      wars.push({ a: a.keys, b: b.keys });
      i += 1;
    } else {
      const foe = nearest(a.power, size);
      if (foe.length === size) wars.push({ a: a.keys, b: foe });
    }
  }
  return { wars };
}

/** The seals of each side: on each port, only its best assault counts. */
export function guerreScore(
  war: GuerreWar,
  assaults: GuerreAssaultDone[],
): { a: number; b: number; best: Record<string, number>; winner: "a" | "b" | null } {
  const best: Record<string, number> = {};
  for (const x of assaults) {
    const attackerSide = war.a.includes(x.by) ? "a" : war.b.includes(x.by) ? "b" : null;
    const targetSide = war.a.includes(x.target) ? "a" : war.b.includes(x.target) ? "b" : null;
    if (!attackerSide || !targetSide || attackerSide === targetSide) continue;
    best[x.target] = Math.max(best[x.target] ?? 0, x.seals);
  }
  const sum = (ports: string[]) => ports.reduce((n, k) => n + (best[k] ?? 0), 0);
  const a = sum(war.b);
  const b = sum(war.a);
  return { a, b, best, winner: a > b ? "a" : b > a ? "b" : null };
}

export interface GuerrePrestigeRules {
  seal: number;
  damage: number;
  repelled: number;
  repelledCap: number;
  victory: number;
}

/**
 * Each house's Prestige of the week: its assaults (by seal, or a little for damage without a
 * seal), its port's defence that held (capped), and the victory of its flotilla.
 */
export function guerrePrestige(
  P: GuerrePrestigeRules,
  war: GuerreWar,
  assaults: GuerreAssaultDone[],
): Record<string, number> {
  const out: Record<string, number> = {};
  const add = (k: string, n: number) => {
    out[k] = (out[k] ?? 0) + n;
  };
  const repelled: Record<string, number> = {};
  const members = new Set([...war.a, ...war.b]);
  for (const x of assaults) {
    if (!members.has(x.by) || !members.has(x.target)) continue;
    if (x.seals > 0) add(x.by, x.seals * P.seal);
    else if (x.damageBps > 0) add(x.by, P.damage);
    if (x.seals === 0) repelled[x.target] = (repelled[x.target] ?? 0) + P.repelled;
  }
  for (const [k, n] of Object.entries(repelled)) add(k, Math.min(P.repelledCap, n));
  const { winner } = guerreScore(war, assaults);
  if (winner) for (const k of war[winner]) add(k, P.victory);
  return out;
}
