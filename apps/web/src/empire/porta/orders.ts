/**
 * What a touch orders in the battle (docs/plan-porta-jeu.md, lot A; pure, tested): the place
 * touched — the ground, a town, the gate, a unit of Rome — says the order and its word, shown where
 * the finger fell. The convoy: the transport follows its fighter, so one touch moves both; a
 * vehicle told alone leaves it. And the times the screen tells: a way's, the way back to the gate.
 */
import { pt } from "./texts.js";
import type { BattleOrder, BattleSnapshot, PlayerUnitView, RomeUnitView } from "./types.js";

type Point = { x: number; y: number };
type AnyUnit = BattleSnapshot["units"][number];

export const isMine = (u: AnyUnit): u is PlayerUnitView => u.side === "player" && u.mine;
const isRome = (u: AnyUnit): u is RomeUnitView => u.side === "rome";
const dist = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);

/** What lies under the finger. */
export type Touched =
  | { kind: "ground"; x: number; y: number }
  | { kind: "city"; id: string }
  | { kind: "gate" }
  | { kind: "rome"; id: string };

/** My two vehicles still inside, and whether the transport follows the fighter. */
export function convoyOf(b: BattleSnapshot): {
  combat: PlayerUnitView | null;
  transport: PlayerUnitView | null;
  joined: boolean;
} {
  const mine = b.units.filter(isMine).filter((u) => u.outcome === "in");
  const combat = mine.find((u) => u.role === "combat") ?? null;
  const transport = mine.find((u) => u.role === "transport") ?? null;
  return { combat, transport, joined: !!combat && transport?.follow === combat.id };
}

/** The vehicles an order to this one moves: itself, and the one that follows it. */
export function movedWith(b: BattleSnapshot, unitId: string): PlayerUnitView[] {
  return b.units
    .filter(isMine)
    .filter((u) => u.outcome === "in" && (u.id === unitId || u.follow === unitId));
}

export interface Told {
  orders: BattleOrder[];
  /** The order's word, shown a moment where the finger fell. */
  word: string;
  /** Where it leads (the word's place, the marker's). */
  at: Point;
  /** Refused before it is sent (a transport told to attack). */
  refused?: boolean;
}

/** The order a touch gives to the chosen vehicle. */
export function tell(b: BattleSnapshot, unitId: string, pick: Touched): Told | null {
  const u = b.units.filter(isMine).find((x) => x.id === unitId && x.outcome === "in");
  if (!u) return null;
  switch (pick.kind) {
    case "ground":
      return {
        orders: [{ type: "move", unitId, x: pick.x, y: pick.y }],
        word: pt.told.go,
        at: pick,
      };
    case "city": {
      const c = b.cities.find((x) => x.id === pick.id);
      if (!c) return null;
      const relics = Object.values(c.relics).reduce((a, n) => a + n, 0);
      const carrier = movedWith(b, unitId).some(
        (x) => x.role === "transport" && x.cargo.length < x.capacity,
      );
      return {
        orders: [{ type: "move", unitId, x: c.x, y: c.y }],
        word: relics > 0 && carrier ? pt.told.load : pt.told.go,
        at: c,
      };
    }
    case "gate":
      return { orders: [{ type: "exit", unitId }], word: pt.told.exit, at: b.gate };
    case "rome": {
      const r = b.units.filter(isRome).find((x) => x.id === pick.id && !x.dead);
      if (!r) return null;
      if (u.weapons.length === 0)
        return { orders: [], word: pt.told.unarmed, at: r, refused: true };
      return {
        orders: [{ type: "attack", unitId, targetId: r.id }],
        word: pt.told.attack,
        at: r,
      };
    }
  }
}

/** A way drawn with the finger, thinned to a few steps a case or more apart. */
export function thin(points: Point[], max: number, apart = 1): Point[] {
  if (points.length === 0) return [];
  const last = points[points.length - 1] as Point;
  const kept: Point[] = [];
  let from = points[0] as Point;
  for (const p of points.slice(1, -1)) {
    if (dist(p, from) < apart || dist(p, last) < apart) continue;
    kept.push(p);
    from = p;
  }
  // The steps too many: every other one dropped, the end always kept.
  while (kept.length > max - 1) for (let i = kept.length - 1; i >= 0; i -= 2) kept.splice(i, 1);
  return [...kept, last];
}

/** Cases a second. */
const speedOf = (u: { speedCenti: number }) => u.speedCenti / 6_000;

/** The seconds a vehicle takes along a way from where it stands. */
export function wayS(u: PlayerUnitView, points: Point[]): number {
  let len = 0;
  let from: Point = u;
  for (const p of points) {
    len += dist(from, p);
    from = p;
  }
  return len / Math.max(1e-6, speedOf(u));
}

/** The way a vehicle is on: its goal and the steps after it. */
export const wayOf = (u: PlayerUnitView): Point[] => (u.goal ? [u.goal, ...u.route] : []);

/** The seconds a vehicle needs to reach the gate's ring from where it stands. */
export function returnS(b: BattleSnapshot, u: PlayerUnitView): number {
  return Math.max(0, dist(u, b.gate) - b.gateRadiusCenti / 100) / Math.max(1e-6, speedOf(u));
}

/** The seconds a vehicle still has before it must turn back (below zero: too late). */
export function marginS(b: BattleSnapshot, u: PlayerUnitView): number {
  return (b.endsAtMs - b.timeMs) / 1_000 - returnS(b, u);
}

/** Under this margin, the vehicle is told to go home (docs/plan-porta-jeu.md, A6). */
export const HURRY_S = 15;

export type UnitMood =
  | "exiting"
  | "fire"
  | "loading"
  | "attack"
  | "follow"
  | "moving"
  | "full"
  | "idle";

/** What a vehicle is doing, in one word for its card. */
export function moodOf(b: BattleSnapshot, u: PlayerUnitView): UnitMood {
  if (u.exiting) return "exiting";
  if (b.units.some((r) => isRome(r) && !r.dead && r.state === "attack" && r.targetId === u.id))
    return "fire";
  if (u.loading) return "loading";
  if (u.attack) return "attack";
  if (u.goal) return "moving";
  if (u.follow) return "follow";
  if (u.role === "transport" && u.cargo.length >= u.capacity) return "full";
  return "idle";
}
