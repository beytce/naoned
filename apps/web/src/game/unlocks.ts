import { store } from "./store.js";

/**
 * What opens as the first session goes (UX audit of 19 October 2026): the counter, the cities and
 * the cargoes from the start; the Rialto bubble and the ranking after the first delivery; the
 * Influence, the day's tasks and the ledger once the market is learned. A merchant who paused the
 * guide, or finished it, sees all of these. The Terraferma, a side game of the week, waits for the
 * first day of trade to be over (owner's decision of 20 October 2026: trade comes first).
 */
export interface Unlocks {
  rialto: boolean;
  ranking: boolean;
  terraferma: boolean;
  /** The Influence on the HUD, the day's tasks and the house's ledger in the notices. */
  house: boolean;
}

/** How long a merchant trades before the Terraferma opens. */
export const TERRA_AFTER_MS = 24 * 3_600_000;

export function unlocks(
  tutorial: readonly string[],
  guideOff: boolean,
  /** Time since the merchant came into the world (Infinity: long ago). */
  ageMs = Number.POSITIVE_INFINITY,
): Unlocks {
  const done = new Set(tutorial);
  const delivered = guideOff || done.has("sell_city");
  const marketLearned = guideOff || done.has("market_buy") || done.has("mission");
  return {
    rialto: delivered,
    ranking: delivered,
    terraferma: (done.has("sell_city") && ageMs >= TERRA_AFTER_MS) || terraEarly(),
    house: marketLearned,
  };
}

/** The merchant opened the Terraferma before its first day (on this device). */
function terraEarly(): boolean {
  try {
    return store.get("terraEarly") === "1";
  } catch {
    return false;
  }
}

/** Opens the Terraferma now, whatever the first day says. */
export function openTerraEarly(): void {
  store.set("terraEarly", "1");
}

/** The guide paused ("Plus tard") or finished on this device. */
export function guideOff(): boolean {
  return store.get("guideDone") === "1" || store.get("guideHidden") === "1";
}

/** The unlocks of this merchant on this device. */
export function unlocksOf(tutorial: readonly string[], ageMs?: number): Unlocks {
  // An empty market lets the guide skip the purchase: the house opens all the same.
  const skipped = store.get("skipMarketBuy") === "1" ? ["market_buy"] : [];
  return unlocks([...tutorial, ...skipped], guideOff(), ageMs);
}
