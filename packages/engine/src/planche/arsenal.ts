/**
 * The Arsenal, the fleet and the port (docs/plan-arsenal.md, step 5 of the audit of 11 November
 * 2026). The Arsenal is a building of the island, opened at a level of the house: its cales turn
 * the goods of the store into ships, never ducats. The fleet has places, by the house's level; a
 * full fleet stops the Arsenal, nothing lost (rule 3). A ship carries the level of the Arsenal that
 * launched it; it is refitted for a third of its goods, or repaired for a third in under an hour.
 * The port has three passes, each with places for defenses made of goods. The Power counts what is
 * built, never the purse (rule 6). No battle here: that is step 6.
 *
 * Pure: the cales are settled at each slice of the board, as the island makes.
 */

import { ILE_FONDACO } from "../ile/ile.js";
import type { PlancheHouse, PlancheSetup, PlancheState } from "./planche.js";

const BPS = 10_000;

export interface ArsenalShipRules {
  name: string;
  goods: Record<string, number>;
  buildMs: number;
  force: number;
  hull: number;
  keyword: string;
  /** The house's level that opens it. */
  minLevel: number;
}

export interface ArsenalRules {
  /** The island's workshop that is the Arsenal. */
  workshop: string;
  /** The house's level that opens it. */
  minLevel: number;
  /** Cales at each of its levels. */
  cales: number[];
  ships: Record<string, ArsenalShipRules>;
  /** Places in the fleet from each level of the house. */
  places: { level: number; n: number }[];
  /** What a ship refitted gives back of its goods. */
  refitBps: number;
  /** What a repair costs of a ship's goods, and how long it takes. */
  repair: { bps: number; ms: number };
  port: {
    passes: string[];
    /** Places of each pass from each level of the house. */
    slots: { level: number; n: number }[];
    defenses: Record<string, { name: string; goods: Record<string, number>; hull?: number }>;
  };
  /** What each thing built weighs in the Power. */
  power: { workshop: number; arsenal: number; ship: number; defense: number };
}

export interface PlancheShip {
  id: number;
  kind: string;
  level: number;
  /** Back damaged from a fight (step 6); repaired at `repairedAt`. */
  damaged?: true;
  repairedAt?: number;
}

/** A ship on its cale. */
export interface PlancheYard {
  kind: string;
  level: number;
  readyAt: number;
}

export interface PlancheFleet {
  ships: PlancheShip[];
  yards: PlancheYard[];
  /** The id of the next ship launched. */
  next: number;
}

const fail = (code: string): never => {
  throw new Error(code);
};

/** The last word of a table by level, for a level. */
const byLevel = (rows: { level: number; n: number }[], level: number) =>
  [...rows].sort((a, b) => a.level - b.level).reduce((n, r) => (r.level <= level ? r.n : n), 0);

/** The places of a house's fleet now. */
export const plancheFleetPlaces = (S: PlancheSetup, h: PlancheHouse) =>
  S.arsenal ? byLevel(S.arsenal.places, h.level ?? 1) : 0;

/** The places of each pass of a house's port now. */
export const planchePortSlots = (S: PlancheSetup, h: PlancheHouse) =>
  S.arsenal ? byLevel(S.arsenal.port.slots, h.level ?? 1) : 0;

/** The Arsenal of a house's island: its tile, its level, whether it is ready, its cales. */
export function plancheArsenalOf(S: PlancheSetup, h: PlancheHouse, now: number) {
  const A = S.arsenal;
  if (!A || !h.ile) return null;
  for (const [at, t] of Object.entries(h.ile.tiles))
    if (t.building?.type === A.workshop) {
      const level = t.building.level;
      return {
        at,
        level,
        ready: t.building.readyAt <= now,
        cales: A.cales[Math.min(level, A.cales.length) - 1] ?? 0,
      };
    }
  return null;
}

/** May this workshop be built by this house (the Arsenal: its level, one an island)? */
export function plancheArsenalMayBuild(S: PlancheSetup, h: PlancheHouse, type: string): void {
  const A = S.arsenal;
  if (!A || type !== A.workshop) return;
  if ((h.level ?? 1) < A.minLevel) fail("planche_level");
  if (plancheArsenalOf(S, h, 0)) fail("planche_arsenal_one");
}

