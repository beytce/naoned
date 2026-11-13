/**
 * The shared board and its threads (docs/CADRAGE-v4.md §§ 3, 5, 6, 7; docs/plan-planche.md).
 *
 * Every house of a world stands on one board. A house makes goods on its island and stretches
 * threads from its quay to the towns: its barges follow them by themselves. A town's demand is
 * shared by all: what one sells, the others no longer can, and the price falls for everyone. The
 * rich routes cross passages, each held by a corsair or by a house, who shuts it or levies a toll.
 *
 * Pure and deterministic. Time moves by whole slices; money is in deniers (bigint), goods in whole
 * units, rates in basis points. What is made, sent or asked for a fraction of a unit is carried over
 * exactly, never rounded away.
 */

import type { AssautPort, AssautRules } from "../guerre/assaut.js";
import {
  type IleRules,
  type IleState,
  type IleTerrain,
  ileBuild,
  ileBuyTile,
  ileFlows,
  ileGround,
  ileInit,
  ileMove,
  ileSlice,
  ileUpgrade,
} from "../ile/ile.js";
import {
  type ArsenalRules,
  type PlancheFleet,
  plancheArsenalMayBuild,
  plancheArsenalSettle,
} from "./arsenal.js";
import type { PlancheOrderRules, PlancheOrderState } from "./commandes.js";
import {
  type EncreRules,
  type EncreState,
  plancheEncreKeepBps,
  plancheEncrePriceBps,
} from "./encre.js";
import type { PlancheDailyRules, PlancheDailyTry } from "./jour.js";
import {
  MAISON_KEEP,
  type MaisonCaps,
  type MaisonRules,
  type MaisonState,
  maisonStart,
  maisonUnlocks,
} from "./maison.js";
import {
  type DecretsRules,
  type PlancheDecretState,
  type PlancheStone,
  plancheDecretPriceBps,
  plancheDecretTollCap,
} from "./maree.js";
import {
  type PlancheMudaRules,
  type PlancheMudaState,
  plancheMudaThread,
  plancheMudaTurn,
} from "./muda.js";
import { type NoirRules, type NoirState, plancheNeedsPlan, plancheSpendPlan } from "./noir.js";
import {
  type PlancheHouseRank,
  type PlancheRank,
  type PlancheRankRules,
  plancheRankHouse,
  plancheRankInit,
  plancheRankTurn,
} from "./rang.js";
import type { PlancheSortiesState, SortiesRules } from "./sorties.js";

const HOUR = 3_600_000;
const DAY = 24 * HOUR;
const BPS = 10_000;

export interface PlancheWant {
  /** Deniers a unit when the town's demand is full. */
  price: number;
  /** The share of that price paid when its demand is spent. */
  floorBps: number;
  /** Units the town can take before it tires. */
  cap: number;
  /** Units its demand grows back an hour. */
  regenPerHour: number;
}

export interface PlancheCity {
  id: string;
  name: string;
  x: number;
  y: number;
  /** The passages its route crosses, from the lagoon out. */
  via: string[];
  wants: Record<string, PlancheWant>;
  /** Its ring in a lagoon (docs/plan-lagunes.md): near a sestiere, the lagoon's, the open sea's. */
  ring?: "sestiere" | "lagoon" | "large" | "muda";
  /** The sestiere whose town it is (ring `sestiere`). */
  sestiere?: string;
  /**
   * The way round its passages, without a duel: a thread there carries this share of what it
   * would by the passages (points of base), and pays no toll. None: no detour.
   */
  detourBps?: number;
}

export interface PlanchePassage {
  id: string;
  name: string;
  x: number;
  y: number;
  /** A house's id, or `corsair:<name>`: a corsair lets no one through who has not forced him. */
  holder: string;
  tollBps: number;
  /** The board of its Passe (the duel that forces it). */
  board: string;
  seals: number;
  /** How perilous its tile is: an hour held there counts as many in the Garde (1 if unsaid). */
  peril?: number;
  /** The links its holder may lay in advance on its board (docs/plan-hex-commerce.md H4); none: no guard. */
  guard?: number;
}

