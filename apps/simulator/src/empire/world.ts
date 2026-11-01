import {
  DENIERS_PER_DUCAT,
  type Deniers,
  type EmpireHouse,
  type EmpireSettings,
  Rng,
  applyBpsFloor,
  bookShareBps,
  localBookOf,
  powerOf,
  pressureAfterHours,
  pressureAfterTrade,
  priceAt,
  rawBonusBps,
  refPriceOf,
  wagesOn,
} from "@comptoirs/engine";
import { identityEffect } from "./identity.js";
import { DAY, type House, type Market, type SimModel, type Trade, type World } from "./model.js";
import { LOADOUT } from "./porta.js";

export const d = (ducats: number): Deniers => BigInt(Math.round(ducats)) * DENIERS_PER_DUCAT;

/** Every good some region makes or wants, plus the crafted ones. */
export function goodsOf(s: EmpireSettings, m: SimModel): string[] {
  const all = new Set<string>(Object.keys(m.recipes));
  for (const r of s.regions)
    for (const g of [...Object.keys(r.produces), ...Object.keys(r.demands)]) all.add(g);
  return [...all].sort();
}

/** A good's reference where no region lists it: the average of its listed ones, or its inputs ×1,6. */
export function globalRef(good: string, s: EmpireSettings, m: SimModel): Deniers {
  const listed = s.regions
    .map((r) => r.produces[good] ?? r.demands[good])
    .filter((x): x is bigint => x !== undefined);
  if (listed.length > 0) return listed.reduce((a, x) => a + x, 0n) / BigInt(listed.length);
  const recipe = m.recipes[good];
  if (!recipe) return d(1);
  let cost = 0n;
  for (const [g, q] of Object.entries(recipe))
    cost += (globalRef(g, s, m) * BigInt(Math.round(q * 1_000))) / 1_000n;
  return (cost * 16n) / 10n;
}

export function createWorld(s: EmpireSettings, m: SimModel): World {
  const markets = new Map<string, Market>();
  for (const r of s.regions)
    for (const good of goodsOf(s, m)) {
      const ref = refPriceOf(r.code, good, s) ?? globalRef(good, s, m);
      markets.set(`${r.code}:${good}`, {
        region: r.code,
        good,
        ref,
        pressure: 10_000,
        lots: [],
        soldToday: 0,
      });
    }
  return {
    s,
    m,
    now: 0,
    houses: [],
    markets,
    deposits: [],
    voyages: [],
    board: new Map(),
    planPool: [],
    created: 0n,
    destroyed: 0n,
    createdBy: {},
    destroyedBy: {},
    history: new Map(),
    nextId: 1,
    depth: new Map(),
    casaShare: [],
    workshopShare: [],
    colleganza: { total: 0n, toYoung: 0n },
    muda: { places: 0, paid: 0n, voyages: 0, withColleganza: 0, stakes: 0n, fromLarger: 0n },
    companies: [],
    aid: { requests: [], asked: 0, supplied: 0, value: 0n, toYoung: 0n },
  };
}

export function market(w: World, region: string, good: string): Market {
  const mk = w.markets.get(`${region}:${good}`);
  if (!mk) throw new RangeError(`no market ${region}:${good}`);
  return mk;
}

export const priceOf = (w: World, mk: Market) => priceAt(mk.ref, mk.pressure, w.s);

// The light ledger: money is made and destroyed only here, and checked each day.

export function create(w: World, h: House, amount: Deniers, why: string, trade?: Trade) {
  if (amount <= 0n) return;
  h.cash += amount;
  h.earned += amount;
  w.created += amount;
  w.createdBy[why] = (w.createdBy[why] ?? 0n) + amount;
  if (trade) h.income[trade] += amount;
}

export function destroy(w: World, h: House, amount: Deniers, why: string) {
  if (amount <= 0n) return;
  if (amount > h.cash) throw new Error(`house ${h.id} pays ${amount} with ${h.cash}`);
  h.cash -= amount;
  h.spent += amount;
  w.destroyed += amount;
  w.destroyedBy[why] = (w.destroyedBy[why] ?? 0n) + amount;
}

