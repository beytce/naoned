import { arriveNow, resolveDeliveries } from "./deliveries.js";
import { draw } from "./draw.js";
import type { Deniers } from "./money.js";
import {
  type Delivery,
  HOUR_MS,
  MINUTE_MS,
  type PlayerId,
  type WorldContext,
  type WorldState,
  dayIndex,
} from "./state.js";
import { findRegion } from "./theme.js";
import { type Tx, emit, fail } from "./tx.js";

/**
 * The house between seasons (see docs/plan-progression.md): its fortune starts afresh every
 * month, but it keeps the privileges (`patents`) it bought with Influence, which only ever add
 * something new (the gilded name, later the Levant, Lombardy…), never more yield. Influence is earned each week by
 * net sales and by the families' campaign, each capped; the server keeps it from season to season.
 */

/** Whether the house holds this patent and the world knows it. */
export function hasPatent(
  ctx: WorldContext,
  state: WorldState,
  playerId: PlayerId,
  code: string,
): boolean {
  if (!ctx.settings.house?.patents[code]) return false;
  return state.players[playerId]?.patents?.includes(code) ?? false;
}

/** A patent the house bought (the server checked and took its price): it serves at once. */
export function grantPatent(tx: Tx, playerId: PlayerId, patent: string): void {
  const player = tx.s.players[playerId];
  if (!player) fail("unknown_player");
  if (!tx.ctx.settings.house?.patents[patent]) fail("unknown_patent");
  if (player.patents?.includes(patent)) return;
  player.patents = [...(player.patents ?? []), patent];
  emit(tx, "patent_granted", playerId, { patent });
}

/** At the close of the week: Influence for the net sales of the week (`gain`, in deniers). */
export function commerceInfluence(
  tx: Tx,
  week: number,
  gains: { playerId: PlayerId; gain: Deniers }[],
): void {
  const cfg = tx.ctx.settings.house?.influence.commerce;
  if (!cfg) return;
  const per = BigInt(cfg.ducatsPerPoint) * 100n;
  for (const { playerId, gain } of [...gains].sort((a, b) => (a.playerId < b.playerId ? -1 : 1))) {
    const amount = gain > 0n ? Math.min(cfg.weeklyCap, Number(gain / per)) : 0;
    if (amount > 0) emit(tx, "influence_earned", playerId, { source: "commerce", week, amount });
  }
}

/**
 * At the close of the campaign's week: Influence for each member's merit, and a bonus to those
 * of the winning family who earned some.
 */
export function campaignInfluence(
  tx: Tx,
  week: number,
  winner: string | null,
  members: { playerId: PlayerId; family: string; merit: number }[],
): void {
  const cfg = tx.ctx.settings.house?.influence.campaign;
  if (!cfg) return;
  for (const m of [...members].sort((a, b) => (a.playerId < b.playerId ? -1 : 1))) {
    if (m.merit <= 0) continue;
    const bonus = m.family === winner ? cfg.winBonus : 0;
    const amount = Math.min(cfg.weeklyCap, Math.floor(m.merit / cfg.meritPerPoint) + bonus);
    if (amount > 0) {
      emit(tx, "influence_earned", m.playerId, {
        source: "campaign",
        week,
        amount,
        merit: m.merit,
      });
    }
  }
}

/** Days of play a merchant needs to count as a participant of the season. */
export const PARTICIPANT_DAYS = 7;

export type SeasonTier = "doge" | "podium" | "top10" | "elite" | "notable" | "participant" | "none";

/** The tier of a final rank among `people` merchants (the rewards and Influence of the close). */
export function seasonTier(rank: number, people: number, daysPlayed: number): SeasonTier {
  if (rank === 1) return "doge";
  if (rank <= 3) return "podium";
  if (rank <= 10) return "top10";
  if (rank <= Math.ceil(people * 0.1)) return "elite";
  if (rank <= Math.ceil(people * 0.25)) return "notable";
  return daysPlayed >= PARTICIPANT_DAYS ? "participant" : "none";
}

/** Influence the house earns at the season's close for its tier. */
export function seasonInfluence(ctx: WorldContext, tier: string): number {
  return ctx.settings.house?.influence.season[tier] ?? 0;
}

// ——— The house's missions: the Influence of the game ———

/** Index of the missions' board at `now` (a new one every `everyHours`). */
export function missionBoard(ctx: WorldContext, now: number): number {
  const every = ctx.settings.house?.missions?.everyHours ?? 0;
  if (every === 0) return 0;
  return Math.max(0, Math.floor((now - ctx.startAt) / (every * HOUR_MS)));
}

/** The missions of a board, drawn from the pool, the same for every merchant. */
function missionsOf(ctx: WorldContext, board: number) {
  const cfg = ctx.settings.house?.missions;
  if (!cfg) return [];
  return cfg.pool
    .map((m) => ({ m, key: draw(ctx, `house-missions:${board}:${m.id}`) }))
    .sort((a, b) => a.key - b.key)
    .slice(0, cfg.perBoard)
    .map((x) => x.m);
}

function missionState(tx: Tx, playerId: PlayerId) {
  const board = missionBoard(tx.ctx, tx.now);
  tx.s.houseMissions ??= {};
  const saved = tx.s.houseMissions[playerId];
  if (!saved || saved.board !== board) {
    tx.s.houseMissions[playerId] = { board, progress: {}, claimed: [] };
  }
  return tx.s.houseMissions[playerId] as NonNullable<WorldState["houseMissions"]>[string];
}

