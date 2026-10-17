import {
  Bot,
  type Command,
  DAY_MS,
  type Delivery,
  type Deniers,
  type Effects,
  MARKET_MAKER,
  MINUTE_MS,
  MarketView,
  PROFILES,
  type ProfileName,
  Rng,
  type WorldContext,
  type WorldSettingsInput,
  type WorldState,
  accumulate,
  checkInvariants,
  createWorldState,
  decide,
  deliveryOrdersFor,
  emptyTotals,
  isMudaGood,
  parseSettings,
  seasonInfluence,
  seasonStandings,
  seasonTier,
  venice1450,
} from "@comptoirs/engine";
import {
  type DailyMetrics,
  type DayFlows,
  type PlayerRow,
  PriceIndex,
  type PriceRow,
  emptyFlows,
  recordFlows,
  snapshot,
} from "./metrics.js";
import { type RoadStats, roadStats } from "./road.js";

export interface SimulationOptions {
  settings: WorldSettingsInput;
  seed: number;
  days: number;
  stepMinutes: number;
  mix: Record<ProfileName, number>;
  lateJoiners: number;
  /** Share of bots holding the Pass Négociant all season (0 to 1). */
  passShare?: number;
  /**
   * Share of bots whose house holds patents from earlier seasons (0 to 1): `patents` on joining.
   * The world's settings must know them (`house`).
   */
  patentShare?: number;
  patents?: string[];
  /** Bots behave as in the live world (leave the market maker to people, sell on the book). */
  live?: boolean;
  /** Optional observer of every accepted command's effects (debugging, extra analysis). */
  onEffects?: (effects: Effects, now: number) => void;
}

export interface SimulationResult {
  options: SimulationOptions;
  daily: DailyMetrics[];
  prices: PriceRow[];
  players: PlayerRow[];
  violations: { at: number; detail: string }[];
  commands: { accepted: number; rejected: number; rejectedBy: Record<string, number> };
  durationMs: number;
  /** Bots that held the Pass Négociant. */
  passHolders?: string[];
  /** Bots whose house held patents. */
  patentHolders?: string[];
  /** Influence earned in the season, per merchant and source (the close's tier included). */
  influence?: Record<
    string,
    { mission: number; commerce: number; campaign: number; season: number }
  >;
  /** World at the end of the run (debugging, extra analysis). */
  finalState?: WorldState;
  /** Do merchants depend on each other? Raw material buyers and building types per merchant. */
  interdependence?: {
    rawBuyers: number;
    merchants: number;
    typesPerMerchant: number;
    /** Average workshop level at the end, and share of workshops at the top level. */
    avgLevel: number;
    topLevelShare: number;
    /** Workshop levels per merchant (a new workshop counts 1): how far merchants grew. */
    levelsPerMerchant: number;
  };
  /** How active play is: share of the board covered by stock at each session, first delivery. */
  activity?: {
    fillableShare: number;
    /** Median hours from joining to the first delivery. */
    firstDeliveryHours: number;
    neverDelivered: number;
    harvestsPerDay: number;
    deliveriesPerDay: number;
  };
  /** The world's board (shared demand): how much of it is taken, how fast, and lost to others. */
  board?: {
    days: number;
    orders: number;
    /** Share of the board's orders taken by the end of their day. */
    takenShare: number;
    /** Of the orders taken, share taken within an hour of opening. */
    firstHourShare: number;
    /** At each session, orders the stock covered but another merchant had already taken. */
    lostPerSession: number;
  };
  /** The road: deliveries and vehicles (see `roadStats`). */
  road?: RoadStats;
  /** Reference prices of the world, to read the prices against. */
  referencePrices?: Record<string, Deniers>;
  /** The Dogana's price over the season, per resource: lowest and highest, in bps of the reference. */
  doganaRange?: Record<string, [number, number]>;
  /**
   * The galleys of the Muda: arrivals, units brought and sold by the Dogana (and its takings),
   * the board's orders of goods from overseas and their share of the money paid on arrival.
   */
  muda?: {
    arrivals: number;
    brought: number;
    sold: number;
    takings: Deniers;
    buyers: number;
    exoticOrders: number;
    exoticTaken: number;
    exoticPaidShare: number;
  };
  /** Faraj's bales: opened, cards by rarity, value at reference prices by player (deniers). */
  bales?: { opened: number; cards: Record<string, number>; valueBy: Record<string, number> };
  /** The families and the week's campaign: members, lances, battles, weeks won, decrees. */
  families?: {
    /** Members of each family at the end of the season. */
    members: Record<string, number>;
    /** Merchants of no family at the end. */
    unaffiliated: number;
    levied: number;
    hired: number;
    /** Ducats destroyed for the lances. */
    hireCost: Deniers;
    /** Works built, razed, and the ducats they destroyed. */
    worksBuilt: number;
    worksRazed: number;
    worksCost: Deniers;
    marches: number;
    taken: number;
    held: number;
    milanRides: number;
    /** Each week: the winner, the glory of each family and the decrees imposed. */
    weeks: {
      week: number;
      winner: string | null;
      glory: Record<string, number>;
      decrees: string[];
    }[];
    /** Money moved by the decrees, by ledger reason (gabelle, toll, favour, shares). */
    decreeMoney: Record<string, Deniers>;
  };
}

