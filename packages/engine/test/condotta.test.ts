import { describe, expect, it } from "vitest";
import {
  type Condotta,
  type WorldSettingsInput,
  advanceCondotta,
  cellsOf,
  condottaAct,
  condottaLevelAfter,
  condottaNationTroops,
  createCondotta,
  groupCondottaLevel,
  hexDistance,
} from "../src/index.js";
import { testTerraferma } from "./fixture.js";
import { World, makeContext } from "./helpers.js";

const START = Date.UTC(2026, 9, 20, 9, 0);
const MIN = 60_000;
const nation = (id: string, behavior: "raider" | "opportunist" | "defensive" | "slow") => ({
  id,
  radius: 1,
  troops: 100,
  troopsPerActive: 2,
  regenBps: 800,
  everyHours: 3,
  shareBps: 3_000,
  behavior,
});
const condotta = {
  minutes: 8,
  speed: 60,
  stepMinutes: 5,
  maxPlayers: 4,
  cellsPerPlayer: 30,
  lobbySeconds: 60,
  troops: 60,
  recruit: { base: 60, perCell: 6, perCity: 12 },
  nations: { min: 2, max: 3 },
  nationTroops: 100,
  levels: 12,
  levelStepBps: 1_500,
  holdShareBps: 3_500,
};
const config = (more: Record<string, unknown> = {}) => {
  const cfg = makeContext({
    terraferma: {
      ...testTerraferma,
      nations: [
        nation("mantova", "defensive"),
        nation("ferrara", "opportunist"),
        nation("impero", "raider"),
      ],
      condotta: { ...condotta, ...more },
    } as WorldSettingsInput["terraferma"],
  }).settings.terraferma;
  if (!cfg?.condotta) throw new Error("no condotta");
  return cfg;
};
const nations = (c: Condotta) =>
  Object.keys(c.state.players).filter((id) => id.startsWith("nation:"));

describe("the Condotta", () => {
  it("sets the allied merchants down in the middle, two or three nations at the edges", () => {
    const c = createCondotta(config(), "seed", ["ada", "bob"], 1, START);
    expect(nations(c).length).toBeGreaterThanOrEqual(2);
    expect(nations(c).length).toBeLessThanOrEqual(3);
    // No house of the computer on the merchants' side: only the nations and Milan against them.
    expect(Object.keys(c.state.players).some((id) => id.startsWith("bot:"))).toBe(false);
    // No farther from the middle than any nation's seat (a small map: ties).
    const { width, height } = c.state.map;
    const centre = Math.floor(height / 2) * width + Math.floor(width / 2);
    const far = (cell: number) => hexDistance(c.state.map, cell, centre);
    const seats = nations(c).map((id) => c.state.players[id]?.capital ?? -1);
    for (const id of ["ada", "bob"]) {
      const cell = c.state.players[id]?.capital ?? -1;
      expect(cell).toBeGreaterThanOrEqual(0);
      for (const seat of seats) expect(far(cell)).toBeLessThanOrEqual(far(seat));
    }
    // Allies: no front of one on the other.
    const bobCell = cellsOf(c.state, "bob")[0] ?? -1;
    expect(
      condottaAct(c, "ada", { type: "terraFront", aim: bobCell, shareBps: 5_000 }, START),
    ).toBe(false);
    expect(c.endsAt - c.startedAt).toBe(8 * MIN);
  });

  it("raises the nations' troops by 15 % a level, the same for each", () => {
    const cfg = config();
    const at = (level: number) => condottaNationTroops(cfg, level);
    expect(at(1)).toBe(100);
    expect(at(2)).toBe(115);
    expect(at(12)).toBe(265);
    const easy = createCondotta(cfg, "seed", ["ada"], 1, START);
    const hard = createCondotta(cfg, "seed", ["ada"], 12, START);
    const troops = (c: Condotta) =>
      nations(c).reduce((n, id) => n + (c.state.players[id]?.troops ?? 0), 0);
    expect(troops(hard)).toBeGreaterThan(troops(easy) * 2.5);
  });

  it("ends after its minutes: won only holding the city and 35 % of the land", () => {
    const c = createCondotta(config(), "seed", ["ada"], 1, START);
    advanceCondotta(c, START + 9 * MIN);
    expect(c.result).toBeDefined();
    // Nobody played: far from 35 % of the land, lost.
    expect(c.result?.won).toBe(false);
    expect(c.result?.shareBps).toBeLessThan(3_500);
  });

  it("is won by a merchant that plays, at an easy level, and lost at the hardest", () => {
    const easy = createCondotta(config(), "seed", ["ada"], 1, START, ["ada"]);
    advanceCondotta(easy, START + 9 * MIN);
    const hard = createCondotta(config(), "seed", ["ada"], 12, START, ["ada"]);
    advanceCondotta(hard, START + 9 * MIN);
    expect(easy.result?.shareBps ?? 0).toBeGreaterThan(hard.result?.shareBps ?? 0);
    expect(hard.result?.won).toBe(false);
  });

  it("plays a group at the highest level open to all, and opens the next one on a win", () => {
    expect(groupCondottaLevel([5, 3, 9])).toBe(3);
    expect(groupCondottaLevel([])).toBe(1);
    expect(condottaLevelAfter(3, 3, true, 12)).toBe(4);
    // A member above the group's level keeps its own.
    expect(condottaLevelAfter(9, 3, true, 12)).toBe(9);
    expect(condottaLevelAfter(3, 3, false, 12)).toBe(3);
    expect(condottaLevelAfter(12, 12, true, 12)).toBe(12);
  });

  it("takes orders only from its merchants, and none once over", () => {
    const c = createCondotta(config(), "seed", ["ada"], 1, START);
    const aim = c.state.owner.findIndex(
      (o, i) =>
        o === null &&
        c.state.map.land[i] &&
        c.state.owner.some((p, j) => p === "ada" && Math.abs(i - j) === 1),
    );
    expect(condottaAct(c, "eve", { type: "terraFront", aim, shareBps: 5_000 }, START)).toBe(false);
    expect(condottaAct(c, "ada", { type: "terraFront", aim, shareBps: 5_000 }, START)).toBe(true);
    advanceCondotta(c, START + 9 * MIN);
    expect(
      condottaAct(c, "ada", { type: "terraFront", aim, shareBps: 5_000 }, START + 9 * MIN),
    ).toBe(false);
  });

  it("is told to the world by an event for the missions, and pays nothing", () => {
    const w = new World(makeContext({}));
    w.do({ type: "join", playerId: "ada", region: "terraferma" });
    const cash = w.state.accounts["cash:ada"];
    const res = w.do({ type: "condottaWon", playerIds: ["ada", "ghost"], level: 4 });
    if (!res.ok) throw new Error("refused");
    const fx = res.effects;
    expect(fx.events.filter((e) => e.type === "condotta_won")).toEqual([
      expect.objectContaining({ playerId: "ada", data: { level: 4 } }),
    ]);
    expect(w.state.accounts["cash:ada"]).toBe(cash);
    expect(fx.ledger).toEqual([]);
    expect(fx.stock).toEqual([]);
  });
});