export interface PlancheHouseSetup {
  id: string;
  name: string;
  robot: boolean;
  x: number;
  y: number;
  /** What it makes, units an hour, when the board has no islands. */
  makes: Record<string, number>;
  /** Its island's soil: how often each terrain comes up (with islands). */
  soil?: Partial<Record<IleTerrain, number>>;
  /** What a house of the computer builds, in order (with islands). */
  plan?: string[];
  /** Its sestiere, in a lagoon of 48 (docs/plan-lagunes.md). */
  sestiere?: string;
}

/** The War of the week's rules (docs/plan-guerre.md § 3.4, the owner's choice of 12 November). */
export interface GuerreRules {
  assaut: AssautRules;
  prestige: {
    seal: number;
    damage: number;
    repelled: number;
    repelledCap: number;
    victory: number;
  };
  /** The training port (the Lido of the corsairs) and the fleet lent to who has none. */
  training?: { name: string; port: AssautPort; fleet: string[] };
}

/** A world's board and its rules, as `worlds.settings` would give them. */
export interface PlancheSetup {
  width: number;
  height: number;
  sliceMs: number;
  goods: Record<string, string>;
  houses: PlancheHouseSetup[];
  cities: PlancheCity[];
  passages: PlanchePassage[];
  /** The islands' rules: with them, a house makes what its island makes, and pays to build it. */
  ile?: IleRules;
  /** The rank's rules: without them, the counters run but no week nor tide ever ends. */
  rank?: PlancheRankRules;
  /**
   * The growth of the houses (docs/plan-progression-maison.md): with it, each house has a level,
   * and its bobbins, its island, its workshops and its towers follow it; without it, the rules'.
   */
  maison?: MaisonRules;
  /** The sealed orders (docs/plan-hex-commerce.md H2): without them, none. */
  orders?: PlancheOrderRules;
  /** The problem of the day (docs/plan-hex-commerce.md H3): without it, none. */
  daily?: PlancheDailyRules;
  /** The Arsenal, the fleet and the port (docs/plan-arsenal.md): without them, none. */
  arsenal?: ArsenalRules;
  /** The War of the week (docs/plan-guerre.md): the assault's rules and its Prestige. */
  guerre?: GuerreRules;
  /**
   * The company's beacon (docs/plan-compagnie.md K4): the points (goods given) of each of its
   * levels, the goods a member may give a day, the level that shows a ruse of each assault.
   */
  compagnie?: { beacon: { thresholds: number[]; dailyCap: number; scoutLevel: number } };
  /** The black straits, their relics and the plans (docs/plan-muda.md N1): without them, none. */
  noir?: NoirRules;
  /** The Muda, the State's convoy of the week (docs/plan-muda.md N2): without it, none. */
  muda?: PlancheMudaRules;
  /** The ink tide (docs/plan-maree.md T1): without it, the ink never moves. */
  encre?: EncreRules;
  /** The captains' sorties (docs/plan-maree.md T2): without them, none. */
  sorties?: SortiesRules;
  /** The Doge's decrees (docs/plan-maree.md T3): without them, none. */
  decrets?: DecretsRules;
  rules: {
    bobbins: number;
    /** Units of each good a warehouse holds. */
    store: number;
    startStock: number;
    startDucats: number;
    /** Units a thread carries an hour, before its patina. */
    threadPerHour: number;
    /** What a thread gains for each whole day held in place, and at most. */
    patinaBpsPerDay: number;
    patinaMaxBps: number;
    tollMaxBps: number;
    /** The share of a toll that is destroyed. */
    tollBurnBps: number;
    /** How long a house that forced a passage goes through it free. */
    freeAfterForceMs: number;
    /** How long a bobbin taken back is coming home, a tile of its thread. */
    rewindMsPerTile: number;
  };
}

export interface PlancheThread {
  to: string;
  good: string;
  since: number;
  /** What it could carry and has not yet: unit × ms × bps, exact. */
  carry: number;
  /** It goes the way round the passages: no duel, no toll, a smaller load. */
  detour?: boolean;
}

