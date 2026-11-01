import {
  DENIERS_PER_DUCAT,
  type Deniers,
  type Rng,
  applyBpsFloor,
  buildMinutesOf,
  buyableOf,
  casaLevelOf,
  casaRequirementMet,
  catchupCut,
  cellCentreOf,
  cellsWithin,
  citiesCovered,
  citySpot,
  effectOf,
  highRecipeRaw,
  levelCost,
  localBookOf,
  lotYieldBps,
  newsDelayMs,
  regionCells,
  regionCities,
  regionSeat,
  researchCost,
  researchMinutesOf,
  revealedOf,
  routeHours,
  sectorCost,
  standingPosts,
  startCells,
} from "@comptoirs/engine";
import { askAid, joinCompany, supplyAid } from "./company.js";
import {
  growIdentity,
  identityEffect,
  makeFine,
  masterWorked,
  neighbourEffect,
  newIdentity,
  sellToCourt,
} from "./identity.js";
import {
  type Activity,
  type Bent,
  type Build,
  DAY,
  type House,
  type Trade,
  type Voyage,
  type Workshop,
  type World,
} from "./model.js";
import { portaDay } from "./porta.js";
import {
  addStock,
  bookOf,
  buyFromMarket,
  create,
  d,
  depthOf,
  destroy,
  globalRef,
  knownPrice,
  market,
  priceOf,
  receive,
  seen,
  sellToMarket,
  takeStock,
  transfer,
} from "./world.js";

const MINUTES_PER_HOUR = 60;
const DAY_MS = 86_400_000;
const hoursOf = (minutes: number) => Math.max(1, Math.ceil(minutes / MINUTES_PER_HOUR));

export function newHouse(w: World, cohort: number, activity: Activity, bent: Bent): House {
  const h: House = {
    id: w.nextId++,
    cohort,
    joinedAt: w.now,
    activity,
    bent,
    cash: 0n,
    favour: 0,
    seals: 0,
    plans: 0,
    casa: 1,
    casaAt: [w.now],
    workshops: w.m.startWorkshops.map((x) => ({ ...x, level: 1 })),
    counters: new Map([["veneto", 1]]),
    revealed: new Set(startCells(w.s)),
    posts: 0,
    spots: [],
    homeLevel: 1,
    arsenal: false,
    camp: false,
    depot: false,
    levels: {},
    vehicles: w.m.startVehicles.map((type) => ({ type, busyUntil: 0 })),
    galleys: 0,
    modules: {},
    stock: new Map(),
    builds: [],
    research: [],
    relaunchedAt: w.now,
    lastSession: w.now,
    awayUntil: 0,
    bookLeft: new Map(),
    income: { orders: 0n, market: 0n, voyages: 0n, extraction: 0n, expeditions: 0n, terra: 0n },
    spent: 0n,
    earned: 0n,
    sampled: { earned: 0n, spent: 0n },
    recent: [0n],
    sessions: 0,
    sessionsInSight: 0,
    rawBought: 0,
    rawBoughtFromYoung: 0,
    mudaPasses: 0,
    mudaPrice: 0n,
    mudaStakes: [],
    youngEarned: 0n,
    youngRawSold: 0n,
    voyagesDone: 0,
    ordersValue: 0n,
    voyageMargin: 0n,
    expeditionsWon: 0,
    expeditionsTried: 0,
    terraValue: 0n,
    expeditionDay: -1,
    ident: newIdentity(w.now),
    fine: new Map(),
    courtDay: -1,
    courtLeft: 0,
    companySince: w.now,
    supplied: { day: -1, value: 0n },
  };
  joinCompany(w, h);
  w.houses.push(h);
  create(w, h, d(w.m.startCapitalDucats), "start");
  h.bookLeft.set("veneto", bookOf(w, h, "veneto", 1));
  return h;
}

/** Whether a house plays a session this hour (its habits, its absences). */
export function playsNow(w: World, h: House, rng: Rng): boolean {
  if (w.now < h.awayUntil) return false;
  const hour = w.now % DAY;
  const day = Math.floor(w.now / DAY);
  if (h.activity === "absent" && hour === 0 && day % 7 === h.id % 7) {
    if (rng.next() * 10_000 < w.m.leaveBpsPerWeek) {
      h.awayUntil = w.now + rng.int(3, 14) * DAY;
      return false;
    }
  }
  if (h.activity === "occasional" && (day + h.id) % 2 !== 0) return false;
  const shift = h.id % 2;
  return w.m.sessionsPerDay[h.activity].some((x) => (x + shift) % DAY === hour);
}

// ——— Production ———

function rateOf(w: World, h: House, ws: { good: string; level: number }): number {
  const base = w.m.rates[ws.good] ?? (w.m.recipes[ws.good] ? w.m.craftedPerHour : w.m.rawPerHour);
  const tools = h.modules.tools ? effectOf({ tools: h.modules.tools }, "workshopYield", w.s) : 0;
  // Its identity: the Arte's chain, the knowledge, its master, the lineage, its neighbourhood.
  const i = h.workshops.indexOf(ws as Workshop);
  const identity = identityEffect(w, h, "workshopYield", i) + neighbourEffect(w, h, i);
  return (base * lotYieldBps(ws.level, w.s) * (10_000 + tools + identity)) / 1e8;
}

/** The raw goods of Venetia a workshop's high recipe may eat: the listed ones but its own good. */
function highRawGoods(w: World, ws: { good: string }): string[] {
  return w.s.highRecipes.goods.filter((g) => g !== ws.good);
}

const stockOf = (h: House, goods: string[]) => goods.reduce((n, g) => n + (h.stock.get(g) ?? 0), 0);

