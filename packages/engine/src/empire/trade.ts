import { DENIERS_PER_DUCAT, type Deniers, applyBpsFloor } from "../money.js";
import {
  DAY_MS,
  type EmpireHouse,
  type EmpireMarket,
  HOUR_MS,
  type PlayerId,
  SINK_ACCOUNT,
  SOURCE_ACCOUNT,
  type WorldContext,
  type WorldState,
  cashAccount,
} from "../state.js";
import { type Tx, addStock, fail, inventoryLine, removeStock, transfer } from "../tx.js";
import { advanceCarnet } from "./carnet.js";
import { houseEffect } from "./effects.js";
import { capacityOf } from "./fleet.js";
import { empireSettings, isAsleep, ownHouse } from "./house.js";
import { bookShareBps, citiesCovered, revealedOf, standingPosts } from "./map.js";
import { powerOf } from "./power.js";
import {
  localBookOf,
  newsDelayMs,
  pressureAfterHours,
  pressureAfterTrade,
  priceAt,
  rawBonusBps,
  regionOf,
} from "./prices.js";
import { wagesOn } from "./salaries.js";
import type { EmpireSettings } from "./settings.js";
import {
  HOME_POST,
  heldAt,
  postsIn,
  postsServing,
  putAt,
  takeAt,
  takeFrom,
  wherePut,
} from "./stores.js";

/** The socle plays in Venetia only (CADRAGE-v3 § 13, step 3): the counters come at step 4. */
const HOME = "veneto";

/** The Power of a house: what it built, Casa, workshops, counters, modules, vehicles (§ 3.6). */
export function powerOfHouse(h: EmpireHouse, s: EmpireSettings): number {
  return powerOf(
    {
      casa: h.casa,
      workshopLevels: h.workshops.map((w) => w.level),
      counterLevels: Object.values(h.counters ?? {}),
      // The modules' levels, each knowledge learnt as one level, a model's levels beyond its first.
      moduleLevels: [
        ...Object.values(h.modules ?? {}),
        ...(h.knowledge ?? []).map(() => 1),
        ...Object.values(h.vehicleLevels ?? {}).map((l) => l - 1),
        // The Porta's arms: a combat model's levels beyond its first, each component's level.
        ...Object.values(h.arms?.levels ?? {}).map((l) => l - 1),
        ...(h.arms?.components ?? []).map((c) => c.level),
      ],
      staffLevels: (h.staff ?? []).map((m) => m.level),
      vehicles: (h.vehicles ?? []).length + (h.arms?.vehicles.length ?? 0),
    },
    s,
  );
}

/**
 * The only way ducats come in: the receipt is paid, and its wages go at once (CADRAGE-v3 § 5.2),
 * a share growing with the Power. Taken on a receipt, never on the treasury: nothing runs while
 * the house is away.
 */
export function receive(tx: Tx, playerId: PlayerId, gross: Deniers, ref?: string): void {
  if (gross <= 0n) return;
  const s = empireSettings(tx.ctx);
  const h = ownHouse(tx, playerId);
  transfer(tx, SOURCE_ACCOUNT, cashAccount(playerId), gross, "empire_sale", ref);
  recordIncome(h, tx.now, gross);
  advanceCarnet(h, "earn", Number(gross / DENIERS_PER_DUCAT));
  // The double entry (partita doppia) saves a share of the wages.
  const wages = applyBpsFloor(
    wagesOn(gross, powerOfHouse(h, s), s),
    10_000 - Math.min(10_000, houseEffect(h, "wagesCut", s)),
  );
  transfer(tx, cashAccount(playerId), SINK_ACCOUNT, wages, "empire_wages", ref);
}

const dayOf = (now: number) => Math.floor(now / DAY_MS);

/** Days of receipts kept: a week, today included. */
const INCOME_DAYS = 7;

/** The receipts of the last days, rolled to today (days without a sale count zero). */
function rollIncome(h: EmpireHouse, now: number): { day: number; days: Deniers[] } {
  const day = dayOf(now);
  const income = h.income ?? { day, days: [0n] };
  const gap = Math.min(INCOME_DAYS, Math.max(0, day - income.day));
  const days = [...income.days, ...Array<Deniers>(gap).fill(0n)].slice(-INCOME_DAYS);
  return { day, days };
}