export interface PlancheHouse {
  id: string;
  ducats: bigint;
  stock: Record<string, number>;
  makeCarry: Record<string, number>;
  threads: PlancheThread[];
  /** When each bobbin taken back is home again. */
  rewinding: number[];
  /** Until when it goes through a passage it forced. */
  free: Record<string, number>;
  /** Units it delivered, and what its threads earned (the tide's score). */
  delivered: number;
  earned: bigint;
  /** Its island, when the board has islands. */
  ile?: IleState;
  /** Its counters for the tide (docs/plan-classement.md). */
  rank: PlancheHouseRank;
  /**
   * Its book, since the board began (docs/plan-compte.md C2): what towns paid for its goods,
   * the tolls it paid and received, what its island cost. Its purse is its start and these.
   */
  book: { sold: bigint; tollPaid: bigint; tollIn: bigint; isle: bigint };
  /** Its level, and what it opens, when the board has the growth of the houses. */
  level?: number;
  caps?: MaisonCaps;
  /** Its Prestige and what its Livre tells. */
  maison?: MaisonState;
  /** Its ships and its cales, and the defenses of its port's passes. */
  fleet?: PlancheFleet;
  port?: Record<string, string[]>;
  /** The level of its company's beacon (docs/plan-compagnie.md K4); none: no company's. */
  beacon?: number;
  /** Its port's secret ruses, one a pass, and the day it set them (docs/plan-guerre.md). */
  ruses?: Record<string, "chaine" | "brulot" | "renforts">;
  rusesDay?: number;
  /** The relics the black straits gave it, by power, and its plans not yet spent. */
  relics?: Record<string, number>;
  plans?: number;
  /** The stones engraved on its island: a tower held to the end of a tide (docs/plan-maree.md). */
  stones?: PlancheStone[];
}

export interface PlancheState {
  now: number;
  houses: Record<string, PlancheHouse>;
  /** What each town still asks of each good, and the fraction growing back. */
  gauges: Record<string, Record<string, { left: number; carry: number }>>;
  passages: Record<
    string,
    {
      holder: string;
      tollBps: number;
      seals: number;
      /** Its guard: the cells of its board where its holder laid links, and the day it did. */
      guard?: number[];
      guardDay?: number;
    }
  >;
  /** Every denier the towns paid, and every denier a toll destroyed. */
  minted: bigint;
  burnt: bigint;
  /** Every denier spent on the islands. */
  spent: bigint;
  /** The tide, the weeks, the rivals and the laurels. */
  rank: PlancheRank;
  /** The sealed orders taken or tried, by id (the last two days'). */
  orders?: Record<string, PlancheOrderState>;
  /** The tries at the problem of the day, by day then house (today's and the day before's). */
  daily?: Record<number, Record<string, PlancheDailyTry>>;
  /** The black straits: this week's forcings, every week's, today's tries. */
  noir?: NoirState;
  /** The Muda of the week. */
  muda?: PlancheMudaState;
  /** The ink tide's line. */
  encre?: EncreState;
  /** The week's sorties and how they went. */
  sorties?: PlancheSortiesState;
  /** The decree of the tide, offered to the Doge. */
  decret?: PlancheDecretState;
}

const fail = (code: string): never => {
  throw new Error(code);
};
const own = <T>(o: Record<string, T>, k: string): T | undefined =>
  Object.hasOwn(o, k) ? o[k] : undefined;
const cityOf = (S: PlancheSetup, id: string) => S.cities.find((c) => c.id === id);
const houseOf = (S: PlancheSetup, id: string) => S.houses.find((h) => h.id === id);
export const plancheIsCorsair = (holder: string) => holder.startsWith("corsair:");

/** The terrain of a house's island, drawn from its id and its soil. */
export function plancheGround(S: PlancheSetup, house: string) {
  const h = houseOf(S, house);
  let seed = 2166136261;
  for (const c of house) seed = Math.imul(seed ^ c.charCodeAt(0), 16777619) >>> 0;
  return ileGround(seed, h?.soil ?? { pre: 1 });
}