export function transfer(from: House, to: House, amount: Deniers) {
  if (amount <= 0n) return;
  if (amount > from.cash) throw new Error(`house ${from.id} transfers ${amount} with ${from.cash}`);
  from.cash -= amount;
  to.cash += amount;
}

/** The components a bot's combat model carries. */
const componentsOf = (model: string, s: World["s"]) =>
  Math.min(s.porta.models[model]?.slots ?? 0, LOADOUT[model]?.length ?? 0);

export function power(w: World, h: House): number {
  return powerOf(
    {
      casa: h.casa,
      workshopLevels: h.workshops.map((x) => x.level),
      counterLevels: [...h.counters.values()],
      // A model's levels beyond its first count as a module's.
      moduleLevels: [
        ...Object.values(h.modules),
        ...Object.values(h.levels).map((l) => l - 1),
        // The Porta's combat vehicle: its model's levels beyond the first, its components'.
        ...(h.porta?.combat
          ? [
              h.porta.combat.level - 1,
              ...Array(componentsOf(h.porta.combat.model, w.s)).fill(h.porta.combat.level),
            ]
          : []),
      ],
      staffLevels: [],
      vehicles: h.vehicles.length + h.galleys + (h.porta?.combat ? 1 : 0),
    },
    w.s,
  );
}

/** A receipt from a sale: made by the buyer (a city, the Dogana), less the wages (arbitrage A). */
export function receive(w: World, h: House, gross: Deniers, why: string, trade: Trade) {
  create(w, h, gross, why, trade);
  const wagesCut = Math.min(10_000, identityEffect(w, h, "wagesCut"));
  destroy(w, h, applyBpsFloor(wagesOn(gross, power(w, h), w.s), 10_000 - wagesCut), "wages");
  h.recent[h.recent.length - 1] = (h.recent.at(-1) ?? 0n) + gross;
  if (h.casa <= w.m.youngCasa) h.youngEarned += gross;
}

export function depthOf(w: World, region: string): number {
  return w.depth.get(region) ?? w.m.depthBase;
}

/**
 * Sells to the Dogana at the market's price (it keeps the lot for the next buyer), no more than
 * what is left of the market's depth today: the rest stays in stock. Returns what was sold.
 */
export function sellToMarket(
  w: World,
  h: House,
  region: string,
  good: string,
  qty: number,
  trade: Trade,
  fair = 0,
): number {
  const mk = market(w, region, good);
  // A fair (the Muda's convoy at the port) adds its own buyers to the day's depth.
  const depth = depthOf(w, region) + fair;
  const n = Math.min(qty, depth - mk.soldToday);
  if (n <= 0) return 0;
  mk.soldToday += n;
  // The young houses' raw goods sell dearer (CADRAGE-v3 § 6).
  const bonus = w.m.recipes[good] ? 0 : rawBonusBps(h.casa, w.s);
  const gross = applyBpsFloor(priceOf(w, mk) * BigInt(n), 10_000 + bonus);
  receive(w, h, gross, "market", trade);
  if (h.casa <= w.m.youngCasa && region === "veneto" && w.s.highRecipes.goods.includes(good))
    h.youngRawSold += gross;
  const tax = Math.max(0, w.m.marketTaxBps - identityEffect(w, h, "taxCut"));
  destroy(w, h, applyBpsFloor(gross, tax), "tax");
  mk.lots.push({ qty: n, young: h.casa <= w.m.youngCasa });
  mk.pressure = pressureAfterTrade(mk.pressure, n, depth, "sell", w.s);
  return n;
}

/**
 * Buys at the market's price, from the Dogana's lots first (oldest first: a young house's raw
 * goods count for the vétérans' metric), then from its imports at the same price. Returns what
 * it could afford.
 */
