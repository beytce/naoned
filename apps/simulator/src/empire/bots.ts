import {
  DENIERS_PER_DUCAT,
  type Deniers,
  type Rng,
  applyBpsFloor,
  buildMinutesOf,
  casaLevelOf,
  catchupCut,
  corsairRiskBps,
  effectOf,
  expeditionSuccessBps,
  extract,
  levelCost,
  lotYieldBps,
  newsDelayMs,
  plansFor,
  relicsOf,
  researchCost,
  researchMinutesOf,
  routeHours,
  settleColleganza,
  teamRate,
} from "@comptoirs/engine";
import {
  type Activity,
  type Bent,
  type Build,
  DAY,
  type House,
  type Trade,
  type Voyage,
  type World,
} from "./model.js";
import {
  addStock,
  buyFromMarket,
  create,
  d,
  destroy,
  knownPrice,
  market,
  priceOf,
  receive,
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
    voyagesDone: 0,
    voyageMargin: 0n,
    expeditionsWon: 0,
    expeditionsTried: 0,
    terraValue: 0n,
    expeditionDay: -1,
  };
  w.houses.push(h);
  create(w, h, d(w.m.startCapitalDucats), "start");
  h.bookLeft.set("veneto", w.s.regions[0]?.localOrdersPerCounter ?? 0);
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
  const base = w.m.recipes[ws.good] ? w.m.craftedPerHour : w.m.rawPerHour;
  const tools = h.modules.tools ? effectOf({ tools: h.modules.tools }, "yield", w.s) : 0;
  return (base * lotYieldBps(ws.level, w.s) * (10_000 + tools)) / 1e8;
}

/** The workshops' output since the last relaunch, never past the queue (12 h): then relaunched. */
function collect(w: World, h: House) {
  const until = Math.min(w.now, h.relaunchedAt + w.m.queueHours);
  const hours = Math.max(0, until - h.relaunchedAt);
  if (hours > 0)
    for (const ws of h.workshops) {
      let qty = Math.floor(rateOf(w, h, ws) * hours);
      const recipe = w.m.recipes[ws.good];
      if (recipe)
        for (const [g, per] of Object.entries(recipe))
          qty = Math.min(qty, Math.floor((h.stock.get(g) ?? 0) / per));
      if (qty <= 0) continue;
      if (recipe) for (const [g, per] of Object.entries(recipe)) takeStock(h, g, qty * per);
      addStock(h, ws.good, qty);
    }
  h.relaunchedAt = w.now;
  // Inputs for the next queue, bought where the house is.
  for (const ws of h.workshops) {
    const recipe = w.m.recipes[ws.good];
    if (!recipe) continue;
    const need = Math.floor(rateOf(w, h, ws) * w.m.queueHours);
    for (const [g, per] of Object.entries(recipe)) {
      const missing = need * per - (h.stock.get(g) ?? 0);
      if (missing > 0) buyFromMarket(w, h, ws.region, g, missing);
    }
  }
}

// ——— Extraction (profondeur.md § A) ———

function teamsOf(h: House): number {
  if (h.casa < 5) return 0;
  const base = 1 + Math.floor((h.casa - 5) / 4);
  return h.bent === "miner" ? base * 2 : base;
}

function extractNow(w: World, h: House, hours: number) {
  const teams = teamsOf(h);
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
    (landCapacity(w, h) * w.m.localTripsPerDay * Math.min(DAY, sinceHours)) / DAY,
  );
  const convoy = effectOf(h.modules, "orderBonus", w.s);
  const small = h.casa <= w.m.smallCasa;
  for (const [region] of h.counters) {
    const r = w.s.regions.find((x) => x.code === region);
    if (!r) continue;
    for (const good of Object.keys(r.demands)) {
      if (cap <= 0) return;
      // The private book first, at the reference (the anchor), then the common board.
      const book = Math.min(h.bookLeft.get(region) ?? 0, h.stock.get(good) ?? 0, cap);
      if (book > 0) {
        takeStock(h, good, book);
        h.bookLeft.set(region, (h.bookLeft.get(region) ?? 0) - book);
        cap -= book;
        const mk = market(w, region, good);
        payOrder(w, h, mk.ref * BigInt(book), convoy);
      }
      const key = `${region}:${good}`;
      const open = w.board.get(key) ?? 0;
      const reachable = small ? open : Math.floor((open * (10_000 - w.m.smallShareBps)) / 10_000);
      const board = Math.min(reachable, h.stock.get(good) ?? 0, cap);
      if (board > 0) {
        takeStock(h, good, board);
        w.board.set(key, open - board);
        cap -= board;
        const mk = market(w, region, good);
        payOrder(w, h, priceOf(w, mk) * BigInt(board), convoy);
      }
    }
  }
}

function payOrder(w: World, h: House, value: Deniers, convoyBps: number) {
  const gross = applyBpsFloor(value, 10_000 + w.m.orderPremiumBps + convoyBps);
  receive(w, h, gross, "orders", "orders");
  h.favour += Number(gross / (100n * DENIERS_PER_DUCAT)) * w.m.favourPer100Ducats;
}