/** The board at its start; its tide counts its weeks from `tideStart` (the server: a Monday). */
export function plancheInit(S: PlancheSetup, now: number, tideStart = now): PlancheState {
  const houses: Record<string, PlancheHouse> = {};
  for (const h of S.houses) {
    const stock: Record<string, number> = {};
    const makeCarry: Record<string, number> = {};
    for (const good of Object.keys(h.makes)) {
      stock[good] = Math.min(S.rules.store, S.rules.startStock);
      makeCarry[good] = 0;
    }
    houses[h.id] = {
      id: h.id,
      ducats: BigInt(S.rules.startDucats),
      stock,
      makeCarry,
      threads: [],
      rewinding: [],
      free: {},
      delivered: 0,
      earned: 0n,
      rank: plancheRankHouse(S),
      book: { sold: 0n, tollPaid: 0n, tollIn: 0n, isle: 0n },
      ...(S.maison
        ? {
            level: 1,
            caps: maisonUnlocks(S.maison, 1),
            maison: maisonStart(Math.floor(now / DAY)),
          }
        : {}),
      ...(S.ile ? { ile: ileInit(S.ile, plancheGround(S, h.id)) } : {}),
    };
  }
  const gauges: PlancheState["gauges"] = {};
  for (const c of S.cities) {
    const g: Record<string, { left: number; carry: number }> = {};
    for (const [good, w] of Object.entries(c.wants)) g[good] = { left: w.cap, carry: 0 };
    gauges[c.id] = g;
  }
  const passages: PlancheState["passages"] = {};
  for (const p of S.passages)
    passages[p.id] = { holder: p.holder, tollBps: p.tollBps, seals: p.seals };
  const minted = BigInt(S.rules.startDucats) * BigInt(S.houses.length);
  const s: PlancheState = {
    now,
    houses,
    gauges,
    passages,
    minted,
    burnt: 0n,
    spent: 0n,
    rank: {} as PlancheRank,
  };
  plancheRankInit(S, s, tideStart);
  return s;
}

const clone = (s: PlancheState): PlancheState => structuredClone(s);

/** Every denier is accounted for: what the towns paid is in a purse or was burnt by a toll. */
export function plancheInvariant(s: PlancheState): boolean {
  let held = 0n;
  for (const h of Object.values(s.houses)) held += h.ducats;
  return held + s.burnt + s.spent === s.minted;
}

/** What a town pays a unit of a good now: its full price, less as its demand is spent. */
export function planchePrice(S: PlancheSetup, s: PlancheState, city: string, good: string): number {
  const w = own(cityOf(S, city)?.wants ?? {}, good);
  const g = own(s.gauges[city] ?? {}, good);
  if (!w || !g) return 0;
  const bps = w.floorBps + Math.floor(((BPS - w.floorBps) * g.left) / Math.max(1, w.cap));
  // On the ink, a town pays more (docs/plan-maree.md T1).
  const ink = plancheEncrePriceBps(S, s, cityOf(S, city)?.y ?? 0);
  // And the Doge's decree, if it is about this town and this good.
  const decree = plancheDecretPriceBps(s, city, good, s.now);
  const price = Math.floor((Math.floor((w.price * bps) / BPS) * ink) / BPS);
  return Math.floor((price * decree) / BPS);
}

/** The bobbins a house may stretch now. */
export function plancheFreeBobbins(S: PlancheSetup, s: PlancheState, house: string): number {
  const h = own(s.houses, house);
  if (!h) return 0;
  const bobbins = h.caps?.bobbins ?? S.rules.bobbins;
  return bobbins - h.threads.length - h.rewinding.filter((t) => t > s.now).length;
}

/** Whether a house's barges get through to a town now: no corsair in the way that it has not forced. */
export function plancheRouteOpen(
  S: PlancheSetup,
  s: PlancheState,
  house: string,
  city: string,
  now: number,
): boolean {
  const c = cityOf(S, city);
  const h = own(s.houses, house);
  if (!c || !h) return false;
  return c.via.every((id) => {
    const p = own(s.passages, id);
    if (!p) return false;
    return !plancheIsCorsair(p.holder) || (own(h.free, id) ?? 0) > now;
  });
}

/** A thread's patina: what it gained for the whole days it was held in place. */
export function planchePatina(S: PlancheSetup, thread: PlancheThread, now: number): number {
  const days = Math.max(0, Math.floor((now - thread.since) / DAY));
  return Math.min(S.rules.patinaMaxBps, days * S.rules.patinaBpsPerDay);
}

