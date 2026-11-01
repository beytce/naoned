import type { EmpireSettings } from "../../settings.js";
import { distance } from "./map.js";
import type { Battle, PlayerUnit, RomeUnit, Vec } from "./types.js";

/**
 * Rome's mind (docs/plan-porta.md § 6.5), after Hades' Star's Cerberus: a state machine per unit.
 * It sees only what is within its vision (never under the smoke), and its striker; it takes the
 * most threatening target, chosen again only at its review (8 s for the halberdier, 20 s for the
 * Gonfalonier); it follows it within its leash, falls back below its share of hp, and goes home.
 */

const CELL_MS = 100 * 60_000;
/** Cells a unit at `speedCenti` covers in `ms`. */
export const stepLength = (speedCenti: number, ms: number) => (speedCenti * ms) / CELL_MS;

/** Moves a point toward a goal by at most `len`; true when it is there. */
export function moveToward(u: Vec, goal: Vec, len: number): boolean {
  const d = distance(u, goal);
  if (d <= len || d === 0) {
    u.x = goal.x;
    u.y = goal.y;
    return true;
  }
  u.x += ((goal.x - u.x) * len) / d;
  u.y += ((goal.y - u.y) * len) / d;
  return false;
}

/** A player's vehicle still in the battle. */
export const stillIn = (p: PlayerUnit) => p.outcome === "in";

/** The damage a second a vehicle can deal: how threatening Rome finds it. */
export function dpsOf(p: PlayerUnit): number {
  return p.weapons.reduce((a, w) => a + (w.periodS > 0 ? w.power / w.periodS : w.power), 0);
}

const struckRecently = (u: RomeUnit, p: PlayerUnit, b: Battle, s: EmpireSettings) =>
  b.timeMs - (u.struck[p.id] ?? Number.NEGATIVE_INFINITY) <= s.porta.battle.hitMemoryS * 1_000;

/** What a unit of Rome sees: within its vision and not under the smoke, or who struck it. */
export function visibleTo(u: RomeUnit, b: Battle, s: EmpireSettings): PlayerUnit[] {
  return b.units.filter(
    (p): p is PlayerUnit =>
      p.side === "player" &&
      stillIn(p) &&
      ((p.hiddenUntil <= b.timeMs && distance(u, p) * 100 <= u.visionCenti) ||
        struckRecently(u, p, b, s)),
  );
}

/**
 * How threatening a vehicle is to a unit (plan-porta.md § 6.5): its damage a second, half as much
 * again if it struck the unit lately, less ten a cell of distance. A transport threatens nothing:
 * the light horse hunts it first, the others take it last.
 */
export function threatOf(u: RomeUnit, p: PlayerUnit, b: Battle, s: EmpireSettings): number {
  const dps = dpsOf(p);
  const base = p.role === "transport" ? (u.prefersTransport ? 1_000 : -1_000) : dps;
  const struck = struckRecently(u, p, b, s) ? dps / 2 : 0;
  return base + struck - distance(u, p) * 10;
}

/** The most threatening vehicle a unit sees, or null; ties go to the first. */
export function chooseTarget(u: RomeUnit, b: Battle, s: EmpireSettings): PlayerUnit | null {
  let best: PlayerUnit | null = null;
  let score = Number.NEGATIVE_INFINITY;
  for (const p of visibleTo(u, b, s)) {
    const t = threatOf(u, p, b, s);
    if (t > score) {
      best = p;
      score = t;
    }
  }
  return best;
}

const cityOf = (b: Battle, id: string) => b.cities.find((c) => c.id === id);

/** The point a unit at rest walks to: around its city, or to the next city for a roamer. */
function patrolPoint(u: RomeUnit, b: Battle): Vec {
  const home = cityOf(b, u.home);
  if (!home) return u;
  if (u.roams) return home;
  const a = (2 * Math.PI * (u.patrol % 6)) / 6;
  return { x: home.x + 0.8 * Math.cos(a), y: home.y + 0.8 * Math.sin(a) };
}

function setTarget(u: RomeUnit, p: PlayerUnit | null, b: Battle) {
  if ((p?.id ?? null) !== u.targetId) u.since = b.timeMs;
  u.targetId = p?.id ?? null;
}

/** A unit that sees an enemy warns those of its city near it, which take the same target. */
function warn(u: RomeUnit, target: PlayerUnit, b: Battle, s: EmpireSettings) {
  b.events.push({ kind: "alert", unit: u.id, target: target.id });
  for (const o of b.units)
    if (
      o.side === "rome" &&
      !o.dead &&
      o !== u &&
      o.home === u.home &&
      o.state === "idle" &&
      distance(o, u) * 100 <= s.porta.battle.alertRadiusCenti
    ) {
      o.state = "alert";
      setTarget(o, target, b);
      o.reviewAt = b.timeMs + o.reviewS * 1_000;
    }
}

/** One step of a unit of Rome's mind and movement. */
export function thinkRome(u: RomeUnit, b: Battle, s: EmpireSettings, ms: number): void {
  if (u.dead) return;
  const bs = s.porta.battle;
  const home = cityOf(b, u.home);
  const len = stepLength(u.speedCenti, ms);
  const atHome = home ? distance(u, home) * 100 <= bs.cityRadiusCenti : true;

  if (
    u.retreatBelowBps > 0 &&
    u.state !== "retreat" &&
    u.hp * 10_000 < u.maxHp * u.retreatBelowBps
  ) {
    u.state = "retreat";
    setTarget(u, null, b);
  }
  if (u.state === "retreat") {
    if (home && !atHome) moveToward(u, home, len);
    else {
      u.hp = Math.min(u.maxHp, u.hp + (u.maxHp * bs.retreatHealBpsPerS * ms) / 10_000_000);
      if (u.hp * 10_000 >= u.maxHp * bs.retreatBackBps) u.state = "idle";
    }
    return;
  }
  if (u.state === "return") {
    // Going home, it answers only a blow.
    const striker = visibleTo(u, b, s).find((p) => struckRecently(u, p, b, s));
    if (!striker) {
      if (home && moveToward(u, home, len)) u.state = "idle";
      return;
    }
    u.state = "alert";
    setTarget(u, striker, b);
    u.reviewAt = b.timeMs + u.reviewS * 1_000;
  }

  const current = b.units.find((p) => p.id === u.targetId) as PlayerUnit | undefined;
  const valid = current && visibleTo(u, b, s).includes(current);
  if (!valid || b.timeMs >= u.reviewAt) {
    const pick = chooseTarget(u, b, s);
    if (pick && u.state === "idle") {
      u.state = "alert";
      warn(u, pick, b, s);
    }
    setTarget(u, pick, b);
    u.reviewAt = b.timeMs + u.reviewS * 1_000;
  }
  const target = b.units.find((p) => p.id === u.targetId) as PlayerUnit | undefined;
  if (!target) {
    if (u.state !== "idle") u.state = home && !atHome ? "return" : "idle";
    if (u.state === "idle" && len > 0 && moveToward(u, patrolPoint(u, b), len)) {
      u.patrol += 1;
      // A roamer heads for the next city.
      if (u.roams && b.cities.length > 0) {
        const i = b.cities.findIndex((c) => c.id === u.home);
        u.home = b.cities[(i + 1) % b.cities.length]?.id ?? u.home;
      }
    }
    return;
  }
  if (home && distance(u, home) * 100 > u.leashCenti) {
    u.state = "return";
    setTarget(u, null, b);
    return;
  }
  if (distance(u, target) * 100 <= u.rangeCenti) u.state = "attack";
  else {
    u.state = "alert";
    if (len > 0) moveToward(u, target, len);
  }
}
