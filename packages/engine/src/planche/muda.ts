/**
 * The Muda, the State's convoy of the week (docs/plan-muda.md § 3.3, lot N2). From Wednesday to
 * Friday the whole lagoon loads it: a thread to the pier pours goods into its hold instead of
 * selling them, a few a day for each house, up to the hold's gauge (rule 3: full, the loading
 * stops, nothing lost). On Saturday it sails for Alexandria past three straits, one after the
 * other: any house may play each once, and the first that wins it lets the convoy through. On
 * Sunday morning each house is paid what it loaded at Venice's price, and half again for each
 * strait passed: never less than it gave (the owner's choice, 13 November 2026).
 *
 * Pure: the board settles it at its slices; the duels are replayed by the server.
 */

import { MAISON_KEEP } from "./maison.js";
import { plancheMonday } from "./noir.js";
import type { PlancheHouse, PlancheSetup, PlancheState, PlancheThread } from "./planche.js";

const HOUR = 3_600_000;
const DAY = 24 * HOUR;
const BPS = 10_000;

/** The Muda's rules, as `worlds.settings` would give them. */
export interface PlancheMudaRules {
  /** The town of the board that is the convoy's pier (its ring `muda`): threads to it load. */
  pier: string;
  /** The days of the week its hold is loaded (0: Monday), all day (UTC). */
  loadDays: number[];
  /** The day it sails, and the hours (UTC) its straits may be played. */
  sailDay: number;
  sailHours: [number, number];
  /** The day and hour (UTC) it comes back and pays. */
  returnDay: number;
  returnHour: number;
  /** Units the hold takes for each house of the board. */
  holdPerHouse: number;
  /** Units a house may load a day. */
  dailyCap: number;
  /** What a house of the computer loads each loading day, of what it has most. */
  robotDaily: number;
  /** The straits on its way, in order, each on a board of the Passe. */
  straits: { id: string; name: string; board: string; x: number; y: number }[];
  /** Pieces the corsairs of its straits look ahead. */
  depth: number;
  /** What each strait passed adds to the return, in points of what was loaded. */
  stepBps: number;
  /** Prestige: for a house that loaded at least `minUnits`; a strait played; a strait won. */
  prestige: { contributor: number; minUnits: number; volunteer: number; winner: number };
}

/** A strait of the Muda: who let the convoy through, and who played it. */
export interface PlancheMudaStraitState {
  by?: string;
  at?: number;
  tried: string[];
}

/** The Muda of the week, as the board keeps it. */
export interface PlancheMudaState {
  monday: number;
  /** Units each house loaded, and their worth at Venice's price (deniers). */
  units: Record<string, number>;
  worth: Record<string, bigint>;
  /** Units each house loaded today, and that day. */
  day: number;
  today: Record<string, number>;
  /** The days the houses of the computer have loaded. */
  robotDays: number[];
  straits: Record<string, PlancheMudaStraitState>;
  /** What each house was paid when it came back. */
  paid?: Record<string, bigint>;
  /** The week before's convoy, as it came back (for the Gazette). */
  last?: { monday: number; units: number; passed: number; paid: Record<string, bigint> };
}

const fail = (code: string): never => {
  throw new Error(code);
};
const own = <T>(o: Record<string, T> | undefined, k: string): T | undefined =>
  o && Object.hasOwn(o, k) ? o[k] : undefined;

const weekday = (t: number) => Math.floor((t - plancheMonday(t)) / DAY);

/** What the Muda is doing at `t`: loading, sailing, back (paid), or nothing yet. */
export function plancheMudaPhase(
  S: PlancheSetup,
  t: number,
): "before" | "loading" | "sailing" | "waiting" | "back" {
  const M = S.muda;
  if (!M) return "before";
  const d = weekday(t);
  const h = Math.floor((t - plancheMonday(t) - d * DAY) / HOUR);
  if (M.loadDays.includes(d)) return "loading";
  if (d === M.sailDay && h >= M.sailHours[0] && h < M.sailHours[1]) return "sailing";
  if (d > M.returnDay || (d === M.returnDay && h >= M.returnHour)) return "back";
  if (d < (M.loadDays[0] ?? 0)) return "before";
  return "waiting";
}