function recordIncome(h: EmpireHouse, now: number, gross: Deniers): void {
  const income = rollIncome(h, now);
  income.days[income.days.length - 1] = (income.days.at(-1) ?? 0n) + gross;
  h.income = income;
}

/**
 * The house's income a day: the mean of its last full days since it opened (up to six), or today's
 * receipts on its first day. Zero before any sale.
 */
export function incomePerDay(h: EmpireHouse, now: number): Deniers {
  const { days } = rollIncome(h, now);
  const opened = Math.max(1, dayOf(now) - dayOf(h.joinedAt));
  const full = days.slice(0, -1).slice(-Math.min(opened, INCOME_DAYS - 1));
  if (full.length === 0) return days.at(-1) ?? 0n;
  return full.reduce((a, x) => a + x, 0n) / BigInt(full.length);
}

/** Houses awake present in a region: all of them in Venetia, those with a counter elsewhere. */
function presentIn(
  houses: Record<string, EmpireHouse>,
  region: string,
  now: number,
  s: EmpireSettings,
): number {
  return Object.values(houses).filter(
    (h) => !isAsleep(h, now, s) && (region === HOME || (h.counters?.[region] ?? 0) > 0),
  ).length;
}

/** What a region's Dogana takes a day, and its cities' common board: sized on the houses there. */
function marketSize(
  houses: Record<string, EmpireHouse>,
  region: string,
  now: number,
  s: EmpireSettings,
) {
  const present = presentIn(houses, region, now, s);
  return {
    depth: s.markets.depthBase + s.markets.depthPerHouse * present,
    board: s.markets.boardPerHouse * present,
  };
}

/** The house's counter level in a region: its Casa stands for one in Venetia. */
export function counterLevel(h: EmpireHouse, region: string): number {
  return region === HOME ? 1 : (h.counters?.[region] ?? 0);
}

/**
 * Where a house holds a good (calibrated at the 24-month simulator): in Venice, and in the regions
 * of the workshops that make it. Elsewhere, a voyage carries it.
 */
export function homesOf(tx: Tx, h: EmpireHouse, good: string): Set<string> {
  const homes = new Set([HOME]);
  for (const w of h.workshops) {
    const r = tx.ctx.theme.recipes.find((x) => x.code === w.recipe && x.building === w.type);
    if (r && good in r.outputs) homes.add(w.region ?? HOME);
  }
  // And where its teams found it.
  for (const region of h.found?.[good] ?? []) homes.add(region);
  return homes;
}

/**
 * The region of a sale: one the house is present in, where its counters hold the good (the map
 * that grows: each counter sells from its own stock).
 */
function checkPlace(
  tx: Tx,
  playerId: PlayerId,
  h: EmpireHouse,
  region: string,
  good: string,
  from: string[],
) {
  const s = empireSettings(tx.ctx);
  const r = s.regions.find((x) => x.code === region);
  if (!r || counterLevel(h, region) <= 0) fail("unknown_region");
  if (heldAt(tx, h, playerId, from, good) <= 0) fail("not_here");
  return r;
}

/** A market as it stands now: its pressure come back toward the reference, its day's sales. */
function marketNow(tx: Tx, region: string, good: string): EmpireMarket {
  const s = empireSettings(tx.ctx);
  const key = `${region}:${good}`;
  const markets = tx.s.empire?.markets ?? {};
  if (tx.s.empire) tx.s.empire.markets = markets;
  const day = dayOf(tx.now);
  const mk = markets[key] ?? { pressureBps: 10_000, at: tx.now, day, soldToday: 0 };
  mk.pressureBps = pressureAfterHours(mk.pressureBps, (tx.now - mk.at) / HOUR_MS, s);
  mk.at = tx.now;
  if (mk.day !== day) {
    mk.day = day;
    mk.soldToday = 0;
  }
  markets[key] = mk;
  return mk;
}

