/**
 * The tide's end and the Doge's decrees (docs/plan-maree.md §§ 3.3 and 3.5, lot T3). When a tide
 * ends, a tower held to the last engraves a stone on its holder's island (never lost); the open sea
 * is given back to the corsairs, every tower whole; the ink ebbs. The Doge just proclaimed chooses,
 * among three decrees the game draws, the rule of the tide that begins; three days without a choice,
 * the first is kept. A decree changes a rule of the lagoon for a tide: never a plunder, never a
 * house's own yield.
 *
 * Pure.
 */

import { plancheEncreEbb } from "./encre.js";
import { MAISON_KEEP } from "./maison.js";
import type { PlancheSetup, PlancheState } from "./planche.js";

/** The decrees' rules, as `worlds.settings` would give them. */
export interface DecretsRules {
  /** A town pays so much more for a good. */
  priceBps: number;
  /** The tolls of the lagoon capped at this. */
  tollBps: number;
  /** The ink rises so much less a week (hundredths of a row). */
  inkLess: number;
  /** The black straits lay so many links less. */
  noirLess: number;
  /** How long the Doge has to choose. */
  chooseMs: number;
}

export type PlancheDecret =
  | { kind: "prix"; city: string; good: string; bps: number }
  | { kind: "peage"; bps: number }
  | { kind: "encre"; less: number }
  | { kind: "noir"; less: number };

/** The decree of a tide: the three offered, the Doge's choice. */
export interface PlancheDecretState {
  tide: number;
  /** The Doge who chooses (the last tide's), and until when. */
  doge: string;
  until: number;
  offered: PlancheDecret[];
  chosen?: number;
}

/** A stone engraved on an island: the tower held to the end of a tide. */
export interface PlancheStone {
  tide: number;
  passage: string;
}

const fail = (code: string): never => {
  throw new Error(code);
};
const own = <T>(o: Record<string, T> | undefined, k: string): T | undefined =>
  o && Object.hasOwn(o, k) ? o[k] : undefined;

/** A number drawn from words, the same everywhere (FNV-1a). */
function hash(...parts: (string | number)[]): number {
  let h = 2166136261;
  for (const c of parts.join("|")) h = Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0;
  return h;
}

/** The three decrees the game offers for a tide, drawn from it: never twice the same kind. */
export function plancheDecretsOffered(S: PlancheSetup, tide: number): PlancheDecret[] {
  const D = S.decrets;
  if (!D) return [];
  const towns = S.cities.filter((c) => c.ring !== "muda" && Object.keys(c.wants).length);
  const all: PlancheDecret[] = [];
  const town = towns.length ? towns[hash(tide, "town") % towns.length] : undefined;
  const goods = town ? Object.keys(town.wants) : [];
  const good = goods[hash(tide, "good") % Math.max(1, goods.length)];
  if (town && good) all.push({ kind: "prix", city: town.id, good, bps: D.priceBps });
  all.push({ kind: "peage", bps: D.tollBps });
  if (S.encre) all.push({ kind: "encre", less: D.inkLess });
  if (S.noir) all.push({ kind: "noir", less: D.noirLess });
  // Three of them, in an order drawn from the tide.
  return all
    .map((d, k) => ({ d, r: hash(tide, "order", k) }))
    .sort((a, b) => a.r - b.r)
    .slice(0, 3)
    .map((x) => x.d);
}

/** The decree in force now: the Doge's choice, or the first once the time to choose is past. */
export function plancheDecret(s: PlancheState, now: number): PlancheDecret | null {
  const d = s.decret;
  if (!d || d.tide !== s.rank.tide) return null;
  if (d.chosen !== undefined) return d.offered[d.chosen] ?? null;
  return now >= d.until ? (d.offered[0] ?? null) : null;
}

/** The Doge chooses the decree of the tide. */
export function plancheDecretChoose(
  s0: PlancheState,
  house: string,
  choice: number,
  now: number,
): PlancheState {
  const d = s0.decret;
  if (!d || d.tide !== s0.rank.tide) return fail("planche_decret_none");
  if (d.doge !== house) return fail("planche_not_doge");
  if (d.chosen !== undefined || now >= d.until) return fail("planche_decret_done");
  if (!Number.isInteger(choice) || !d.offered[choice]) return fail("planche_unknown");
  const s = structuredClone(s0);
  (s.decret as PlancheDecretState).chosen = choice;
  const h = own(s.houses, house);
  if (h?.maison) {
    h.maison.log.push({ at: now, kind: "decret", data: d.offered[choice]?.kind ?? "" });
    if (h.maison.log.length > MAISON_KEEP) h.maison.log.shift();
  }
  return s;
}

/**
 * The tide's end (called by the board when a tide ends, after the laurels and before the rank
 * starts again; `now` the new tide's start, `doge` the house proclaimed): the stones, the open sea
 * given back, the ink's ebb, the decrees offered to the Doge.
 */
export function plancheTideEnd(S: PlancheSetup, s: PlancheState, now: number, doge: string): void {
  for (const p of S.passages) {
    const st = own(s.passages, p.id);
    const h = st ? own(s.houses, st.holder) : undefined;
    if (h && s.rank.humans.includes(st?.holder ?? "")) {
      h.stones = [...(h.stones ?? []), { tide: s.rank.tide, passage: p.id }];
      if (h.maison) {
        h.maison.log.push({ at: now, kind: "stone", data: p.id });
        if (h.maison.log.length > MAISON_KEEP) h.maison.log.shift();
      }
    }
    s.passages[p.id] = { holder: p.holder, tollBps: p.tollBps, seals: p.seals };
  }
  plancheEncreEbb(S, s);
  if (S.decrets && doge)
    s.decret = {
      tide: s.rank.tide + 1,
      doge,
      until: now + S.decrets.chooseMs,
      offered: plancheDecretsOffered(S, s.rank.tide + 1),
    };
}

/** What a decree adds to a town's price for a good, in points (10 000 without). */
export function plancheDecretPriceBps(s: PlancheState, city: string, good: string, now: number) {
  const d = plancheDecret(s, now);
  return d?.kind === "prix" && d.city === city && d.good === good ? 10_000 + d.bps : 10_000;
}

/** The toll's cap under the decree, if it lowers it. */
export function plancheDecretTollCap(s: PlancheState, cap: number, now: number): number {
  const d = plancheDecret(s, now);
  return d?.kind === "peage" ? Math.min(cap, d.bps) : cap;
}

/** What the ink rises less, and the black straits lay less, under the decree. */
export const plancheDecretInkLess = (s: PlancheState, now: number) => {
  const d = plancheDecret(s, now);
  return d?.kind === "encre" ? d.less : 0;
};
export const plancheDecretNoirLess = (s: PlancheState, now: number) => {
  const d = plancheDecret(s, now);
  return d?.kind === "noir" ? d.less : 0;
};

/** How long a tide's Doge has left to choose. */
export const plancheDecretLeft = (s: PlancheState, now: number) =>
  s.decret && s.decret.tide === s.rank.tide && s.decret.chosen === undefined
    ? Math.max(0, s.decret.until - now)
    : 0;