/**
 * Who serves a town's good (docs/audit-visuel-2026-11-11, CADRAGE-v4 § 6, the gauge cut by
 * supplier): the share still free, and what is spent split between the houses whose threads carry
 * there now, by what each carries (its patina counted). Points of base, largest share first.
 */
export function plancheShares(
  S: PlancheSetup,
  s: PlancheState,
  city: string,
  good: string,
  now: number,
): { freeBps: number; houses: { house: string; bps: number }[] } {
  const w = own(cityOf(S, city)?.wants ?? {}, good);
  const g = own(s.gauges[city] ?? {}, good);
  if (!w || !g) return { freeBps: 0, houses: [] };
  const freeBps = Math.floor((Math.max(0, g.left) * BPS) / Math.max(1, w.cap));
  const rates: { house: string; rate: number }[] = [];
  for (const [id, h] of Object.entries(s.houses)) {
    if (!plancheRouteOpen(S, s, id, city, now)) continue;
    const has = (h.stock[good] ?? 0) > 0 || (plancheSupply(S, s, id, now)[good] ?? 0) > 0;
    if (!has) continue;
    const rate = h.threads
      .filter((t) => t.to === city && t.good === good)
      .reduce((n, t) => n + BPS + planchePatina(S, t, now), 0);
    if (rate > 0) rates.push({ house: id, rate });
  }
  const total = rates.reduce((n, r) => n + r.rate, 0);
  const spent = BPS - freeBps;
  const houses = rates
    .map((r) => ({ house: r.house, bps: Math.floor((spent * r.rate) / total) }))
    .sort((a, b) => b.bps - a.bps || a.house.localeCompare(b.house));
  return { freeBps, houses };
}

