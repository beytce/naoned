import {
  type Command,
  DAY_MS,
  type Effects,
  MINUTE_MS,
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
import { Bot, PROFILES, type ProfileName } from "./bots.js";
import { MarketView } from "./market.js";
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
}

export const DEFAULT_MIX: Record<ProfileName, number> = {
  producer: 15,
  artisan: 15,
  builder: 8,
  speculator: 5,
  casual: 7,
};

const REGIONS = ["terraferma", "lagoon", "dolomites"];
const START = Date.UTC(2026, 0, 5);

function regionFor(profile: ProfileName, i: number): string {
  if (profile === "artisan") return "terraferma";
  if (profile === "builder") return i % 2 === 0 ? "lagoon" : "dolomites";
  return REGIONS[i % 3] ?? "terraferma";
}

export function createBots(options: SimulationOptions, rng: Rng): Bot[] {
  const bots: Bot[] = [];
  let n = 0;
  for (const [name, count] of Object.entries(options.mix) as [ProfileName, number][]) {
    for (let i = 0; i < count; i++) {
      const joinAt = START + Math.floor(rng.next() * DAY_MS);
      bots.push(new Bot(`${name}-${++n}`, PROFILES[name], regionFor(name, i), joinAt));
    }
  }
  const names = Object.keys(options.mix) as ProfileName[];
  for (let i = 0; i < options.lateJoiners; i++) {
    const name = rng.pick(names.filter((p) => p !== "speculator"));
    const joinAt = START + 7 * DAY_MS + Math.floor(rng.next() * 14 * DAY_MS);
    bots.push(new Bot(`late-${name}-${++n}`, PROFILES[name], regionFor(name, i), joinAt));
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
  result.durationMs = performance.now() - started;
  return result;
}
