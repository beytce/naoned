/**
 * A house held by the computer on the shared board (docs/CADRAGE-v4.md § 3.1: they fly a grey flag
 * and stand outside every ranking). It reads the board as a careful merchant would at each visit:
 * what each thread brings an hour, what a free bobbin would bring elsewhere, and whether a better
 * town is worth giving up a thread's patina for.
 */
import {
  type PlancheSetup,
  type PlancheState,
  plancheFreeBobbins,
  planchePatina,
  planchePrice,
  plancheRouteOpen,
  plancheThread,
  plancheUnthread,
} from "./planche.js";

const BPS = 10_000;

/** What a thread to that town brings an hour, in deniers, at its patina and the house's output. */
function worth(
  S: PlancheSetup,
  s: PlancheState,
  house: string,
  city: string,
  good: string,
  patina: number,
  now: number,
): number {
  const hs = S.houses.find((h) => h.id === house);
  const h = s.houses[house];
  if (!hs || !h || !plancheRouteOpen(S, s, house, city, now)) return 0;
  const sameGood = h.threads.filter((t) => t.good === good).length || 1;
  // What it can really load an hour: its output of that good, and a share of what lies in store.
  const supply = (hs.makes[good] ?? 0) / sameGood + (h.stock[good] ?? 0) / 12;
  const flow = Math.min((S.rules.threadPerHour * (BPS + patina)) / BPS, supply);
  return Math.floor(planchePrice(S, s, city, good) * flow);
}

/**
 * One visit: every free bobbin goes where it brings most, then the poorest thread is taken back if
 * another town would bring a quarter more even without its patina (`eager`: how much more, in bps).
 */
export function plancheRobot(
  S: PlancheSetup,
  s0: PlancheState,
  house: string,
  now: number,
  eager = 2_500,
): PlancheState {
  let s = s0;
  const hs = S.houses.find((h) => h.id === house);
  if (!hs || !s.houses[house]) return s;
  const options = () => {
    const h = s.houses[house];
    const out: { city: string; good: string; v: number }[] = [];
    if (!h) return out;
    for (const c of S.cities)
      for (const good of Object.keys(c.wants)) {
        if (!(good in hs.makes)) continue;
        if (h.threads.some((t) => t.to === c.id && t.good === good)) continue;
        const v = worth(S, s, house, c.id, good, 0, now);
        if (v > 0) out.push({ city: c.id, good, v });
      }
    return out.sort((a, b) => b.v - a.v || a.city.localeCompare(b.city));
  };
  for (let guard = 0; guard < S.rules.bobbins && plancheFreeBobbins(S, s, house) > 0; guard++) {
    const best = options()[0];
    if (!best) break;
    s = plancheThread(S, s, house, best.city, best.good, now);
  }
  const h = s.houses[house];
  if (!h || !h.threads.length) return s;
  const held = h.threads
    .map((t) => ({ t, v: worth(S, s, house, t.to, t.good, planchePatina(S, t, now), now) }))
    .sort((a, b) => a.v - b.v);
  const worst = held[0];
  const best = options()[0];
  // Never to stretch it again to the town it leaves: that is churn, not a choice.
  if (worst && best && best.city !== worst.t.to && best.v * BPS > worst.v * (BPS + eager))
    s = plancheUnthread(S, s, house, worst.t.to, worst.t.good, now);
  return s;
}
