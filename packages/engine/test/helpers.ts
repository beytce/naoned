import { expect } from "vitest";
import {
  type Command,
  type Effects,
  type Trade,
  type WorldContext,
  type WorldSettingsInput,
  type WorldState,
  accumulate,
  checkInvariants,
  createWorldState,
  decide,
  emptyTotals,
  parseSettings,
} from "../src/index.js";
import { testSettings, testTheme } from "./fixture.js";

export const T0 = Date.UTC(2026, 0, 5, 0, 0, 0);
export const MIN = 60_000;
export const HOUR = 60 * MIN;
export const DAY = 24 * HOUR;

export function makeContext(overrides: Partial<WorldSettingsInput> = {}): WorldContext {
  return {
    theme: testTheme,
    settings: parseSettings({ ...testSettings, ...overrides }),
    startAt: T0,
  };
}

/** Small harness: applies commands, keeps journal totals and checks the invariants each time. */
export class World {
  state: WorldState;
  totals = emptyTotals();
  now = T0;
  trades: Trade[] = [];

  constructor(readonly ctx: WorldContext = makeContext()) {
    this.state = createWorldState(ctx);
  }

  at(offsetMs: number): this {
    this.now = T0 + offsetMs;
    return this;
  }

  advance(ms: number): this {
    this.now += ms;
    return this;
  }

  try(cmd: Command) {
    const res = decide(this.ctx, this.state, cmd, this.now);
    if (res.ok) {
      this.state = res.state;
      accumulate(this.totals, res.effects);
      this.trades.push(...res.effects.trades);
    }
    expect(checkInvariants(this.state, this.totals)).toEqual([]);
    return res;
  }

  do(cmd: Command) {
    const res = this.try(cmd);
    if (!res.ok) throw new Error(`${cmd.type} rejected: ${res.error}`);
    return res;
  }

  /** Puts stock in a player's inventory through the journal (test fixture only). */
  give(playerId: string, resource: string, quantity: number): this {
    const fx: Effects = {
      ledger: [],
      stock: [{ playerId, resource, quantity, reason: "starting_kit", at: this.now }],
      trades: [],
      events: [],
    };
    const inv = { ...(this.state.inventories[playerId] ?? {}) };
    const line = inv[resource] ?? { available: 0, escrow: 0 };
    inv[resource] = { ...line, available: line.available + quantity };
    this.state = { ...this.state, inventories: { ...this.state.inventories, [playerId]: inv } };
    accumulate(this.totals, fx);
    return this;
  }

  cash(playerId: string): bigint {
    return this.state.accounts[`cash:${playerId}`] ?? 0n;
  }

  escrow(playerId: string): bigint {
    return this.state.accounts[`escrow:${playerId}`] ?? 0n;
  }

  stock(playerId: string, resource: string) {
    return this.state.inventories[playerId]?.[resource] ?? { available: 0, escrow: 0 };
  }

  buildingsOf(playerId: string) {
    return Object.values(this.state.buildings).filter((b) => b.playerId === playerId);
  }
}

/**
 * Opens Lombardy on the fixture's map (test/fixture.ts, `map`): a counter put down in Venetia sees
 * its edge, a counter put there opens it after its voyage. The house's Casa must be reached.
 */
export function openLombardy(w: World, playerId = "a"): void {
  w.do({ type: "empirePlaceCounter", playerId, cell: "1,0" });
  w.advance(HOUR);
  w.do({ type: "empirePlaceCounter", playerId, cell: "3,0" });
  w.advance(7 * HOUR);
}
