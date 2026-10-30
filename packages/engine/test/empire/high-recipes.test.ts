import { describe, expect, it } from "vitest";
import { highRecipeRaw, parseEmpireSettings } from "../../src/index.js";
import { testEmpire } from "../fixture.js";

const s = parseEmpireSettings({
  ...testEmpire,
  highRecipes: { fromLevel: 4, rawPerLevelBps: 2_500, goods: ["wheat", "salt"] },
});

describe("the high recipes eat Venetia's raw goods", () => {
  it("asks nothing below the threshold", () => {
    expect(highRecipeRaw(1, 100, s)).toBe(0);
    expect(highRecipeRaw(3, 100, s)).toBe(0);
  });

  it("asks a share per unit made, growing with each level from the threshold", () => {
    expect(highRecipeRaw(4, 100, s)).toBe(25);
    expect(highRecipeRaw(5, 100, s)).toBe(50);
    expect(highRecipeRaw(8, 100, s)).toBe(125);
  });

  it("asks whole units, rounded up, and nothing for nothing made", () => {
    expect(highRecipeRaw(4, 1, s)).toBe(1);
    expect(highRecipeRaw(4, 3, s)).toBe(1);
    expect(highRecipeRaw(4, 5, s)).toBe(2);
    expect(highRecipeRaw(6, 0, s)).toBe(0);
  });

  it("asks nothing in a world without the rule", () => {
    expect(highRecipeRaw(20, 100, parseEmpireSettings(testEmpire))).toBe(0);
  });
});
