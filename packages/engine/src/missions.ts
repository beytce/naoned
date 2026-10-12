import { addVehicle } from "./deliveries.js";
import {
  DAY_MS,
  type PlayerId,
  SOURCE_ACCOUNT,
  type WorldContext,
  type WorldState,
  cashAccount,
} from "./state.js";
import { type Tx, addStock, emit, fail, transfer } from "./tx.js";

export interface MissionView {
  id: string;
  day: number;
  count: number;
  progress: number;
  unlocked: boolean;
  /** Opens at this time (joining + day). */
  opensAt: number;
  done: boolean;
  claimed: boolean;
  reward: { goods: Record<string, number>; ducats: bigint; vehicles: string[] };
}

/** Counts this command's events towards each player's missions. */
export function trackMissions(tx: Tx): void {
  const defs = tx.ctx.settings.missions;
  if (defs.length === 0) return;
  for (const e of tx.fx.events) {
    if (!e.playerId || !tx.s.players[e.playerId]) continue;
    for (const m of defs) {
      if (m.event !== e.type) continue;
      const data = e.data ?? {};
      if (!Object.entries(m.filter).every(([k, v]) => data[k] === v)) continue;
      tx.s.missions ??= {};
      tx.s.missions[e.playerId] ??= { progress: {}, claimed: [] };
      const mine = tx.s.missions[e.playerId];
      if (mine) mine.progress[m.id] = (mine.progress[m.id] ?? 0) + 1;
    }
  }
}

export function missionsFor(
  ctx: WorldContext,
  state: WorldState,
  playerId: PlayerId,
  now: number,
): MissionView[] {
  const player = state.players[playerId];
  if (!player) return [];
  const mine = state.missions?.[playerId];
  return ctx.settings.missions.map((m) => {
    const progress = Math.min(m.count, mine?.progress[m.id] ?? 0);
    const opensAt = player.joinedAt + m.day * DAY_MS;
    return {
      id: m.id,
      day: m.day,
      count: m.count,
      progress,
      unlocked: now >= opensAt,
      opensAt,
      done: progress >= m.count,
      claimed: mine?.claimed.includes(m.id) ?? false,
      reward: { goods: m.reward.goods, ducats: m.reward.ducats, vehicles: m.reward.vehicles },
    };
  });
}

/** Pays a finished mission's reward: goods through the stock journal, ducats through the ledger. */
export function claimMission(tx: Tx, playerId: PlayerId, missionId: string): void {
  const def = tx.ctx.settings.missions.find((m) => m.id === missionId);
  if (!def) fail("unknown_mission");
  const player = tx.s.players[playerId];
  if (!player) fail("unknown_player");
  if (tx.now < player.joinedAt + def.day * DAY_MS) fail("mission_locked");
  const mine = tx.s.missions?.[playerId];
  if ((mine?.progress[missionId] ?? 0) < def.count) fail("mission_not_done");
  if (!mine || mine.claimed.includes(missionId)) fail("mission_claimed");
  mine.claimed.push(missionId);
  for (const [resource, qty] of Object.entries(def.reward.goods)) {
    if (qty > 0) addStock(tx, playerId, resource, qty, "mission_reward", missionId);
  }
  if (def.reward.ducats > 0n) {
    transfer(
      tx,
      SOURCE_ACCOUNT,
      cashAccount(playerId),
      def.reward.ducats,
      "mission_reward",
      missionId,
    );
  }
  for (const type of def.reward.vehicles) {
    const owned = Object.values(tx.s.vehicles ?? {}).filter((v) => v.playerId === playerId);
    if (owned.length < tx.ctx.settings.deliveries.maxVehicles) addVehicle(tx, playerId, type);
  }
  emit(tx, "mission_claimed", playerId, { mission: missionId });
}