/** A ship's force and hull: its kind's, a point of hull more for each level of its Arsenal. */
export function plancheShipStats(S: PlancheSetup, ship: { kind: string; level: number }) {
  const r = S.arsenal?.ships[ship.kind];
  return { force: r?.force ?? 0, hull: (r?.hull ?? 0) + Math.max(0, ship.level - 1) };
}

const fleetOf = (h: PlancheHouse): PlancheFleet => {
  h.fleet ??= { ships: [], yards: [], next: 1 };
  return h.fleet;
};

/** Takes goods from the store, or refuses. */
function take(h: PlancheHouse, goods: Record<string, number>, bps = BPS): void {
  const need = Object.entries(goods).map(([g, n]) => [g, Math.floor((n * bps) / BPS)] as const);
  if (need.some(([g, n]) => (h.stock[g] ?? 0) < n)) fail("planche_short");
  for (const [g, n] of need) h.stock[g] = (h.stock[g] ?? 0) - n;
}

/** Gives goods back to the store, up to its cap. */
function give(S: PlancheSetup, h: PlancheHouse, goods: Record<string, number>, bps: number) {
  for (const [g, n] of Object.entries(goods)) {
    const back = Math.floor((n * bps) / BPS);
    h.stock[g] = Math.min(Math.max(S.rules.store, h.stock[g] ?? 0), (h.stock[g] ?? 0) + back);
  }
}

const houseIn = (s: PlancheState, house: string) => {
  const h = Object.hasOwn(s.houses, house) ? s.houses[house] : undefined;
  return h ?? fail("planche_unknown");
};

/** A ship is laid on a free cale of the Arsenal, from the goods of the store. */
export function plancheShip(
  S: PlancheSetup,
  s0: PlancheState,
  house: string,
  kind: string,
  now: number,
): PlancheState {
  const A = S.arsenal;
  const r = A?.ships[kind];
  if (!A || !r) return fail("planche_unknown");
  const h0 = houseIn(s0, house);
  if ((h0.level ?? 1) < r.minLevel) return fail("planche_level");
  const ars = plancheArsenalOf(S, h0, now);
  if (!ars) return fail("planche_no_arsenal");
  if (!ars.ready) return fail("planche_arsenal_busy");
  if ((h0.fleet?.yards.length ?? 0) >= ars.cales) return fail("planche_no_cale");
  const s = structuredClone(s0);
  const h = s.houses[house] as PlancheHouse;
  take(h, r.goods);
  fleetOf(h).yards.push({ kind, level: ars.level, readyAt: now + r.buildMs });
  return s;
}

/** A ship is refitted: taken apart for a share of its goods, its place free for a better one. */
export function plancheShipRefit(
  S: PlancheSetup,
  s0: PlancheState,
  house: string,
  id: number,
  _now: number,
): PlancheState {
  const A = S.arsenal;
  const h0 = houseIn(s0, house);
  const ship = h0.fleet?.ships.find((x) => x.id === id);
  if (!A || !ship) return fail("planche_unknown");
  const s = structuredClone(s0);
  const h = s.houses[house] as PlancheHouse;
  const f = fleetOf(h);
  f.ships = f.ships.filter((x) => x.id !== id);
  give(S, h, A.ships[ship.kind]?.goods ?? {}, A.refitBps);
  return s;
}

/** A ship comes back damaged (from a fight, at step 6). */
export function plancheShipDamage(
  _S: PlancheSetup,
  s0: PlancheState,
  house: string,
  id: number,
): PlancheState {
  if (!houseIn(s0, house).fleet?.ships.some((x) => x.id === id)) return fail("planche_unknown");
  const s = structuredClone(s0);
  const ship = s.houses[house]?.fleet?.ships.find((x) => x.id === id) as PlancheShip;
  ship.damaged = true;
  delete ship.repairedAt;
  return s;
}

/** A damaged ship is repaired at the Arsenal: a share of its goods, a little while. */
export function plancheShipRepair(
  S: PlancheSetup,
  s0: PlancheState,
  house: string,
  id: number,
  now: number,
): PlancheState {
  const A = S.arsenal;
  const ship0 = houseIn(s0, house).fleet?.ships.find((x) => x.id === id);
  if (!A || !ship0) return fail("planche_unknown");
  if (!ship0.damaged || ship0.repairedAt !== undefined) return fail("planche_not_damaged");
  const s = structuredClone(s0);
  const h = s.houses[house] as PlancheHouse;
  take(h, A.ships[ship0.kind]?.goods ?? {}, A.repair.bps);
  const ship = fleetOf(h).ships.find((x) => x.id === id) as PlancheShip;
  ship.repairedAt = now + A.repair.ms;
  return s;
}