/** Takes `qty` of Venetia's raw goods from the stock, the most plentiful first. */
function takeRaw(h: House, goods: string[], qty: number) {
  let left = qty;
  for (const g of [...goods].sort((a, b) => (h.stock.get(b) ?? 0) - (h.stock.get(a) ?? 0))) {
    if (left <= 0) return;
    left -= takeStock(h, g, left);
  }
}

/** The workshops' output since the last relaunch, never past the queue (12 h): then relaunched. */
function collect(w: World, h: House) {
  const until = Math.min(w.now, h.relaunchedAt + w.m.queueHours);
  const hours = Math.max(0, until - h.relaunchedAt);
  if (hours > 0)
    for (const [i, ws] of h.workshops.entries()) {
      masterWorked(w, h, i, hours);
      const saved = Math.min(9_000, identityEffect(w, h, "inputs", i));
      let qty = Math.floor(rateOf(w, h, ws) * hours);
      const recipe = w.m.recipes[ws.good];
      if (recipe)
        for (const [g, per] of Object.entries(recipe))
          qty = Math.min(qty, Math.floor((h.stock.get(g) ?? 0) / per));
      // A high recipe makes no more than its share of Venetia's raw goods allows.
      const raws = highRawGoods(w, ws);
      const have = stockOf(h, raws);
      while (qty > 0 && highRecipeRaw(ws.level, qty, w.s) > have)
        qty = Math.floor((qty * have) / highRecipeRaw(ws.level, qty, w.s));
      if (qty <= 0) continue;
      if (recipe)
        for (const [g, per] of Object.entries(recipe))
          takeStock(h, g, Math.ceil((qty * per * (10_000 - saved)) / 10_000));
      takeRaw(h, raws, highRecipeRaw(ws.level, qty, w.s));
      addStock(h, ws.good, qty - makeFine(w, h, ws.good, qty, i));
    }
  h.relaunchedAt = w.now;
  // Inputs for the next queue, bought where the house is; Venetia's raw goods, in Venice.
  const wanted = wantedIn(w, h);
  for (const ws of h.workshops) {
    const recipe = w.m.recipes[ws.good];
    const need = Math.floor(rateOf(w, h, ws) * w.m.queueHours);
    const raw = highRecipeRaw(ws.level, need, w.s);
    if (raw > 0 && !pilesUp(w, h, ws.good)) {
      const raws = highRawGoods(w, ws);
      const missing = raw - stockOf(h, raws);
      const cheapest = [...raws].sort((a, b) =>
        Number(priceOf(w, market(w, "veneto", a)) - priceOf(w, market(w, "veneto", b))),
      )[0];
      if (missing > 0 && cheapest) buyFromMarket(w, h, "veneto", cheapest, missing);
    }
    // No inputs for a good no city of its regions asks, nor for one that piles up.
    if (!recipe || !wanted.has(ws.good) || pilesUp(w, h, ws.good)) continue;
    for (const [g, per] of Object.entries(recipe)) {
      const missing = Math.ceil(need * per - (h.stock.get(g) ?? 0));
      // A young house asks its company first; it buys what the request does not cover.
      const asked = missing > 0 && h.casa <= w.m.youngCasa ? askAid(w, h, g, missing) : 0;
      if (missing - asked > 0) buyFromMarket(w, h, ws.region, g, missing - asked);
    }
  }
}

// ——— City orders ———

/** A vehicle's hold at the house's level of its model (+10 % a level, by default). */
function holdOf(w: World, h: House, type: string): number {
  const base = w.m.vehicles[type]?.capacity ?? 0;
  const lv = w.s.vehicleLevels;
  const step = lv.stepBps * ((h.levels[type] ?? 1) - 1);
  return Math.floor((base * (10_000 + step)) / 10_000);
}

function landCapacity(w: World, h: House): number {
  return h.vehicles
    .filter((v) => w.m.vehicles[v.type]?.regions.length === 1)
    .reduce((n, v) => n + holdOf(w, h, v.type), 0);
}

/**
 * The cities' orders (1 November, after Hades' Star's shipments): in a session, the waves piled up
 * since the last one (one each period, `maxWaves` at most) of the cities its counters serve, as
 * many orders a wave as each town's size, of its region's goods; brought hop by hop by its carts
 * (a hop is a few seconds: `roundsPerSession` loads in a session), from what it holds there.
 */
/** How much greater a city's orders are for its counter's level (Venice's own for Venetia). */
function boostOf(w: World, h: House, region: string): number {
  const level = region === "veneto" ? h.homeLevel : (h.counters.get(region) ?? 1);
  return 10_000 + w.s.counters.bookStepBps * (Math.max(1, level) - 1);
}

/** The waves a session finds piled up, after so long away. */
function wavesSince(w: World, sinceMs: number): number {
  const o = w.s.orders;
  if (!o) return 0;
  const period = o.periodMinutes * 60_000;
  return Math.min(o.maxWaves, Math.max(1, Math.floor(sinceMs / period)));
}

/** The units the waves of a session ask in the cities its counters serve (their expectation). */
function ordersPerSession(w: World, h: House): number {
  const o = w.s.orders;
  if (!o) return Number.POSITIVE_INFINITY;
  // Two sessions a day: half a day of waves.
  const waves = wavesSince(w, 12 * 3_600_000);
  const covered = citiesCovered(seen(h), w.s);
  return w.s.map.cities
    .filter((c) => covered.has(c.code))
    .reduce((n, c) => {
      const size = Math.min(5, Math.max(1, c.size));
      const asked = ((o.perSize[size - 1] ?? 1) * o.qtyPerSize * size * 3) / 2;
      return n + (waves * asked * boostOf(w, h, c.region)) / 10_000;
    }, 0);
}

