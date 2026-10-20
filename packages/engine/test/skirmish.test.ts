import { describe, expect, it } from "vitest";
import {
  type WorldSettingsInput,
  advanceSkirmish,
  cellsOf,
  createSkirmish,
  skirmishAct,
  toReal,
} from "../src/index.js";
import { testTerraferma } from "./fixture.js";
import { makeContext } from "./helpers.js";

const START = Date.UTC(2026, 9, 20, 18, 0);
const SEC = 1_000;
const skirmish = {
  minutes: 15,
  speed: 60,
  stepMinutes: 5,
  players: 6,
  cellsPerPlayer: 30,
  lobbySeconds: 30,
  troops: 60,
  recruit: { base: 60, perCell: 6, perCity: 12 },
  glory: [200, 120, 80, 30],
};
const config = () => {
  const cfg = makeContext({
    terraferma: { ...testTerraferma, skirmish } as WorldSettingsInput["terraferma"],
  }).settings.terraferma;
  if (!cfg?.skirmish) throw new Error("no skirmish");
  return cfg;
};

describe("a skirmish", () => {
  it("sets everyone down, fills the field with houses of the computer, plays them, and ends", () => {
    const sk = createSkirmish(config(), "seed", ["ada", "bob"], START);
    expect(Object.keys(sk.state.players).filter((id) => id.startsWith("bot:"))).toHaveLength(4);
    expect(cellsOf(sk.state, "ada").length).toBeGreaterThan(0);
    // Ada sends half her troops at the free land.
    const aim = sk.state.owner.findIndex(
      (o, i) =>
        o === null &&
        sk.state.map.land[i] &&
        sk.state.owner.some((p, j) => p === "ada" && Math.abs(i - j) === 1),
    );
    expect(
      skirmishAct(sk, "ada", { type: "terraFront", aim, shareBps: 5_000 }, START + 5 * SEC),
    ).toBe(true);
    advanceSkirmish(sk, START + 60 * SEC);
    expect(cellsOf(sk.state, "ada").length).toBeGreaterThan(7);
    // The computer's houses march too.
    expect(cellsOf(sk.state, "bot:1").length).toBeGreaterThan(7);
    advanceSkirmish(sk, START + 16 * 60 * SEC);
    expect(sk.result).toBeDefined();
    expect(sk.result?.ranking.map((r) => r.id).sort()).toEqual(
      ["ada", "bob", "bot:1", "bot:2", "bot:3", "bot:4"].sort(),
    );
    expect(sk.result?.ranking[0]?.glory).toBe(200);
    // Times shown to people are real times.
    expect(toReal(sk, sk.virtualStart + 60 * 60_000)).toBe(START + 60 * SEC);
  });
});
