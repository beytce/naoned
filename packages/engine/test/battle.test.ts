import { describe, expect, it } from "vitest";
import {
  type WorldSettingsInput,
  advanceSkirmish,
  cellsOf,
  chestOf,
  createSkirmish,
  skirmishAct,
} from "../src/index.js";
import { testTerraferma } from "./fixture.js";
import { makeContext } from "./helpers.js";

// The Battle (docs/plan-terraferme-porcellana.md § 4 nonies, lot T6b): the skirmish of the
// empire, 12 minutes, with a war chest of the match, the same for all, filled through the match;
// its merchants build, raise their cap, fire, ally and send troops as in the week.
const START = Date.UTC(2026, 10, 9, 18, 0);
const SEC = 1_000;
const MIN = 60 * SEC;
const chest = {
  start: 60,
  perDay: 20,
  cap: 120,
  // A payment each 120 minutes of the match's own time: 2 minutes of real time at 60 times.
  everyMinutes: 120,
  prices: { rocca: 40, borgo: 50, porto: 30, bombarda: 110, mura: 50, cap: 60 },
};
const skirmish = {
  minutes: 12,
  speed: 60,
  stepMinutes: 5,
  players: 8,
  cellsPerPlayer: 30,
  lobbySeconds: 60,
  troops: 60,
  recruit: { base: 60, perCell: 6, perCity: 12 },
  glory: [60, 40, 25, 10],
  chest,
};
const config = () => {
  const cfg = makeContext({
    terraferma: {
      ...testTerraferma,
      skirmish,
      // A fort for each cell held: one fits on the land of the start.
      buildings: { rocca: { price: 4_000, defenseBps: 16_000, perCells: 1 } },
    } as WorldSettingsInput["terraferma"],
  }).settings.terraferma;
  if (!cfg?.skirmish) throw new Error("no skirmish");
  return cfg;
};

describe("the Battle's war chest", () => {
  it("gives every merchant of the match the same chest, filled through the match", () => {
    const sk = createSkirmish(config(), "seed", ["ada", "bob"], START);
    expect(chestOf(sk.state, sk.cfg, "ada", sk.state.clock)).toBe(60);
    expect(chestOf(sk.state, sk.cfg, "bob", sk.state.clock)).toBe(60);
    // 4 minutes of real time: 240 minutes of the match, two payments.
    advanceSkirmish(sk, START + 4 * MIN);
    expect(chestOf(sk.state, sk.cfg, "ada", sk.state.clock)).toBe(100);
  });
});

describe("the Battle's orders", () => {
  it("builds for écus of the match", () => {
    const sk = createSkirmish(config(), "seed", ["ada", "bob"], START);
    const cell = cellsOf(sk.state, "ada")[1] as number;
    expect(skirmishAct(sk, "ada", { type: "terraBuild", cell, kind: "rocca" }, START + SEC)).toBe(
      true,
    );
    expect(sk.state.buildings?.[cell]?.kind).toBe("rocca");
    expect(chestOf(sk.state, sk.cfg, "ada", sk.state.clock)).toBe(20);
  });
  it("raises the cap, allies and sends troops", () => {
    const sk = createSkirmish(config(), "seed", ["ada", "bob"], START);
    expect(skirmishAct(sk, "ada", { type: "terraRaise" }, START + SEC)).toBe(true);
    expect(skirmishAct(sk, "ada", { type: "terraAlly", other: "bob" }, START + SEC)).toBe(true);
    expect(skirmishAct(sk, "bob", { type: "terraAccept", from: "ada" }, START + SEC)).toBe(true);
    expect(skirmishAct(sk, "ada", { type: "terraSend", to: "bob", count: 5 }, START + SEC)).toBe(
      true,
    );
  });
  it("refuses what the match does not allow, and the computer's houses", () => {
    const sk = createSkirmish(config(), "seed", ["ada"], START);
    expect(skirmishAct(sk, "bot:1", { type: "terraRaise" }, START + SEC)).toBe(false);
    expect(skirmishAct(sk, "ada", { type: "terraRaise" }, START + SEC)).toBe(true);
    // The chest is empty after the cap (60 of 60).
    expect(skirmishAct(sk, "ada", { type: "terraRaise" }, START + SEC)).toBe(false);
  });
});
