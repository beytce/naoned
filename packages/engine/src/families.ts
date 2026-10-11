import { draw } from "./draw.js";
import { applyBpsFloor } from "./money.js";
import {
  DAY_MS,
  type FamiliesState,
  type PlayerId,
  SINK_ACCOUNT,
  SOURCE_ACCOUNT,
  type WorldContext,
  type WorldState,
  cashAccount,
  dayIndex,
  isActive,
  seasonEnd,
} from "./state.js";
import { type Tx, emit, fail, removeStock, transfer } from "./tx.js";
import { seasonWeeks, weekIndex } from "./weekly.js";

/**
 * The patrician families. Each merchant pledges allegiance to one for the season; members raise
 * their family together through its orders and their patronage, and every week the family with the
 * most influence per active member holds power. Family orders replace one of the Doge's (same
 * budget of money created); patronage destroys ducats.
 */

export interface FamilyOrder {
  id: string;
  day: number;
  family: string;
  resource: string;
  quantity: number;
  unitPrice: bigint;
  expiresAt: number;
}

export interface FamilyStanding {
  family: string;
  /** Merchants who pledged allegiance. */
  members: number;
  /** Members counted in the score: active, or with influence this week. */
  activeMembers: number;
  /** Influence of the week, each member capped. */
  influence: number;
  /** Influence per counted member, in hundredths (at least `minMembers` counted). */
  score: number;
  /** Member with the most influence this week, if any. */
  champion: PlayerId | null;
  /** In power this week: its score is lowered by the contumacia. */
  incumbent: boolean;
}

function emptyFamilies(week: number): FamiliesState {
  return {
    week,
    members: {},
    weekInfluence: {},
    seasonInfluence: {},
    ordersDone: {},
    patronage: {},
    inPower: null,
  };
}

function families(tx: Tx): FamiliesState {
  tx.s.families ??= emptyFamilies(weekIndex(tx.ctx, tx.now));
  return tx.s.families;
}

function house(ctx: WorldContext, code: string) {
  return ctx.settings.families.houses.find((h) => h.code === code);
}

/** When a merchant may pledge allegiance (joining + `openDay`). */
export function familiesOpenAt(ctx: WorldContext, state: WorldState, playerId: PlayerId): number {
  const joined = state.players[playerId]?.joinedAt ?? ctx.startAt;
  return joined + ctx.settings.families.openDay * DAY_MS;
}

/** Today's family orders of a merchant (none without a family). */
export function familyOrdersFor(
  ctx: WorldContext,
  state: WorldState,
  playerId: PlayerId,
  day: number,
): FamilyOrder[] {
  const code = state.families?.members[playerId];
  const def = code ? house(ctx, code) : undefined;
  if (!code || !def) return [];
  const resources = Object.keys(def.quantities);
  if (resources.length === 0) return [];
  const { premiumBps } = ctx.settings.contracts;
  const power = state.families?.inPower === code ? ctx.settings.families.powerPremiumBps : 0;
  const out: FamilyOrder[] = [];
  for (let i = 0; i < ctx.settings.families.ordersPerDay; i++) {
    const resource =
      resources[draw(ctx, `family-order:${playerId}:${day}:${i}`) % resources.length];
    if (!resource) continue;
    out.push({
      id: `${day}:f${i}`,
      day,
      family: code,
      resource,
      quantity: def.quantities[resource] ?? 0,
      unitPrice: applyBpsFloor(
        ctx.settings.referencePrices[resource] ?? 0n,
        10_000 + premiumBps + power,
      ),
      expiresAt: ctx.startAt + (day + 1) * DAY_MS,
    });
  }
  return out;
}

export function familyOrdersDone(state: WorldState, playerId: PlayerId, day: number): string[] {
  const entry = state.families?.ordersDone[playerId];
  return entry && entry.day === day ? entry.ids : [];
}

/** Points of patronage a merchant may still give today. */
export function patronageLeft(
  ctx: WorldContext,
  state: WorldState,
  playerId: PlayerId,
  day: number,
): number {
  const entry = state.families?.patronage[playerId];
  const given = entry && entry.day === day ? entry.points : 0;
  return Math.max(0, ctx.settings.families.patronageMaxPerDay - given);
}

export function addInfluence(tx: Tx, playerId: PlayerId, points: number): void {
  const f = families(tx);
  f.weekInfluence[playerId] = (f.weekInfluence[playerId] ?? 0) + points;
  f.seasonInfluence[playerId] = (f.seasonInfluence[playerId] ?? 0) + points;
}

function memberFamily(tx: Tx, playerId: PlayerId): string {
  const code = tx.s.families?.members[playerId];
  if (!code) fail("no_family");
  return code;
}

export function joinFamily(tx: Tx, playerId: PlayerId, family: string): void {
  if (!house(tx.ctx, family)) fail("unknown_family");
  if (tx.now < familiesOpenAt(tx.ctx, tx.s as WorldState, playerId)) fail("family_locked");
  const f = families(tx);
  if (f.members[playerId]) fail("family_chosen");
  f.members[playerId] = family;
  emit(tx, "family_joined", playerId, { family });
}