/** What is left after the orders is sold at the best market among its counters, but the Casa's materials. */
function sellSurplus(w: World, h: House) {
  const keep = nextCasaMaterials(w, h);
  const inputs = new Set(h.workshops.flatMap((x) => Object.keys(w.m.recipes[x.good] ?? {})));
  for (const [good, qty] of h.stock) {
    if (qty <= 0 || inputs.has(good)) continue;
    const spare = qty - (keep[good] ?? 0);
    if (spare <= 0) continue;
    let best = "veneto";
    let bestPrice = -1n;
    for (const region of h.counters.keys()) {
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

function planVoyages(w: World, h: House, rng: Rng) {
  const intel = effectOf(h.modules, "intel", w.s);
  const hold = effectOf(h.modules, "capacity", w.s);
  const speed = effectOf(h.modules, "speed", w.s);
  h.vehicles.forEach((v, index) => {
    const spec = vehicleSpec(w, v.type);
    if (spec.regions.length < 2 || v.busyUntil > w.now) return;
    const cap = Math.floor((spec.capacity * (10_000 + hold)) / 10_000);
    let best: {
      from: string;
      to: string;
      good: string;
      hours: number;
      unit: Deniers;
      gain: number;
    } | null = null;
    for (const from of spec.regions) {
      if (!h.counters.has(from)) continue;
      for (const to of spec.regions) {
        if (to === from) continue;
        const hours = routeHours(from, to, spec.speedBps + speed, w.s);
        const delay = Math.round(newsDelayMs(to, h.counters.has(to), intel, w.s) / DAY_MS);
        const risk = corsairRiskBps(to, strengthOf(w, h), w.s) * w.s.corsairs.lossShareBps;
        for (const good of Object.keys(w.s.regions.find((r) => r.code === to)?.demands ?? {})) {
          const buy = priceOf(w, market(w, from, good));
          const sell = knownPrice(w, h, to, good, delay);
          const expected = Number(sell) * (1 - risk / 1e8) - Number(buy) * 1.03;
          const gain = (expected * cap) / (2 * hours);
          if (expected > Number(buy) * 0.1 && (!best || gain > best.gain))
            best = { from, to, good, hours, unit: buy, gain };
        }
      }
    }
    if (!best) return;
    const unit = (best.unit * 103n) / 100n;
    let qty = Math.min(cap, unit > 0n ? Number(h.cash / unit) : 0);
    const stakes: Voyage["stakes"] = [];
    // A long voyage short of capital opens a colleganza (Casa 11).
    if (best.hours >= 48 && h.casa >= 11 && qty < cap) {
      const missing = unit * BigInt(cap - qty);
      let raised = 0n;
      const investors = w.houses
        .filter((x) => x !== h && x.awayUntil <= w.now && x.cash > reserveOf(w, x) * 2n)
        .sort(() => rng.next() - 0.5)
        .slice(0, 3);
      for (const inv of investors) {
        if (raised >= missing) break;
        const stake = minBig(missing - raised, inv.cash - reserveOf(w, inv) * 2n);
        if (stake <= 0n) continue;
        transfer(inv, h, stake);
        stakes.push({ house: w.houses.indexOf(inv), amount: stake });
        raised += stake;
      }
      qty = Math.min(cap, Number(h.cash / unit));
    }
    const bought = buyFromMarket(w, h, best.from, best.good, qty);
    if (bought <= 0) {
      // Nothing bought: the investors have their stakes back.
      for (const st of stakes) {
        const inv = w.houses[st.house];
        if (inv) transfer(h, inv, st.amount);
      }
      return;
    }
    takeStock(h, best.good, bought);
    v.busyUntil = w.now + 2 * best.hours;
    w.voyages.push({
      house: w.houses.indexOf(h),
      vehicle: index,
      good: best.good,
      qty: bought,
      to: best.to,
      arrivesAt: w.now + best.hours,
      cost: unit * BigInt(bought),
      stakes,
      escort: strengthOf(w, h),
    });
  });
}

const minBig = (a: Deniers, b: Deniers) => (a < b ? a : b);

/** A voyage arrives: the corsairs perhaps, the sale at the port, the colleganza shared. */
export function arrive(w: World, v: Voyage, rng: Rng) {
  const h = w.houses[v.house];
  if (!h) return;
  let qty = v.qty;
  const risk = corsairRiskBps(v.to, v.escort, w.s);
  if (risk > 0 && rng.next() * 10_000 < risk)
    qty -= Math.floor((qty * w.s.corsairs.lossShareBps) / 10_000);
  const before = h.cash;
  // What the port cannot take comes home in stock.
  addStock(h, v.good, qty);
  takeStock(h, v.good, sellToMarket(w, h, v.to, v.good, qty, "voyages"));
  const net = h.cash - before;
  h.voyagesDone++;
  h.voyageMargin += net - v.cost;
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

function reserveOf(w: World, h: House): Deniers {
  return w.m.casaFirst ? (nextCasaCost(w, h) * 3n) / 10n : 0n;
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

function tryWorkshop(w: World, h: House): boolean {
  const max = Math.min(h.casa, w.s.workshops.maxLevel);
  let best = -1;
  h.workshops.forEach((ws, i) => {
    if (ws.level >= max || busy(h, "workshop", String(i))) return;
    if (best < 0 || ws.level < (h.workshops[best]?.level ?? 0)) best = i;
  });
  const ws = h.workshops[best];
  if (!ws) return false;
  const cost = levelCost(ws.level + 1, w.s);
  if (spendable(w, h) < cost) return false;
  destroy(w, h, cost, "workshops");
  startBuild(w, h, { kind: "workshop", target: String(best) }, buildMinutesOf(ws.level + 1, w.s));
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
  if (spendable(w, h) < cost) return false;
  const pick = bestNewWorkshop(w, h);
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

function bestNewWorkshop(w: World, h: House) {
  let best: { region: string; good: string; value: number } | null = null;
  for (const region of h.counters.keys()) {
    const r = w.s.regions.find((x) => x.code === region);
    if (!r) continue;
    const goods = [...Object.keys(r.produces), ...Object.keys(w.m.recipes)];
    for (const good of goods) {
      const recipe = w.m.recipes[good];
      const rate = recipe ? w.m.craftedPerHour : w.m.rawPerHour;
      let value = Number(priceOf(w, market(w, region, good))) * rate;
      if (recipe)
        for (const [g, per] of Object.entries(recipe))
          value -= Number(priceOf(w, market(w, region, g))) * per * rate;
      const same = h.workshops.filter((x) => x.good === good).length;
      value *= 0.6 ** same;
      if (!best || value > best.value) best = { region, good, value };
    }
  }
  return best;
}

function tryCounter(w: World, h: House): boolean {
  if (busy(h, "counter")) return false;
  const region = w.s.regions.find(
    (r) => !h.counters.has(r.code) && r.casa <= h.casa && h.favour >= r.charterFavour,
  );
  const cost = d(w.m.counterCostDucats);
  if (region && spendable(w, h) >= cost) {
    h.favour -= region.charterFavour;
    destroy(w, h, cost, "counters");
    startBuild(
      w,
      h,
      { kind: "counter", target: region.code },
      region.hoursFromVenice * MINUTES_PER_HOUR + 60,
    );
    return true;
  }
  // Else a counter grows (its private book with it), up to level 10.
  for (const [code, level] of h.counters) {
    if (level >= 10) continue;
    const up = d(w.m.counterCostDucats) * BigInt(level);
    if (spendable(w, h) < up) continue;
    destroy(w, h, up, "counters");
    startBuild(w, h, { kind: "counter", target: code }, buildMinutesOf(level + 2, w.s));
    return true;
  }
  return false;
}

function tryVehicle(w: World, h: House): boolean {
  if (busy(h, "vehicle")) return false;
  if (h.vehicles.length >= 2 + Math.floor(h.casa / 2)) return false;
  const types = Object.entries(w.m.vehicles)
    .filter(([, v]) => v.casa <= h.casa)
    .sort((a, b) => b[1].capacity - a[1].capacity);
  // A land vehicle while the local books outgrow the mules, else the largest ship.
  const books = [...h.counters.values()].reduce((n, l) => n + l, 0) * 60;
  const wantLand = landCapacity(w, h) * w.m.localTripsPerDay < books;
  const pick = wantLand ? types.find(([, v]) => v.regions.length === 1) : types[0];
  if (!pick) return false;
  const cost = d(pick[1].costDucats);
  if (spendable(w, h) < cost) return false;
  destroy(w, h, cost, "vehicles");
  startBuild(w, h, { kind: "vehicle", target: pick[0] }, 120);
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
  trader: [tryCasa, tryCounter, tryVehicle, tryNewWorkshop, tryWorkshop],
  miner: [tryCasa, tryNewWorkshop, tryWorkshop, tryCounter, tryVehicle],
  armourer: [tryCasa, tryGalley, tryNewWorkshop, tryWorkshop, tryVehicle, tryCounter],
  mixed: [tryCasa, tryNewWorkshop, tryWorkshop, tryCounter, tryVehicle, tryGalley],
};

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
  create(w, h, d(25 * tier), "booty", "expeditions");
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
  sellSurplus(w, h);
  if (h.bent !== "miner" || h.casa >= 8) planVoyages(w, h, rng);
  build(w, h);
  research(w, h);
  if (h.bent === "armourer" || h.bent === "mixed") expedition(w, h, rng);
  h.sessions++;
  const soon = w.now + DAY;
  const inSight =
    h.builds.some((b) => b.endsAt <= soon) ||
    h.research.some((r) => r.endsAt <= soon) ||
    w.voyages.some((v) => w.houses[v.house] === h && v.arrivesAt <= soon);
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