/** The fortnight of news a market keeps. */
const NEWS_MS = 14 * DAY_MS;

function remember(mk: EmpireMarket, now: number): void {
  const kept = (mk.history ?? []).filter((x) => x.at > now - NEWS_MS && x.at < now);
  mk.history = [...kept, { at: now, pressureBps: mk.pressureBps }];
}

/** A market's pressure as it stood at an instant: its last trade before, come back since. */
function pressureAt(mk: EmpireMarket | undefined, at: number, s: EmpireSettings): number {
  if (!mk) return 10_000;
  const before = [...(mk.history ?? [])].reverse().find((x) => x.at <= at);
  if (!before)
    return mk.history?.length
      ? 10_000
      : pressureAfterHours(mk.pressureBps, (at - mk.at) / HOUR_MS, s);
  return pressureAfterHours(before.pressureBps, (at - before.at) / HOUR_MS, s);
}

function isRaw(tx: Tx, good: string): boolean {
  return tx.ctx.theme.resources.find((r) => r.code === good)?.tier === "raw";
}

/**
 * Sells to a region's Dogana at its market's price, no more than its depth today, where the house
 * holds the good: the young houses' raw goods sell dearer; the tax is taken. Returns what was sold.
 */
export function sellToDogana(
  tx: Tx,
  playerId: PlayerId,
  good: string,
  qty: number,
  at = HOME,
  city?: string,
): number {
  const h = ownHouse(tx, playerId);
  if (!Number.isInteger(qty) || qty <= 0) fail("invalid_quantity");
  // To a city of the map: one the house has found; its region is the city's.
  let region = at;
  if (city !== undefined) {
    const s = empireSettings(tx.ctx);
    const c = s.map.cities.find((x) => x.code === city);
    if (!c) fail("unknown_city");
    if (!revealedOf(h, s).has(c.cell)) fail("hidden_cell");
    // On a map with a reach, a city is served by a counter it lies within reach of.
    if (s.map.reach && !citiesCovered(h, s).has(city)) fail("out_of_reach");
    region = c.region;
  }
  const from = postsIn(h, empireSettings(tx.ctx), region);
  checkPlace(tx, playerId, h, region, good, from);
  const n = sellAt(tx, playerId, good, qty, region, from);
  if (n <= 0) fail("no_liquidity");
  return n;
}

/** The Dogana's purchase itself (a sale, or a voyage's arrival): what it took, maybe nothing. */
export function sellAt(
  tx: Tx,
  playerId: PlayerId,
  good: string,
  qty: number,
  region: string,
  from?: string[],
): number {
  const s = empireSettings(tx.ctx);
  const h = ownHouse(tx, playerId);
  const r = regionOf(region, s);
  const ref = r.produces[good] ?? r.demands[good];
  if (ref === undefined) fail("unknown_resource");
  const mk = marketNow(tx, region, good);
  const { depth } = marketSize(tx.s.empire?.houses ?? {}, region, tx.now, s);
  const posts = from ?? postsIn(h, s, region);
  const n = Math.min(qty, depth - mk.soldToday, heldAt(tx, h, playerId, posts, good));
  if (n <= 0) return 0;
  takeFrom(tx, h, playerId, posts, good, n, "empire_sale");
  const bonus = isRaw(tx, good) ? rawBonusBps(h.casa, s) : 0;
  const gross = applyBpsFloor(priceAt(ref, mk.pressureBps, s) * BigInt(n), 10_000 + bonus);
  receive(tx, playerId, gross, `dogana:${region}:${good}`);
  transfer(
    tx,
    cashAccount(playerId),
    SINK_ACCOUNT,
    applyBpsFloor(gross, Math.max(0, s.markets.taxBps - houseEffect(h, "taxCut", s))),
    "market_tax",
  );
  mk.soldToday += n;
  advanceCarnet(h, "sell", n);
  mk.pressureBps = pressureAfterTrade(mk.pressureBps, n, Math.max(1, depth), "sell", s);
  remember(mk, tx.now);
  return n;
}

