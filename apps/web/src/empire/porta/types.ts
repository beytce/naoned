/** The Porta as the server shows it (docs/plan-porta.md; engine `PortaView`), money as strings. */

export type Rarity = "common" | "rare" | "precious" | "legendary";
export const RARITIES: Rarity[] = ["common", "rare", "precious", "legendary"];
export type PortaPlace = "remise" | "going" | "porta" | "battle" | "back";

export interface ArmStatsView {
  model: string;
  hp: number;
  speedCenti: number;
  weapons: {
    componentId: string;
    effect: string;
    power: number;
    rangeCenti: number;
    periodS: number;
  }[];
  actives: {
    componentId: string;
    effect: string;
    power: number;
    durationS: number;
    cooldownS: number;
  }[];
  damageCutBps: number;
}

export interface PortaView {
  site: { cost: string; minutes: number; casa: number } | null;
  cell: string | null;
  level: number;
  best: number;
  upgrade: { cost: string; minutes: number } | null;
  travelMinutes: number;
  relics: Record<Rarity, number>;
  weekPoints: number;
  relicPrices: Record<Rarity, { price: string; points: number; loadS: number }>;
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
    cost: string;
    hp: number;
    speedCenti: number;
    slots: number;
    level: number;
    upgradeCost: string | null;
  }[];
  components: {
    code: string;
    kind: "weapon" | "defense" | "support";
    effect: string;
    casa: number;
    cost: string;
    power: number;
    rangeCenti: number;
    durationS: number;
    cooldownS: number;
  }[];
  vehicles: {
    id: string;
    model: string;
    slots: (string | null)[];
    place: PortaPlace;
    arrivesAt: number | null;
    stats: ArmStatsView;
  }[];
  inventory: {
    id: string;
    code: string;
    level: number;
    upgradeCost: string | null;
    on: string | null;
  }[];
  transports: {
    id: string;
    type: string;
    hold: number;
    place: PortaPlace;
    arrivesAt: number | null;
  }[];
  battle: { id: string; tier: number } | null;
}

export type PortaAction =
  | { type: "empireBuildPorta"; cell: string }
  | { type: "empireUpgradePorta" }
  | { type: "empireBuyArm"; model: string }
  | { type: "empireUpgradeArm"; model: string }
  | { type: "empireBuyComponent"; code: string }
  | { type: "empireUpgradeComponent"; componentId: string }
  | { type: "empireFitArm"; vehicleId: string; slot: number; componentId: string | null }
  | { type: "empireSendToPorta"; vehicleIds: string[] }
  | { type: "empireRecallFromPorta"; vehicleIds: string[] }
  | { type: "empireSellRelics"; rarity: Rarity; qty: number };

/** A unit of the battle, as the snapshot carries it. */
export interface RomeUnitView {
  id: string;
  side: "rome";
  kind: string;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  state: "idle" | "alert" | "attack" | "retreat" | "return";
  targetId: string | null;
  rangeCenti: number;
  visionCenti: number;
  dead: boolean;
}

export interface PlayerUnitView {
  id: string;
  side: "player";
  owner: string;
  mine: boolean;
  role: "combat" | "transport";
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  outcome: "in" | "exited" | "dead" | "lost";
  goal: { x: number; y: number } | null;
  cargo: Rarity[];
  capacity: number;
  loading: { cityId: string; rarity: Rarity; doneAt: number } | null;
  shield: number;
  hiddenUntil: number;
  weapons: { effect: string; rangeCenti: number; targetId: string | null }[];
  actives: {
    componentId: string;
    effect: string;
    readyAt: number;
    until: number;
    rangeCenti: number;
  }[];
}

export type BattleEvent =
  | { kind: "hit"; from: string; to: string; damage: number }
  | { kind: "dead"; unit: string }
  | { kind: "loaded"; unit: string; rarity: Rarity }
  | { kind: "exited"; unit: string }
  | { kind: "lost"; unit: string }
  | { kind: "alert"; unit: string; target: string };

export interface BattleSnapshot {
  id: string;
  tier: number;
  timeMs: number;
  endsAtMs: number;
  over: boolean;
  radius: number;
  gate: { x: number; y: number };
  gateRadiusCenti: number;
  cities: { id: string; x: number; y: number; relics: Record<Rarity, number> }[];
  units: (RomeUnitView | PlayerUnitView)[];
  events: BattleEvent[];
}

export interface PortaLobby {
  id: string;
  tier: number;
  code: string | null;
  owner: boolean;
  players: number;
  waitUntil: number | null;
}

export interface PortaState {
  lobby: PortaLobby | null;
  battle: BattleSnapshot | null;
  ranking?: {
    band: number;
    lines: { rank: number; pseudo: string; points: number; me: boolean }[];
    mine: { rank: number; points: number } | null;
  };
  error?: string;
}

export type BattleOrder =
  | { type: "move"; unitId: string; x: number; y: number }
  | { type: "stop"; unitId: string }
  | { type: "activate"; unitId: string; componentId: string }
  | { type: "leave"; unitId: string };
