/**
 * A house held by the computer on the shared board (docs/CADRAGE-v4.md § 3.1: they fly a grey flag
 * and stand outside every ranking). It reads the board as a careful merchant would at each visit:
 * what each thread brings an hour, what a free bobbin would bring elsewhere, and whether a better
 * town is worth giving up a thread's patina for.
 */
import { ILE_FONDACO, ileBonusBps, ileBuyable, ileTileCost } from "../ile/ile.js";
import {
  type PlancheSetup,
  type PlancheState,
  plancheBuild,
  plancheBuyTile,
  plancheFreeBobbins,
  plancheGround,
  planchePatina,
  planchePrice,
  plancheRouteOpen,
  plancheSupply,
  plancheThread,
  plancheUnthread,
  plancheUpgrade,
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
  const supply =
    (plancheSupply(S, s, house, now)[good] ?? 0) / sameGood + (h.stock[good] ?? 0) / 12;
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
  s = plancheRobotBuild(S, s, house, now);
  const options = () => {
    const h = s.houses[house];
    const sells = new Set([
      ...Object.keys(plancheSupply(S, s, house, now)),
      ...Object.entries(h?.stock ?? {})
        .filter(([, n]) => n > 0)
        .map(([g]) => g),
    ]);
    const out: { city: string; good: string; v: number }[] = [];
    if (!h) return out;
    for (const c of S.cities)
      for (const good of Object.keys(c.wants)) {
        if (!sells.has(good)) continue;
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

/**
 * A house of the computer builds its island by its plan: the next workshop of the plan on the free
 * tile where it gains most (a tile bought first if none is free), then raises the plan's workshops,
 * the lowest first, keeping a reserve. One gesture a visit.
 */
export function plancheRobotBuild(
  S: PlancheSetup,
  s: PlancheState,
  house: string,
  now: number,
): PlancheState {
  const R = S.ile;
  const h = s.houses[house];
  const plan = S.houses.find((x) => x.id === house)?.plan ?? [];
  if (!R || !h?.ile || !plan.length) return s;
  const ile = h.ile;
  const tiles = Object.entries(ile.tiles);
  const have = new Map<string, number>();
  for (const [, t] of tiles)
    if (t.building) have.set(t.building.type, (have.get(t.building.type) ?? 0) + 1);
  // The plan is played round after round: the next round only once every workshop is at its top.
  const top = tiles.every(([, t]) => {
    const b = t.building;
    if (!b || b.type === ILE_FONDACO) return true;
    return b.level >= (R.workshops[b.type]?.cost.length ?? 0);
  });
  let next: string | undefined;
  for (let round = 1; round <= 6 && !next; round++) {
    const want = new Map<string, number>();
    for (const type of plan) {
      want.set(type, (want.get(type) ?? 0) + 1);
      if (!next && (have.get(type) ?? 0) < (want.get(type) ?? 0) * round) next = type;
    }
    if (!next && !top) break;
  }
  const purse = h.ducats;
  const tryIt = (f: () => PlancheState) => {
    try {
      return f();
    } catch {
      return s;
    }
  };
  if (next) {
    const w = R.workshops[next];
    if (!w || purse < BigInt(w.cost[0] ?? 0)) return s;
    const free = tiles
      .filter(([, t]) => !t.building)
      .map(([k]) => ({ k, v: ileBonusBps(R, ile, next as string, k) }))
      .sort((a, b) => b.v - a.v || a.k.localeCompare(b.k));
    const best = free[0];
    if (best) return tryIt(() => plancheBuild(S, s, house, next as string, best.k, now));
    // No free tile: one bought, of the workshop's terrain if one is offered.
    const ground = plancheGround(S, house);
    const offered = ileBuyable(R, ile);
    if (!offered.length || purse < ileTileCost(R, ile) + BigInt(w.cost[0] ?? 0)) return s;
    const at =
      offered.find((k) => {
        const [x = 0, y = 0] = k.split(",").map(Number);
        return ground(x, y) === w.terrain;
      }) ?? (offered[0] as string);
    return tryIt(() => plancheBuyTile(S, s, house, at, now));
  }
  // The plan is built: the lowest workshop of the plan is raised, if the purse keeps a reserve after.
  const raise = tiles
    .filter(([, t]) => t.building && t.building.type !== ILE_FONDACO && t.building.readyAt <= now)
    .map(([k, t]) => ({ k, b: t.building as NonNullable<typeof t.building> }))
    .filter(({ b }) => b.level < (R.workshops[b.type]?.cost.length ?? 0))
    .sort((a, b) => a.b.level - b.b.level || a.k.localeCompare(b.k))[0];
  if (!raise) return s;
  const cost = BigInt(R.workshops[raise.b.type]?.cost[raise.b.level] ?? 0);
  if (purse < cost * 2n) return s;
  return tryIt(() => plancheUpgrade(S, s, house, raise.k, now));
}