function deliverOrders(w: World, h: House, sinceMs: number) {
  const o = w.s.orders;
  if (!o) return;
  const waves = wavesSince(w, sinceMs);
  let cap = landCapacity(w, h) * w.m.roundsPerSession;
  const covered = citiesCovered(seen(h), w.s);
  const convoy = effectOf(h.modules, "orderBonus", w.s) + identityEffect(w, h, "orderBonus");
  for (const c of w.s.map.cities) {
    if (cap <= 0) return;
    if (!covered.has(c.code)) continue;
    const r = w.s.regions.find((x) => x.code === c.region);
    if (!r) continue;
    const goods = Object.keys(r.demands);
    if (goods.length === 0) continue;
    const size = Math.min(5, Math.max(1, c.size));
    // The expected orders of the waves: so many of each good of the region.
    const asked =
      (((waves * (o.perSize[size - 1] ?? 1) * o.qtyPerSize * size * 3) / 2 / goods.length) *
        boostOf(w, h, c.region)) /
      10_000;
    for (const good of goods) {
      if (cap <= 0) return;
      if (!homesOf(h, good).has(c.region)) continue;
      const n = Math.min(Math.floor(asked), h.stock.get(good) ?? 0, cap);
      if (n <= 0) continue;
      takeStock(h, good, n);
      cap -= n;
      const ref = r.demands[good] ?? 0n;
      const bps = 10_000 + o.premiumBps + o.sizeBps * (size - 1) + o.distanceBps + convoy;
      const gross = applyBpsFloor(ref * BigInt(n), bps);
      receive(w, h, gross, "orders", "orders");
      h.ordersValue += gross;
      h.favour += Number(gross / (100n * DENIERS_PER_DUCAT)) * w.m.favourPer100Ducats;
    }
  }
}

function deliver(w: World, h: House, sinceHours: number) {
  if (w.s.orders) {
    deliverOrders(w, h, sinceHours);
    return;
  }
  let cap = Math.floor(
    (landCapacity(w, h) * w.s.localTripsPerDay * Math.min(DAY, sinceHours)) / DAY,
  );
  for (const [region] of h.counters) {
    const r = w.s.regions.find((x) => x.code === region);
    if (!r) continue;
    for (const good of Object.keys(r.demands)) {
      if (cap <= 0) return;
      // Only what it makes there (or holds in Venice): elsewhere, a voyage carries it.
      if (!homesOf(h, good).has(region)) continue;
      cap -= fillOrders(w, h, region, good, Math.min(cap, h.stock.get(good) ?? 0), "orders");
    }
  }
}

/**
 * Where a house holds a good: the regions of the workshops that make it, and Venice. Each counter
 * keeps its own stock (the map that grows), but a land vehicle carries it between two counters in
 * a few hours: the model counts the goods made away as within reach of Venice too.
 */
function homesOf(h: House, good: string): Set<string> {
  const homes = new Set(["veneto"]);
  for (const ws of h.workshops) if (ws.good === good) homes.add(ws.region);
  return homes;
}

/**
 * Delivers up to `qty` of a good from its stock to a region's cities: its private book first, at
 * the reference (the anchor), then the common board at the market's price. Returns what went.
 */
function fillOrders(
  w: World,
  h: House,
  region: string,
  good: string,
  qty: number,
  trade: Trade,
): number {
  // A world of orders has no daily book nor board: what a ship brings sells at the Dogana.
  if (w.s.orders) return 0;
  const convoy = effectOf(h.modules, "orderBonus", w.s) + identityEffect(w, h, "orderBonus");
  const small = h.casa <= w.m.smallCasa;
  const mk = market(w, region, good);
  let left = qty;
  if (h.counters.has(region)) {
    const book = Math.min(h.bookLeft.get(region) ?? 0, left);
    if (book > 0) {
      takeStock(h, good, book);
      h.bookLeft.set(region, (h.bookLeft.get(region) ?? 0) - book);
      left -= book;
      payOrder(w, h, mk.ref * BigInt(book), convoy, trade);
    }
  }
  const key = `${region}:${good}`;
  const open = w.board.get(key) ?? 0;
  const reachable = small ? open : Math.floor((open * (10_000 - w.m.smallShareBps)) / 10_000);
  const board = Math.min(reachable, left);
  if (board > 0) {
    takeStock(h, good, board);
    w.board.set(key, open - board);
    left -= board;
    payOrder(w, h, priceOf(w, mk) * BigInt(board), convoy, trade);
  }
  return qty - left;
}

function payOrder(w: World, h: House, value: Deniers, convoyBps: number, trade: Trade) {
  const gross = applyBpsFloor(value, 10_000 + w.m.orderPremiumBps + convoyBps);
  receive(w, h, gross, "orders", trade);
  h.ordersValue += gross;
  h.favour += Number(gross / (100n * DENIERS_PER_DUCAT)) * w.m.favourPer100Ducats;
}

/**
 * What is left after the orders is sold at the best market among its counters, but the Casa's
 * materials and its own inputs. A young house sells its raw goods in Venice, inputs or not, while
 * the price there is good: the veterans' high recipes buy them (CADRAGE-v3 § 12 bis).
 */
function sellSurplus(w: World, h: House) {
  const keep = nextCasaMaterials(w, h);
  const inputs = new Set(h.workshops.flatMap((x) => Object.keys(w.m.recipes[x.good] ?? {})));
  const young = h.casa <= w.s.newcomers.untilCasa;
  for (const [good, qty] of h.stock) {
    const spare = qty - (keep[good] ?? 0);
    if (spare <= 0) continue;
    const venice = market(w, "veneto", good);
    if (young && !w.m.recipes[good] && w.s.highRecipes.goods.includes(good)) {
      if (priceOf(w, venice) >= venice.ref)
        takeStock(h, good, sellToMarket(w, h, "veneto", good, spare, "market"));
      continue;
    }
    if (inputs.has(good)) continue;
    let best = "veneto";
    let bestPrice = -1n;
    for (const region of homesOf(h, good)) {
      const p = priceOf(w, market(w, region, good));
      if (p > bestPrice) {
        bestPrice = p;
        best = region;
      }
    }
    takeStock(h, good, sellToMarket(w, h, best, good, spare, "market"));
  }
}