/** The hold's gauge: units it takes in all. */
export const plancheMudaHold = (S: PlancheSetup) => (S.muda?.holdPerHouse ?? 0) * S.houses.length;

/** The Muda of the week at `t`, fresh if the board's is an older week's. */
function mudaOf(s: PlancheState, t: number): PlancheMudaState {
  const monday = plancheMonday(t);
  if (s.muda?.monday === monday) return s.muda;
  const old = s.muda;
  const fresh: PlancheMudaState = {
    monday,
    units: {},
    worth: {},
    day: Math.floor(t / DAY),
    today: {},
    robotDays: [],
    straits: {},
  };
  if (old?.paid)
    fresh.last = {
      monday: old.monday,
      units: Object.values(old.units).reduce((a, b) => a + b, 0),
      passed: Object.values(old.straits).filter((x) => x.by).length,
      paid: old.paid,
    };
  else if (old?.last) fresh.last = old.last;
  return fresh;
}

/** The units in the hold. */
export function plancheMudaLoaded(s: PlancheState, t: number): number {
  if (!s.muda || s.muda.monday !== plancheMonday(t)) return 0;
  return Object.values(s.muda.units).reduce((a, b) => a + b, 0);
}

/** The straits the convoy has passed so far this week. */
export function plancheMudaPassed(S: PlancheSetup, s: PlancheState, t: number): number {
  if (!S.muda || !s.muda || s.muda.monday !== plancheMonday(t)) return 0;
  let n = 0;
  for (const x of S.muda.straits) {
    if (!own(s.muda.straits, x.id)?.by) break;
    n++;
  }
  return n;
}

/** Venice's price of a good for the Muda: what its pier pays, at its full price. */
export function plancheMudaPrice(S: PlancheSetup, good: string): number {
  const pier = S.cities.find((c) => c.id === S.muda?.pier);
  return own(pier?.wants, good)?.price ?? 0;
}

/**
 * Units poured into the hold from a house (in the state being sliced): never more than the house
 * has, its day's cap, the hold's room. Returns what went in.
 */
function pour(S: PlancheSetup, s: PlancheState, h: PlancheHouse, good: string, n: number): number {
  const M = S.muda as PlancheMudaRules;
  const m = mudaOf(s, s.now);
  s.muda = m;
  const day = Math.floor(s.now / DAY);
  if (m.day !== day) {
    m.day = day;
    m.today = {};
  }
  const room = Math.max(0, plancheMudaHold(S) - plancheMudaLoaded(s, s.now));
  const left = M.dailyCap - (own(m.today, h.id) ?? 0);
  const k = Math.max(0, Math.min(n, h.stock[good] ?? 0, left, room));
  if (!k) return 0;
  h.stock[good] = (h.stock[good] ?? 0) - k;
  m.today[h.id] = (own(m.today, h.id) ?? 0) + k;
  m.units[h.id] = (own(m.units, h.id) ?? 0) + k;
  m.worth[h.id] = (own(m.worth, h.id) ?? 0n) + BigInt(plancheMudaPrice(S, good)) * BigInt(k);
  return k;
}

/**
 * A thread to the pier, in a slice: while the hold is loaded, what it carries goes into it instead
 * of being sold; otherwise it waits, carrying nothing. True: the thread was the Muda's.
 */
export function plancheMudaThread(
  S: PlancheSetup,
  s: PlancheState,
  h: PlancheHouse,
  th: PlancheThread,
  could: number,
  unit: number,
): boolean {
  if (!S.muda || th.to !== S.muda.pier) return false;
  if (plancheMudaPhase(S, s.now) !== "loading") {
    th.carry = 0;
    return true;
  }
  const k = pour(S, s, h, th.good, could);
  // What it could not load is not banked, as for a sale.
  th.carry = k < could ? 0 : th.carry - could * unit;
  return true;
}