export const DEFAULT_MIX: Record<ProfileName, number> = {
  producer: 15,
  artisan: 15,
  builder: 8,
  speculator: 5,
  casual: 7,
};

/** The default mix brought down to `total` merchants, keeping its proportions. */
export function scaleMix(
  mix: Record<ProfileName, number>,
  total: number,
): Record<ProfileName, number> {
  const sum = Object.values(mix).reduce((a, b) => a + b, 0);
  const out = { ...mix };
  let given = 0;
  for (const name of Object.keys(mix) as ProfileName[]) {
    out[name] = Math.max(1, Math.round((mix[name] * total) / sum));
    given += out[name];
  }
  out.producer += total - given;
  return out;
}

const REGIONS = ["terraferma", "lagoon", "dolomites"];
const START = Date.UTC(2026, 0, 5);

function regionFor(profile: ProfileName, i: number): string {
  if (profile === "artisan") return "terraferma";
  if (profile === "builder") return i % 2 === 0 ? "lagoon" : "dolomites";
  return REGIONS[i % 3] ?? "terraferma";
}

export function createBots(options: SimulationOptions, rng: Rng): Bot[] {
  const bots: Bot[] = [];
  const live = options.live ? { spareMarketMaker: true, generous: true } : {};
  let n = 0;
  for (const [name, count] of Object.entries(options.mix) as [ProfileName, number][]) {
    for (let i = 0; i < count; i++) {
      const joinAt = START + Math.floor(rng.next() * DAY_MS);
      bots.push(new Bot(`${name}-${++n}`, PROFILES[name], regionFor(name, i), joinAt, live));
    }
  }
  const names = Object.keys(options.mix) as ProfileName[];
  for (let i = 0; i < options.lateJoiners; i++) {
    const name = rng.pick(names.filter((p) => p !== "speculator"));
    // Late joiners arrive between a sixth and a half of the season.
    const from = Math.round(options.days / 6);
    const joinAt =
      START +
      from * DAY_MS +
      Math.floor(rng.next() * (Math.round(options.days / 2) - from) * DAY_MS);
    bots.push(new Bot(`late-${name}-${++n}`, PROFILES[name], regionFor(name, i), joinAt, live));
  }
  return bots;
}

