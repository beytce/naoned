import { describe, expect, it } from "vitest";
import { bandOf, catchupCut, parseEmpireSettings, powerOf } from "../../src/index.js";
import { testEmpire } from "../fixture.js";

const s = parseEmpireSettings(testEmpire);

const house = {
  casa: 3,
  workshopLevels: [2, 3],
  counterLevels: [1],
  moduleLevels: [1, 2],
  staffLevels: [4],
  vehicles: 2,
};

describe("the Power (CADRAGE-v3 § 3.6)", () => {
  it("weighs what is built, modules and staff included", () => {
    // 3×50 + 5×5 + 1×20 + 3×3 + 4×2 + 2×10
    expect(powerOf(house, s)).toBe(232);
  });

  it("never reads the treasury", () => {
    const rich = { ...house, ducats: 10_000_000n };
    expect(powerOf(rich, s)).toBe(powerOf(house, s));
  });

  it("places a house in its band", () => {
    expect(bandOf(0, s)).toBe(0);
    expect(bandOf(199, s)).toBe(0);
    expect(bandOf(232, s)).toBe(1);
    expect(bandOf(5_000, s)).toBe(3);
  });
});

describe("the knowledge that spreads (CADRAGE-v3 § 6)", () => {
  it("cuts nothing while fewer than half the active houses own a level", () => {
    expect(catchupCut(0, s)).toEqual({ costCutBps: 0, timeCutBps: 0 });
    expect(catchupCut(5_000, s)).toEqual({ costCutBps: 0, timeCutBps: 0 });
  });

  it("cuts more as the level spreads, up to its bounds when all own it", () => {
    expect(catchupCut(7_500, s)).toEqual({ costCutBps: 2_500, timeCutBps: 3_000 });
    expect(catchupCut(10_000, s)).toEqual({ costCutBps: 5_000, timeCutBps: 6_000 });
  });

  it("never lowers the top: a level owned by few is never cheaper", () => {
    expect(catchupCut(100, s).costCutBps).toBe(0);
  });
});