/**
 * The Muda's turn at the end of a slice: the houses of the computer load their part once each
 * loading day; on Sunday morning the convoy comes back and pays.
 */
export function plancheMudaTurn(S: PlancheSetup, s: PlancheState): void {
  const M = S.muda;
  if (!M) return;
  const phase = plancheMudaPhase(S, s.now);
  if (phase === "loading") {
    const m = mudaOf(s, s.now);
    s.muda = m;
    const day = Math.floor(s.now / DAY);
    if (!m.robotDays.includes(day)) {
      m.robotDays.push(day);
      for (const hs of S.houses) {
        const h = own(s.houses, hs.id);
        if (!h || s.rank.humans.includes(hs.id)) continue;
        const goods = Object.entries(h.stock)
          .filter(([g, n]) => n > 0 && plancheMudaPrice(S, g) > 0)
          .sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1));
        const best = goods[0];
        if (best) pour(S, s, h, best[0], M.robotDaily);
      }
    }
  }
  if (phase === "back" && s.muda?.monday === plancheMonday(s.now) && !s.muda.paid) {
    const m = s.muda;
    const passed = plancheMudaPassed(S, s, s.now);
    const bps = BigInt(BPS + passed * M.stepBps);
    const paid: Record<string, bigint> = {};
    for (const [house, worth] of Object.entries(m.worth)) {
      const h = own(s.houses, house);
      if (!h) continue;
      const pay = (worth * bps) / BigInt(BPS);
      paid[house] = pay;
      h.ducats += pay;
      h.earned += pay;
      h.book.sold += pay;
      s.minted += pay;
      if (h.maison && (own(m.units, house) ?? 0) >= M.prestige.minUnits) {
        h.maison.muda = (h.maison.muda ?? 0) + M.prestige.contributor;
        if (passed === M.straits.length) {
          h.maison.log.push({ at: s.now, kind: "muda", data: passed });
          if (h.maison.log.length > MAISON_KEEP) h.maison.log.shift();
        }
      }
    }
    m.paid = paid;
  }
}

/** Why a house may not play a strait of the Muda now, or nothing if it may. */
export function plancheMudaRefusal(
  S: PlancheSetup,
  s: PlancheState,
  house: string,
  strait: string,
  now: number,
): string | undefined {
  const M = S.muda;
  const k = M?.straits.findIndex((x) => x.id === strait) ?? -1;
  if (!M || k < 0 || !own(s.houses, house)) return "planche_unknown";
  if (plancheMudaPhase(S, now) !== "sailing") return "planche_muda_closed";
  if (plancheMudaLoaded(s, now) <= 0) return "planche_muda_empty";
  const st = s.muda?.monday === plancheMonday(now) ? own(s.muda.straits, strait) : undefined;
  if (st?.by) return "planche_muda_passed";
  // The convoy is before the first strait not passed.
  if (plancheMudaPassed(S, s, now) !== k) return "planche_muda_ahead";
  if (st?.tried.includes(house)) return "planche_muda_tried";
  return undefined;
}

/** A house has played the convoy's strait: won, the convoy passes it. Either way, its Prestige. */
export function plancheMudaForce(
  S: PlancheSetup,
  s0: PlancheState,
  house: string,
  strait: string,
  won: boolean,
  now: number,
): PlancheState {
  const why = plancheMudaRefusal(S, s0, house, strait, now);
  if (why) return fail(why);
  const M = S.muda as PlancheMudaRules;
  const s = structuredClone(s0);
  const m = mudaOf(s, now);
  s.muda = m;
  const st = own(m.straits, strait) ?? { tried: [] };
  st.tried.push(house);
  m.straits[strait] = st;
  const h = s.houses[house] as PlancheHouse;
  if (h.maison) h.maison.muda = (h.maison.muda ?? 0) + M.prestige.volunteer;
  if (!won) return s;
  st.by = house;
  st.at = now;
  if (h.maison) h.maison.muda = (h.maison.muda ?? 0) + M.prestige.winner;
  return s;
}
