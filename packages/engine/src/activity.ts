import { draw } from "./draw.js";
import { type Deniers, applyBpsFloor } from "./money.js";
import {
  DAY_MS,
  type PlayerId,
  SOURCE_ACCOUNT,
  type WorldContext,
  type WorldState,
  activePlayerCount,
  cashAccount,
  dayIndex,
  seasonEnd,
} from "./state.js";
import { type Tx, addStock, emit, fail, removeStock, transfer } from "./tx.js";

const MINUTE_MS = 60_000;

export interface Criee {
  /** Running number since the start of the season. */
  index: number;
  city: string;
  resource: string;
  premiumBps: number;
  startsAt: number;
  endsAt: number;
}

/** The k-th Criée of day `day`: hour, city, resource and premium drawn from the world's seed. */
function crieeAt(ctx: WorldContext, day: number, k: number): Criee | null {
  const cfg = ctx.settings.criees;
  if (cfg.perDay === 0 || cfg.resources.length === 0) return null;
  // The day's window is split in equal slots, one Criée somewhere in each: never two at once.
  const windowMs = Math.max(0, cfg.toHour - cfg.fromHour) * 60 * MINUTE_MS;
  const slot = Math.floor(windowMs / cfg.perDay);
  const length = cfg.minutes * MINUTE_MS;
  if (slot < length) return null;
  const offset = draw(ctx, `criee:${day}:${k}:at`) % (slot - length + 1);
  const startsAt = ctx.startAt + day * DAY_MS + cfg.fromHour * 60 * MINUTE_MS + k * slot + offset;
  if (startsAt + length > seasonEnd(ctx)) return null;
  const resource = cfg.resources[draw(ctx, `criee:${day}:${k}:res`) % cfg.resources.length] ?? "";
  const cities = ctx.theme.cities.filter((c) => ctx.settings.cities[c.code]?.[resource]);
  const city = cities[draw(ctx, `criee:${day}:${k}:city`) % Math.max(1, cities.length)]?.code;
  const span = cfg.maxPremiumBps - cfg.minPremiumBps;
  const premiumBps =
    cfg.minPremiumBps + (span > 0 ? draw(ctx, `criee:${day}:${k}:p`) % (span + 1) : 0);
  return {
    index: day * cfg.perDay + k,
    city: city ?? ctx.theme.cities[0]?.code ?? "",
    resource,
    premiumBps,
    startsAt,
    endsAt: startsAt + length,
  };
}

/** The Criée under way at `at`, if any. */
export function currentCriee(ctx: WorldContext, at: number): Criee | null {
  const day = dayIndex(ctx, at);
  for (let k = 0; k < ctx.settings.criees.perDay; k++) {
    const c = crieeAt(ctx, day, k);
    if (c && at >= c.startsAt && at < c.endsAt) return c;
  }
  return null;
}

/**
 * The next Criée to start after `at`. For the engine and tests: players are only told about a
 * Criée once it has started (they have to be there).
 */
export function nextCriee(ctx: WorldContext, at: number): Criee | null {
  const first = Math.max(0, dayIndex(ctx, at));
  for (let day = first; day < first + 2; day++) {
    for (let k = 0; k < ctx.settings.criees.perDay; k++) {
      const c = crieeAt(ctx, day, k);
      if (c && c.startsAt > at) return c;
    }
  }
  return null;
}

/** Units the Criée still buys: from this merchant, and in all. */
export function crieeRoom(
  ctx: WorldContext,
  state: WorldState,
  criee: Criee,
  playerId: PlayerId,
  now: number,
): { mine: number; total: number } {
  const cfg = ctx.settings.criees;
  const sold = state.criees?.[criee.index];
  const total = Math.max(cfg.minTotal, cfg.perActivePlayer * activePlayerCount(ctx, state, now));
  return {
    mine: Math.max(0, cfg.perPlayer - (sold?.byPlayer[playerId] ?? 0)),
    total: Math.max(0, total - (sold?.sold ?? 0)),
  };
}

export function crieePrice(ctx: WorldContext, criee: Criee): Deniers {
  return applyBpsFloor(
    ctx.settings.referencePrices[criee.resource] ?? 0n,
    10_000 + criee.premiumBps,
  );
}

/** Sells to the Criée under way: the city pays the premium price, like a city sale. */
export function sellToCriee(tx: Tx, playerId: PlayerId, quantity: number): void {
  if (!Number.isInteger(quantity) || quantity <= 0) fail("invalid_quantity");
  const criee = currentCriee(tx.ctx, tx.now);
  if (!criee) fail("no_criee");
  const room = crieeRoom(tx.ctx, tx.s, criee, playerId, tx.now);
  if (quantity > room.mine) fail("criee_quota");
  if (quantity > room.total) fail("criee_sold_out");
  const ref = `criee:${criee.index}`;
  const amount = crieePrice(tx.ctx, criee) * BigInt(quantity);
  removeStock(tx, playerId, criee.resource, quantity, "criee_sale", ref);
  transfer(tx, SOURCE_ACCOUNT, cashAccount(playerId), amount, "criee_sale", ref);
  tx.s.criees ??= {};
  tx.s.criees[criee.index] ??= { sold: 0, byPlayer: {} };
  const sold = tx.s.criees[criee.index];
  if (!sold) return;
  sold.sold += quantity;
  sold.byPlayer[playerId] = (sold.byPlayer[playerId] ?? 0) + quantity;
  emit(tx, "criee_sale", playerId, {
    city: criee.city,
    resource: criee.resource,
    quantity,
    amount: amount.toString(),
  });
}

