import {
  type ArmStats,
  type BattleOutcome,
  type EmpireSettings,
  type PlayerUnit,
  type Rarity,
  createBattle,
  orderBattle,
  stepBattle,
} from "@comptoirs/engine";
import type { Rng } from "@comptoirs/engine";
import type { House, World } from "./model.js";
import { DAY } from "./model.js";
import { d, destroy, receive } from "./world.js";

/**
 * The Porta at the 24-month simulator (docs/plan-porta.md, lot 6). The battles are the engine's
 * own (`createBattle`, `stepBattle`), played by a scripted bot; as a battle of ten minutes is too
 * long to play for every house every day, each combination (tier, combat model, its level, the
 * transport's hold) is played a few times once, and the houses draw their outcome among those.
 */

/** The components a bot fits on each model, in order of its places. */
export const LOADOUT: Record<string, string[]> = {
  cavaliere: ["lances"],
  carro: ["lances", "cuirass"],
  carro_grande: ["lances", "crossbows", "cuirass"],
};

/** The strength of a model with its loadout, model and components at `level`. */
export function botStats(model: string, level: number, s: EmpireSettings): ArmStats {
  const m = s.porta.models[model];
  if (!m) throw new RangeError(`no model ${model}`);
  const levelBps = 10_000 + s.porta.modelLevels.stepBps * (level - 1);
  const scaled = (n: number) => Math.floor((n * levelBps) / 10_000);
  const out: ArmStats = {
    model,
    hp: scaled(m.hp),
    speedCenti: m.speedCenti,
    weapons: [],
    actives: [],
    damageCutBps: 0,
  };
  (LOADOUT[model] ?? []).slice(0, m.slots).forEach((code, i) => {
    const c = s.porta.components[code];
    if (!c) return;
    const power = c.power + Math.floor((c.power * c.perLevelBps * (level - 1)) / 10_000);
    if (c.kind === "weapon")
      out.weapons.push({
        componentId: `c${i}`,
        effect: c.effect,
        power: scaled(power),
        rangeCenti: c.rangeCenti,
        periodS: c.periodS,
        rampBps: c.rampBps,
        rampEveryS: c.rampEveryS,
        rampMaxBps: c.rampMaxBps,
      });
    else if (c.effect === "cuirass") out.damageCutBps = Math.min(9_000, out.damageCutBps + power);
  });
  return out;
}

const dist = (a: { x: number; y: number }, b: { x: number; y: number }) =>
  Math.hypot(a.x - b.x, a.y - b.y);

/**
 * A bot's battle, alone: the combat vehicle clears the nearest city that holds its relics, the
 * transport follows once no unit of Rome stands near it, loads, goes on to the next; both come
 * back to the gate in time and leave. Returns the outcome.
 */
export function playBattle(
  seed: number,
  tier: number,
  stats: ArmStats,
  hold: number,
  s: EmpireSettings,
): BattleOutcome {
  const b = createBattle(
    {
      seed,
      tier,
      players: [
        { id: "bot", combat: { vehicleId: "cv", stats }, transport: { vehicleId: "tr", hold } },
      ],
    },
    s,
  );
  const unit = (id: string) => b.units.find((u) => u.id === id) as PlayerUnit;
  const combat = unit("p0c");
  const transport = unit("p0t");
  const cell = 100 * 60_000;
  const back = (u: PlayerUnit) => (dist(u, b.gate) * cell) / u.speedCenti + 30_000;
  let homing = false;
  while (!b.over) {
    const left = b.endsAtMs - b.timeMs;
    const inside = [combat, transport].filter((u) => u.outcome === "in");
    for (const u of inside)
      if (
        dist(u, b.gate) * 100 <= b.gateRadiusCenti &&
        (homing ||
          (u.outcome === "in" && u === transport && transport.cargo.length >= transport.capacity))
      )
        orderBattle(b, "bot", { type: "leave", unitId: u.id });
    // Home in time, with a full hold, or before the combat vehicle falls (under 40 % of its hp).
    if (
      !homing &&
      (left < Math.max(back(transport), back(combat)) ||
        transport.outcome !== "in" ||
        transport.cargo.length >= transport.capacity ||
        combat.hp < combat.maxHp * 0.4)
    )
      homing = true;
    // The nearest city that still holds its relics (the cities are ordered from the gate).
    const target = b.cities.find((c) => (c.relics.bot ?? []).length > 0);
    if (homing || !target) {
      for (const u of [combat, transport])
        if (u.outcome === "in" && !u.goal && dist(u, b.gate) * 100 > b.gateRadiusCenti)
          orderBattle(b, "bot", { type: "move", unitId: u.id, x: b.gate.x, y: b.gate.y });
      if (combat.outcome !== "in" && transport.outcome !== "in") break;
    } else {
      if (combat.outcome === "in" && dist(combat, target) > 0.3 && !combat.goal)
        orderBattle(b, "bot", { type: "move", unitId: combat.id, x: target.x, y: target.y });
      const guarded = b.units.some((u) => u.side === "rome" && !u.dead && dist(u, target) < 2.2);
      if (
        transport.outcome === "in" &&
        (!guarded || combat.outcome !== "in") &&
        dist(transport, target) > 0.3 &&
        !transport.goal
      )
        orderBattle(b, "bot", { type: "move", unitId: transport.id, x: target.x, y: target.y });
      if (combat.outcome !== "in") homing = true;
    }
    stepBattle(b, s);
  }
  const out: BattleOutcome = { vehicles: [], relics: [], won: false };
  for (const u of [combat, transport]) {
    out.vehicles.push({ vehicleId: u.vehicleId, role: u.role, outcome: u.outcome });
    if (u.outcome === "exited") out.relics.push(...u.cargo);
  }
  out.won = out.relics.length > 0;
  return out;
}