/**
 * Buys from a region's Dogana at its market's price and the tax (a voyage's cargo), as much as the
 * house can pay: the price rises as it buys. Returns what was bought.
 */
export function buyAt(
  tx: Tx,
  playerId: PlayerId,
  good: string,
  qty: number,
  region: string,
  into?: string,
): number {
  const s = empireSettings(tx.ctx);
  const r = regionOf(region, s);
  const ref = r.produces[good] ?? r.demands[good];
  if (ref === undefined) fail("unknown_resource");
  const mk = marketNow(tx, region, good);
  const unit = applyBpsFloor(priceAt(ref, mk.pressureBps, s), 10_000 + s.markets.taxBps);
  const cash = tx.s.accounts[cashAccount(playerId)] ?? 0n;
  const n = Math.min(qty, unit > 0n ? Number(cash / unit) : qty);
  if (n <= 0) return 0;
  transfer(
    tx,
    cashAccount(playerId),
    SINK_ACCOUNT,
    unit * BigInt(n),
    "empire_purchase",
    `${region}:${good}`,
  );
  const h = ownHouse(tx, playerId);
  putAt(tx, h, playerId, into ?? wherePut(h, s, region), good, n, "empire_purchase");
  const { depth } = marketSize(tx.s.empire?.houses ?? {}, region, tx.now, s);
  mk.pressureBps = pressureAfterTrade(mk.pressureBps, n, Math.max(1, depth), "buy", s);
  remember(mk, tx.now);
  return n;
}

/**
 * What the land vehicles of the delivering counters still carry today to the cities (no vehicles
 * set: no bound): each counter's carts serve its own cities (the map that grows).
 */
function haulLeft(tx: Tx, h: EmpireHouse, posts: string[]): number {
  const s = empireSettings(tx.ctx);
  if (Object.keys(s.vehicles).length === 0) return Number.POSITIVE_INFINITY;
  const base = (h.vehicles ?? [])
    .filter((v) => s.vehicles[v.type]?.regions.length === 1)
    .filter((v) => posts.includes(v.at ?? HOME_POST))
    .reduce((n, v) => n + capacityOf(h, v.type, s), 0);
  const capacity = Number(
    applyBpsFloor(BigInt(base), 10_000 + houseEffect(h, "capacity", s) + houseEffect(h, "haul", s)),
  );
  const trips = s.localTripsPerDay + houseEffect(h, "tripsExtra", s);
  const day = dayOf(tx.now);
  const today = h.hauled?.day === day ? h.hauled : null;
  // The day's deliveries of these counters (a house of before counted them all in Venice's).
  const used = posts.reduce(
    (n, p) => n + (today?.at ? (today.at[p] ?? 0) : p === HOME_POST ? (today?.units ?? 0) : 0),
    0,
  );
  return Math.max(0, capacity * trips - used);
}

/**
 * Delivers to a region's cities, where the house holds the good and as much as its land vehicles
 * carry today. Returns what was delivered.
 */
export function deliverOrders(
  tx: Tx,
  playerId: PlayerId,
  good: string,
  qty: number,
  at = HOME,
  city?: string,
): number {
  const h = ownHouse(tx, playerId);
  if (!Number.isInteger(qty) || qty <= 0) fail("invalid_quantity");
  // To a city of the map: one the house has found; its region is the city's.
  let region = at;
  if (city !== undefined) {
    const s = empireSettings(tx.ctx);
    const c = s.map.cities.find((x) => x.code === city);
    if (!c) fail("unknown_city");
    if (!revealedOf(h, s).has(c.cell)) fail("hidden_cell");
    if (s.map.reach && !citiesCovered(h, s).has(city)) fail("out_of_reach");
    region = c.region;
  }
  // From the counters that serve the city (those that have it in reach), else the region's.
  const s = empireSettings(tx.ctx);
  const from = city !== undefined && s.map.reach ? postsServing(h, s, city) : postsIn(h, s, region);
  checkPlace(tx, playerId, h, region, good, from);
  const n = fillOrders(tx, playerId, good, Math.min(qty, haulLeft(tx, h, from)), region, from);
  if (n <= 0) fail("no_liquidity");
  const day = dayOf(tx.now);
  const today = h.hauled?.day === day ? h.hauled : { day, units: 0, at: {} };
  const by = { ...(today.at ?? { [HOME_POST]: today.units }) };
  const first = from[0] ?? HOME_POST;
  by[first] = (by[first] ?? 0) + n;
  h.hauled = { day, units: today.units + n, at: by };
  return n;
}

