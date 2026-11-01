import type { PlayerId } from "../../../state.js";
import type { ActiveStats, WeaponStats } from "../arms.js";
import type { Rarity, RomeKind, RomeUnitSettings } from "../settings.js";

/**
 * A battle in the lands of Rome (docs/plan-porta.md § 6): pure state, held by the server in
 * memory, advanced by fixed steps. Positions in cells on a plane where two neighbouring hexes are
 * one apart; times in ms from the start. Nothing in it is money or goods: what it yields is read
 * at the end (`battleResult`) and settled by the house's commands.
 */

export interface Vec {
  x: number;
  y: number;
}

export interface WeaponState extends WeaponStats {
  targetId: string | null;
  /** When it took its target (the lances' rise). */
  since: number;
  nextShotAt: number;
}

export interface ActiveState extends ActiveStats {
  readyAt: number;
  until: number;
}

/** In the battle, gone out by the gate, fallen, or left inside at the closing. */
export type Outcome = "in" | "exited" | "dead" | "lost";

export interface PlayerUnit extends Vec {
  id: string;
  side: "player";
  owner: PlayerId;
  /** The house's vehicle it is. */
  vehicleId: string;
  role: "combat" | "transport";
  hp: number;
  maxHp: number;
  speedCenti: number;
  goal: Vec | null;
  weapons: WeaponState[];
  actives: ActiveState[];
  damageCutBps: number;
  /** Damage the pavise still absorbs, until `shieldUntil`. */
  shield: number;
  shieldUntil: number;
  /** Unseen by Rome until then (the smoke). */
  hiddenUntil: number;
  /** Relics it can carry, and those it carries. */
  capacity: number;
  cargo: Rarity[];
  loading: { cityId: string; rarity: Rarity; doneAt: number } | null;
  outcome: Outcome;
}

export type RomeState = "idle" | "alert" | "attack" | "retreat" | "return";

export interface RomeUnit extends Vec, RomeUnitSettings {
  id: string;
  side: "rome";
  kind: RomeKind;
  maxHp: number;
  /** Its city; a roaming unit's is the city it heads for. */
  home: string;
  state: RomeState;
  targetId: string | null;
  reviewAt: number;
  since: number;
  nextShotAt: number;
  /** Its patrol point around its city, by index. */
  patrol: number;
  /** Who struck it last, and when. */
  struck: Record<string, number>;
  dead: boolean;
}

export type Unit = PlayerUnit | RomeUnit;

export interface City extends Vec {
  id: string;
  /** Each player's relics still there. */
  relics: Record<PlayerId, Rarity[]>;
}

/** What happened during the last step, for the screen. */
export type BattleEvent =
  | { kind: "hit"; from: string; to: string; damage: number }
  | { kind: "dead"; unit: string }
  | { kind: "loaded"; unit: string; rarity: Rarity }
  | { kind: "exited"; unit: string }
  | { kind: "lost"; unit: string }
  | { kind: "alert"; unit: string; target: string };

export interface Battle {
  seed: number;
  tier: number;
  timeMs: number;
  endsAtMs: number;
  radius: number;
  gate: Vec;
  /** A vehicle this near the gate may leave. */
  gateRadiusCenti: number;
  cities: City[];
  players: PlayerId[];
  units: Unit[];
  over: boolean;
  events: BattleEvent[];
}

/** An order of a player (plan-porta.md § 6.2). */
export type BattleOrder =
  | { type: "move"; unitId: string; x: number; y: number }
  | { type: "stop"; unitId: string }
  | { type: "activate"; unitId: string; componentId: string }
  | { type: "leave"; unitId: string };
