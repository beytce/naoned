import { parseEmpireSettings, venice1450Empire } from "@comptoirs/engine";
import { describe, expect, it } from "vitest";
import { evaluate } from "../src/empire/report.js";
import { DEFAULT_EMPIRE_OPTIONS, runEmpire } from "../src/empire/run.js";

const small = (seed: number) =>
  runEmpire({ ...DEFAULT_EMPIRE_OPTIONS, seed, months: 3, cohortSize: 30, cohortMonths: [0, 1] });

describe("the 24-month model simulator (CADRAGE-v3 § 13)", () => {
  it("reads Venice's empire settings", () => {
    const s = parseEmpireSettings(venice1450Empire);
    expect(s.casa).toHaveLength(20);
    expect(s.regions).toHaveLength(10);
    for (let i = 1; i < s.casa.length; i++)
      expect(s.casa[i]?.costDucats ?? 0n).toBeGreaterThan(s.casa[i - 1]?.costDucats ?? 0n);
  });

  it("is deterministic for a seed", () => {
    expect(small(4).daily).toEqual(small(4).daily);
  });

  it("never makes nor loses a denier outside its ledger", () => {
    expect(small(2).violations).toEqual([]);
  });

  it("lets the houses grow, sail and win expeditions", () => {
    const r = small(3);
    const hs = r.world.houses;
    expect(Math.max(...hs.map((h) => h.casa))).toBeGreaterThan(9);
    expect(hs.reduce((n, h) => n + h.voyagesDone, 0)).toBeGreaterThan(0);
    expect(hs.reduce((n, h) => n + h.expeditionsWon, 0)).toBeGreaterThan(0);
  });

  it("judges the ten targets", () => {
    const checks = evaluate(small(1));
    expect(checks).toHaveLength(11);
    for (const c of checks) expect(c.value).not.toBe("");
  });
});