export function fulfillFamilyOrder(tx: Tx, playerId: PlayerId, orderId: string): void {
  const family = memberFamily(tx, playerId);
  const today = dayIndex(tx.ctx, tx.now);
  const [dayText] = orderId.split(":");
  if (Number(dayText) !== today) fail("contract_expired");
  const order = familyOrdersFor(tx.ctx, tx.s as WorldState, playerId, today).find(
    (o) => o.id === orderId,
  );
  if (!order) fail("unknown_contract");
  const done = familyOrdersDone(tx.s as WorldState, playerId, today);
  if (done.includes(orderId)) fail("contract_done");
  // With deliveries, every family order goes by road.
  if (tx.ctx.settings.deliveries.ordersPerDay.max > 0) fail("city_sales_closed");

  removeStock(tx, playerId, order.resource, order.quantity, "family_order", orderId);
  transfer(
    tx,
    SOURCE_ACCOUNT,
    cashAccount(playerId),
    order.unitPrice * BigInt(order.quantity),
    "family_order_reward",
    orderId,
  );
  families(tx).ordersDone[playerId] = { day: today, ids: [...done, orderId] };
  const influence = tx.ctx.settings.families.orderInfluence;
  addInfluence(tx, playerId, influence);
  emit(tx, "family_order_fulfilled", playerId, {
    family,
    order: orderId,
    resource: order.resource,
    influence,
  });
}

/** Gives ducats to one's family (a chapel, a fresco, a feast): they leave the game. */
export function patronize(tx: Tx, playerId: PlayerId, points: number): void {
  const family = memberFamily(tx, playerId);
  if (!Number.isInteger(points) || points <= 0) fail("invalid_quantity");
  const today = dayIndex(tx.ctx, tx.now);
  if (points > patronageLeft(tx.ctx, tx.s as WorldState, playerId, today)) fail("patronage_limit");
  const amount = tx.ctx.settings.families.patronageUnit * BigInt(points);
  transfer(tx, cashAccount(playerId), SINK_ACCOUNT, amount, "patronage", family);
  const f = families(tx);
  const entry = f.patronage[playerId];
  f.patronage[playerId] = {
    day: today,
    points: (entry && entry.day === today ? entry.points : 0) + points,
  };
  addInfluence(tx, playerId, points);
  emit(tx, "patronage", playerId, { family, points, amount: amount.toString() });
}

/** Live ranking of the families for the week under way, best first. */
export function familyStandings(
  ctx: WorldContext,
  state: WorldState,
  now: number,
): FamilyStanding[] {
  const { houses, weeklyCapPerMember, minMembers, incumbentHandicapBps } = ctx.settings.families;
  const f = state.families;
  const table = houses.map((h) => {
    let members = 0;
    let active = 0;
    let influence = 0;
    let champion: PlayerId | null = null;
    let best = 0;
    for (const [playerId, code] of Object.entries(f?.members ?? {})) {
      if (code !== h.code) continue;
      const player = state.players[playerId];
      if (!player) continue;
      members++;
      const own = f?.weekInfluence[playerId] ?? 0;
      if (own > 0 || isActive(ctx, player, now)) active++;
      influence += Math.min(own, weeklyCapPerMember);
      if (own > best) {
        best = own;
        champion = playerId;
      }
    }
    const incumbent = f?.inPower === h.code;
    const weight = 10_000 - (incumbent ? incumbentHandicapBps : 0);
    const score = Math.floor((influence * 100 * weight) / 10_000 / Math.max(active, minMembers));
    return {
      family: h.code,
      members,
      activeMembers: active,
      influence,
      score,
      champion,
      incumbent,
    };
  });
  return table.sort(
    (a, b) => b.score - a.score || b.influence - a.influence || a.family.localeCompare(b.family),
  );
}

/**
 * Scheduled: on the first tick after a week boundary, publishes the families' week (event
 * `family_week_closed`), hands power to the winner and starts counting afresh.
 */
export function closeFamilyWeek(tx: Tx): void {
  if (tx.ctx.settings.families.houses.length === 0) return;
  const week = tx.now >= seasonEnd(tx.ctx) ? seasonWeeks(tx.ctx) : weekIndex(tx.ctx, tx.now);
  const f = families(tx);
  if (f.week >= week) return;
  const standings = familyStandings(tx.ctx, tx.s as WorldState, tx.now);
  const top = standings[0];
  const winner = top && top.influence > 0 ? top.family : null;
  emit(tx, "family_week_closed", undefined, {
    week: f.week,
    winner,
    standings: standings.map((s) => ({ ...s })),
  });
  f.week = week;
  f.weekInfluence = {};
  f.inPower = winner;
}

/** A merchant who starts over leaves their family. */
export function leaveFamilies(tx: Tx, playerId: PlayerId): void {
  const f = tx.s.families;
  if (!f) return;
  delete f.members[playerId];
  delete f.weekInfluence[playerId];
  delete f.seasonInfluence[playerId];
  delete f.ordersDone[playerId];
  delete f.patronage[playerId];
}
