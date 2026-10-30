import { describe, expect, it } from "vitest";
import { casaRequirementMet, parseEmpireSettings } from "../../src/index.js";
import { testEmpire } from "../fixture.js";

const s = parseEmpireSettings({
  ...testEmpire,
  casa: testEmpire.casa.map((c, i) =>
    i === 3 ? { ...c, requires: { workshops: 2, level: 3 } } : c,
  ),
});

describe("the Casa asks the empire to follow", () => {
  it("lets a level without requirement be built", () => {
    expect(casaRequirementMet(3, [1, 1], s)).toBe(true);
  });

  it("asks so many workshops at a level for the level that requires them", () => {
    expect(casaRequirementMet(4, [3, 2, 2], s)).toBe(false);
    expect(casaRequirementMet(4, [3, 3, 1], s)).toBe(true);
    expect(casaRequirementMet(4, [4, 5], s)).toBe(true);
  });
});