// ——— Tasks of the day ———

/** Today's tasks: drawn from the pool, the same for every merchant. */
function tasksOfDay(ctx: WorldContext, day: number) {
  const { tasks, perDay } = ctx.settings.daily;
  const order = tasks
    .map((t) => ({ t, key: draw(ctx, `daily:${day}:${t.id}`) }))
    .sort((a, b) => a.key - b.key)
    .map((x) => x.t);
  return order.slice(0, perDay);
}

function dailyState(tx: Tx, playerId: PlayerId) {
  const day = dayIndex(tx.ctx, tx.now);
  tx.s.daily ??= {};
  tx.s.daily[playerId] ??= {
    day,
    progress: {},
    claimed: [],
    chest: false,
    streak: 0,
    lastChestDay: -2,
    best: 0,
  };
  const mine = tx.s.daily[playerId];
  if (!mine) fail("unknown_player");
  if (mine.day !== day) {
    mine.day = day;
    mine.progress = {};
    mine.claimed = [];
    mine.chest = false;
  }
  return mine;
}

/** Counts this command's events towards today's tasks. */
export function trackDaily(tx: Tx): void {
  if (tx.ctx.settings.daily.perDay === 0) return;
  const today = tasksOfDay(tx.ctx, dayIndex(tx.ctx, tx.now));
  for (const e of tx.fx.events) {
    if (!e.playerId || !tx.s.players[e.playerId]) continue;
    const data = e.data ?? {};
    for (const t of today) {
      if (t.event !== e.type) continue;
      if (!Object.entries(t.filter).every(([k, v]) => data[k] === v)) continue;
      const mine = dailyState(tx, e.playerId);
      mine.progress[t.id] = (mine.progress[t.id] ?? 0) + 1;
    }
  }
}

/** Value of the chest after `streak` days in a row (the first day counts 1). */
export function chestValue(ctx: WorldContext, streak: number): Deniers {
  const { chest } = ctx.settings.daily;
  const days = Math.min(Math.max(1, streak), chest.maxStreak);
  return chest.ducats + chest.perStreakDay * BigInt(days - 1);
}

export function dailyFor(ctx: WorldContext, state: WorldState, playerId: PlayerId, now: number) {
  const day = dayIndex(ctx, now);
  const saved = state.daily?.[playerId];
  const mine = saved && saved.day === day ? saved : undefined;
  // The streak still counts if yesterday's chest was opened (or today's already is).
  const streak = saved && saved.lastChestDay >= day - 1 ? saved.streak : 0;
  return {
    day,
    tasks: tasksOfDay(ctx, day).map((t) => {
      const progress = Math.min(t.count, mine?.progress[t.id] ?? 0);
      return {
        id: t.id,
        event: t.event,
        count: t.count,
        progress,
        done: progress >= t.count,
        claimed: mine?.claimed.includes(t.id) ?? false,
        reward: { goods: t.reward.goods, ducats: t.reward.ducats },
      };
    }),
    chestClaimed: mine?.chest ?? false,
    /** What today's chest holds if opened (the streak goes on). */
    chest: chestValue(ctx, mine?.chest ? streak : streak + 1),
    streak,
    best: saved?.best ?? 0,
    /** Next reset of the tasks. */
    resetsAt: ctx.startAt + (day + 1) * DAY_MS,
  };
}

/** Pays a finished task; the last one of the day opens the chest. */
export function claimDaily(tx: Tx, playerId: PlayerId, taskId: string): void {
  const today = tasksOfDay(tx.ctx, dayIndex(tx.ctx, tx.now));
  const task = today.find((t) => t.id === taskId);
  if (!task) fail("unknown_daily");
  const mine = dailyState(tx, playerId);
  if ((mine.progress[taskId] ?? 0) < task.count) fail("daily_not_done");
  if (mine.claimed.includes(taskId)) fail("daily_claimed");
  mine.claimed.push(taskId);
  const ref = `daily:${mine.day}:${taskId}`;
  for (const [resource, qty] of Object.entries(task.reward.goods)) {
    if (qty > 0) addStock(tx, playerId, resource, qty, "daily_reward", ref);
  }
  if (task.reward.ducats > 0n) {
    transfer(tx, SOURCE_ACCOUNT, cashAccount(playerId), task.reward.ducats, "daily_reward", ref);
  }
  emit(tx, "daily_claimed", playerId, { task: taskId });

  if (!mine.chest && today.every((t) => mine.claimed.includes(t.id))) {
    mine.streak = mine.lastChestDay === mine.day - 1 ? mine.streak + 1 : 1;
    mine.lastChestDay = mine.day;
    mine.best = Math.max(mine.best, mine.streak);
    mine.chest = true;
    const value = chestValue(tx.ctx, mine.streak);
    transfer(tx, SOURCE_ACCOUNT, cashAccount(playerId), value, "daily_chest", `chest:${mine.day}`);
    emit(tx, "daily_chest", playerId, { streak: mine.streak, amount: value.toString() });
  }
}
