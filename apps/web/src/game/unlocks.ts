import { store } from "./store.js";

/**
 * What opens as the first session goes (UX audit of 19 October 2026): the counter, the cities and
 * the cargoes from the start; the Rialto bubble, the ranking and the Terraferma after the first
 * delivery; the Influence, the day's tasks and the ledger once the market is learned. A merchant
 * who paused the guide, or finished it, sees everything.
 */
export interface Unlocks {
  rialto: boolean;
  ranking: boolean;
  terraferma: boolean;
  /** The Influence on the HUD, the day's tasks and the house's ledger in the notices. */
  house: boolean;
}

export function unlocks(tutorial: readonly string[], guideOff: boolean): Unlocks {
  const done = new Set(tutorial);
  const delivered = guideOff || done.has("sell_city");
  const marketLearned = guideOff || done.has("market_buy") || done.has("mission");
  return { rialto: delivered, ranking: delivered, terraferma: delivered, house: marketLearned };
}

/** The guide paused ("Plus tard") or finished on this device. */
export function guideOff(): boolean {
  return store.get("guideDone") === "1" || store.get("guideHidden") === "1";
}

/** The unlocks of this merchant on this device. */
export function unlocksOf(tutorial: readonly string[]): Unlocks {
  // An empty market lets the guide skip the purchase: the house opens all the same.
  const skipped = store.get("skipMarketBuy") === "1" ? ["market_buy"] : [];
  return unlocks([...tutorial, ...skipped], guideOff());
}
