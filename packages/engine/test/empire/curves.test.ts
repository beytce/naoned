import { describe, expect, it } from "vitest";
import {
  buildMinutesOf,
  casaLevelOf,
  levelCost,
  lotYieldBps,
  parseEmpireSettings,
  paybackRatio,
} from "../../src/index.js";
import { testEmpire } from "../fixture.js";

const s = parseEmpireSettings(testEmpire);

describe("the workshops' curves (CADRAGE-v3 § 3.2)", () => {
  it("yields n × (1 + k × (n − 1)) lots of base, in basis points", () => {
    expect(lotYieldBps(1, s)).toBe(10_000);
    expect(lotYieldBps(5, s)).toBe(80_000);
    expect(lotYieldBps(10, s)).toBe(235_000);
    expect(lotYieldBps(20, s)).toBe(770_000);
  });

  it("costs base × g^(n − 1), in whole deniers, rounded up", () => {
    expect(levelCost(1, s)).toBe(500_000n);
    expect(levelCost(2, s)).toBe(650_000n);
    expect(levelCost(3, s)).toBe(845_000n);
    for (let n = 1; n <= 20; n++) expect(typeof levelCost(n, s)).toBe("bigint");
  });

  it("grows its cost faster than its yield: the payback lengthens by itself", () => {
    let last = 0;
    for (let n = 2; n <= 20; n++) {
      const ratio = paybackRatio(n, s);
      expect(ratio).toBeGreaterThan(last);
      last = ratio;
    }
  });

  it("reads the building minutes of a level, the last one beyond the table", () => {
    expect(buildMinutesOf(1, s)).toBe(1);
    expect(buildMinutesOf(5, s)).toBe(60);
    expect(buildMinutesOf(9, s)).toBe(60);
  });
});

describe("the Casa (CADRAGE-v3 § 3.1)", () => {
  it("reads a level's cost, building time and what it opens", () => {
    expect(casaLevelOf(1, s).costDucats).toBe(0n);
    expect(casaLevelOf(3, s).opens).toEqual(["scuola"]);
    expect(casaLevelOf(4, s).buildSlots).toBe(2);
  });

  it("refuses a level outside the table", () => {
    expect(() => casaLevelOf(0, s)).toThrow();
    expect(() => casaLevelOf(6, s)).toThrow();
  });
});
