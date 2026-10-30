import { describe, expect, it } from "vitest";
import { localBookOf, parseEmpireSettings, rawBonusBps } from "../../src/index.js";
import { testEmpire } from "../fixture.js";

const s = parseEmpireSettings({
  ...testEmpire,
  counters: { maxLevel: 10, bookStepBps: 5_000 },
  newcomers: { rawBonusBps: 2_000, untilCasa: 8 },
});

describe("the counters' private books", () => {
  it("ask nothing without a counter, their region's base at level 1, more at each level", () => {
    expect(localBookOf("veneto", 0, s)).toBe(0);
    expect(localBookOf("veneto", 1, s)).toBe(40);
    expect(localBookOf("veneto", 3, s)).toBe(80);
  });
});

describe("the young houses' raw goods (CADRAGE-v3 § 6)", () => {
  it("sell dearer up to the Casa 8, no more after", () => {
    expect(rawBonusBps(1, s)).toBe(2_000);
    expect(rawBonusBps(8, s)).toBe(2_000);
    expect(rawBonusBps(9, s)).toBe(0);
  });
});