// ——— Building (CADRAGE-v3 § 3) ———

function casaCut(w: World, level: number) {
  return catchupCut(w.casaShare[level - 1] ?? 0, w.s);
}

function nextCasaMaterials(w: World, h: House): Record<string, number> {
  if (h.casa >= w.s.casa.length) return {};
  return casaLevelOf(h.casa + 1, w.s).materials;
}

/** What the next Casa costs this house now, its materials bought at today's prices. */
export function nextCasaCost(w: World, h: House): Deniers {
  if (h.casa >= w.s.casa.length) return 0n;
  const step = casaLevelOf(h.casa + 1, w.s);
  const cut = casaCut(w, h.casa + 1).costCutBps;
  let cost = applyBpsFloor(step.costDucats, 10_000 - cut);
  for (const [g, q] of Object.entries(step.materials)) {
    const missing = Math.max(0, q - (h.stock.get(g) ?? 0));
    cost += priceOf(w, market(w, "veneto", g)) * BigInt(missing);
  }
  return cost;
}

/** Ducats a day the house took in over its last week. */
export function incomePerDay(h: House): Deniers {
  const days = Math.max(1, h.recent.length - 1);
  return h.recent.slice(0, -1).reduce((a, x) => a + x, 0n) / BigInt(days);
}

/**
 * What it keeps aside for the next Casa: all of it once within `saveDays` days of income (it saves
 * for the step in sight), else a share.
 */
function reserveOf(w: World, h: House): Deniers {
  if (!w.m.casaFirst) return 0n;
  const next = nextCasaCost(w, h);
  if (next <= incomePerDay(h) * BigInt(w.m.saveDays)) return next;
  return (next * 3n) / 10n;
}

function slotsOf(w: World, h: House) {
  return casaLevelOf(h.casa, w.s);
}

function startBuild(w: World, h: House, b: Omit<Build, "endsAt">, minutes: number) {
  h.builds.push({ ...b, endsAt: w.now + hoursOf(minutes) });
}

function busy(h: House, kind: Build["kind"], target?: string) {
  return h.builds.some((b) => b.kind === kind && (target === undefined || b.target === target));
}

function tryCasa(w: World, h: House): boolean {
  if (h.casa >= w.s.casa.length || busy(h, "casa")) return false;
  if (
    !casaRequirementMet(
      h.casa + 1,
      h.workshops.map((x) => x.level),
      w.s,
    )
  )
    return false;
  const cost = nextCasaCost(w, h);
  if (h.cash < cost) return false;
  const step = casaLevelOf(h.casa + 1, w.s);
  for (const [g, q] of Object.entries(step.materials)) {
    const missing = Math.max(0, q - (h.stock.get(g) ?? 0));
    if (missing > 0) buyFromMarket(w, h, "veneto", g, missing);
    if ((h.stock.get(g) ?? 0) < q) return false;
  }
  const cut = casaCut(w, h.casa + 1);
  const price = applyBpsFloor(step.costDucats, 10_000 - cut.costCutBps);
  // The materials bought (tax included) may leave it short: they wait in stock for the next round.
  if (h.cash < price) return false;
  for (const [g, q] of Object.entries(step.materials)) takeStock(h, g, q);
  destroy(w, h, price, "casa");
  startBuild(
    w,
    h,
    { kind: "casa", target: String(h.casa + 1) },
    Math.floor((step.buildMinutes * (10_000 - cut.timeCutBps)) / 10_000),
  );
  return true;
}

function spendable(w: World, h: House): Deniers {
  return h.cash - reserveOf(w, h);
}

/** A good piles up when its stock passes a day of what the house makes of it. */
function pilesUp(w: World, h: House, good: string): boolean {
  const day = h.workshops
    .filter((x) => x.good === good)
    .reduce((n, x) => n + rateOf(w, h, x) * DAY, 0);
  return (h.stock.get(good) ?? 0) > Math.max(day, 50);
}

function tryWorkshop(w: World, h: House): boolean {
  const max = Math.min(h.casa, w.s.workshops.maxLevel);
  let best = -1;
  // What the next Casa asks comes first, whether the goods sell or not.
  const asks =
    h.casa < w.s.casa.length ? casaLevelOf(h.casa + 1, w.s).requires : { workshops: 0, level: 0 };
  const short = h.workshops.filter((x) => x.level >= asks.level).length < asks.workshops;
  h.workshops.forEach((ws, i) => {
    if (ws.level >= max || busy(h, "workshop", String(i))) return;
    if (short ? ws.level >= asks.level : pilesUp(w, h, ws.good)) return;
    if (short) {
      // The closest to the asked level first.
      if (best < 0 || ws.level > (h.workshops[best]?.level ?? 0)) best = i;
      return;
    }
    if (best < 0 || ws.level < (h.workshops[best]?.level ?? 0)) best = i;
  });
  const ws = h.workshops[best];
  if (!ws) return false;
  // « Le savoir circule »: a level half the world has costs less, and is built quicker.
  const cut = catchupCut(w.workshopShare[ws.level] ?? 0, w.s);
  const cost = applyBpsFloor(levelCost(ws.level + 1, w.s), 10_000 - cut.costCutBps);
  // Toward the Casa's requirement, the house spends its reserve: it is the step in sight.
  if ((short ? h.cash : spendable(w, h)) < cost) return false;
  destroy(w, h, cost, "workshops");
  const minutes = buildMinutesOf(ws.level + 1, w.s);
  startBuild(
    w,
    h,
    { kind: "workshop", target: String(best) },
    Math.floor((minutes * (10_000 - cut.timeCutBps)) / 10_000),
  );
  return true;
}