const portOf = (S: PlancheSetup, h: PlancheHouse): Record<string, string[]> => {
  h.port ??= Object.fromEntries((S.arsenal?.port.passes ?? []).map((p) => [p, []]));
  return h.port;
};

/** A defense is built of goods on a pass of the port, in a free place. */
export function plancheDefense(
  S: PlancheSetup,
  s0: PlancheState,
  house: string,
  pass: string,
  kind: string,
): PlancheState {
  const A = S.arsenal;
  const d = A?.port.defenses[kind];
  if (!A || !d || !A.port.passes.includes(pass)) return fail("planche_unknown");
  const h0 = houseIn(s0, house);
  if ((h0.port?.[pass]?.length ?? 0) >= planchePortSlots(S, h0)) return fail("planche_port_full");
  const s = structuredClone(s0);
  const h = s.houses[house] as PlancheHouse;
  take(h, d.goods);
  portOf(S, h)[pass]?.push(kind);
  return s;
}

/** A defense is moved from one pass to another, free. */
export function plancheDefenseMove(
  S: PlancheSetup,
  s0: PlancheState,
  house: string,
  from: string,
  index: number,
  to: string,
): PlancheState {
  const A = S.arsenal;
  const h0 = houseIn(s0, house);
  const kind = h0.port?.[from]?.[index];
  if (!A || kind === undefined || !A.port.passes.includes(to)) return fail("planche_unknown");
  if (from !== to && (h0.port?.[to]?.length ?? 0) >= planchePortSlots(S, h0))
    return fail("planche_port_full");
  const s = structuredClone(s0);
  const port = portOf(S, s.houses[house] as PlancheHouse);
  port[from]?.splice(index, 1);
  port[to]?.push(kind);
  return s;
}

/** A defense is taken down: a share of its goods comes back. */
export function plancheDefenseRemove(
  S: PlancheSetup,
  s0: PlancheState,
  house: string,
  pass: string,
  index: number,
): PlancheState {
  const A = S.arsenal;
  const kind = houseIn(s0, house).port?.[pass]?.[index];
  if (!A || kind === undefined) return fail("planche_unknown");
  const s = structuredClone(s0);
  const h = s.houses[house] as PlancheHouse;
  portOf(S, h)[pass]?.splice(index, 1);
  give(S, h, A.port.defenses[kind]?.goods ?? {}, A.refitBps);
  return s;
}

/** At each slice: the ships finished go to the fleet while it has places; repairs end. */
export function plancheArsenalSettle(S: PlancheSetup, h: PlancheHouse, now: number): void {
  const f = h.fleet;
  if (!S.arsenal || !f) return;
  for (const ship of f.ships)
    if (ship.repairedAt !== undefined && ship.repairedAt <= now) {
      delete ship.damaged;
      delete ship.repairedAt;
    }
  const places = plancheFleetPlaces(S, h);
  f.yards.sort((a, b) => a.readyAt - b.readyAt);
  while (f.yards[0] && f.yards[0].readyAt <= now && f.ships.length < places) {
    const y = f.yards.shift() as PlancheYard;
    f.ships.push({ id: f.next, kind: y.kind, level: y.level });
    f.next += 1;
  }
}

/** The Power of a house: its workshops, its Arsenal, its fleet and its port; never its purse. */
export function planchePower(S: PlancheSetup, s: PlancheState, house: string): number {
  const A = S.arsenal;
  const h = Object.hasOwn(s.houses, house) ? s.houses[house] : undefined;
  if (!A || !h) return 0;
  let p = 0;
  for (const t of Object.values(h.ile?.tiles ?? {})) {
    const b = t.building;
    if (!b || b.type === ILE_FONDACO) continue;
    p += (b.type === A.workshop ? A.power.arsenal : A.power.workshop) * b.level;
  }
  // A ship: its force, its hull and its level.
  for (const ship of h.fleet?.ships ?? []) {
    const r = A.ships[ship.kind];
    p += A.power.ship * ((r?.force ?? 0) + (r?.hull ?? 0) + ship.level);
  }
  for (const list of Object.values(h.port ?? {})) p += A.power.defense * list.length;
  return p;
}
