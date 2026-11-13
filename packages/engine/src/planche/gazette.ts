/**
 * The Gazette of Sunday (docs/plan-muda.md § 3.4, lot N4): a journal of the lagoon written by the
 * game from what its week was. Pure: facts in, an issue out; the words are the screen's (the issue
 * holds names and numbers, never a player's own text). The War's facts come from the server, which
 * keeps the assaults.
 */

import { plancheMudaHold, plancheMudaPassed } from "./muda.js";
import { plancheMonday } from "./noir.js";
import type { PlancheSetup, PlancheState } from "./planche.js";

const DAY = 86_400_000;

/** The War's week, as the server tells it for a lagoon. */
export interface GazetteWar {
  /** Seals the lagoon's houses broke this week. */
  seals: number;
  /** The houses that broke the most. */
  top: { name: string; seals: number }[];
  /** The finest assault made by one of its houses: the most seals. */
  best: { id: number; by: string; target: string; seals: number } | null;
}

export type GazetteHeadline =
  | { kind: "doge"; name: string }
  | { kind: "muda"; passed: number; units: number }
  | { kind: "noir"; name: string; count: number }
  | { kind: "guerre"; name: string; seals: number }
  | { kind: "rival"; name: string; loser: string }
  | { kind: "calme" };

export interface PlancheGazette {
  /** The Monday of its week. */
  monday: number;
  headline: GazetteHeadline;
  muda: {
    units: number;
    hold: number;
    passed: number;
    straits: { id: string; name: string; by: string | null }[];
    /** Those who loaded most. */
    top: { name: string; units: number }[];
  } | null;
  noir: { id: string; name: string; power: string; count: number; houses: string[] }[];
  guerre: GazetteWar | null;
  rivals: { winner: string; loser: string }[];
  levels: { name: string; level: number }[];
  laurels: {
    negoce: string | null;
    passe: string | null;
    garde: string | null;
    doge: string;
  } | null;
}

/** How many rows a rubric keeps. */
const ROWS = 5;

/**
 * The issue of the week of `now` (written on Sunday): `names` gives each house its name, `war` the
 * War's facts if the lagoon was at war.
 */
export function plancheGazette(
  S: PlancheSetup,
  s: PlancheState,
  now: number,
  names: Record<string, string>,
  war: GazetteWar | null,
): PlancheGazette {
  const monday = plancheMonday(now);
  const name = (id: string) => names[id] ?? S.houses.find((h) => h.id === id)?.name ?? id;
  // The Muda of the week.
  const m = s.muda?.monday === monday ? s.muda : undefined;
  const M = S.muda;
  const muda =
    M && m
      ? {
          units: Object.values(m.units).reduce((a, b) => a + b, 0),
          hold: plancheMudaHold(S),
          passed: plancheMudaPassed(S, s, now),
          straits: M.straits.map((x) => {
            const by = m.straits[x.id]?.by;
            return { id: x.id, name: x.name, by: by ? name(by) : null };
          }),
          top: Object.entries(m.units)
            .sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1))
            .slice(0, ROWS)
            .map(([id, units]) => ({ name: name(id), units })),
        }
      : null;
  // The black straits forced this week.
  const feats = s.noir?.monday === monday ? s.noir.feats : [];
  const noir = (S.noir?.straits ?? [])
    .map((x) => {
      const mine = feats.filter((f) => f.strait === x.id);
      return {
        id: x.id,
        name: x.name,
        power: x.power,
        count: mine.length,
        houses: [...new Set(mine.map((f) => name(f.house)))].slice(0, ROWS),
      };
    })
    .filter((x) => x.count > 0);
  // The rivals beaten, the levels reached this week.
  const rivals = Object.entries(s.rank.flags)
    .flatMap(([w, losers]) => losers.map((l) => ({ winner: name(w), loser: name(l) })))
    .slice(0, ROWS);
  const levels = Object.entries(s.houses)
    .filter(([id]) => s.rank.humans.includes(id))
    .flatMap(([id, h]) =>
      (h.maison?.log ?? [])
        .filter((e) => e.kind === "level" && e.at >= monday && e.at < monday + 7 * DAY)
        .map((e) => ({ name: name(id), level: Number(e.data) })),
    )
    .sort((a, b) => b.level - a.level)
    .slice(0, ROWS);
  // The laurels and the Doge proclaimed this Monday, at the end of the last tide.
  const L = s.rank.laurels;
  const laurels =
    L && plancheMonday(s.rank.tideStart) === monday
      ? {
          negoce: L.negoce ? name(L.negoce) : null,
          passe: L.passe ? name(L.passe) : null,
          garde: L.garde ? name(L.garde) : null,
          doge: name(L.doge),
        }
      : null;
  // The headline: the strongest fact of the week.
  const most = [...noir].sort((a, b) => b.count - a.count)[0];
  const headline: GazetteHeadline = laurels
    ? { kind: "doge", name: laurels.doge }
    : muda && M && muda.passed === M.straits.length && muda.units > 0
      ? { kind: "muda", passed: muda.passed, units: muda.units }
      : war?.top[0] && war.top[0].seals > 0
        ? { kind: "guerre", name: war.top[0].name, seals: war.top[0].seals }
        : most
          ? { kind: "noir", name: most.name, count: most.count }
          : rivals[0]
            ? { kind: "rival", name: rivals[0].winner, loser: rivals[0].loser }
            : muda && muda.units > 0
              ? { kind: "muda", passed: muda.passed, units: muda.units }
              : { kind: "calme" };
  return {
    monday,
    headline,
    muda,
    noir,
    guerre: war,
    rivals,
    levels,
    laurels,
  };
}
