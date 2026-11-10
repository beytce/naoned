import type { PlayerId } from "../../../state.js";
import type { EmpireSettings } from "../../settings.js";
import { RARITIES, type Rarity } from "../settings.js";
import { moveToward, stepLength, stillIn, thinkRome } from "./ai.js";
import { distance } from "./map.js";
import type { Battle, BattleOrder, PlayerUnit, RomeUnit } from "./types.js";

/**
 * The battle's clock (docs/plan-porta.md § 6.2): a fixed step, deterministic. The players' orders
 * come between two steps; each step moves the vehicles, loads the relics, runs Rome's minds, fires
 * every weapon in range, and at the closing loses whatever is still inside. The battle object is
 * changed in place: it lives in the server's memory, never in the base.
 */

const isPlayer = (u: Battle["units"][number]): u is PlayerUnit => u.side === "player";
const isRome = (u: Battle["units"][number]): u is RomeUnit => u.side === "rome";
const rank = (r: Rarity) => RARITIES.indexOf(r);

/** Why an order is refused, or null when it is taken. */
export type OrderRefusal =
  | "battle_over"
  | "unknown_unit"
  | "not_yours"
  | "not_ready"
  | "too_far"
  | "no_weapon";

/** A new order takes back what the vehicle was told before. */
function clearOrders(u: PlayerUnit) {
  u.goal = null;
  u.route = [];
  u.follow = null;
  u.attack = null;
  u.exiting = false;
}

/** A point kept on the map's disc. */
function onDisc(b: Battle, p: { x: number; y: number }) {
  const d = Math.hypot(p.x, p.y);
  const k = d > b.radius ? b.radius / d : 1;
  return { x: p.x * k, y: p.y * k };
}

/** Applies a player's order between two steps. */
export function orderBattle(
  b: Battle,
  playerId: PlayerId,
  order: BattleOrder,
  s?: EmpireSettings,
): OrderRefusal | null {
  if (b.over) return "battle_over";
  const u = b.units.find((x): x is PlayerUnit => isPlayer(x) && x.id === order.unitId);
  if (!u || !stillIn(u)) return "unknown_unit";
  if (u.owner !== playerId) return "not_yours";
  switch (order.type) {
    case "move": {
      clearOrders(u);
      u.goal = onDisc(b, order);
      u.route = (order.via ?? [])
        .slice(0, s?.porta.battle.maxWaypoints ?? 5)
        .map((p) => onDisc(b, p));
      u.loading = null;
      return null;
    }
    case "follow": {
      const leader = b.units.find(
        (x): x is PlayerUnit => isPlayer(x) && x.id === order.leaderId && x.id !== u.id,
      );
      if (!leader || !stillIn(leader) || leader.owner !== playerId) return "unknown_unit";
      clearOrders(u);
      u.follow = leader.id;
      return null;
    }
    case "attack": {
      const target = b.units.find((x): x is RomeUnit => isRome(x) && x.id === order.targetId);
      if (!target || target.dead) return "unknown_unit";
      if (u.weapons.length === 0) return "no_weapon";
      clearOrders(u);
      u.attack = target.id;
      return null;
    }
    case "exit":
      clearOrders(u);
      u.goal = { ...b.gate };
      u.exiting = true;
      u.loading = null;
      return null;
    case "stop":
      clearOrders(u);
      return null;
    case "activate": {
      const a = u.actives.find((x) => x.componentId === order.componentId);
      if (!a) return "unknown_unit";
      if (a.readyAt > b.timeMs) return "not_ready";
      a.until = b.timeMs + a.durationS * 1_000;
      a.readyAt = b.timeMs + a.cooldownS * 1_000;
      if (a.effect === "pavise") {
        u.shield = a.power;
        u.shieldUntil = a.until;
      }
      if (a.effect === "smoke") {
        u.hiddenUntil = a.until;
        // Rome loses it at once.
        for (const r of b.units)
          if (isRome(r) && r.targetId === u.id) {
            r.targetId = null;
            delete r.struck[u.id];
          }
      }
      return null;
    }
    case "leave":
      if (distance(u, b.gate) * 100 > b.gateRadiusCenti) return "too_far";
      leave(b, u);
      return null;
  }
}

function leave(b: Battle, u: PlayerUnit) {
  u.outcome = "exited";
  clearOrders(u);
  u.loading = null;
  b.events.push({ kind: "exited", unit: u.id });
  // Those that followed it go out behind it.
  for (const f of b.units)
    if (isPlayer(f) && stillIn(f) && f.follow === u.id) {
      clearOrders(f);
      f.goal = { ...b.gate };
      f.exiting = true;
      f.loading = null;
    }
}

/**
 * A vehicle's own way this step (docs/plan-porta-jeu.md, lot A): toward the one it attacks until
 * within its reach, behind the one it follows, else to its goal and the next steps of its way.
 * True when it moved otherwise than to a goal (a goal alone already stops the loading).
 */