export function runSimulation(options: SimulationOptions): SimulationResult {
  const started = performance.now();
  const ctx: WorldContext = {
    theme: venice1450,
    settings: parseSettings(options.settings),
    startAt: START,
    endAt: START + options.days * DAY_MS,
  };
  const rng = new Rng(options.seed);
  const bots = createBots(options, rng);
  let state: WorldState = createWorldState(ctx);
  const totals = emptyTotals();
  let flows: DayFlows = emptyFlows();
  const index = new PriceIndex(ctx);
  const result: SimulationResult = {
    options,
    daily: [],
    prices: [],
    players: [],
    violations: [],
    commands: { accepted: 0, rejected: 0, rejectedBy: {} },
    durationMs: 0,
  };

  const raw = new Set(ctx.theme.resources.filter((r) => r.tier === "raw").map((r) => r.code));
  const rawBuyers = new Set<string>();
  const families = {
    members: {},
    unaffiliated: 0,
    levied: 0,
    hired: 0,
    hireCost: 0n,
    worksBuilt: 0,
    worksRazed: 0,
    worksCost: 0n,
    marches: 0,
    taken: 0,
    held: 0,
    milanRides: 0,
    weeks: [],
    decreeMoney: {},
  } as NonNullable<SimulationResult["families"]>;
  const bales = { opened: 0, cards: {}, valueBy: {} } as NonNullable<SimulationResult["bales"]>;
  let now = START;
  const muda = { arrivals: 0, brought: 0, sold: 0, takings: 0n, buyers: new Set<string>() };
  const run = (cmd: Command): boolean => {
    const before = state.muda;
    const res = decide(ctx, state, cmd, now);
    if (!res.ok) {
      result.commands.rejected++;
      const key = `${cmd.type}:${res.error}`;
      result.commands.rejectedBy[key] = (result.commands.rejectedBy[key] ?? 0) + 1;
      return false;
    }
    result.commands.accepted++;
    state = res.state;
    if (state.muda && state.muda.arrival !== before?.arrival) {
      for (const [r, q] of Object.entries(state.muda.stock)) {
        muda.brought += Math.max(0, q - (before?.stock[r] ?? 0));
      }
    }
    accumulate(totals, res.effects);
    for (const e of res.effects.events) {
      if (e.type !== "influence_earned" || !e.playerId) continue;
      result.influence ??= {};
      const tally = result.influence[e.playerId] ?? {
        mission: 0,
        commerce: 0,
        campaign: 0,
        season: 0,
      };
      result.influence[e.playerId] = tally;
      const source =
        e.data?.source === "mission"
          ? "mission"
          : e.data?.source === "campaign"
            ? "campaign"
            : "commerce";
      tally[source] += Number(e.data?.amount ?? 0);
    }
    for (const t of res.effects.trades) {
      if (raw.has(t.resource)) rawBuyers.add(t.buyerId);
      if (t.sellerId === MARKET_MAKER && isMudaGood(ctx, t.resource)) {
        muda.sold += t.quantity;
        muda.takings += t.price * BigInt(t.quantity);
        muda.buyers.add(t.buyerId);
      }
    }
    recordFlows(flows, res.effects);
    for (const e of res.effects.events) {
      if (e.type === "harvest") activity.harvests++;
      if (e.type === "muda_arrived") muda.arrivals++;
      if (e.type === "delivery_dispatched" && e.playerId) {
        activity.deliveries++;
        if (!delivered.has(e.playerId)) {
          delivered.add(e.playerId);
          const joined = state.players[e.playerId]?.joinedAt ?? now;
          activity.firstDelivery.push((now - joined) / 3_600_000);
        }
      }
      if (e.type === "levy_collected") families.levied += Number(e.data?.lances ?? 0);
      if (e.type === "lances_hired") families.hired += Number(e.data?.lances ?? 0);
      if (e.type === "march_sent") families.marches++;
      if (e.type === "work_built") families.worksBuilt++;
      if (e.type === "work_razed") families.worksRazed++;
      if (e.type === "land_taken") families.taken++;
      if (e.type === "land_held") families.held++;
      if (e.type === "milan_rides") families.milanRides++;
    }
    for (const l of res.effects.ledger) {
      if (l.reason === "campaign_hire") families.hireCost += l.amount;
      if (l.reason === "campaign_work") families.worksCost += l.amount;
      if (l.reason.startsWith("decree_"))
        families.decreeMoney[l.reason] = (families.decreeMoney[l.reason] ?? 0n) + l.amount;
    }
    if (cmd.type === "openBale") {
      bales.opened++;
      for (const c of state.bales?.[cmd.playerId]?.last?.cards ?? []) {
        bales.cards[c.rarity] = (bales.cards[c.rarity] ?? 0) + 1;
      }
      for (const m of res.effects.stock) {
        if (m.reason !== "bale_gift") continue;
        const value = Number(ctx.settings.referencePrices[m.resource] ?? 0n) * m.quantity;
        bales.valueBy[m.playerId] = (bales.valueBy[m.playerId] ?? 0) + value;
      }
    }
    options.onEffects?.(res.effects, now);
    return true;
  };
  const market = new MarketView(
    ctx,
    () => state,
    () => now,
  );
  const session = {
    ctx,
    state: () => state,
    get now() {
      return now;
    },
    market,
    rng,
    act: run,
  };

  // Pass holders: every k-th bot of each profile, so that profiles stay comparable.
  const passHolders = new Set<string>();
  const share = options.passShare ?? 0;
  if (share > 0) {
    const seen: Record<string, number> = {};
    for (const bot of bots) {
      const n = (seen[bot.profile.name] ?? 0) + 1;
      seen[bot.profile.name] = n;
      if (Math.floor(n * share) > Math.floor((n - 1) * share)) passHolders.add(bot.id);
    }
  }
  result.passHolders = [...passHolders];
  // Houses with patents: picked the same way, every k-th bot of each profile.
  const patentHolders = new Set<string>();
  const patentShare = options.patentShare ?? 0;
  if (patentShare > 0) {
    const seen: Record<string, number> = {};
    for (const bot of bots) {
      const n = (seen[bot.profile.name] ?? 0) + 1;
      seen[bot.profile.name] = n;
      if (Math.floor(n * patentShare) > Math.floor((n - 1) * patentShare))
        patentHolders.add(bot.id);
    }
  }
  result.patentHolders = [...patentHolders];
  // By default, every privilege of the world's catalogue.
  const patents = options.patents ?? Object.keys(options.settings.house?.patents ?? {});
  const schedule = new Map<Bot, number[]>();
  const step = options.stepMinutes * MINUTE_MS;
  const end = START + options.days * DAY_MS;
  const botInfo = bots.map((b) => ({ id: b.id, profile: b.profile.name, region: b.region }));
  let currentDay = 0;

  // Deliveries leave the state a few days after they end: keep their last look.
  const roadSeen = { deliveries: new Map<string, Delivery>() };
  const sweepRoad = () => {
    for (const d of Object.values(state.deliveries ?? {})) roadSeen.deliveries.set(d.id, d);
  };
  // How playable the board is: at each session, the open orders the stock already covers.
  const activity = {
    sessions: 0,
    open: 0,
    fillable: 0,
    harvests: 0,
    deliveries: 0,
    firstDelivery: [] as number[],
    lost: 0,
  };
  const delivered = new Set<string>();
  const observeBoard = (playerId: string) => {
    const s = state;
    const day = Math.floor((now - START) / DAY_MS);
    const stock = (r: string) => s.inventories[playerId]?.[r]?.available ?? 0;
    const showing = deliveryOrdersFor(ctx, s, playerId, day).filter(
      (o) =>
        o.opensAt <= now &&
        now < o.expiresAt &&
        !(
          s.deliveriesDone?.[playerId]?.day === day &&
          s.deliveriesDone[playerId]?.ids.includes(o.id)
        ),
    );
    // Taken by another: no longer playable, and lost if the stock covered it.
    const takenByOther = (o: (typeof showing)[number]) => !!o.takenBy && o.takenBy !== playerId;
    const orders = showing.filter((o) => !takenByOther(o));
    activity.sessions++;
    activity.open += orders.length;
    activity.fillable += orders.filter((o) => stock(o.resource) >= o.quantity).length;
    activity.lost += showing.filter(
      (o) => takenByOther(o) && stock(o.resource) >= o.quantity,
    ).length;
  };
  // The world's board of each day, as it last stood.
  const boards = new Map<number, NonNullable<WorldState["board"]>>();
  const doganaRange: Record<string, [number, number]> = {};
  const closeDay = () => {
    sweepRoad();
    for (const r of Object.keys(ctx.settings.referencePrices)) {
      const bps = state.marketMaker.anchorBps?.[r] ?? 10_000;
      const seen = doganaRange[r] ?? [bps, bps];
      doganaRange[r] = [Math.min(seen[0], bps), Math.max(seen[1], bps)];
    }
    const snap = snapshot(ctx, state, now, currentDay, flows, index, botInfo);
    result.daily.push(snap.daily);
    result.prices.push(...snap.prices);
    result.players.push(...snap.players);
    flows = emptyFlows();
  };

  const planDay = (day: number) => {
    for (const bot of bots) {
      if (bot.churned) continue;
      if (day > 0 && state.players[bot.id] && rng.chance(bot.profile.churnPerDay)) {
        bot.churned = true;
        continue;
      }
      schedule.set(bot, bot.planDay(rng, START + day * DAY_MS));
    }
  };
  planDay(0);

  for (now = START; now < end; now += step) {
    const day = Math.floor((now - START) / DAY_MS);
    if (day !== currentDay) {
      closeDay();
      currentDay = day;
      planDay(day);
    }
    run({ type: "tick" });
    if (state.board) boards.set(state.board.day, state.board);
    for (const bot of bots) {
      if (bot.churned) continue;
      if (!state.players[bot.id]) {
        if (bot.joinAt <= now)
          run({
            type: "join",
            playerId: bot.id,
            region: bot.region,
            ...(patentHolders.has(bot.id) ? { patents } : {}),
          });
        if (!state.players[bot.id]) continue;
        if (passHolders.has(bot.id)) {
          run({ type: "grantPass", playerId: bot.id, until: end });
        }
      }
      const times = schedule.get(bot) ?? [];
      while (times.length > 0 && (times[0] ?? Number.POSITIVE_INFINITY) <= now) {
        times.shift();
        observeBoard(bot.id);
        bot.play(session);
      }
    }
    for (const v of checkInvariants(state, totals)) {
      if (result.violations.length < 50)
        result.violations.push({ at: now, detail: `#${v.invariant} ${v.detail}` });
    }
  }
  closeDay();
  // The close: each merchant's tier of the final ranking brings its Influence (served by the
  // server in the game).
  if (ctx.settings.house) {
    const standings = seasonStandings(ctx, state, end - 1);
    standings.forEach((row, i) => {
      const days = Math.floor((end - (state.players[row.playerId]?.joinedAt ?? end)) / DAY_MS);
      const amount = seasonInfluence(ctx, seasonTier(i + 1, standings.length, days));
      if (amount === 0) return;
      result.influence ??= {};
      const tally = result.influence[row.playerId] ?? {
        mission: 0,
        commerce: 0,
        campaign: 0,
        season: 0,
      };
      tally.season += amount;
      result.influence[row.playerId] = tally;
    });
  }
  result.finalState = state;
  result.referencePrices = ctx.settings.referencePrices;
  result.doganaRange = doganaRange;
  const merchants = Object.keys(state.players);
  const workshops = Object.values(state.buildings).filter((b) => b.type !== "palazzo");
  const types = merchants.map(
    (id) =>
      new Set(
        Object.values(state.buildings)
          .filter((b) => b.playerId === id)
          .map((b) => b.type),
      ).size,
  );
  result.interdependence = {
    rawBuyers: merchants.filter((id) => rawBuyers.has(id)).length,
    merchants: merchants.length,
    typesPerMerchant: types.reduce((a, b) => a + b, 0) / Math.max(1, types.length),
    avgLevel: workshops.reduce((a, b) => a + b.level, 0) / Math.max(1, workshops.length),
    topLevelShare:
      workshops.filter((b) => b.level >= ctx.settings.maxBuildingLevel).length /
      Math.max(1, workshops.length),
    levelsPerMerchant: workshops.reduce((a, b) => a + b.level, 0) / Math.max(1, merchants.length),
  };
  for (const id of merchants) {
    const f = state.families?.memberOf[id];
    if (f) families.members[f] = (families.members[f] ?? 0) + 1;
  }
  families.unaffiliated = merchants.filter((id) => !state.families?.memberOf[id]).length;
  families.weeks = (state.campaign?.history ?? []).map((h) => ({
    week: h.week,
    winner: h.winner,
    glory: h.glory,
    decrees: h.decrees.map((d) => (d.target ? `${d.code}:${d.target}` : d.code)),
  }));
  result.families = families;
  result.bales = bales;
  const playerDays = result.daily.reduce((a, d) => a + d.active, 0);
  const sortedFirst = [...activity.firstDelivery].sort((a, b) => a - b);
  result.activity = {
    fillableShare: activity.open > 0 ? activity.fillable / activity.open : 0,
    firstDeliveryHours: sortedFirst[Math.floor(sortedFirst.length / 2)] ?? Number.NaN,
    neverDelivered: Object.keys(state.players).length - delivered.size,
    harvestsPerDay: activity.harvests / Math.max(1, playerDays),
    deliveriesPerDay: activity.deliveries / Math.max(1, playerDays),
  };
  sweepRoad();
  if (boards.size > 0) {
    const departed = new Map<string, number>();
    for (const d of roadSeen.deliveries.values())
      departed.set(`${d.playerId}:${d.orderId}`, d.departAt);
    let orders = 0;
    let taken = 0;
    let fast = 0;
    for (const b of boards.values()) {
      orders += b.orders.length;
      for (const o of b.orders) {
        const taker = b.takenBy[o.id];
        if (!taker) continue;
        taken++;
        const at = departed.get(`${taker}:${o.id}`);
        if (at !== undefined && at - o.opensAt <= 3_600_000) fast++;
      }
    }
    result.board = {
      days: boards.size,
      orders,
      takenShare: orders > 0 ? taken / orders : 0,
      firstHourShare: taken > 0 ? fast / taken : 0,
      lostPerSession: activity.lost / Math.max(1, activity.sessions),
    };
  }
  if (ctx.settings.muda) {
    let exoticOrders = 0;
    let exoticTaken = 0;
    for (const b of boards.values()) {
      for (const o of b.orders) {
        if (!isMudaGood(ctx, o.resource)) continue;
        exoticOrders++;
        if (b.takenBy[o.id]) exoticTaken++;
      }
    }
    let paid = 0n;
    let exoticPaid = 0n;
    for (const d of roadSeen.deliveries.values()) {
      paid += d.paid ?? 0n;
      if (isMudaGood(ctx, d.resource)) exoticPaid += d.paid ?? 0n;
    }
    result.muda = {
      arrivals: muda.arrivals,
      brought: muda.brought,
      sold: muda.sold,
      takings: muda.takings,
      buyers: muda.buyers.size,
      exoticOrders,
      exoticTaken,
      exoticPaidShare: paid > 0n ? Number((exoticPaid * 10_000n) / paid) / 10_000 : 0,
    };
  }
  result.road = roadStats(ctx, state, [...roadSeen.deliveries.values()], botInfo, START, end);
  result.durationMs = performance.now() - started;
  return result;
}
