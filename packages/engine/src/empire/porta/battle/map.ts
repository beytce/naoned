import { Rng } from "../../../rng.js";
import type { PlayerId } from "../../../state.js";
import type { EmpireSettings } from "../../settings.js";
import type { ArmStats } from "../arms.js";
import { RARITIES, type Rarity, type RomeKind, type TierSettings } from "../settings.js";
import type { Battle, City, PlayerUnit, RomeUnit, Vec } from "./types.js";

/** What a player brings in: a combat vehicle at its strength, a transport and its hold. */
export interface BattleEntrant {
  id: PlayerId;
  combat: { vehicleId: string; stats: ArmStats };
  transport: { vehicleId: string; hold: number };
}

export interface BattleInput {
  seed: number;
  tier: number;
  players: BattleEntrant[];
}

/** A tier's line, or a RangeError. */
export function tierLine(tier: number, s: EmpireSettings): TierSettings {
  const line = s.porta.tiers[tier - 1];
  if (!Number.isInteger(tier) || !line) throw new RangeError(`no tier ${tier}`);
  return line;
}

export const distance = (a: Vec, b: Vec) => Math.hypot(a.x - b.x, a.y - b.y);
const round2 = (n: number) => Math.round(n * 100) / 100;

/** The cities, drawn on the disc, apart from the gate and from one another. */
function drawCities(rng: Rng, radius: number, count: number, gate: Vec): Vec[] {
  let spacing = 2.5;
  for (;;) {
    const out: Vec[] = [];
    for (let tries = 0; tries < 400 && out.length < count; tries++) {
      const r = (radius - 1) * Math.sqrt(rng.next());
      const a = rng.next() * 2 * Math.PI;
      const p = { x: round2(r * Math.cos(a)), y: round2(r * Math.sin(a)) };
      if (distance(p, gate) < 3) continue;
      if (out.some((c) => distance(c, p) < spacing)) continue;
      out.push(p);
    }
    if (out.length === count) return out;
    spacing *= 0.85;
  }
}

/** A rarity drawn by the tier's weights. */
function drawRarity(rng: Rng, w: TierSettings["rarityWeights"]): Rarity {
  const total = RARITIES.reduce((a, r) => a + w[r], 0);
  let n = rng.next() * total;
  for (const r of RARITIES) {
    n -= w[r];
    if (n < 0) return r;
  }
  return "common";
}

/** Units for a count at the tier, more with each player beyond the first. */
export function scaledCount(base: number, players: number, s: EmpireSettings): number {
  if (base <= 0) return 0;
  return Math.round((base * (10_000 + s.porta.battle.extraPlayerBps * (players - 1))) / 10_000);
}

/** A unit of Rome at the tier's strength. */
export function makeRomeUnit(
  id: string,
  kind: RomeKind,
  at: Vec,
  home: string,
  line: TierSettings,
  s: EmpireSettings,
): RomeUnit {
  const spec = s.porta.rome[kind];
  if (!spec) throw new RangeError(`no unit ${kind}`);
  const strong = (n: number) => Math.floor((n * line.strengthBps) / 10_000);
  return {
    ...spec,
    id,
    side: "rome",
    kind,
    x: at.x,
    y: at.y,
    hp: strong(spec.hp),
    maxHp: strong(spec.hp),
    power: strong(spec.power),
    home,
    state: "idle",
    targetId: null,
    reviewAt: 0,
    since: 0,
    nextShotAt: 0,
    patrol: 0,
    struck: {},
    dead: false,
  };
}

/** Points around a centre, on a ring. */
const ring = (c: Vec, r: number, i: number, n: number, turn = 0): Vec => ({
  x: round2(c.x + r * Math.cos(turn + (2 * Math.PI * i) / Math.max(1, n))),
  y: round2(c.y + r * Math.sin(turn + (2 * Math.PI * i) / Math.max(1, n))),
});

/**
 * Draws a battle from its seed (plan-porta.md § 6.1): the gate at the west, the cities, each
 * player's own relics in them (the rarest the farthest from the gate), Rome's garrisons, its
 * roamers, its Gonfaloniers in the farthest city, the players' vehicles at the gate.
 */