/** Battles played for each combination, once per world. */
const RUNS = 6;
const tables = new WeakMap<EmpireSettings, Map<string, BattleOutcome[]>>();

export function outcomesOf(
  tier: number,
  model: string,
  level: number,
  relics: number,
  s: EmpireSettings,
): BattleOutcome[] {
  let table = tables.get(s);
  if (!table) {
    table = new Map();
    tables.set(s, table);
  }
  const key = `${tier}:${model}:${level}:${relics}`;
  let list = table.get(key);
  if (!list) {
    const hold = relics * s.porta.battle.transport.holdPerRelic;
    const stats = botStats(model, level, s);
    list = Array.from({ length: RUNS }, (_, i) =>
      playBattle(1_000 * tier + 97 * i + level, tier, stats, hold, s),
    );
    table.set(key, list);
  }
  return list;
}

/** What a model and its loadout cost to buy, and to raise from `level` to the next. */
export function armsCost(model: string, level: number, s: EmpireSettings) {
  const m = s.porta.models[model];
  const comps = (LOADOUT[model] ?? [])
    .slice(0, m?.slots ?? 0)
    .map((c) => s.porta.components[c]?.costDucats ?? 0);
  const base = (m?.costDucats ?? 0) + comps.reduce((a, x) => a + x, 0);
  const step =
    ((m?.costDucats ?? 0) * s.porta.modelLevels.costTimes + comps.reduce((a, x) => a + x, 0)) *
    2 ** level;
  return { buy: d(base), raise: d(step) };
}

/** The best combat model a Casa opens. */
export function bestModel(casa: number, s: EmpireSettings): string | null {
  const open = Object.entries(s.porta.models)
    .filter(([, m]) => m.casa <= casa)
    .sort((a, b) => b[1].hp - a[1].hp);
  return open[0]?.[0] ?? null;
}

/** The price of a relic, and the bread of an entry, at the antiquarian's and Venice's prices. */
export const relicPrice = (r: Rarity, s: EmpireSettings) => d(s.porta.relics?.[r].priceDucats ?? 0);
export const relicPoints = (r: Rarity, s: EmpireSettings) => s.porta.relics?.[r].points ?? 0;

/** The Porta's state of a house at the simulator. */
export interface SimPorta {
  level: number;
  best: number;
  combat: { model: string; level: number } | null;
  day: number;
  /** Battles played that day. */
  today: number;
  battles: number;
  won: number;
  lostCombat: number;
  lostTransport: number;
  relics: Record<Rarity, number>;
  points: number;
}

export const newPorta = (): SimPorta => ({
  level: 1,
  best: 0,
  combat: null,
  day: -1,
  today: 0,
  battles: 0,
  won: 0,
  lostCombat: 0,
  lostTransport: 0,
  relics: { common: 0, rare: 0, precious: 0, legendary: 0 },
  points: 0,
});

/**
 * A house's day at the Porta (armourer or mixed, from the Porta's Casa): it puts the Porta down,
 * buys its combat vehicle and loadout, raises them when it can spare the ducats, then plays a
 * battle a session, so many a day, at the highest tier its outcomes make worth it; it sells its relics at once.
 */