function placesOf(w: World, h: House): number {
  let places = slotsOf(w, h).workshopSlots;
  for (const region of h.counters.keys())
    if (region !== "veneto")
      places += w.s.regions.find((r) => r.code === region)?.workshopSlots ?? 0;
  return places;
}

function tryNewWorkshop(w: World, h: House): boolean {
  const building = h.builds.filter((b) => b.kind === "newWorkshop").length;
  if (h.workshops.length + building >= placesOf(w, h)) return false;
  const cost = levelCost(1, w.s);
  // Short of the workshops the next Casa asks: built whatever sells, from the reserve.
  const asks =
    h.casa < w.s.casa.length ? casaLevelOf(h.casa + 1, w.s).requires : { workshops: 0, level: 0 };
  const short = h.workshops.length + building < asks.workshops;
  if ((short ? h.cash : spendable(w, h)) < cost) return false;
  const pick = bestNewWorkshop(w, h, short);
  if (!pick) return false;
  destroy(w, h, cost, "workshops");
  startBuild(
    w,
    h,
    { kind: "newWorkshop", target: `${pick.region}:${pick.good}` },
    buildMinutesOf(1, w.s),
  );
  return true;
}

/** The goods the cities of its regions ask for. */
function wantedIn(w: World, h: House): Set<string> {
  const wanted = new Set<string>();
  for (const region of h.counters.keys())
    for (const g of Object.keys(w.s.regions.find((r) => r.code === region)?.demands ?? {}))
      wanted.add(g);
  return wanted;
}

function bestNewWorkshop(w: World, h: House, anyway = false) {
  // What sells: the goods its regions' cities want, and the raw goods its own workshops need.
  const wanted = wantedIn(w, h);
  for (const ws of h.workshops)
    for (const g of Object.keys(w.m.recipes[ws.good] ?? {})) wanted.add(g);
  let best: { region: string; good: string; value: number } | null = null;
  for (const region of h.counters.keys()) {
    const r = w.s.regions.find((x) => x.code === region);
    if (!r) continue;
    // For the Casa's requirement, anything that sells, or a raw good (no inputs to buy).
    const goods = [...Object.keys(r.produces), ...Object.keys(w.m.recipes)].filter(
      (g) => wanted.has(g) || (anyway && !w.m.recipes[g]),
    );
    for (const good of goods) {
      const recipe = w.m.recipes[good];
      const rate = w.m.rates[good] ?? (recipe ? w.m.craftedPerHour : w.m.rawPerHour);
      let value = Number(priceOf(w, market(w, region, good))) * rate;
      if (recipe)
        for (const [g, per] of Object.entries(recipe))
          value -= Number(priceOf(w, market(w, region, g))) * per * rate;
      if (pilesUp(w, h, good) && !anyway) continue;
      const same = h.workshops.filter((x) => x.good === good).length;
      value *= 0.6 ** same;
      if (!best || value > best.value) best = { region, good, value };
    }
  }
  return best;
}

/** A new counter's book pays its cost back within `paybackDays`. */
function regionPaysBack(w: World, region: string, cost: Deniers): boolean {
  const r = w.s.regions.find((x) => x.code === region);
  if (!r) return false;
  const goods = Object.keys(r.demands);
  if (goods.length === 0) return false;
  const avg = goods.reduce((a, g) => a + market(w, region, g).ref, 0n) / BigInt(goods.length);
  return cost <= avg * BigInt(localBookOf(region, 1, w.s)) * BigInt(w.m.paybackDays);
}

/**
 * A counter's next level pays back fast when its private book is short of what the house makes:
 * then it is bought before saving for the Casa (its reserve is spent).
 */
function counterPaysBack(w: World, h: House, region: string, cost: Deniers): boolean {
  const r = w.s.regions.find((x) => x.code === region);
  if (!r) return false;
  const goods = Object.keys(r.demands);
  const stocked = goods.some((g) => (h.stock.get(g) ?? 0) > r.localOrdersPerCounter);
  if (!stocked || goods.length === 0) return false;
  const avg = goods.reduce((a, g) => a + market(w, region, g).ref, 0n) / BigInt(goods.length);
  const level = h.counters.get(region) ?? 0;
  const perDay =
    avg * BigInt(localBookOf(region, level + 1, w.s) - localBookOf(region, level, w.s));
  return perDay > 0n && cost <= perDay * BigInt(w.m.paybackDays);
}

/** A counter put down (step 2): its region's charter of before, dearer for each one down. */
function postCostOf(w: World, h: House, region: string): Deniers {
  const r = w.s.regions.find((x) => x.code === region);
  const base = levelCost(r?.casa ?? 1, w.s) * BigInt(w.s.counters.costTimes);
  return applyBpsFloor(base, 10_000 + w.s.map.costStepBps * h.posts);
}

/** The cities of a region a counter on `cell` would find, not seen yet. */
function newCities(w: World, sees: Set<string>, region: string, cell: string): number {
  const around = cellsWithin(cell, w.s.map.revealRadius);
  const hidden = regionCities(w.s, region).filter((c) => !sees.has(c.cell));
  return hidden.filter((c) => around.includes(c.cell)).length;
}

/**
 * Where to put a counter in a cell (the map that grows): at the place of one of its cities still
 * out of reach, or its centre, apart from the counters already down; the one that serves most.
 */
