import {
  DENIERS_PER_DUCAT,
  type Deniers,
  type Rng,
  applyBpsFloor,
  arsenalCost,
  buildMinutesOf,
  casaLevelOf,
  casaRequirementMet,
  catchupCut,
  cellsWithin,
  corsairRiskBps,
  effectOf,
  expeditionSuccessBps,
  extract,
  highRecipeRaw,
  levelCost,
  localBookOf,
  lotYieldBps,
  mudaAuction,
  mudaPlaces,
  mudaReserve,
  newsDelayMs,
  plansFor,
  regionCells,
  regionSeat,
  relicsOf,
  researchCost,
  researchMinutesOf,
  revealedOf,
  routeHours,
  settleColleganza,
  teamRate,
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
    revealed: new Set(regionCells(w.s, "veneto")),
    posts: 0,
    arsenal: false,
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

// ——— Extraction (profondeur.md § A) ———

function teamsOf(w: World, h: House): number {
  if (h.casa < 5) return 0;
  const base = 1 + Math.floor((h.casa - 5) / 4);
  return h.bent === "miner" ? base * w.m.minerTeams : base;
}

function extractNow(w: World, h: House, hours: number) {
  const teams = teamsOf(w, h);
  if (teams === 0 || hours <= 0) return;
  const remote = (h.modules.remote ?? 0) > 0;
  const deposits = w.deposits
    .filter((x) => x.stock > 0 && (remote || h.counters.has(x.region)))
    .sort((a, b) => b.stock - a.stock)
    .slice(0, teams);
  const rate = teamRate(effectOf(h.modules, "yield", w.s), w.s);
  for (const dep of deposits) {
    const r = extract(dep.stock, [rate], hours);
    dep.stock = r.left;
    const qty = r.taken[0] ?? 0;
    if (qty <= 0) continue;
    // Sold where it is found, at that market's price; what the market cannot take is kept.
    addStock(h, dep.good, qty);
    takeStock(h, dep.good, sellToMarket(w, h, dep.region, dep.good, qty, "extraction"));
  }
}

// ——— City orders ———

function landCapacity(w: World, h: House): number {
  return h.vehicles
    .map((v) => w.m.vehicles[v.type])
    .filter((v) => v?.regions.length === 1)
    .reduce((n, v) => n + (v?.capacity ?? 0), 0);
}

function deliver(w: World, h: House, sinceHours: number) {
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

/** Where a house holds a good: the regions of the workshops that make it, and Venice. */
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

// ——— Voyages (profondeur.md § D, § E) ———

function vehicleSpec(w: World, type: string) {
  const v = w.m.vehicles[type];
  if (!v) throw new RangeError(`no vehicle ${type}`);
  return v;
}

function strengthOf(w: World, h: House): number {
  if (h.galleys === 0) return 0;
  const bonus =
    effectOf(h.modules, "strength", w.s) +
    effectOf(h.modules, "defence", w.s) +
    effectOf(h.modules, "support", w.s);
  return Math.floor((h.galleys * w.m.galleyStrength * (10_000 + bonus)) / 10_000);
}

interface Route {
  from: string;
  to: string;
  good: string;
  hours: number;
  unit: Deniers;
  gain: number;
  qty: number;
  /** What the cargo should fetch over its cost, in deniers. */
  margin: number;
}

/**
 * A vehicle's best route by gain an hour. A port takes a share of its day's depth, selling more
 * would only sink its price; a Muda convoy sells at the port's fair, a full hold.
 */
function bestRoute(w: World, h: House, type: string): Route | null {
  const spec = vehicleSpec(w, type);
  const intel = effectOf(h.modules, "intel", w.s);
  const hold = effectOf(h.modules, "capacity", w.s);
  const speed = effectOf(h.modules, "speed", w.s);
  const cap = Math.floor((spec.capacity * (10_000 + hold)) / 10_000);
  const fair = w.s.muda.vehicles.includes(type);
  let best: Route | null = null;
  for (const from of spec.regions) {
    if (!h.counters.has(from)) continue;
    for (const to of spec.regions) {
      if (to === from) continue;
      const hours = routeHours(from, to, spec.speedBps + speed, w.s);
      const delay = Math.round(newsDelayMs(to, h.counters.has(to), intel, w.s) / DAY_MS);
      const risk = corsairRiskBps(to, strengthOf(w, h), w.s) * w.s.corsairs.lossShareBps;
      const depth = depthOf(w, to) + (fair ? cap : 0);
      const qtyMax = fair ? cap : Math.min(cap, Math.floor(depth * w.m.voyageDepthShare));
      const impact = (w.s.prices.impactBps * qtyMax) / (2 * depth) / 10_000;
      for (const good of Object.keys(w.s.regions.find((r) => r.code === to)?.demands ?? {})) {
        const buy = priceOf(w, market(w, from, good));
        const sell = Number(knownPrice(w, h, to, good, delay)) * (1 - impact);
        const expected = sell * (1 - risk / 1e8) - Number(buy) * 1.03;
        const gain = (expected * qtyMax) / (2 * hours);
        if (expected > Number(buy) * 0.1 && (!best || gain > best.gain))
          best = { from, to, good, hours, unit: buy, gain, qty: qtyMax, margin: expected * qtyMax };
      }
    }
  }
  return best;
}

function planVoyages(w: World, h: House, rng: Rng) {
  h.vehicles.forEach((v, index) => {
    const spec = vehicleSpec(w, v.type);
    if (spec.regions.length < 2 || v.busyUntil > w.now) return;
    // A Muda galley sails only with a place won at the incanto.
    const muda = w.s.muda.vehicles.includes(v.type);
    if (muda && h.mudaPasses <= 0) return;
    const best = bestRoute(w, h, v.type);
    if (!best) return;
    const unit = (best.unit * 103n) / 100n;
    // Its own goods first: the négociant sells its surplus where it fetches most.
    const own = Math.min(best.qty, h.stock.get(best.good) ?? 0);
    const wanted = best.qty - own;
    // It pays from what it may spend: its reserve for the Casa stays, the colleganza fills in.
    const free = minBig(h.cash, maxBig(0n, spendable(w, h)));
    let qty = Math.min(wanted, unit > 0n ? Number(free / unit) : 0);
    // A convoy carries the stakes that paid its place.
    const stakes: Voyage["stakes"] = muda ? h.mudaStakes : [];
    const place = muda ? h.mudaPrice : 0n;
    if (muda) {
      h.mudaStakes = [];
      h.mudaPrice = 0n;
    }
    // A long voyage or a convoy short of capital opens a colleganza (Casa 11).
    if ((muda || best.hours >= 48) && h.casa >= 11 && qty < wanted) {
      const raised = raise(w, h, unit * BigInt(wanted - qty), stakes, rng);
      qty = Math.min(wanted, Number((free + raised) / unit));
    }
    const bought = qty > 0 ? buyFromMarket(w, h, best.from, best.good, qty) : 0;
    if (bought + own <= 0) {
      // Nothing to carry: the investors have their stakes back, as far as the house can.
      if (muda) h.mudaPasses--;
      for (const st of stakes) {
        const inv = w.houses[st.house];
        if (inv) transfer(h, inv, minBig(st.amount, h.cash));
      }
      return;
    }
    takeStock(h, best.good, bought + own);
    v.busyUntil = w.now + 2 * best.hours;
    // A prudent house insures a risky road (step 7a): the premium destroyed now.
    const risk = corsairRiskBps(best.to, strengthOf(w, h), w.s);
    const value = unit * BigInt(bought) + best.unit * BigInt(own);
    const premium = (value * BigInt(risk) * BigInt(w.s.corsairs.premiumBps)) / 100_000_000n;
    const insured = risk >= w.m.insureFromBps && premium > 0n && h.cash >= premium;
    if (insured) destroy(w, h, premium, "insurance");
    if (muda) {
      h.mudaPasses--;
      w.muda.voyages++;
      if (stakes.length > 0) w.muda.withColleganza++;
      for (const st of stakes) {
        w.muda.stakes += st.amount;
        if ((w.houses[st.house]?.casa ?? 0) > h.casa) w.muda.fromLarger += st.amount;
      }
    }
    w.voyages.push({
      house: w.houses.indexOf(h),
      vehicle: index,
      good: best.good,
      qty: bought + own,
      to: best.to,
      arrivesAt: w.now + best.hours,
      // Its own goods count at what they would have fetched at home.
      // A convoy's place is part of its cost.
      cost: unit * BigInt(bought) + best.unit * BigInt(own) + place,
      stakes,
      escort: strengthOf(w, h),
      muda,
      ...(insured ? { insured: true } : {}),
    });
  });
}

/**
 * Raises up to `missing` from up to three houses with money to spare, as stakes in a colleganza.
 * Returns what was raised.
 */
function raise(w: World, h: House, missing: Deniers, stakes: Voyage["stakes"], rng: Rng): Deniers {
  let raised = 0n;
  const investors = w.houses
    .filter((x) => x !== h && x.awayUntil <= w.now && investable(w, x) > 0n)
    .sort(() => rng.next() - 0.5)
    .slice(0, 3);
  for (const inv of investors) {
    if (raised >= missing) break;
    const stake = minBig(missing - raised, investable(w, inv));
    if (stake <= 0n) continue;
    transfer(inv, h, stake);
    stakes.push({ house: w.houses.indexOf(inv), amount: stake });
    raised += stake;
  }
  return raised;
}

/**
 * The incanto (CADRAGE-v3 § 12 bis), before each Muda departure. A place not sailed is lost, and
 * its investors have back what the house can give. Each owner of an idle Muda galley bids a share
 * of what its best convoy should make; a winner short of free cash raises the rest in colleganza
 * on that convoy, or gives the place up. The price is destroyed.
 */
export function mudaIncanto(w: World, rng: Rng) {
  for (const h of w.houses) {
    for (const st of h.mudaStakes) {
      const inv = w.houses[st.house];
      if (inv) transfer(h, inv, minBig(st.amount, h.cash));
    }
    h.mudaPasses = 0;
    h.mudaPrice = 0n;
    h.mudaStakes = [];
  }
  const types = w.s.muda.vehicles;
  const owners = w.houses.filter((h) => h.vehicles.some((v) => types.includes(v.type)));
  const places = mudaPlaces(owners.length, w.s);
  if (places === 0) return;
  const incomes = owners.map(incomePerDay).sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  const reserve = mudaReserve(incomes[Math.floor(incomes.length / 2)] ?? 0n, w.s);
  const bidders: House[] = [];
  const bids: Deniers[] = [];
  for (const h of owners) {
    if (h.awayUntil > w.now) continue;
    const idle = h.vehicles.find((v) => types.includes(v.type) && v.busyUntil <= w.now);
    const route = idle ? bestRoute(w, h, idle.type) : null;
    if (!route) continue;
    const bid = BigInt(Math.floor((route.margin * w.m.mudaBidBps) / 10_000));
    if (bid <= 0n) continue;
    bidders.push(h);
    bids.push(bid);
  }
  mudaAuction(bids, places, reserve).forEach((price, i) => {
    const h = bidders[i];
    if (!h || price === null) return;
    const free = minBig(h.cash, maxBig(0n, spendable(w, h)));
    const stakes: Voyage["stakes"] = [];
    if (free < price) raise(w, h, price - free, stakes, rng);
    if (h.cash < price) {
      for (const st of stakes) {
        const inv = w.houses[st.house];
        if (inv) transfer(h, inv, st.amount);
      }
      return;
    }
    destroy(w, h, price, "muda");
    h.mudaPasses = 1;
    h.mudaPrice = price;
    h.mudaStakes = stakes;
    w.muda.places++;
    w.muda.paid += price;
  });
}

const minBig = (a: Deniers, b: Deniers) => (a < b ? a : b);
const maxBig = (a: Deniers, b: Deniers) => (a > b ? a : b);

/** What a house may put in a colleganza: past its reserve and three days of income. */
function investable(w: World, h: House): Deniers {
  return h.cash - reserveOf(w, h) - incomePerDay(h) * 3n;
}

/** A voyage arrives: the corsairs perhaps, the sale at the port, the colleganza shared. */
export function arrive(w: World, v: Voyage, rng: Rng) {
  const h = w.houses[v.house];
  if (!h) return;
  let qty = v.qty;
  const risk = corsairRiskBps(v.to, v.escort, w.s);
  if (risk > 0 && rng.next() * 10_000 < risk) {
    const lost = Math.floor((qty * w.s.corsairs.lossShareBps) / 10_000);
    qty -= lost;
    if (v.insured) create(w, h, market(w, v.to, v.good).ref * BigInt(lost), "insurance", "voyages");
  }
  const before = h.cash;
  // The port's orders first, then its market; what it cannot take comes home in stock.
  addStock(h, v.good, qty);
  const delivered = fillOrders(w, h, v.to, v.good, qty, "voyages");
  const fair = v.muda ? qty : 0;
  const sold = sellToMarket(w, h, v.to, v.good, qty - delivered, "voyages", fair) + delivered;
  takeStock(h, v.good, sold - delivered);
  const net = h.cash - before;
  const kept = priceOf(w, market(w, v.to, v.good)) * BigInt(qty - sold);
  h.voyagesDone++;
  h.voyageMargin += net + kept - v.cost;
  if (v.stakes.length > 0) settle(w, h, v, net);
}

function settle(w: World, h: House, v: Voyage, net: Deniers) {
  const stakes = v.stakes.map((x) => x.amount);
  const capital = stakes.reduce((a, x) => a + x, 0n);
  // The share of the voyage the investors paid for, settled as the engine's colleganza does.
  const share = v.cost > 0n ? (net * capital) / v.cost : 0n;
  const out = colleganzaShare(w, stakes, share > 0n ? share : 0n);
  v.stakes.forEach((st, i) => {
    const inv = w.houses[st.house];
    const due = out[i] ?? 0n;
    if (inv && due > 0n) {
      transfer(h, inv, minBig(due, h.cash));
      w.colleganza.toYoung += inv.casa >= 12 && h.casa <= 12 ? st.amount : 0n;
      w.colleganza.total += st.amount;
    }
  });
}

function colleganzaShare(w: World, stakes: Deniers[], proceeds: Deniers): Deniers[] {
  return settleColleganza(stakes, proceeds, w.s).investors;
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

/** The cities of a region a counter on `cell` would find, not found yet. */
function newCities(w: World, h: House, region: string, cell: string): number {
  const sees = revealedOf(seen(h), w.s);
  const around = new Set(cellsWithin(cell, w.s.map.revealRadius));
  return w.s.map.cities.filter(
    (c) => c.region === region && !sees.has(c.cell) && around.has(c.cell),
  ).length;
}

function tryCounter(w: World, h: House): boolean {
  if (busy(h, "counter") || busy(h, "post")) return false;
  // A new region, its seat in sight from its Casa (no Favour now): a counter put down there.
  const region = w.s.regions.find((r) => !h.counters.has(r.code) && r.casa <= h.casa);
  const seat = region ? regionSeat(w.s, region.code) : null;
  const cost = region ? postCostOf(w, h, region.code) : 0n;
  // A new region is the house's growth: it is opened before saving, as soon as it pays back.
  if (region && seat && (regionPaysBack(w, region.code, cost) ? h.cash : spendable(w, h)) >= cost) {
    destroy(w, h, cost, "counters");
    startBuild(
      w,
      h,
      { kind: "post", target: `${region.code}@${seat}` },
      region.hoursFromVenice * MINUTES_PER_HOUR + 60,
    );
    return true;
  }
  // Else a counter more where it finds cities still hidden, when their book pays it back.
  for (const code of h.counters.keys()) {
    const sees = revealedOf(seen(h), w.s);
    const best = regionCells(w.s, code)
      .filter((c) => sees.has(c))
      .map((c) => ({ c, n: newCities(w, h, code, c) }))
      .sort((a, b) => b.n - a.n)[0];
    if (!best || best.n === 0) continue;
    const r = w.s.regions.find((x) => x.code === code);
    const all = w.s.map.cities.filter((c) => c.region === code).length;
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
      { kind: "post", target: `${code}@${best.c}` },
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
  // The négociant keeps a larger fleet.
  const most = 2 + Math.floor((h.casa * (h.bent === "trader" ? 2 : 1)) / 2);
  if (h.vehicles.length >= most) return false;
  const types = Object.entries(w.m.vehicles)
    .filter(([, v]) => v.casa <= h.casa)
    .sort((a, b) => b[1].capacity - a[1].capacity);
  // A land vehicle while Venice's own book outgrows the carts, else the largest ship.
  const book = localBookOf("veneto", h.counters.get("veneto") ?? 0, w.s);
  const wantLand = landCapacity(w, h) * w.s.localTripsPerDay < book;
  const pick = wantLand ? types.find(([, v]) => v.regions.length === 1) : types[0];
  if (!pick || (!wantLand && pick[1].regions.length === 1)) return false;
  // A ship is built at the Arsenal (step 7a): its site's hours, its materials from the stock, or
  // their worth at the reference when the house lacks them (the model buys them for it).
  const build = w.s.vehicles[pick[0]]?.build;
  // On the map (step 2), the Arsenal is put down on a coast first.
  const yard = w.s.map.arsenal;
  if (build && yard && !h.arsenal) {
    if (busy(h, "arsenal") || h.casa < yard.casa) return false;
    const price = arsenalCost(w.s);
    if (spendable(w, h) < price) return false;
    destroy(w, h, price, "vehicles");
    startBuild(w, h, { kind: "arsenal", target: "arsenal" }, yard.minutes);
    return true;
  }
  let cost = d(pick[1].costDucats);
  const lacking: [string, number][] = [];
  for (const [g, n] of Object.entries(build?.materials ?? {})) {
    const short = n - Math.min(n, h.stock.get(g) ?? 0);
    if (short > 0) {
      cost += globalRef(g, w.s, w.m) * BigInt(short);
      lacking.push([g, n - short]);
    } else lacking.push([g, n]);
  }
  if (spendable(w, h) < cost) return false;
  for (const [g, n] of lacking) takeStock(h, g, n);
  destroy(w, h, cost, "vehicles");
  startBuild(
    w,
    h,
    { kind: "vehicle", target: pick[0] },
    build ? Math.ceil(build.minutes / 60) : 120,
  );
  return true;
}

function tryGalley(w: World, h: House): boolean {
  if (h.casa < 9 || busy(h, "galley")) return false;
  if (h.galleys >= 1 + Math.floor(h.casa / 4)) return false;
  const cost = d(w.m.galleyCostDucats) * BigInt(h.galleys + 1);
  if (spendable(w, h) < cost) return false;
  destroy(w, h, cost, "galleys");
  startBuild(w, h, { kind: "galley", target: "galley" }, 480);
  return true;
}

const PRIORITY: Record<Bent, ((w: World, h: House) => boolean)[]> = {
  trader: [tryCasa, tryCounter, tryVehicle, tryNewWorkshop, tryWorkshop, tryWorks],
  miner: [tryCasa, tryCounter, tryNewWorkshop, tryWorkshop, tryVehicle, tryWorks],
  armourer: [tryCasa, tryCounter, tryGalley, tryNewWorkshop, tryWorkshop, tryVehicle, tryWorks],
  mixed: [tryCasa, tryCounter, tryNewWorkshop, tryWorkshop, tryVehicle, tryGalley, tryWorks],
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
    h.counters.set(b.target, (h.counters.get(b.target) ?? 0) + 1);
  } else if (b.kind === "post") {
    // A counter put down: the cells around it seen, its region opened if none stood there.
    const [region = "veneto", cell = ""] = b.target.split("@");
    h.posts++;
    for (const c of cellsWithin(cell, w.s.map.revealRadius)) h.revealed.add(c);
    if (!h.counters.has(region)) h.counters.set(region, 1);
  } else if (b.kind === "arsenal") {
    h.arsenal = true;
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
    const plans = plansFor(level, w.s);
    if (h.plans < plans && !buyPlans(w, h, plans - h.plans)) continue;
    // The plans bought may leave it short: they wait for the next round.
    if (h.cash < cost) return;
    h.plans -= plans;
    destroy(w, h, cost, "research");
    h.research.push({ code, level, endsAt: w.now + hoursOf(researchMinutesOf(level, w.s)) });
  }
}

function buyPlans(w: World, h: House, qty: number): boolean {
  const price = d(w.m.planPriceDucats);
  let need = qty;
  for (const lot of w.planPool) {
    if (need === 0) break;
    const seller = w.houses[lot.house];
    if (!seller || seller === h) continue;
    const take = Math.min(need, lot.qty, Number(h.cash / price));
    if (take <= 0) break;
    transfer(h, seller, price * BigInt(take));
    seller.income.expeditions += price * BigInt(take);
    lot.qty -= take;
    need -= take;
    h.plans += take;
  }
  w.planPool = w.planPool.filter((x) => x.qty > 0);
  return need === 0;
}

// ——— Expeditions (profondeur.md § C) ———

function expedition(w: World, h: House, rng: Rng) {
  const strength = strengthOf(w, h);
  if (strength === 0 || h.casa < 10) return;
  const today = Math.floor(w.now / DAY);
  if (h.expeditionDay === today) return;
  h.expeditionDay = today;
  let tier = 0;
  w.s.expeditions.tiers.forEach((_, i) => {
    if (expeditionSuccessBps(i + 1, strength, w.s) >= 5_000) tier = i + 1;
  });
  if (tier === 0) return;
  const victuals = d(w.m.victualsPerTierDucats * tier);
  if (h.cash < victuals) return;
  destroy(w, h, victuals, "victuals");
  h.expeditionsTried++;
  if (rng.next() * 10_000 >= expeditionSuccessBps(tier, strength, w.s)) return;
  h.expeditionsWon++;
  h.seals += tier;
  const plans = relicsOf(tier, w.s) * w.m.plansPerRelic;
  h.plans += plans;
  // Booty taken from the corsairs, and the plans one has no use for put up for sale.
  create(w, h, d(w.m.bootyPerTierDucats * tier * tier), "booty", "expeditions");
  const spare = Math.max(0, h.plans - 6);
  if (spare > 0) {
    h.plans -= spare;
    w.planPool.push({ house: w.houses.indexOf(h), qty: spare });
  }
}

// ——— The session ———

/** A bot's round of five minutes (CADRAGE-v3 § 4.1). */
export function session(w: World, h: House, rng: Rng) {
  const since = w.now - h.lastSession;
  const worked = Math.min(since, w.m.queueHours);
  collect(w, h);
  extractNow(w, h, worked);
  deliver(w, h, since);
  // Its partners' requests first, from what it holds beyond its inputs and its next Casa.
  const keep = nextCasaMaterials(w, h);
  const inputs = new Set(h.workshops.flatMap((x) => Object.keys(w.m.recipes[x.good] ?? {})));
  supplyAid(w, h, (g) => (inputs.has(g) ? Number.POSITIVE_INFINITY : (keep[g] ?? 0)));
  sellSurplus(w, h);
  sellToCourt(w, h);
  if (h.bent !== "miner" || h.casa >= 8) planVoyages(w, h, rng);
  build(w, h);
  research(w, h);
  growIdentity(w, h, () => spendable(w, h));
  if (h.bent === "armourer" || h.bent === "mixed") expedition(w, h, rng);
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