export function buyFromMarket(
  w: World,
  h: House,
  region: string,
  good: string,
  qty: number,
): number {
  if (qty <= 0) return 0;
  const mk = market(w, region, good);
  const unit = (priceOf(w, mk) * (10_000n + BigInt(w.m.marketTaxBps))) / 10_000n;
  const afford = unit > 0n ? Number(h.cash / unit) : qty;
  const n = Math.min(qty, afford);
  if (n <= 0) return 0;
  destroy(w, h, unit * BigInt(n), "market");
  let left = n;
  let young = 0;
  while (left > 0 && mk.lots.length > 0) {
    const lot = mk.lots[0];
    if (!lot) break;
    const take = Math.min(left, lot.qty);
    if (lot.young) young += take;
    lot.qty -= take;
    left -= take;
    if (lot.qty === 0) mk.lots.shift();
  }
  if (!w.m.recipes[good]) {
    h.rawBought += n;
    h.rawBoughtFromYoung += young;
  }
  mk.pressure = pressureAfterTrade(mk.pressure, n, depthOf(w, region), "buy", w.s);
  addStock(h, good, n);
  return n;
}

export function addStock(h: House, good: string, qty: number) {
  h.stock.set(good, (h.stock.get(good) ?? 0) + qty);
}

export function takeStock(h: House, good: string, qty: number): number {
  const have = h.stock.get(good) ?? 0;
  const n = Math.min(have, qty);
  h.stock.set(good, have - n);
  return n;
}

/** Each hour: the markets drift back toward their references. */
export function relaxMarkets(w: World) {
  for (const mk of w.markets.values()) mk.pressure = pressureAfterHours(mk.pressure, 1, w.s);
}

/** Each day: the cities' common board is renewed, and each market's price written down. */
export function newDay(w: World) {
  const actives = w.houses.filter((h) => h.awayUntil <= w.now);
  for (const r of w.s.regions) {
    const withAccess = actives.filter((h) => h.counters.has(r.code)).length;
    for (const good of Object.keys(r.demands))
      w.board.set(`${r.code}:${good}`, w.m.boardPerActive * withAccess);
  }
  for (const r of w.s.regions)
    w.depth.set(
      r.code,
      w.m.depthBase +
        w.m.depthPerActive * actives.filter((h) => h.counters.has(r.code)).length +
        // The great foreign markets (Bruges, Alexandria…) take goods whoever comes.
        (r.hoursFromVenice > 0
          ? w.m.foreignDepth + Math.round(w.m.foreignDepthPerActive * actives.length)
          : 0),
    );
  for (const [key, mk] of w.markets) {
    mk.soldToday = 0;
    const row = w.history.get(key) ?? [];
    row.push(priceOf(w, mk));
    w.history.set(key, row);
  }
  for (const h of w.houses) {
    h.recent.push(0n);
    if (h.recent.length > w.m.incomeDays + 1) h.recent.shift();
    for (const [region, level] of h.counters) h.bookLeft.set(region, bookOf(w, h, region, level));
  }
}

/** The price a house knows of a market: today's where it has a counter, else as old as the news. */
export function knownPrice(
  w: World,
  h: House,
  region: string,
  good: string,
  delayDays: number,
): Deniers {
  const mk = market(w, region, good);
  if (delayDays <= 0) return priceOf(w, mk);
  const row = w.history.get(`${region}:${good}`) ?? [];
  return row[Math.max(0, row.length - 1 - delayDays)] ?? mk.ref;
}

export function newRng(seed: number, salt: number) {
  return new Rng((seed * 2_654_435_761 + salt * 40_503) >>> 0);
}

export const days = (hours: number) => hours / DAY;

/** The house as the engine's map reads it: what it sees, its Casa. */
export const seen = (h: House) =>
  ({
    revealed: [...h.revealed],
    casa: h.casa,
    homeLevel: h.homeLevel,
    posts: h.spots.map((p, i) => ({ id: `p${i + 1}`, ...p })),
  }) as EmpireHouse;

/** A region's daily book for the house: its counter's, for the share of its cities found. */
export function bookOf(w: World, h: House, region: string, level: number): number {
  return Number(
    applyBpsFloor(BigInt(localBookOf(region, level, w.s)), bookShareBps(seen(h), region, w.s)),
  );
}