function bestPoint(
  w: World,
  h: House,
  region: string,
  cell: string,
): { x: number; y: number; covers: number } | null {
  if (!w.s.map.reach) return null;
  const before = citiesCovered(seen(h), w.s);
  const [cx, cy] = cellCentreOf(cell, w.s);
  const points = [
    ...w.s.map.cities
      .filter((c) => c.cell === cell && !before.has(c.code))
      .map((c) => citySpot(c, w.s)),
    [Math.round(cx), Math.round(cy)] as [number, number],
  ];
  const others = standingPosts(seen(h), w.s);
  const gap = w.s.map.postSpacing;
  let best: { x: number; y: number; covers: number } | null = null;
  for (const [x, y] of points) {
    if (others.some((o) => (o.x - x) ** 2 + (o.y - y) ** 2 < gap * gap)) continue;
    const after = citiesCovered(
      { ...seen(h), posts: [...(seen(h).posts ?? []), { cell, region, x, y, level: 1 }] },
      w.s,
    );
    const covers = [...after].filter((c) => !before.has(c)).length;
    if (!best || covers > best.covers) best = { x, y, covers };
  }
  return best;
}

/** The weight of a sector's towns: their sizes. */
const townsIn = (w: World, cell: string) =>
  w.s.map.cities.filter((c) => c.cell === cell).reduce((n, c) => n + c.size, 0);

/**
 * A sector bought next to its own (1 November): the one with the greatest towns, of a region its
 * Casa has reached, when it can pay it.
 */
function tryUnlock(w: World, h: House): boolean {
  if (!w.s.map.unlock) return false;
  const best = buyableOf(seen(h), w.s)
    .filter((c) => {
      const r = w.s.regions.find((x) => x.code === w.s.map.cells[c]?.region);
      return r !== undefined && r.casa <= h.casa;
    })
    .map((c) => ({ c, n: townsIn(w, c) }))
    .filter((x) => x.n > 0)
    .sort((a, b) => b.n - a.n)[0];
  if (!best) return false;
  const cost = sectorCost(seen(h), w.s);
  if (spendable(w, h) < cost) return false;
  destroy(w, h, cost, "counters");
  h.revealed.add(best.c);
  return true;
}

function tryCounter(w: World, h: House): boolean {
  if (busy(h, "counter") || busy(h, "post")) return false;
  // A new region, its seat in sight from its Casa (no Favour now): a counter put down there.
  const region = w.s.regions.find((r) => !h.counters.has(r.code) && r.casa <= h.casa);
  // On a map bought sector by sector, the region's sector it owns with the most towns.
  const seat = region
    ? w.s.map.unlock
      ? (regionCells(w.s, region.code)
          .filter((c) => h.revealed.has(c))
          .sort((a, b) => townsIn(w, b) - townsIn(w, a))[0] ?? null)
      : regionSeat(w.s, region.code)
    : null;
  const cost = region ? postCostOf(w, h, region.code) : 0n;
  // A new region is the house's growth: it is opened before saving, as soon as it pays back.
  if (region && seat && (regionPaysBack(w, region.code, cost) ? h.cash : spendable(w, h)) >= cost) {
    const at = bestPoint(w, h, region.code, seat);
    destroy(w, h, cost, "counters");
    startBuild(
      w,
      h,
      { kind: "post", target: `${region.code}@${seat}@${at?.x ?? ""}@${at?.y ?? ""}` },
      region.hoursFromVenice * MINUTES_PER_HOUR + 60,
    );
    return true;
  }
  // Else a counter more where it finds cities still hidden, or serves those found and out of
  // reach (the map that grows), when their book pays it back: a city served counts twice.
  const sees = revealedOf(seen(h), w.s);
  for (const code of h.counters.keys()) {
    const best = regionCells(w.s, code)
      .filter((c) => sees.has(c))
      .map((c) => {
        const at = bestPoint(w, h, code, c);
        return { c, at, n: newCities(w, sees, code, c) + 2 * (at?.covers ?? 0) };
      })
      .sort((a, b) => b.n - a.n)[0];
    if (!best || best.n === 0) continue;
    const r = w.s.regions.find((x) => x.code === code);
    const all = regionCities(w.s, code).length;
    if (!r || all === 0) continue;
    const up = postCostOf(w, h, code);
    const goods = Object.keys(r.demands);
    if (goods.length === 0) continue;
    const avg = goods.reduce((a, g) => a + market(w, code, g).ref, 0n) / BigInt(goods.length);
    const gain =
      (avg * BigInt(localBookOf(code, h.counters.get(code) ?? 1, w.s)) * BigInt(best.n)) /
      BigInt(all);
    if (up > gain * BigInt(w.m.paybackDays) || spendable(w, h) < up) continue;
    destroy(w, h, up, "counters");
    startBuild(
      w,
      h,
      { kind: "post", target: `${code}@${best.c}@${best.at?.x ?? ""}@${best.at?.y ?? ""}` },
      r.hoursFromVenice * MINUTES_PER_HOUR + 60,
    );
    return true;
  }
  // Else a counter grows (its private book with it), up to level 10.
  for (const [code, level] of h.counters) {
    if (level >= w.s.counters.maxLevel) continue;
    const up = levelCost(level + 1, w.s) * BigInt(w.s.counters.costTimes);
    const quick = counterPaysBack(w, h, code, up);
    if ((quick ? h.cash : spendable(w, h)) < up) continue;
    destroy(w, h, up, "counters");
    startBuild(w, h, { kind: "counter", target: code }, buildMinutesOf(level + 2, w.s));
    return true;
  }
  return false;
}

