import { describe, expect, it } from "vitest";
import {
  effectOf,
  moduleEffectBps,
  parseEmpireSettings,
  researchCost,
  researchMinutesOf,
} from "../../src/index.js";
import { testEmpire } from "../fixture.js";

const s = parseEmpireSettings(testEmpire);

describe("the modules (profondeur.md § B)", () => {
  it("give their first level's effect, then more at each level, nothing unequipped", () => {
    expect(moduleEffectBps("hold", 0, s)).toBe(0);
    expect(moduleEffectBps("hold", 1, s)).toBe(1_000);
    expect(moduleEffectBps("hold", 10, s)).toBe(5_500);
    expect(() => moduleEffectBps("unknown", 1, s)).toThrow();
  });

  it("add up by effect", () => {
    expect(effectOf({ hold: 2 }, "capacity", s)).toBe(1_500);
    expect(effectOf({}, "capacity", s)).toBe(0);
  });

  it("are researched longer and dearer at each level, no plan asked (1 November)", () => {
    expect(researchCost(1, s)).toBe(200_000n);
    expect(researchCost(2, s)).toBe(280_000n);
    expect(researchMinutesOf(10, s)).toBe(14_400);
    expect(researchMinutesOf(12, s)).toBe(14_400);
  });
});