/**
 * The cities' orders themselves (a delivery, or a voyage's arrival): the counter's private book
 * first, at the reference (the anchor), then the common board at the market's price, of which a
 * large house reaches only a share; the orders pay a premium. Returns what went, maybe nothing.
 */
export function fillOrders(
  tx: Tx,
  playerId: PlayerId,
  good: string,
  qty: number,
  region: string,
  from?: string[],
): number {
  const s = empireSettings(tx.ctx);
  const h = ownHouse(tx, playerId);
  const ref = regionOf(region, s).demands[good];
  if (ref === undefined) return 0;
  const day = dayOf(tx.now);
  const posts = from ?? postsIn(h, s, region);
  let left = Math.min(qty, heldAt(tx, h, playerId, posts, good));
  if (left <= 0) return 0;
  const books = h.books ?? {};
  h.books = books;
  const mine =
    books[region]?.day === day
      ? (books[region] as { day: number; left: number })
      : {
          day,
          // The cities found in the region carry their share of its book.
          left: Number(
            applyBpsFloor(
              applyBpsFloor(
                BigInt(localBookOf(region, counterLevel(h, region), s)),
                bookShareBps(h, region, s),
              ),
              10_000 + houseEffect(h, "book", s, { region }),
            ),
          ),
        };
  books[region] = mine;
  const book = Math.min(mine.left, left);
  mine.left -= book;
  left -= book;
  let value = ref * BigInt(book);
  const boards = tx.s.empire?.boards ?? {};
  if (tx.s.empire) tx.s.empire.boards = boards;
  const key = `${region}:${good}`;
  const open =
    boards[key]?.day === day
      ? (boards[key]?.left ?? 0)
      : marketSize(tx.s.empire?.houses ?? {}, region, tx.now, s).board;
  const reach =
    h.casa <= s.markets.smallCasa
      ? open
      : applyBpsFloor(BigInt(open), 10_000 - s.markets.smallShareBps);
  const board = Math.min(Number(reach), left);
  boards[key] = { day, left: open - board };
  if (board > 0) value += priceAt(ref, marketNow(tx, region, good).pressureBps, s) * BigInt(board);
  const delivered = book + board;
  if (delivered <= 0) return 0;
  takeFrom(tx, h, playerId, posts, good, delivered, "empire_sale");
  // The convoy's premium on the orders, with the market's.
  const convoy = houseEffect(h, "orderBonus", s, { region });
  receive(
    tx,
    playerId,
    applyBpsFloor(value, 10_000 + s.markets.orderPremiumBps + convoy),
    `orders:${region}:${good}`,
  );
  advanceCarnet(h, "deliver", delivered);
  return delivered;
}

export interface EmpireQuote {
  region: string;
  good: string;
  ref: Deniers;
  /** What the Dogana pays now, before the young houses' bonus. */
  price: Deniers;
  /** Asked by the cities (orders), or only made there (the Dogana). */
  asked: boolean;
  /** What the Dogana still takes today. */
  depthLeft: number;
  /** What is left today of the cities' common board. */
  boardLeft: number;
  /** When the price was so: now where the house has a counter, earlier elsewhere (the news). */
  asOf: number;
}

/**
 * The markets as a house sees them now, for the view (pure, the state untouched): live in Venetia
 * and where it has a counter; in the other regions it may charter, as the news brought them, as
 * late as a ship from there (profondeur.md § D). Without a house, Venetia's.
 */
