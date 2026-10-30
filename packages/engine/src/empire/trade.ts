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
import { type Tx, fail, inventoryLine, removeStock, transfer } from "../tx.js";
import { advanceCarnet } from "./carnet.js";
import { empireSettings, isAsleep, ownHouse } from "./house.js";
import { powerOf } from "./power.js";
import {
  localBookOf,
  pressureAfterHours,
  pressureAfterTrade,
  priceAt,
  rawBonusBps,
  regionOf,
} from "./prices.js";
import { wagesOn } from "./salaries.js";
import type { EmpireSettings } from "./settings.js";

/** The socle plays in Venetia only (CADRAGE-v3 § 13, step 3): the counters come at step 4. */
const HOME = "veneto";

/** The Power of a house of the socle: its Casa and its workshops (CADRAGE-v3 § 3.6). */
export function powerOfHouse(h: EmpireHouse, s: EmpireSettings): number {
  return powerOf(
    {
      casa: h.casa,
      workshopLevels: h.workshops.map((w) => w.level),
      counterLevels: Object.values(h.counters ?? {}),
      moduleLevels: [],
      staffLevels: [],
      vehicles: 0,
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
  const wages = wagesOn(gross, powerOfHouse(h, s), s);
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
  return homes;
}

/** The region of a sale: one the house is present in, where it holds the good. */
function checkPlace(tx: Tx, h: EmpireHouse, region: string, good: string) {
  const s = empireSettings(tx.ctx);
  const r = s.regions.find((x) => x.code === region);
  if (!r || counterLevel(h, region) <= 0) fail("unknown_region");
  if (!homesOf(tx, h, good).has(region)) fail("not_here");
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
  region = HOME,
): number {
  const s = empireSettings(tx.ctx);
  const h = ownHouse(tx, playerId);
  if (!Number.isInteger(qty) || qty <= 0) fail("invalid_quantity");
  const r = checkPlace(tx, h, region, good);
  const ref = r.produces[good] ?? r.demands[good];
  if (ref === undefined) fail("unknown_resource");
  const mk = marketNow(tx, region, good);
  const { depth } = marketSize(tx.s.empire?.houses ?? {}, region, tx.now, s);
  const n = Math.min(qty, depth - mk.soldToday, inventoryLine(tx, playerId, good).available);
  if (n <= 0)
    fail(inventoryLine(tx, playerId, good).available <= 0 ? "insufficient_stock" : "no_liquidity");
  removeStock(tx, playerId, good, n, "empire_sale");
  const bonus = isRaw(tx, good) ? rawBonusBps(h.casa, s) : 0;
  const gross = applyBpsFloor(priceAt(ref, mk.pressureBps, s) * BigInt(n), 10_000 + bonus);
  receive(tx, playerId, gross, `dogana:${region}:${good}`);
  transfer(
    tx,
    cashAccount(playerId),
    SINK_ACCOUNT,
    applyBpsFloor(gross, s.markets.taxBps),
    "market_tax",
  );
  mk.soldToday += n;
  advanceCarnet(h, "sell", n);
  mk.pressureBps = pressureAfterTrade(mk.pressureBps, n, Math.max(1, depth), "sell", s);
  return n;
}

/**
 * Delivers to a region's cities, where the house holds the good: its counter's private book first,
 * at the reference (the anchor), then the common board at the market's price, of which a large
 * house reaches only a share; the orders pay a premium. Returns what was delivered.
 */
export function deliverOrders(
  tx: Tx,
  playerId: PlayerId,
  good: string,
  qty: number,
  region = HOME,
): number {
  const s = empireSettings(tx.ctx);
  const h = ownHouse(tx, playerId);
  if (!Number.isInteger(qty) || qty <= 0) fail("invalid_quantity");
  const ref = checkPlace(tx, h, region, good).demands[good];
  if (ref === undefined) fail("unknown_resource");
  const day = dayOf(tx.now);
  let left = Math.min(qty, inventoryLine(tx, playerId, good).available);
  if (left <= 0) fail("insufficient_stock");
  const books = h.books ?? {};
  h.books = books;
  const mine =
    books[region]?.day === day
      ? (books[region] as { day: number; left: number })
      : { day, left: localBookOf(region, counterLevel(h, region), s) };
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
  if (delivered <= 0) fail("no_liquidity");
  removeStock(tx, playerId, good, delivered, "empire_sale");
  receive(
    tx,
    playerId,
    applyBpsFloor(value, 10_000 + s.markets.orderPremiumBps),
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
}

/**
 * The markets as a house sees them now, for the view (pure, the state untouched): Venetia's and
 * those of its counters' regions; without a house, Venetia's.
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
  const regions = s.regions.filter((r) => r.code === HOME || (h?.counters?.[r.code] ?? 0) > 0);
  return regions.flatMap((r) => {
    const size = marketSize(houses, r.code, now, s);
    const goods = [...new Set([...Object.keys(r.produces), ...Object.keys(r.demands)])];
    return goods.map((good) => {
      const ref = (r.demands[good] ?? r.produces[good]) as Deniers;
      const mk = state.empire?.markets?.[`${r.code}:${good}`];
      const pressure = mk ? pressureAfterHours(mk.pressureBps, (now - mk.at) / HOUR_MS, s) : 10_000;
      const sold = mk && mk.day === day ? mk.soldToday : 0;
      const board = state.empire?.boards?.[`${r.code}:${good}`];
      return {
        region: r.code,
        good,
        ref,
        price: priceAt(ref, pressure, s),
        asked: good in r.demands,
        depthLeft: Math.max(0, size.depth - sold),
        boardLeft: board?.day === day ? board.left : size.board,
      };
    });
  });
}