/** One slice of time: the islands make, the threads carry, the towns pay and tire, then rest. */
function slice(S: PlancheSetup, s: PlancheState): void {
  const t = s.now;
  const ms = S.sliceMs;
  // 1. The islands make, up to the store.
  for (const hs of S.houses) {
    const h = s.houses[hs.id];
    if (!h) continue;
    if (S.ile && h.ile) {
      ileSlice(S.ile, h.ile, h.stock, S.rules.store, ms, t);
      plancheArsenalSettle(S, h, t + ms);
      continue;
    }
    for (const [good, perHour] of Object.entries(hs.makes)) {
      const carry = (h.makeCarry[good] ?? 0) + perHour * ms;
      const made = Math.floor(carry / HOUR);
      const have = h.stock[good] ?? 0;
      const kept = Math.min(S.rules.store - have, made);
      h.stock[good] = have + Math.max(0, kept);
      // A full store stops the workshop: what it could not keep is not owed later.
      h.makeCarry[good] = kept < made ? 0 : carry - made * HOUR;
    }
  }
  // 2. What each thread would carry this slice, by the town and the good it serves.
  const unit = HOUR * BPS;
  const asks = new Map<string, { h: PlancheHouse; th: PlancheThread; want: number }[]>();
  for (const hs of S.houses) {
    const h = s.houses[hs.id];
    if (!h) continue;
    const taken: Record<string, number> = {};
    for (const th of h.threads) {
      if (!th.detour && !plancheRouteOpen(S, s, h.id, th.to, t)) {
        th.carry = 0;
        continue;
      }
      // On the ink, a thread loses a share of its load (docs/plan-maree.md T1).
      const keep = plancheEncreKeepBps(S, s, cityOf(S, th.to)?.y ?? 0);
      const pace = Math.floor(((BPS + planchePatina(S, th, t)) * keep) / BPS);
      const way = th.detour ? Math.floor((pace * (cityOf(S, th.to)?.detourBps ?? 0)) / BPS) : pace;
      th.carry += S.rules.threadPerHour * way * ms;
      const could = Math.floor(th.carry / unit);
      // A thread to the Muda's pier loads its hold, and sells nothing (docs/plan-muda.md N2).
      if (plancheMudaThread(S, s, h, th, could, unit)) continue;
      const left = (h.stock[th.good] ?? 0) - (taken[th.good] ?? 0);
      const want = Math.max(0, Math.min(could, left));
      // What it could not load is not banked: a thread never owes a flood.
      th.carry = want < could ? 0 : th.carry - could * unit;
      if (!want) continue;
      taken[th.good] = (taken[th.good] ?? 0) + want;
      const key = `${th.to}|${th.good}`;
      const list = asks.get(key) ?? [];
      list.push({ h, th, want });
      asks.set(key, list);
    }
  }
  // 3. Each town takes what it still asks, shared in proportion, and pays its price of the moment.
  for (const [key, list] of asks) {
    const [cityId = "", good = ""] = key.split("|");
    const city = cityOf(S, cityId);
    const g = own(s.gauges[cityId] ?? {}, good);
    if (!city || !g) continue;
    const price = BigInt(planchePrice(S, s, cityId, good));
    const total = list.reduce((n, a) => n + a.want, 0);
    const room = Math.min(g.left, total);
    for (const a of list) {
      const sold = total <= g.left ? a.want : Math.floor((room * a.want) / total);
      if (!sold) continue;
      a.h.stock[good] = (a.h.stock[good] ?? 0) - sold;
      a.h.delivered += sold;
      const paid = price * BigInt(sold);
      s.minted += paid;
      a.h.book.sold += paid;
      let kept = paid;
      // The toll of each passage a house holds on the way, a share of it destroyed; none by the detour.
      for (const id of a.th.detour ? [] : city.via) {
        const p = s.passages[id];
        if (!p || plancheIsCorsair(p.holder) || p.holder === a.h.id) continue;
        const holder = own(s.houses, p.holder);
        if (!holder) continue;
        const cap = plancheDecretTollCap(s, S.rules.tollMaxBps, t);
        const toll = (paid * BigInt(Math.min(p.tollBps, cap))) / BigInt(BPS);
        const burnt = (toll * BigInt(S.rules.tollBurnBps)) / BigInt(BPS);
        kept -= toll;
        a.h.book.tollPaid += toll;
        holder.book.tollIn += toll - burnt;
        holder.ducats += toll - burnt;
        s.burnt += burnt;
      }
      a.h.ducats += kept;
      a.h.earned += kept;
      a.h.rank.earned += kept;
      a.h.rank.week[cityId] = (a.h.rank.week[cityId] ?? 0n) + kept;
      g.left -= sold;
    }
  }
  // 4. The towns' demand grows back.
  for (const c of S.cities)
    for (const [good, w] of Object.entries(c.wants)) {
      const g = s.gauges[c.id]?.[good];
      if (!g) continue;
      g.carry += w.regenPerHour * ms;
      const back = Math.floor(g.carry / HOUR);
      g.carry -= back * HOUR;
      g.left = Math.min(w.cap, g.left + back);
      if (g.left === w.cap) g.carry = 0;
    }
  // 5. The rank's counters: bobbins out, towers held.
  for (const h of Object.values(s.houses)) h.rank.threadMs += h.threads.length * ms;
  for (const p of S.passages) {
    const holder = own(s.houses, s.passages[p.id]?.holder ?? "");
    if (holder) holder.rank.guardMs += ms * (p.peril ?? 1);
  }
  s.now = t + ms;
  for (const h of Object.values(s.houses)) h.rewinding = h.rewinding.filter((at) => at > s.now);
  plancheRankTurn(S, s);
  plancheMudaTurn(S, s);
}

/** The board at `now`: every whole slice since its last is played, in order. */
export function plancheAdvance(S: PlancheSetup, s0: PlancheState, now: number): PlancheState {
  if (now < s0.now + S.sliceMs) return s0;
  const s = clone(s0);
  while (s.now + S.sliceMs <= now) slice(S, s);
  return s;
}

