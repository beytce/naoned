import { DENIERS_PER_DUCAT, type Deniers } from "../../money.js";
import type { EmpireHouse } from "../../state.js";
import { capacityOf } from "../fleet.js";
import type { EmpireSettings } from "../settings.js";
import {
  type ArmStats,
  armAway,
  armLevelOf,
  armStats,
  armUpgradeCost,
  componentUpgradeCost,
} from "./arms.js";
import { portaTravelMinutes, portaUpgradeCost, tierOpen, weekPoints } from "./porta.js";
import { RARITIES, type Rarity } from "./settings.js";

/** Where a vehicle of the Porta stands. */
export type PortaPlaceView = "remise" | "going" | "porta" | "battle" | "back";

function placeOf(
  v: { porta?: { arrivesAt: number; battle?: string }; backAt?: number; busyUntil?: number },
  now: number,
): PortaPlaceView {
  if (v.porta?.battle) return "battle";
  if (v.porta) return v.porta.arrivesAt > now ? "going" : "porta";
  if ((v.backAt ?? 0) > now) return "back";
  return "remise";
}

/** The Porta and its arms, as the screen shows them (docs/plan-porta.md). */
export interface PortaView {
  /** Its site to put down (null in a world without it). */
  site: { cost: Deniers; minutes: number; casa: number } | null;
  cell: string | null;
  level: number;
  best: number;
  upgrade: { cost: Deniers; minutes: number } | null;
  travelMinutes: number;
  relics: Record<Rarity, number>;
  weekPoints: number;
  relicPrices: Record<Rarity, { price: Deniers; points: number; loadS: number }>;
  tiers: {
    tier: number;
    open: boolean;
    minPlayers: number;
    maxPlayers: number;
    bread: number;
    weights: Record<Rarity, number>;
  }[];
  entryGood: string;
  models: {
    code: string;
    casa: number;
    cost: Deniers;
    hp: number;
    speedCenti: number;
    slots: number;
    level: number;
    upgradeCost: Deniers | null;
  }[];
  components: {
    code: string;
    kind: "weapon" | "defense" | "support";
    effect: string;
    casa: number;
    cost: Deniers;
    power: number;
    rangeCenti: number;
    durationS: number;
    cooldownS: number;
  }[];
  vehicles: {
    id: string;
    model: string;
    slots: (string | null)[];
    place: PortaPlaceView;
    arrivesAt: number | null;
    stats: ArmStats;
  }[];
  inventory: {
    id: string;
    code: string;
    level: number;
    upgradeCost: Deniers | null;
    on: string | null;
  }[];
  transports: {
    id: string;
    type: string;
    hold: number;
    place: PortaPlaceView;
    arrivesAt: number | null;
  }[];
  battle: { id: string; tier: number } | null;
}

const ducats = (n: number) => BigInt(n) * DENIERS_PER_DUCAT;

export function portaViewOf(h: EmpireHouse, s: EmpireSettings, now: number): PortaView {
  const b = s.porta.building;
  const arms = h.arms ?? { vehicles: [], components: [] };
  const carrier = (id: string) => arms.vehicles.find((v) => v.slots.includes(id))?.id ?? null;
  const zero = Object.fromEntries(RARITIES.map((r) => [r, 0])) as Record<Rarity, number>;
  return {
    site: b ? { cost: ducats(b.costDucats), minutes: b.minutes, casa: b.casa } : null,
    cell: h.porta?.cell ?? null,
    level: h.porta?.level ?? 0,
    best: h.porta?.best ?? 0,
    upgrade: (() => {
      const cost = portaUpgradeCost(h, s);
      return cost !== null && b ? { cost, minutes: b.levelMinutes * (h.porta?.level ?? 1) } : null;
    })(),
    travelMinutes: b && h.porta ? portaTravelMinutes(h, s) : 0,
    relics: { ...zero, ...(h.porta?.relics ?? {}) },
    weekPoints: weekPoints(h, now),
    relicPrices: Object.fromEntries(
      RARITIES.map((r) => {
        const x = s.porta.relics?.[r];
        return [
          r,
          { price: ducats(x?.priceDucats ?? 0), points: x?.points ?? 0, loadS: x?.loadS ?? 0 },
        ];
      }),
    ) as PortaView["relicPrices"],
    tiers: s.porta.tiers.map((t, i) => ({
      tier: i + 1,
      open: tierOpen(h, i + 1),
      minPlayers: t.minPlayers,
      maxPlayers: t.maxPlayers,
      bread: t.breadPerVehicle * 2,
      weights: t.rarityWeights,
    })),
    entryGood: b?.entryGood ?? "bread",
    models: Object.entries(s.porta.models).map(([code, m]) => ({
      code,
      casa: m.casa,
      cost: ducats(m.costDucats),
      hp: m.hp,
      speedCenti: m.speedCenti,
      slots: m.slots,
      level: armLevelOf(h, code),
      upgradeCost: armUpgradeCost(h, code, s),
    })),
    components: Object.entries(s.porta.components).map(([code, c]) => ({
      code,
      kind: c.kind,
      effect: c.effect,
      casa: c.casa,
      cost: ducats(c.costDucats),
      power: c.power,
      rangeCenti: c.rangeCenti,
      durationS: c.durationS,
      cooldownS: c.cooldownS,
    })),
    vehicles: arms.vehicles.map((v) => ({
      id: v.id,
      model: v.model,
      slots: v.slots,
      place: placeOf(v, now),
      arrivesAt: v.porta?.arrivesAt ?? (armAway(v, now) ? (v.backAt ?? null) : null),
      stats: armStats(h, v.id, s),
    })),
    inventory: arms.components.map((c) => ({
      id: c.id,
      code: c.code,
      level: c.level,
      upgradeCost: componentUpgradeCost(h, c.id, s),
      on: carrier(c.id),
    })),
    transports: (h.vehicles ?? [])
      .filter((v) => s.vehicles[v.type] && !s.vehicles[v.type]?.build)
      .map((v) => ({
        id: v.id,
        type: v.type,
        hold: capacityOf(h, v.type, s),
        place: v.porta ? placeOf(v, now) : v.busyUntil > now ? "back" : "remise",
        arrivesAt: v.porta?.arrivesAt ?? (v.busyUntil > now ? v.busyUntil : null),
      })),
    battle: h.porta?.battle ? { id: h.porta.battle.id, tier: h.porta.battle.tier } : null,
  };
}
