import { draw } from "./draw.js";
import type { Deniers } from "./money.js";
import { readyFleet } from "./ships.js";
import {
  DAY_MS,
  type Expedition,
  HOUR_MS,
  type PlayerId,
  type Raid,
  SINK_ACCOUNT,
  type WorldContext,
  type WorldState,
  cashAccount,
} from "./state.js";
import { type Tx, addStock, emit, fail, nextId, removeStock, transfer } from "./tx.js";
import { netWorth } from "./valuation.js";

/** When a convoy crosses the corsairs on its route: half-way. */
export function crossingAt(e: Expedition): number {
  return e.departAt + Math.floor((e.returnAt - e.departAt) / 2);
}

/** Routes where privateers are cruising now (who they are stays hidden). */
export function watchedRoutes(state: WorldState, now: number): string[] {
  const routes = new Set<string>();
  for (const r of Object.values(state.raids ?? {})) {
    if (r.outcome === "cruising" && !r.beaten && r.startAt <= now && now < r.endAt)
      routes.add(r.route);
  }
  return [...routes];
}

export function commissionPrivateers(
  tx: Tx,
  playerId: PlayerId,
  route: string,
  ships: string[],
): Raid {
  const cfg = tx.ctx.settings.privateers;
  if (cfg.maxActive === 0) fail("no_privateers");
  if (!tx.ctx.settings.expeditions.destinations[route]) fail("unknown_destination");
  const cruising = Object.values(tx.s.raids ?? {}).filter(
    (r) => r.playerId === playerId && r.outcome === "cruising",
  );
  if (cruising.length >= cfg.maxActive) fail("too_many_raids");
  const fleet = readyFleet(tx, playerId, ships);
  let hold: Deniers = 0n;
  for (const id of fleet.ships) {
    const type = tx.s.ships?.[id]?.type ?? "";
    hold += tx.ctx.settings.ships.types[type]?.holdValue ?? 0n;
  }

  const id = nextId(tx, "r");
  transfer(tx, cashAccount(playerId), SINK_ACCOUNT, cfg.letterFee, "privateer_letter", id);
  for (const [resource, qty] of Object.entries(cfg.provisions)) {
    removeStock(tx, playerId, resource, qty * fleet.ships.length, "privateer_out", id);
  }
  const raid: Raid = {
    id,
    playerId,
    route,
    ships: fleet.ships,
    attack: fleet.defense,
    hold,
    startAt: tx.now,
    endAt: tx.now + cfg.hours * HOUR_MS,
    outcome: "cruising",
    beaten: false,
    booty: {},
    hits: [],
  };
  tx.s.raids ??= {};
  tx.s.raids[id] = raid;
  emit(tx, "privateers_commissioned", playerId, { raid: id, route });
  return raid;
}

function referenceValue(ctx: WorldContext, goods: Record<string, number>): Deniers {
  let v = 0n;
  for (const [r, q] of Object.entries(goods))
    v += (ctx.settings.referencePrices[r] ?? 0n) * BigInt(q);
  return v;
}

/** Can these corsairs board this convoy? The safeguards, checked at the crossing. */
function fairGame(tx: Tx, raid: Raid, e: Expedition, at: number): boolean {
  const cfg = tx.ctx.settings.privateers;
  const victim = tx.s.players[e.playerId];
  if (!victim || raid.playerId === e.playerId || raid.route !== e.destination) return false;
  if (raid.beaten || raid.startAt > at || at >= raid.endAt) return false;
  if (at < victim.joinedAt + cfg.newcomerDays * DAY_MS) return false;
  const last = tx.s.plunderedAt?.[e.playerId];
  if (last !== undefined && at < last + cfg.cooldownHours * HOUR_MS) return false;
  const state = tx.s as WorldState;
  const theirs = netWorth(tx.ctx, state, e.playerId, at).total;
  const ours = netWorth(tx.ctx, state, raid.playerId, at).total;
  return theirs * 10_000n >= ours * BigInt(cfg.minTargetWorthBps);
}