function tryVehicle(w: World, h: House): boolean {
  if (busy(h, "vehicle")) return false;
  const most = 2 + Math.floor(h.casa / 2);
  if (h.vehicles.length >= most) return false;
  // A cart more while the orders of a session outgrow what its carts bring.
  if (landCapacity(w, h) * w.m.roundsPerSession >= ordersPerSession(w, h)) return false;
  const pick = Object.entries(w.m.vehicles)
    .filter(([, v]) => v.casa <= h.casa)
    .sort((a, b) => b[1].capacity - a[1].capacity)[0];
  if (!pick) return false;
  // Bought at the Remise (31 October, evening), put down first.
  const depot = w.s.map.depot;
  if (depot && !h.depot) {
    if (busy(h, "depot") || h.casa < depot.casa) return false;
    const price = BigInt(depot.costDucats) * DENIERS_PER_DUCAT;
    if (spendable(w, h) < price) return false;
    destroy(w, h, price, "vehicles");
    startBuild(w, h, { kind: "depot", target: "depot" }, depot.minutes);
    return true;
  }
  const cost = d(pick[1].costDucats);
  if (spendable(w, h) < cost) return false;
  destroy(w, h, cost, "vehicles");
  startBuild(w, h, { kind: "vehicle", target: pick[0] }, 120);
  return true;
}

/**
 * A model raised a level at its Remise or Arsenal (31 October, evening), when the hold it adds to
 * every vehicle of it pays its price back within `paybackDays`: on land while the carts fall short
 * of Venice's book, at sea on the best route's margin.
 */
function tryModel(w: World, h: House): boolean {
  if (busy(h, "model")) return false;
  const lv = w.s.vehicleLevels;
  if (w.s.map.depot && !h.depot) return false;
  // Only while the orders outgrow the carts: a hold more is worth only what it brings.
  if (landCapacity(w, h) * w.m.roundsPerSession >= ordersPerSession(w, h)) return false;
  const owned = new Map<string, number>();
  for (const v of h.vehicles) owned.set(v.type, (owned.get(v.type) ?? 0) + 1);
  const r = w.s.regions.find((x) => x.code === "veneto");
  const goods = Object.keys(r?.demands ?? {});
  if (goods.length === 0) return false;
  const avg = goods.reduce((a, g) => a + market(w, "veneto", g).ref, 0n) / BigInt(goods.length);
  for (const [type, count] of owned) {
    const spec = w.m.vehicles[type];
    const level = h.levels[type] ?? 1;
    if (!spec || level >= lv.max) continue;
    const cost =
      d(Math.max(spec.costDucats, lv.minCostDucats)) * BigInt(lv.costTimes) * 2n ** BigInt(level);
    const more = Math.floor((spec.capacity * lv.stepBps) / 10_000) * count;
    // The orders' premium on the units more a day (two sessions, its rounds each).
    const perDay = (avg * BigInt(more * w.m.roundsPerSession * 2)) / 10n;
    if (perDay <= 0n || cost > perDay * BigInt(w.m.paybackDays) || spendable(w, h) < cost) continue;
    destroy(w, h, cost, "vehicles");
    startBuild(w, h, { kind: "model", target: type }, 1);
    return true;
  }
  return false;
}

/** The Campo, the door of the Terraferma (31 October 2026): built once its Casa is reached. */
function tryCamp(w: World, h: House): boolean {
  const camp = w.s.map.camp;
  if (!camp || h.camp || h.casa < camp.casa || busy(h, "camp")) return false;
  const cost = BigInt(camp.costDucats) * DENIERS_PER_DUCAT;
  if (spendable(w, h) < cost) return false;
  destroy(w, h, cost, "camp");
  startBuild(w, h, { kind: "camp", target: "camp" }, camp.minutes);
  return true;
}

/**
 * One trade, delivering (1 November): every house builds alike, the Casa first, then its counters
 * and sectors, its workshops, its carts, the Campo.
 */
const ORDER = [
  tryCasa,
  tryCounter,
  tryUnlock,
  tryNewWorkshop,
  tryWorkshop,
  tryVehicle,
  tryModel,
  tryCamp,
  tryWorks,
];
const PRIORITY: Record<Bent, ((w: World, h: House) => boolean)[]> = {
  trader: ORDER,
  miner: ORDER,
  armourer: ORDER,
  mixed: ORDER,
};

/**
 * The Grandes Œuvres (CADRAGE-v3 § 9), the sink one wants: past `worksDays` days of income in its
 * treasury, a house gives half of the surplus to the city's works, for Favour.
 */
function tryWorks(w: World, h: House): boolean {
  const income = incomePerDay(h);
  if (income <= 0n) return false;
  const surplus = h.cash - reserveOf(w, h) - income * BigInt(w.m.worksDays);
  if (surplus <= 0n) return false;
  const gift = surplus / 2n;
  destroy(w, h, gift, "works");
  h.favour += Number(gift / (1_000n * DENIERS_PER_DUCAT));
  return false;
}

function build(w: World, h: House) {
  for (let guard = 0; guard < 6; guard++) {
    if (h.builds.length >= slotsOf(w, h).buildSlots) return;
    if (!PRIORITY[h.bent].some((f) => f(w, h))) return;
  }
}

export function finishBuild(w: World, h: House, b: Build) {
  if (b.kind === "casa") {
    h.casa++;
    h.casaAt.push(b.endsAt);
  } else if (b.kind === "workshop") {
    const ws = h.workshops[Number(b.target)];
    if (ws) ws.level++;
  } else if (b.kind === "newWorkshop") {
    const [region = "veneto", good = "wheat"] = b.target.split(":");
    h.workshops.push({ region, good, level: 1 });
  } else if (b.kind === "counter") {
    const level = (h.counters.get(b.target) ?? 0) + 1;
    h.counters.set(b.target, level);
    // Its reach with it: Venice's own counter, or the region's first.
    if (b.target === "veneto") h.homeLevel = level;
    const first = h.spots.find((p) => p.region === b.target);
    if (first) first.level = Math.max(first.level, level);
  } else if (b.kind === "post") {
    // A counter put down: the cells around it seen, its region opened if none stood there.
    const [region = "veneto", cell = "", x = "", y = ""] = b.target.split("@");
    h.posts++;
    const [cx, cy] = cellCentreOf(cell, w.s);
    h.spots.push({
      region,
      cell,
      x: x === "" ? Math.round(cx) : Number(x),
      y: y === "" ? Math.round(cy) : Number(y),
      level: 1,
    });
    if (!w.s.map.unlock) for (const c of cellsWithin(cell, w.s.map.revealRadius)) h.revealed.add(c);
    if (!h.counters.has(region)) h.counters.set(region, 1);
  } else if (b.kind === "arsenal") {
    h.arsenal = true;
  } else if (b.kind === "camp") {
    h.camp = true;
  } else if (b.kind === "depot") {
    h.depot = true;
  } else if (b.kind === "model") {
    h.levels[b.target] = (h.levels[b.target] ?? 1) + 1;
  } else if (b.kind === "vehicle") {
    h.vehicles.push({ type: b.target, busyUntil: 0 });
  } else if (b.kind === "galley") {
    h.galleys++;
  }
}

