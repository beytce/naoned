/**
 * The leagues' moves (docs/plan-maree.md § 3.4, lot T5): a house that goes up (or down) a league
 * leaves its lagoon whole, its island, purse, store, fleet, level and Livre with it, and takes the
 * place of a house of the computer in a lagoon of the other league; its threads are wound in. The
 * house left behind is a new house of the computer. The purses that leave and come are written in
 * the houses' books (`out`, `in`), for the ledger, and in the board's `moved`, for its invariant.
 *
 * Pure: the server carries the house from one board to the other.
 */

import type { PlancheHouse, PlancheSetup, PlancheState } from "./planche.js";
import { plancheFreshHouse } from "./planche.js";

const fail = (code: string): never => {
  throw new Error(code);
};
const own = <T>(o: Record<string, T>, k: string): T | undefined =>
  Object.hasOwn(o, k) ? o[k] : undefined;

/** A house leaves the board: what it takes, and the board with a new house of the computer in its place. */
export function plancheHouseLeave(
  S: PlancheSetup,
  s0: PlancheState,
  house: string,
  now: number,
): { state: PlancheState; gone: PlancheHouse } {
  const h0 = own(s0.houses, house);
  const hs = S.houses.find((h) => h.id === house);
  if (!h0 || !hs) return fail("planche_unknown");
  const s = structuredClone(s0);
  const gone = structuredClone(h0);
  const fresh = plancheFreshHouse(S, hs, now);
  // The book stays the house's place's: what left, what came.
  fresh.book = {
    ...h0.book,
    out: (h0.book.out ?? 0n) + h0.ducats,
    in: (h0.book.in ?? 0n) + fresh.ducats,
  };
  s.houses[house] = fresh;
  s.moved = (s.moved ?? 0n) + fresh.ducats - h0.ducats;
  s.rank.humans = s.rank.humans.filter((id) => id !== house);
  for (const [id, p] of Object.entries(s.passages)) {
    const def = S.passages.find((q) => q.id === id);
    if (p.holder === house && def)
      s.passages[id] = { holder: def.holder, tollBps: def.tollBps, seals: def.seals };
  }
  return { state: s, gone };
}

/**
 * A house comes onto the board in the place of a house of the computer: all it is, its threads
 * wound in (they were stretched to the other lagoon's towns), its rank of this tide from nothing.
 */
export function plancheHouseArrive(
  S: PlancheSetup,
  s0: PlancheState,
  house: string,
  came: PlancheHouse,
): PlancheState {
  const h0 = own(s0.houses, house);
  if (!h0 || !S.houses.some((h) => h.id === house)) return fail("planche_unknown");
  if (s0.rank.humans.includes(house)) return fail("planche_taken");
  const s = structuredClone(s0);
  const h: PlancheHouse = {
    ...structuredClone(came),
    id: house,
    threads: [],
    rewinding: [],
    free: {},
    makeCarry: Object.fromEntries(Object.keys(came.makeCarry).map((g) => [g, 0])),
    rank: { ...h0.rank, earned: 0n, threadMs: 0, guardMs: 0, repelled: 0, week: {} },
    book: {
      ...h0.book,
      out: (h0.book.out ?? 0n) + h0.ducats,
      in: (h0.book.in ?? 0n) + came.ducats,
    },
  };
  // The beacon is its company's here: set again by the server.
  delete h.beacon;
  if (h.maison) h.maison = { ...h.maison, guardAt: 0 };
  s.houses[house] = h;
  s.moved = (s.moved ?? 0n) + came.ducats - h0.ducats;
  return s;
}
