import type { Deniers } from "../money.js";
import type { EmpireSettings } from "./settings.js";

/**
 * The incanto of the Muda (CADRAGE-v3 § 12 bis): the highest bids take the places, the first bid
 * winning a tie, and each pays the bid just below it, never less than the reserve (a Vickrey sale:
 * bidding what a place is worth is the best play). A bid below the reserve takes nothing. Returns
 * each bid's price, null when it lost; no price passes its bid, and what is paid is destroyed.
 */
export function mudaAuction(
  bids: readonly Deniers[],
  places: number,
  reserve: Deniers,
): (Deniers | null)[] {
  const order = bids
    .map((bid, i) => ({ bid, i }))
    .filter((x) => x.bid >= reserve)
    .sort((a, b) => (a.bid === b.bid ? a.i - b.i : a.bid > b.bid ? -1 : 1));
  const prices: (Deniers | null)[] = bids.map(() => null);
  order.slice(0, Math.max(0, places)).forEach((x, rank) => {
    const below = order[rank + 1]?.bid ?? reserve;
    prices[x.i] = below > reserve ? below : reserve;
  });
  return prices;
}

/** The places of a departure: a share of the houses owning a Muda galley, one at least. */
export function mudaPlaces(owners: number, s: EmpireSettings): number {
  if (owners <= 0) return 0;
  return Math.max(1, Math.ceil((owners * s.muda.placesShareBps) / 10_000));
}

/** A place's reserve price, in days of the bidders' median income a day. */
export function mudaReserve(medianIncomePerDay: Deniers, s: EmpireSettings): Deniers {
  return (medianIncomePerDay * BigInt(s.muda.reserveDaysBps)) / 10_000n;
}