export function portaDay(
  w: World,
  h: House & { porta?: SimPorta },
  rng: Rng,
  spendable: () => bigint,
  holdRelics: () => number,
  loseTransport: () => void,
  victualPrice: bigint,
  battlesPerDay: number,
  transportPrice: bigint,
): number {
  const s = w.s;
  const b = s.porta.building;
  if (!b || h.casa < b.casa || s.porta.tiers.length === 0) return 0;
  const today = Math.floor(w.now / DAY);
  if (!h.porta) {
    const cost = d(b.costDucats);
    if (spendable() < cost) return 0;
    destroy(w, h, cost, "porta");
    h.porta = newPorta();
  }
  const p = h.porta;
  if (p.day !== today) {
    p.day = today;
    p.today = 0;
  }
  if (p.today >= battlesPerDay) return 0;
  const model = bestModel(h.casa, s);
  if (!model) return 0;
  if (
    !p.combat ||
    (p.combat.model !== model && spendable() >= (armsCost(model, 1, s).buy * 3n) / 2n)
  ) {
    const { buy } = armsCost(model, 1, s);
    if (spendable() < buy) return 0;
    destroy(w, h, buy, "arms");
    p.combat = { model, level: 1 };
  }
  // Raised when the house can spare it twice over.
  const { raise } = armsCost(p.combat.model, p.combat.level, s);
  if (p.combat.level < s.porta.modelLevels.max && spendable() >= raise * 2n) {
    destroy(w, h, raise, "arms");
    p.combat.level += 1;
  }
  if (p.level < s.porta.tiers.length && p.best >= p.level) {
    const cost = d(b.levelCostDucats * 2 ** p.level);
    if (spendable() >= cost) {
      destroy(w, h, cost, "porta");
      p.level += 1;
    }
  }
  const relics = holdRelics();
  if (relics === 0) return 0;
  // The tier worth most, its losses reckoned (the combat vehicle and its levels, the transport,
  // the victuals); a new tier only when the house wins it one time in two. A lone house keeps to
  // the tiers it may play alone.
  let pick = 0;
  let worth = 0n;
  // A loss reckoned at the vehicle's price: its levels are sunk.
  const kept = armsCost(p.combat.model, 1, s).buy;
  for (let t = 1; t <= Math.min(p.level, p.best + 1); t++) {
    const line = s.porta.tiers[t - 1];
    if (!line || line.minPlayers > 1) continue;
    const outs = outcomesOf(t, p.combat.model, p.combat.level, relics, s);
    const n = BigInt(outs.length);
    const wins = outs.filter((o) => o.won).length;
    if (t > p.best && wins * 2 < outs.length) continue;
    const gain =
      outs.reduce((a, o) => a + o.relics.reduce((x, r) => x + relicPrice(r, s), 0n), 0n) / n;
    const lostCombat = BigInt(outs.filter((o) => o.vehicles[0]?.outcome !== "exited").length);
    const lostTransport = BigInt(outs.filter((o) => o.vehicles[1]?.outcome !== "exited").length);
    const value =
      gain -
      (lostCombat * kept) / n -
      (lostTransport * transportPrice) / n -
      BigInt(line.breadPerVehicle * 2) * victualPrice;
    if (value > worth) {
      pick = t;
      worth = value;
    }
  }
  if (pick === 0) return 0;
  const line = s.porta.tiers[pick - 1];
  const victuals = BigInt((line?.breadPerVehicle ?? 0) * 2) * victualPrice;
  if (h.cash < victuals) return 0;
  p.today++;
  destroy(w, h, victuals, "victuals");
  const outs = outcomesOf(pick, p.combat.model, p.combat.level, relics, s);
  const o = outs[Math.floor(rng.next() * outs.length)] as BattleOutcome;
  p.battles++;
  if (o.vehicles[0]?.outcome !== "exited") {
    p.lostCombat++;
    p.combat = null;
  }
  if (o.vehicles[1]?.outcome !== "exited") {
    p.lostTransport++;
    loseTransport();
  }
  if (o.won) {
    p.won++;
    p.best = Math.max(p.best, pick);
  }
  for (const r of o.relics) {
    p.relics[r]++;
    p.points += relicPoints(r, s);
    // The antiquarian pays like any receipt, its wages taken.
    receive(w, h, relicPrice(r, s), "relics", "expeditions");
  }
  return o.relics.length;
}