/** A house stretches a thread from its quay to a town, for one good. */
export function plancheThread(
  S: PlancheSetup,
  s0: PlancheState,
  house: string,
  city: string,
  good: string,
  now: number,
  /** The way round the passages (`detour`), where the town has one. */
  how: { detour?: boolean } = {},
): PlancheState {
  const c = cityOf(S, city);
  if (!own(s0.houses, house) || !houseOf(S, house) || !c) return fail("planche_unknown");
  if (!own(c.wants, good)) return fail("planche_not_wanted");
  if (how.detour && !(c.via.length && (c.detourBps ?? 0) > 0)) return fail("planche_no_detour");
  if (!how.detour && !plancheRouteOpen(S, s0, house, city, now)) return fail("planche_route_shut");
  if (plancheFreeBobbins(S, s0, house) < 1) return fail("planche_no_bobbin");
  const s = clone(s0);
  const h = s.houses[house] as PlancheHouse;
  if (h.threads.some((t) => t.to === city && t.good === good)) return fail("planche_twice");
  h.threads.push({ to: city, good, since: now, carry: 0, ...(how.detour ? { detour: true } : {}) });
  return s;
}

/** A house takes a thread back: its patina is lost, its bobbin is a while coming home. */
export function plancheUnthread(
  S: PlancheSetup,
  s0: PlancheState,
  house: string,
  city: string,
  good: string,
  now: number,
): PlancheState {
  const hs = houseOf(S, house);
  const c = cityOf(S, city);
  const h0 = own(s0.houses, house);
  if (!hs || !c || !h0) return fail("planche_unknown");
  const k = h0.threads.findIndex((t) => t.to === city && t.good === good);
  if (k < 0) return fail("planche_no_thread");
  const s = clone(s0);
  const h = s.houses[house] as PlancheHouse;
  h.threads.splice(k, 1);
  const tiles = Math.abs(hs.x - c.x) + Math.abs(hs.y - c.y);
  h.rewinding.push(now + tiles * S.rules.rewindMsPerTile);
  return s;
}

/**
 * A house has won the Passe of a passage: a seal breaks and it goes through free for a while; the
 * last seal broken, the tower is its own.
 */
export function plancheForced(
  S: PlancheSetup,
  s0: PlancheState,
  house: string,
  passage: string,
  now: number,
): PlancheState {
  const p0 = own(s0.passages, passage);
  const def = S.passages.find((p) => p.id === passage);
  if (!own(s0.houses, house) || !p0 || !def) return fail("planche_unknown");
  if (p0.holder === house) return fail("planche_own_passage");
  const s = clone(s0);
  const p = s.passages[passage] as PlancheState["passages"][string];
  const h = s.houses[house] as PlancheHouse;
  p.seals -= 1;
  h.free[passage] = now + S.rules.freeAfterForceMs;
  if (h.maison) h.maison.seals += 1;
  if (p.seals <= 0) {
    // A house holds as many towers as its level allows: beyond, the seals come back, the tower stays.
    const held = Object.values(s.passages).filter((q) => q.holder === house).length;
    if (held < (h.caps?.towers ?? Number.POSITIVE_INFINITY)) {
      // The guard was the last holder's.
      const { guard: _guard, guardDay: _day, ...kept } = p;
      s.passages[passage] = { ...kept, holder: house, seals: def.seals };
      h.maison?.log.push({ at: now, kind: "tower", data: passage });
      if (h.maison && h.maison.log.length > MAISON_KEEP) h.maison.log.shift();
    } else p.seals = def.seals;
  }
  return s;
}

/** The holder of a passage sets its toll, never above the cap. */
export function plancheToll(
  S: PlancheSetup,
  s0: PlancheState,
  house: string,
  passage: string,
  tollBps: number,
): PlancheState {
  const p0 = own(s0.passages, passage);
  if (!p0) return fail("planche_unknown");
  if (p0.holder !== house) return fail("planche_not_holder");
  const s = clone(s0);
  const p = s.passages[passage] as PlancheState["passages"][string];
  p.tollBps = Math.max(0, Math.min(S.rules.tollMaxBps, Math.floor(tollBps) || 0));
  return s;
}

/** What a house has to sell of each good an hour: its island's make, net of what it uses. */
export function plancheSupply(
  S: PlancheSetup,
  s: PlancheState,
  house: string,
  now: number,
): Record<string, number> {
  const h = own(s.houses, house);
  if (!h) return {};
  if (!S.ile || !h.ile) return { ...(houseOf(S, house)?.makes ?? {}) };
  const { made, used } = ileFlows(S.ile, h.ile, now);
  const out: Record<string, number> = {};
  for (const [g, n] of Object.entries(made)) {
    const net = n - (used[g] ?? 0);
    if (net > 0) out[g] = net;
  }
  return out;
}