function advance(u: PlayerUnit, b: Battle, s: EmpireSettings, len: number): boolean {
  const bs = s.porta.battle;
  if (u.attack) {
    const target = b.units.find((x): x is RomeUnit => isRome(x) && x.id === u.attack);
    if (!target || target.dead) u.attack = null;
    else {
      const range = Math.min(...u.weapons.map((w) => w.rangeCenti));
      const need = distance(u, target) - (range * bs.attackReachBps) / 1_000_000;
      if (need <= 0) return false;
      moveToward(u, target, Math.min(len, need));
      return true;
    }
  }
  if (u.follow) {
    const leader = b.units.find((x): x is PlayerUnit => isPlayer(x) && x.id === u.follow);
    if (!leader || !stillIn(leader)) u.follow = null;
    else {
      const need = distance(u, leader) - bs.followCenti / 100;
      if (need <= 1e-9) return false;
      moveToward(u, leader, Math.min(len, need));
      return true;
    }
  }
  if (u.goal && moveToward(u, u.goal, len)) u.goal = u.route?.shift() ?? null;
  if (u.exiting && distance(u, b.gate) * 100 <= b.gateRadiusCenti) leave(b, u);
  return false;
}

/** The speed bonus a vehicle has from the trumpets sounding near it, in bps. */
function boostBps(u: PlayerUnit, b: Battle): number {
  let best = 0;
  for (const o of b.units)
    if (isPlayer(o) && stillIn(o))
      for (const a of o.actives)
        if (a.effect === "trumpet" && a.until > b.timeMs && distance(o, u) * 100 <= a.rangeCenti)
          best = Math.max(best, a.power);
  return best;
}

/** A transport standing in a city with its owner's relics loads the rarest, one at a time. */
function load(u: PlayerUnit, b: Battle, s: EmpireSettings, moved = false) {
  if (u.role !== "transport" || u.goal || moved || u.cargo.length >= u.capacity) {
    u.loading = null;
    return;
  }
  const city = b.cities.find(
    (c) =>
      distance(u, c) * 100 <= s.porta.battle.cityRadiusCenti &&
      (c.relics[u.owner] ?? []).length > 0,
  );
  if (!city) {
    u.loading = null;
    return;
  }
  const mine = city.relics[u.owner] ?? [];
  const rarest = [...mine].sort((x, y) => rank(y) - rank(x))[0];
  if (!rarest) return;
  if (!u.loading || u.loading.cityId !== city.id) {
    u.loading = {
      cityId: city.id,
      rarity: rarest,
      doneAt: b.timeMs + (s.porta.relics?.[rarest].loadS ?? 10) * 1_000,
    };
    return;
  }
  if (b.timeMs < u.loading.doneAt) return;
  const i = mine.indexOf(u.loading.rarity);
  if (i >= 0) {
    mine.splice(i, 1);
    u.cargo.push(u.loading.rarity);
    b.events.push({ kind: "loaded", unit: u.id, rarity: u.loading.rarity });
  }
  u.loading = null;
}

/** The lances' and the Gonfalonier's rise on one target, in bps. */
function rampBps(
  since: number,
  now: number,
  w: { rampBps: number; rampEveryS: number; rampMaxBps: number },
) {
  if (w.rampBps === 0 || w.rampEveryS === 0) return 0;
  return Math.min(w.rampMaxBps, w.rampBps * Math.floor((now - since) / (w.rampEveryS * 1_000)));
}