/** Counts this command's events towards the merchants' missions of the board. */
export function trackHouseMissions(tx: Tx): void {
  const missions = missionsOf(tx.ctx, missionBoard(tx.ctx, tx.now));
  if (missions.length === 0) return;
  for (const e of tx.fx.events) {
    if (!e.playerId || !tx.s.players[e.playerId]) continue;
    const data = e.data ?? {};
    for (const m of missions) {
      if (m.event !== e.type) continue;
      if (!Object.entries(m.filter).every(([k, v]) => data[k] === v)) continue;
      const mine = missionState(tx, e.playerId);
      mine.progress[m.id] = (mine.progress[m.id] ?? 0) + 1;
    }
  }
}

/** The board of missions as the merchant sees it. */
export function houseMissionsFor(
  ctx: WorldContext,
  state: WorldState,
  playerId: PlayerId,
  now: number,
) {
  const board = missionBoard(ctx, now);
  const saved = state.houseMissions?.[playerId];
  const mine = saved && saved.board === board ? saved : undefined;
  const every = (ctx.settings.house?.missions?.everyHours ?? 0) * HOUR_MS;
  return {
    board,
    endsAt: ctx.startAt + (board + 1) * every,
    missions: missionsOf(ctx, board).map((m) => {
      const progress = Math.min(m.count, mine?.progress[m.id] ?? 0);
      return {
        id: m.id,
        event: m.event,
        filter: m.filter,
        count: m.count,
        influence: m.influence,
        progress,
        done: progress >= m.count,
        claimed: mine?.claimed.includes(m.id) ?? false,
      };
    }),
  };
}

/** Pays a mission done: its Influence, which the server keeps from season to season. */
export function claimHouseMission(tx: Tx, playerId: PlayerId, missionId: string): void {
  const board = missionBoard(tx.ctx, tx.now);
  const mission = missionsOf(tx.ctx, board).find((m) => m.id === missionId);
  if (!mission) fail("unknown_mission");
  const mine = missionState(tx, playerId);
  if ((mine.progress[missionId] ?? 0) < mission.count) fail("mission_not_done");
  if (mine.claimed.includes(missionId)) fail("mission_claimed");
  mine.claimed.push(missionId);
  emit(tx, "influence_earned", playerId, {
    source: "mission",
    key: `mission:${board}:${missionId}`,
    amount: mission.influence,
  });
}

// ——— What Influence buys in the world (the server takes the price first) ———

/** What Influence buys and what is left of today's limits (null in a world without it). */
export function houseSpendFor(
  ctx: WorldContext,
  state: WorldState,
  playerId: PlayerId,
  now: number,
) {
  const spend = ctx.settings.house?.spend;
  if (!spend) return null;
  const spent = state.houseSpent?.[playerId];
  const today = spent && spent.day === dayIndex(ctx, now) ? spent : { rushes: 0, troops: 0 };
  return {
    ...spend,
    rushesLeft: Math.max(0, spend.rushPerDay - today.rushes),
    troopsLeft: Math.max(0, spend.troopsPerDay - today.troops),
  };
}

/** Influence a rush costs: a point per `rushMinutesPerPoint` minutes until the vehicle is home. */
export function rushCost(ctx: WorldContext, d: Pick<Delivery, "backAt">, now: number): number {
  const per = ctx.settings.house?.spend?.rushMinutesPerPoint ?? 0;
  if (per === 0) return 0;
  return Math.max(1, Math.ceil(Math.max(0, d.backAt - now) / (per * MINUTE_MS)));
}

/** The delivery arrives now and is paid (if still on its way), and its vehicle is home at once. */
export function rushDelivery(tx: Tx, playerId: PlayerId, deliveryId: string): void {
  const spend = tx.ctx.settings.house?.spend;
  if (!spend) fail("no_patent");
  resolveDeliveries(tx);
  const d = tx.s.deliveries?.[deliveryId];
  if (!d) fail("unknown_delivery_order");
  if (d.playerId !== playerId) fail("not_owner");
  if (d.backAt <= tx.now) fail("not_en_route");
  const today = dayIndex(tx.ctx, tx.now);
  tx.s.houseSpent ??= {};
  const spent = tx.s.houseSpent[playerId];
  const mine = spent && spent.day === today ? spent : { day: today, rushes: 0, troops: 0 };
  if (mine.rushes >= spend.rushPerDay) fail("rush_limit");
  tx.s.houseSpent[playerId] = { ...mine, rushes: mine.rushes + 1 };
  if (d.outcome === "en_route") d.arriveAt = tx.now;
  d.backAt = tx.now;
  const vehicle = tx.s.vehicles?.[d.vehicleId];
  if (vehicle) vehicle.busyUntil = tx.now;
  emit(tx, "delivery_rushed", playerId, { delivery: deliveryId });
  arriveNow(tx, d as Delivery);
}

/** The mastery forgotten: the merchant chooses one again. */
export function resetSpecialty(tx: Tx, playerId: PlayerId): void {
  const player = tx.s.players[playerId];
  if (!player) fail("unknown_player");
  if (!player.specialty) fail("no_specialty");
  player.specialty = undefined;
  emit(tx, "specialty_reset", playerId);
}