/** A gesture on a house's island, paid from its purse; refused when the purse cannot pay. */
function onIsle(
  S: PlancheSetup,
  s0: PlancheState,
  house: string,
  f: (R: IleRules, ile: IleState) => { ile: IleState; cost: bigint },
): PlancheState {
  const h0 = own(s0.houses, house);
  if (!S.ile || !h0?.ile) return fail("planche_unknown");
  // The island grows as far as the house's level allows (docs/plan-progression-maison.md).
  const R = h0.caps ? { ...S.ile, maxTiles: Math.min(S.ile.maxTiles, h0.caps.tiles) } : S.ile;
  const { ile, cost } = f(R, h0.ile);
  if (cost > h0.ducats) return fail("planche_poor");
  const s = clone(s0);
  const h = s.houses[house] as PlancheHouse;
  h.ile = ile;
  h.ducats -= cost;
  h.book.isle += cost;
  s.spent += cost;
  return s;
}

export const plancheBuyTile = (
  S: PlancheSetup,
  s: PlancheState,
  house: string,
  at: string,
  _now: number,
) => onIsle(S, s, house, (R, ile) => ileBuyTile(R, ile, at, plancheGround(S, house)));
export const plancheBuild = (
  S: PlancheSetup,
  s: PlancheState,
  house: string,
  type: string,
  at: string,
  now: number,
) => {
  // The workshops of a tier open at their level.
  const tier = S.ile?.workshops[type]?.tier ?? 0;
  const caps = own(s.houses, house)?.caps;
  if (caps && Object.hasOwn(S.ile?.workshops ?? {}, type) && tier > caps.tier)
    return fail("planche_level");
  // The Arsenal opens at its own level, one an island (docs/plan-arsenal.md).
  const h = own(s.houses, house);
  if (h) plancheArsenalMayBuild(S, h, type);
  // The workshops of the high tier ask a plan (docs/plan-muda.md § 3.2).
  const plan = Object.hasOwn(S.ile?.workshops ?? {}, type) && plancheNeedsPlan(S, { tier });
  if (plan && (h?.plans ?? 0) < 1) return fail("planche_no_plan");
  const out = onIsle(S, s, house, (R, ile) => ileBuild(R, ile, type, at, now));
  if (plan) plancheSpendPlan(out.houses[house] as PlancheHouse);
  return out;
};

/**
 * A house reaches a level (docs/plan-progression-maison.md): what the level opens is its own from
 * then on. A level never goes back.
 */
export function plancheSetLevel(
  S: PlancheSetup,
  s0: PlancheState,
  house: string,
  level: number,
): PlancheState {
  const h0 = own(s0.houses, house);
  if (!h0 || !S.maison) return fail("planche_unknown");
  const to = Math.max(1, Math.min(S.maison.maxLevel, Math.floor(level)));
  if (to < (h0.level ?? 1)) return fail("planche_level_back");
  if (to === h0.level) return s0;
  const s = clone(s0);
  const h = s.houses[house] as PlancheHouse;
  h.level = to;
  h.caps = maisonUnlocks(S.maison, to);
  return s;
}
export function plancheUpgrade(
  S: PlancheSetup,
  s: PlancheState,
  house: string,
  at: string,
  now: number,
): PlancheState {
  // The Arsenal raised high asks a plan (docs/plan-muda.md § 3.2).
  const h = own(s.houses, house);
  const b = h?.ile?.tiles[at]?.building;
  const plan =
    !!b && b.type === S.arsenal?.workshop && plancheNeedsPlan(S, { arsenalTo: b.level + 1 });
  if (plan && (h?.plans ?? 0) < 1) return fail("planche_no_plan");
  const out = onIsle(S, s, house, (R, ile) => ileUpgrade(R, ile, at, now));
  if (plan) plancheSpendPlan(out.houses[house] as PlancheHouse);
  return out;
}
export const plancheMove = (
  S: PlancheSetup,
  s: PlancheState,
  house: string,
  from: string,
  to: string,
  now: number,
) => onIsle(S, s, house, (R, ile) => ({ ile: ileMove(R, ile, from, to, now), cost: 0n }));