/** Advances a battle by one step. */
export function stepBattle(b: Battle, s: EmpireSettings): void {
  if (b.over) return;
  const bs = s.porta.battle;
  const ms = bs.stepMs;
  b.events = [];
  b.timeMs += ms;
  const players = b.units.filter(isPlayer).filter(stillIn);
  const rome = b.units.filter(isRome).filter((r) => !r.dead);

  // The vehicles move, the transports load.
  for (const u of players) {
    const len = stepLength(u.speedCenti, ms) * (1 + boostBps(u, b) / 10_000);
    const moved = advance(u, b, s, len);
    if (stillIn(u)) load(u, b, s, moved);
  }

  // Rome thinks and moves.
  for (const r of rome) thinkRome(r, b, s, ms);

  // Every weapon in range fires; the damage lands together.
  const damage = new Map<string, number>();
  const hit = (from: string, to: string, dmg: number) => {
    if (dmg <= 0) return;
    damage.set(to, (damage.get(to) ?? 0) + dmg);
    const struck = rome.find((r) => r.id === to);
    if (struck) struck.struck[from] = b.timeMs;
    b.events.push({ kind: "hit", from, to, damage: Math.round(dmg) });
  };
  for (const u of players) {
    // Gone out by the gate this very step.
    if (!stillIn(u)) continue;
    let fired = false;
    for (const w of u.weapons) {
      const inRange = rome.filter((r) => distance(u, r) * 100 <= w.rangeCenti);
      if (inRange.length === 0) {
        w.targetId = null;
        continue;
      }
      const nearest = [...inRange].sort((p, q) => distance(u, p) - distance(u, q))[0] as RomeUnit;
      if (w.effect === "crossbows") {
        for (const r of inRange) hit(u.id, r.id, (w.power * ms) / 1_000);
        fired = true;
        continue;
      }
      const told = u.attack ? inRange.find((r) => r.id === u.attack) : undefined;
      const keep = inRange.find((r) => r.id === w.targetId);
      const target = told ?? keep ?? nearest;
      if (target.id !== w.targetId) {
        w.targetId = target.id;
        w.since = b.timeMs;
      }
      if (w.periodS > 0) {
        if (b.timeMs < w.nextShotAt) continue;
        w.nextShotAt = b.timeMs + w.periodS * 1_000;
        hit(u.id, target.id, w.power);
      } else
        hit(
          u.id,
          target.id,
          (w.power * (10_000 + rampBps(w.since, b.timeMs, w)) * ms) / 10_000_000,
        );
      fired = true;
    }
    // Firing gives away a vehicle under the smoke.
    if (fired) u.hiddenUntil = Math.min(u.hiddenUntil, b.timeMs);
  }
  for (const r of rome) {
    if (r.state !== "attack" || !r.targetId) continue;
    const target = players.find((p) => p.id === r.targetId);
    if (!target || distance(r, target) * 100 > r.rangeCenti) continue;
    if (r.periodS > 0) {
      if (b.timeMs < r.nextShotAt) continue;
      r.nextShotAt = b.timeMs + r.periodS * 1_000;
      if (r.areaCenti > 0) {
        for (const p of players)
          if (distance(p, target) * 100 <= r.areaCenti) hit(r.id, p.id, r.power);
      } else hit(r.id, target.id, r.power);
    } else
      hit(r.id, target.id, (r.power * (10_000 + rampBps(r.since, b.timeMs, r)) * ms) / 10_000_000);
  }

  // The surgeons heal the most hurt ally near them.
  for (const u of players)
    for (const a of u.actives) {
      if (a.effect !== "surgeon" || a.until <= b.timeMs) continue;
      const hurt = players
        .filter((p) => p.hp < p.maxHp && distance(p, u) * 100 <= a.rangeCenti)
        .sort((p, q) => p.hp / p.maxHp - q.hp / q.maxHp)[0];
      if (hurt) hurt.hp = Math.min(hurt.maxHp, hurt.hp + (a.power * ms) / 1_000);
    }

  for (const [id, raw] of damage) {
    const u = b.units.find((x) => x.id === id);
    if (!u) continue;
    let dmg = raw;
    if (isPlayer(u)) {
      if (u.shieldUntil > b.timeMs && u.shield > 0) {
        const absorbed = Math.min(u.shield, dmg);
        u.shield -= absorbed;
        dmg -= absorbed;
      }
      dmg = (dmg * (10_000 - u.damageCutBps)) / 10_000;
    }
    u.hp -= dmg;
    if (u.hp > 0) continue;
    u.hp = 0;
    if (isPlayer(u)) {
      u.outcome = "dead";
      u.cargo = [];
      clearOrders(u);
      u.loading = null;
    } else u.dead = true;
    b.events.push({ kind: "dead", unit: u.id });
  }

  // Rome closes its lands: what is still inside is lost.
  if (b.timeMs >= b.endsAtMs) {
    for (const u of b.units.filter(isPlayer).filter(stillIn)) {
      u.outcome = "lost";
      u.cargo = [];
      b.events.push({ kind: "lost", unit: u.id });
    }
  }
  if (!b.units.some((u) => isPlayer(u) && stillIn(u))) b.over = true;
}

/** What a player brings out of a battle (plan-porta.md § 8). */
export interface BattleOutcome {
  vehicles: { vehicleId: string; role: "combat" | "transport"; outcome: PlayerUnit["outcome"] }[];
  relics: Rarity[];
  /** At least one relic brought out: the tier is won. */
  won: boolean;
}

/** Each player's outcome, read at any time (final once the battle is over). */
export function battleResult(b: Battle): Record<PlayerId, BattleOutcome> {
  const out: Record<PlayerId, BattleOutcome> = {};
  for (const id of b.players) out[id] = { vehicles: [], relics: [], won: false };
  for (const u of b.units.filter(isPlayer)) {
    const o = out[u.owner];
    if (!o) continue;
    o.vehicles.push({ vehicleId: u.vehicleId, role: u.role, outcome: u.outcome });
    if (u.outcome === "exited") o.relics.push(...u.cargo);
  }
  for (const o of Object.values(out)) o.won = o.relics.length > 0;
  return out;
}
