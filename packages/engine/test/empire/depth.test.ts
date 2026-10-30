import { describe, expect, it } from "vitest";
import {
  Rng,
  cargoLoss,
  corsairRiskBps,
  depositStock,
  effectOf,
  expeditionSuccessBps,
  extract,
  moduleEffectBps,
  parseEmpireSettings,
  plansFor,
  relicsOf,
  researchCost,
  researchMinutesOf,
  settleColleganza,
  teamRate,
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

  it("add up by effect over what a ship carries", () => {
    expect(effectOf({ hold: 2, sails: 3, crossbow: 1 }, "capacity", s)).toBe(1_500);
    expect(effectOf({ hold: 2, sails: 3, crossbow: 1 }, "speed", s)).toBe(1_600);
    expect(effectOf({}, "speed", s)).toBe(0);
  });

  it("are researched longer and dearer at each level, with plans from level 4", () => {
    expect(researchCost(1, s)).toBe(200_000n);
    expect(researchCost(2, s)).toBe(280_000n);
    expect(researchMinutesOf(10, s)).toBe(14_400);
    expect(researchMinutesOf(12, s)).toBe(14_400);
    expect(plansFor(3, s)).toBe(0);
    expect(plansFor(4, s)).toBe(2);
    expect(plansFor(6, s)).toBe(6);
  });
});

describe("the deposits (profondeur.md § A)", () => {
  it("draw a stock between the bounds", () => {
    const rng = new Rng(7);
    for (let i = 0; i < 50; i++) {
      const stock = depositStock(rng, s);
      expect(stock).toBeGreaterThanOrEqual(200);
      expect(stock).toBeLessThanOrEqual(1_000);
    }
  });

  it("give a team more with its yield module", () => {
    expect(teamRate(0, s)).toBe(10);
    expect(teamRate(5_000, s)).toBe(15);
  });

  it("share what is there among the teams, in whole units, never more than the stock", () => {
    expect(extract(1_000, [10, 30], 2)).toEqual({ taken: [20, 60], left: 920 });
    const scarce = extract(50, [10, 30], 2);
    expect(scarce.taken.reduce((a, x) => a + x, 0)).toBe(50);
    expect(scarce.left).toBe(0);
    expect(scarce.taken[1]).toBeGreaterThan(scarce.taken[0] ?? 0);
    expect(extract(0, [10], 5)).toEqual({ taken: [0], left: 0 });
  });
});

describe("the colleganza (profondeur.md § E)", () => {
  it("returns the capital and shares the profit: a quarter to the traveller", () => {
    const r = settleColleganza([30_000n, 10_000n], 60_000n, s);
    expect(r.traveller).toBe(5_000n);
    expect(r.investors).toEqual([41_250n, 13_750n]);
  });

  it("shares a loss by the stakes, the traveller earning nothing", () => {
    const r = settleColleganza([30_000n, 10_000n], 20_000n, s);
    expect(r.traveller).toBe(0n);
    expect(r.investors).toEqual([15_000n, 5_000n]);
  });

  it("never makes or loses a denier: all that comes back is shared", () => {
    for (const proceeds of [0n, 1n, 39_999n, 40_000n, 40_001n, 123_457n]) {
      const r = settleColleganza([30_001n, 9_999n, 7n], proceeds, s);
      const total = r.traveller + r.investors.reduce((a, x) => a + x, 0n);
      expect(total).toBe(proceeds);
    }
  });
});

describe("the expeditions (profondeur.md § C)", () => {
  it("succeed at the base chance with the asked strength, more with more, never surely", () => {
    expect(expeditionSuccessBps(2, 25, s)).toBe(6_000);
    expect(expeditionSuccessBps(2, 50, s)).toBe(9_500);
    expect(expeditionSuccessBps(2, 0, s)).toBe(0);
    expect(expeditionSuccessBps(1, 1_000, s)).toBe(9_500);
  });

  it("give more relics at higher tiers, and know no tier past the table", () => {
    expect(relicsOf(1, s)).toBe(1);
    expect(relicsOf(3, s)).toBe(3);
    expect(() => relicsOf(4, s)).toThrow();
  });
});

describe("the corsairs (profondeur.md § H)", () => {
  it("never sail in Venetia", () => {
    expect(corsairRiskBps("veneto", 0, s)).toBe(0);
  });

  it("threaten far routes, half as much for each escort's worth", () => {
    expect(corsairRiskBps("levante", 0, s)).toBe(1_200);
    expect(corsairRiskBps("levante", 20, s)).toBe(600);
    expect(corsairRiskBps("levante", 40, s)).toBe(300);
  });

  it("take a share of the cargo, never the ship", () => {
    expect(cargoLoss(100_000n, s)).toBe(30_000n);
    expect(cargoLoss(0n, s)).toBe(0n);
  });
});