/** Share of each cargo line taken, within the corsairs' remaining hold. */
function plunder(tx: Tx, raid: Raid, e: Expedition): Record<string, number> {
  const prices = tx.ctx.settings.referencePrices;
  let room = raid.hold - referenceValue(tx.ctx, raid.booty);
  const taken: Record<string, number> = {};
  for (const [resource, qty] of Object.entries(e.cargo)) {
    const unit = prices[resource] ?? 0n;
    let q = Math.floor((qty * tx.ctx.settings.privateers.shareBps) / 10_000);
    if (unit > 0n) q = Math.min(q, Number(room / unit));
    if (q <= 0) continue;
    taken[resource] = q;
    room -= unit * BigInt(q);
  }
  return taken;
}

/**
 * Convoys reach mid-voyage; privateers cruising their route then may board them. Resolved in
 * crossing order, at the latest when the convoy or the corsairs come home. One successful
 * boarding per convoy; corsairs that are repelled hunt no more.
 */
export function resolveCrossings(tx: Tx): void {
  const due = Object.values(tx.s.expeditions ?? {})
    .filter((e) => e.outcome === "pending" && !e.crossed && crossingAt(e as Expedition) <= tx.now)
    .sort(
      (a, b) => crossingAt(a as Expedition) - crossingAt(b as Expedition) || (a.id < b.id ? -1 : 1),
    );
  if (due.length === 0) return;
  const cfg = tx.ctx.settings.privateers;
  for (const e of due) {
    e.crossed = true;
    const at = crossingAt(e as Expedition);
    const raids = Object.values(tx.s.raids ?? {})
      .filter((r) => r.outcome === "cruising")
      .sort((a, b) => a.startAt - b.startAt || (a.id < b.id ? -1 : 1));
    for (const raid of raids) {
      if (!fairGame(tx, raid as Raid, e as Expedition, at)) continue;
      const taken = plunder(tx, raid as Raid, e as Expedition);
      if (Object.keys(taken).length === 0) continue;
      const defense = e.defense ?? (e.escort ? 3 : 1);
      const odds = Math.floor((raid.attack * 10_000) / (raid.attack + defense));
      const chanceBps = Math.min(cfg.maxChanceBps, Math.max(cfg.minChanceBps, odds));
      const success = draw(tx.ctx, `raid:${raid.id}:${e.id}`) % 10_000 < chanceBps;
      raid.hits.push({
        expeditionId: e.id,
        victimId: e.playerId,
        at,
        resolvedAt: tx.now,
        chanceBps,
        success,
        taken: success ? taken : {},
      });
      if (!success) {
        raid.beaten = true;
        for (const id of raid.ships) {
          const ship = tx.s.ships?.[id];
          if (ship) ship.damaged = true;
        }
        emit(tx, "raid_failed", raid.playerId, { raid: raid.id, victim: e.playerId });
        emit(tx, "convoy_defended", e.playerId, { expedition: e.id, raider: raid.playerId });
        continue;
      }
      const before = referenceValue(tx.ctx, e.cargo);
      for (const [resource, q] of Object.entries(taken)) {
        e.cargo[resource] = (e.cargo[resource] ?? 0) - q;
        raid.booty[resource] = (raid.booty[resource] ?? 0) + q;
      }
      const after = referenceValue(tx.ctx, e.cargo);
      if (before > 0n) e.cargoValue = (e.cargoValue * after) / before;
      const merchant = e.ships?.[0] ? tx.s.ships?.[e.ships[0]] : undefined;
      if (merchant) merchant.damaged = true;
      tx.s.plunderedAt ??= {};
      tx.s.plunderedAt[e.playerId] = at;
      emit(tx, "raid_success", raid.playerId, { raid: raid.id, victim: e.playerId, taken });
      emit(tx, "convoy_raided", e.playerId, {
        expedition: e.id,
        raider: raid.playerId,
        taken,
      });
      break;
    }
  }
}

/** The corsairs come home: the booty enters the player's stock. */
export function collectRaid(tx: Tx, playerId: PlayerId, raidId: string): void {
  const raid = tx.s.raids?.[raidId];
  if (!raid || raid.outcome !== "cruising") fail("unknown_raid");
  if (raid.playerId !== playerId) fail("not_owner");
  if (tx.now < raid.endAt) fail("raid_not_back");
  resolveCrossings(tx);
  for (const [resource, qty] of Object.entries(raid.booty)) {
    if (qty > 0) addStock(tx, playerId, resource, qty, "plunder", raid.id);
  }
  raid.outcome = "returned";
  emit(tx, "privateers_returned", playerId, { raid: raid.id, booty: { ...raid.booty } });
}