// ——— Research (profondeur.md § B.4) ———

function research(w: World, h: House) {
  const slots = slotsOf(w, h).researchSlots;
  for (const code of w.m.researchOrder[h.bent]) {
    if (h.research.length >= slots) return;
    if (h.research.some((r) => r.code === code)) continue;
    const level = (h.modules[code] ?? 0) + 1;
    if (level > 10) continue;
    const cost = researchCost(level, w.s);
    if (spendable(w, h) < cost) return;
    if (!w.s.modules.some((m) => m.code === code)) continue;
    if (w.s.research.available.length > 0 && !w.s.research.available.includes(code)) continue;
    destroy(w, h, cost, "research");
    h.research.push({ code, level, endsAt: w.now + hoursOf(researchMinutesOf(level, w.s)) });
  }
}

// ——— The Porta (docs/plan-porta.md), in place of the expeditions of profondeur.md § C ———

function expedition(w: World, h: House, rng: Rng) {
  const s = w.s;
  // The transport: its best free land vehicle, a relic for every `holdPerRelic` of its hold.
  // Docked at the Porta in the game, it waits there: never asked free of the deliveries here.
  // A house at the Porta buys the land vehicle of the biggest hold its Casa opens, for its relics.
  if (h.porta) {
    const best = Object.entries(w.s.vehicles)
      .filter(([, v]) => v.casa <= h.casa)
      .sort((a, b) => b[1].capacity - a[1].capacity)[0];
    const owned = h.vehicles.some((v) => v.type === best?.[0]);
    const price = best ? d(best[1].costDucats) : 0n;
    if (best && !owned && spendable(w, h) >= price) {
      destroy(w, h, price, "vehicles");
      h.vehicles.push({ type: best[0], busyUntil: 0 });
    }
  }
  // Any land vehicle, as the engine takes (`landVehicle`).
  const land = h.vehicles
    .filter((v) => w.s.vehicles[v.type] !== undefined)
    .sort((a, b) => holdOf(w, h, b.type) - holdOf(w, h, a.type))[0];
  const holdRelics = () =>
    land
      ? Math.max(1, Math.floor(holdOf(w, h, land.type) / s.porta.battle.transport.holdPerRelic))
      : 0;
  const loseTransport = () => {
    if (land) h.vehicles = h.vehicles.filter((v) => v !== land);
  };
  const bread = w.markets.get("veneto:bread")?.ref ?? d(1);
  const before = h.porta?.battles ?? 0;
  portaDay(
    w,
    h,
    rng,
    // The armourer's trade comes first: half its treasury, whatever its next Casa asks.
    () => (h.bent === "armourer" ? h.cash / 2n : spendable(w, h)),
    holdRelics,
    loseTransport,
    bread,
    w.m.portaBattlesPerDay[h.activity],
    land ? d(w.s.vehicles[land.type]?.costDucats ?? 0) : 0n,
  );
  if (!h.porta || h.porta.battles === before) return;
  h.expeditionsTried = h.porta.battles;
  h.expeditionsWon = h.porta.won;
}

// ——— The session ———

/** A bot's round of five minutes (CADRAGE-v3 § 4.1). */
export function session(w: World, h: House, rng: Rng) {
  const since = w.now - h.lastSession;
  const worked = Math.min(since, w.m.queueHours);
  collect(w, h);
  deliver(w, h, since);
  // Its partners' requests first, from what it holds beyond its inputs and its next Casa.
  const keep = nextCasaMaterials(w, h);
  const inputs = new Set(h.workshops.flatMap((x) => Object.keys(w.m.recipes[x.good] ?? {})));
  supplyAid(w, h, (g) => (inputs.has(g) ? Number.POSITIVE_INFINITY : (keep[g] ?? 0)));
  sellSurplus(w, h);
  sellToCourt(w, h);
  if (h.bent === "armourer") expedition(w, h, rng);
  build(w, h);
  research(w, h);
  growIdentity(w, h, () => spendable(w, h));
  if (h.bent === "mixed") expedition(w, h, rng);
  h.sessions++;
  const soon = w.now + DAY;
  const reachable = h.cash + incomePerDay(h);
  const nextWorkshop = Math.min(...h.workshops.map((x) => x.level));
  const inSight =
    h.builds.some((b) => b.endsAt <= soon) ||
    h.research.some((r) => r.endsAt <= soon) ||
    w.voyages.some((v) => w.houses[v.house] === h && v.arrivesAt <= soon) ||
    (h.casa < w.s.casa.length && reachable >= nextCasaCost(w, h)) ||
    (nextWorkshop < Math.min(h.casa, w.s.workshops.maxLevel) &&
      reachable >= levelCost(nextWorkshop + 1, w.s));
  if (inSight) h.sessionsInSight++;
  h.lastSession = w.now;
}

export const _trades: Trade[] = [
  "orders",
  "market",
  "voyages",
  "extraction",
  "expeditions",
  "terra",
];