export function empireQuotes(
  ctx: WorldContext,
  state: WorldState,
  now: number,
  playerId?: string,
): EmpireQuote[] {
  const s = ctx.settings.empire;
  if (!s) return [];
  const houses = state.empire?.houses ?? {};
  const h = playerId ? houses[playerId] : undefined;
  const day = dayOf(now);
  const regions = s.regions.filter(
    (r) =>
      r.code === HOME || (h !== undefined && ((h.counters?.[r.code] ?? 0) > 0 || r.casa <= h.casa)),
  );
  return regions.flatMap((r) => {
    const size = marketSize(houses, r.code, now, s);
    const live =
      r.code === HOME ||
      (h?.counters?.[r.code] ?? 0) > 0 ||
      houseEffect(h, "newsLive", s) > 0 ||
      // A factor there reports its prices as they are.
      (h?.staff ?? []).some((m) => m.placedAt === r.code);
    const intel = houseEffect(h, "intel", s);
    const asOf = now - newsDelayMs(r.code, live, intel, s);
    const goods = [...new Set([...Object.keys(r.produces), ...Object.keys(r.demands)])];
    return goods.map((good) => {
      const ref = (r.demands[good] ?? r.produces[good]) as Deniers;
      const mk = state.empire?.markets?.[`${r.code}:${good}`];
      const sold = mk && mk.day === day ? mk.soldToday : 0;
      const board = state.empire?.boards?.[`${r.code}:${good}`];
      return {
        region: r.code,
        good,
        ref,
        price: priceAt(ref, pressureAt(mk, asOf, s), s),
        asked: good in r.demands,
        depthLeft: Math.max(0, size.depth - sold),
        boardLeft: board?.day === day ? board.left : size.board,
        asOf,
      };
    });
  });
}

/**
 * Sells fine or exquisite goods to the court of Venice (profondeur.md § G): at the reference, the
 * fine half again, the exquisite three times, within the court's book of the day for the house (so
 * many units a level of its Casa). Returns what it took.
 */
export function sellToCourt(tx: Tx, playerId: PlayerId, code: string, qty: number): number {
  const s = empireSettings(tx.ctx);
  const h = ownHouse(tx, playerId);
  if (!Number.isInteger(qty) || qty <= 0) fail("invalid_quantity");
  const [good = "", quality] = code.split(":");
  const mult =
    quality === "fine"
      ? s.qualities.fineBps
      : quality === "exquisite"
        ? s.qualities.exquisiteBps
        : 0;
  const r = regionOf(HOME, s);
  const ref = r.demands[good] ?? r.produces[good];
  if (mult === 0 || ref === undefined) fail("unknown_resource");
  const day = dayOf(tx.now);
  const book = h.court?.day === day ? h.court : { day, left: s.qualities.courtPerCasa * h.casa };
  // The court is in Venice: Venice's own stock.
  const held = heldAt(tx, h, playerId, [HOME_POST], code);
  const n = Math.min(qty, book.left, held);
  if (held <= 0) fail("insufficient_stock");
  if (n <= 0) fail("no_liquidity");
  takeAt(tx, h, playerId, HOME_POST, code, n, "empire_sale");
  receive(tx, playerId, applyBpsFloor(ref * BigInt(n), mult), `court:${code}`);
  h.court = { day, left: book.left - n };
  advanceCarnet(h, "sell", n);
  return n;
}

/**
 * Buys at the market of a counter's region, into the counter's stock (the map that grows): the
 * price rises as it buys, as much as the house can pay. Returns what was bought.
 */
export function buyGoods(
  tx: Tx,
  playerId: PlayerId,
  good: string,
  qty: number,
  post = HOME_POST,
): number {
  const s = empireSettings(tx.ctx);
  const h = ownHouse(tx, playerId);
  if (!Number.isInteger(qty) || qty <= 0) fail("invalid_quantity");
  const at = standingPosts(h, s).find((p) => p.id === post);
  if (!at) fail("unknown_target");
  const r = regionOf(at.region, s);
  if (r.produces[good] === undefined && r.demands[good] === undefined) fail("unknown_resource");
  const n = buyAt(tx, playerId, good, qty, at.region, post);
  if (n <= 0) fail("insufficient_funds");
  return n;
}