export function createBattle(input: BattleInput, s: EmpireSettings): Battle {
  const line = tierLine(input.tier, s);
  const n = input.players.length;
  if (n < line.minPlayers || n > line.maxPlayers) throw new RangeError("players");
  const rng = new Rng(input.seed);
  const b = s.porta.battle;
  const gate = { x: -(line.radius - 0.5), y: 0 };
  const spots = drawCities(rng, line.radius, line.cities, gate).sort(
    (p, q) => distance(p, gate) - distance(q, gate),
  );
  const cities: City[] = spots.map((p, i) => ({ id: `c${i}`, x: p.x, y: p.y, relics: {} }));

  // Each player's relics: so many a city, the rarest put the farthest.
  for (const pl of input.players) {
    const perCity = cities.map(() => rng.int(line.relicsPerCity.min, line.relicsPerCity.max));
    const all = perCity
      .flatMap((k) => Array.from({ length: k }, () => drawRarity(rng, line.rarityWeights)))
      .sort((x, y) => RARITIES.indexOf(x) - RARITIES.indexOf(y));
    let at = 0;
    cities.forEach((c, i) => {
      const k = perCity[i] ?? 0;
      c.relics[pl.id] = all
        .slice(at, at + k)
        .sort((x, y) => RARITIES.indexOf(y) - RARITIES.indexOf(x));
      at += k;
    });
  }

  const units: Battle["units"] = [];
  let next = 0;
  const id = () => `r${next++}`;
  for (const c of cities) {
    const kinds = Object.entries(line.garrison).flatMap(([kind, k]) =>
      Array.from({ length: scaledCount(k ?? 0, n, s) }, () => kind as RomeKind),
    );
    kinds.forEach((kind, i) => {
      units.push(makeRomeUnit(id(), kind, ring(c, 0.6, i, kinds.length), c.id, line, s));
    });
  }
  const far = cities[cities.length - 1];
  if (far)
    for (let i = 0; i < scaledCount(line.bosses, n, s); i++)
      units.push(makeRomeUnit(id(), "gonfalonier", ring(far, 0.3, i, 3, 0.5), far.id, line, s));
  const roamers = Object.entries(line.roamers).flatMap(([kind, k]) =>
    Array.from({ length: scaledCount(k ?? 0, n, s) }, () => kind as RomeKind),
  );
  roamers.forEach((kind, i) => {
    const c = cities[(i + 1) % cities.length] ?? cities[0];
    if (!c) return;
    const u = makeRomeUnit(id(), kind, ring(c, 1, i, roamers.length), c.id, line, s);
    u.roams = true;
    units.push(u);
  });

  // The players' vehicles at the gate, the combat vehicle ahead of its transport.
  input.players.forEach((pl, i) => {
    const y = round2((i - (n - 1) / 2) * 0.6);
    const base = {
      side: "player" as const,
      owner: pl.id,
      goal: null,
      shield: 0,
      shieldUntil: 0,
      hiddenUntil: 0,
      cargo: [],
      loading: null,
      outcome: "in" as const,
    };
    const st = pl.combat.stats;
    const combat: PlayerUnit = {
      ...base,
      id: `p${i}c`,
      vehicleId: pl.combat.vehicleId,
      role: "combat",
      x: round2(gate.x + 0.4),
      y,
      hp: st.hp,
      maxHp: st.hp,
      speedCenti: st.speedCenti,
      weapons: st.weapons.map((w) => ({ ...w, targetId: null, since: 0, nextShotAt: 0 })),
      actives: st.actives.map((a) => ({ ...a, readyAt: 0, until: 0 })),
      damageCutBps: st.damageCutBps,
      capacity: 0,
    };
    const transport: PlayerUnit = {
      ...base,
      id: `p${i}t`,
      vehicleId: pl.transport.vehicleId,
      role: "transport",
      x: gate.x,
      y,
      hp: b.transport.hp,
      maxHp: b.transport.hp,
      speedCenti: b.transport.speedCenti,
      weapons: [],
      actives: [],
      damageCutBps: 0,
      capacity: Math.max(1, Math.floor(pl.transport.hold / b.transport.holdPerRelic)),
    };
    units.push(combat, transport);
  });

  return {
    seed: input.seed,
    tier: input.tier,
    timeMs: 0,
    endsAtMs: b.minutes * 60_000,
    radius: line.radius,
    gate,
    gateRadiusCenti: b.gateRadiusCenti,
    cities,
    players: input.players.map((p) => p.id),
    units,
    over: false,
    events: [],
  };
}
