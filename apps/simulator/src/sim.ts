import {
  Bot,
  type Command,
  DAY_MS,
  type Effects,
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
  emptyTotals,
  parseSettings,
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

export interface SimulationOptions {
  settings: WorldSettingsInput;
  seed: number;
  days: number;
  stepMinutes: number;
  mix: Record<ProfileName, number>;
  lateJoiners: number;
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
    const joinAt = START + 7 * DAY_MS + Math.floor(rng.next() * 14 * DAY_MS);
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
  let now = START;
  const run = (cmd: Command): boolean => {
    const res = decide(ctx, state, cmd, now);
    if (!res.ok) {
      result.commands.rejected++;
      const key = `${cmd.type}:${res.error}`;
      result.commands.rejectedBy[key] = (result.commands.rejectedBy[key] ?? 0) + 1;
      return false;
    }
    result.commands.accepted++;
    state = res.state;
    accumulate(totals, res.effects);
    for (const t of res.effects.trades) if (raw.has(t.resource)) rawBuyers.add(t.buyerId);
    recordFlows(flows, res.effects);
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

  const schedule = new Map<Bot, number[]>();
  const step = options.stepMinutes * MINUTE_MS;
  const end = START + options.days * DAY_MS;
  const botInfo = bots.map((b) => ({ id: b.id, profile: b.profile.name, region: b.region }));
  let currentDay = 0;

  const closeDay = () => {
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
    for (const bot of bots) {
      if (bot.churned) continue;
      if (!state.players[bot.id]) {
        if (bot.joinAt <= now) run({ type: "join", playerId: bot.id, region: bot.region });
        if (!state.players[bot.id]) continue;
      }
      const times = schedule.get(bot) ?? [];
      while (times.length > 0 && (times[0] ?? Number.POSITIVE_INFINITY) <= now) {
        times.shift();
        bot.play(session);
      }
    }
    for (const v of checkInvariants(state, totals)) {
      if (result.violations.length < 50)
        result.violations.push({ at: now, detail: `#${v.invariant} ${v.detail}` });
    }
  }
  closeDay();
  result.finalState = state;
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
  };
  result.durationMs = performance.now() - started;
  return result;
}
