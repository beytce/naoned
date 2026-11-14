import { describe, expect, it } from "vitest";
import {
  type MaisonRules,
  type PlancheSetup,
  plancheBuild,
  plancheInit,
  plancheInvariant,
  plancheSetLevel,
  plancheUpgrade,
} from "../../src/index.js";

const HOUR = 3_600_000;
const T0 = Date.parse("2026-11-16T00:00:00Z");

/** The fixture's growth: the works at level 3, the grand works (tier 3) at level 5. */
const growth = (): MaisonRules => ({
  curve: 10,
  maxLevel: 6,
  titles: [{ from: 1, name: "Échoppe" }],
  unlocks: [
    { level: 1, bobbins: 1, tiles: 9, tier: 1, towers: 1 },
    { level: 5, tier: 3 },
  ],
  weeklyCap: 100,
  catchUpBps: 0,
  commerce: { perDucats: 100, dailyCap: 10 },
  gains: {
    rival: 0,
    placeTop: 0,
    placeStep: 0,
    seal: 0,
    guardHours: 10,
    guardCap: 0,
    laurel: 0,
    doge: 0,
  },
});

function setup(): PlancheSetup {
  const work = (tier: number, level: number, cost: number) => ({
    name: "Ouvrage",
    tier,
    terrain: "pre" as const,
    inputs: {},
    outputs: {},
    lotsPerHour: 0,
    cost: [cost],
    buildMs: [HOUR],
    level,
    ouvrage: { growthBps: 5_000 },
  });
  return {
    width: 8,
    height: 6,
    sliceMs: HOUR,
    goods: { sable: "Sable" },
    houses: [{ id: "ana", name: "Ana", robot: false, x: 3, y: 3, makes: {}, soil: { pre: 1 } }],
    cities: [],
    passages: [],
    ile: {
      startTiles: ["0,0", "1,0", "0,1", "1,1", "2,0"],
      maxTiles: 9,
      tileCost: { base: 100, growthBps: 0 },
      levelYieldBps: [10_000, 15_000, 20_000],
      workshops: {
        fontaine: work(1, 3, 1_000),
        loggia: work(1, 3, 2_000),
        basilique: work(3, 5, 10_000),
      },
      bonus: { terrainBps: 0, supplierBps: 0, nuisanceBps: 0 },
    },
    maison: growth(),
    rules: {
      bobbins: 1,
      store: 100,
      startStock: 0,
      startDucats: 100_000,
      threadPerHour: 10,
      patinaBpsPerDay: 0,
      patinaMaxBps: 0,
      tollMaxBps: 1_500,
      tollBurnBps: 3_000,
      freeAfterForceMs: 24 * HOUR,
      rewindMsPerTile: 60_000,
    },
  };
}

// The works, the ducats' sink (docs/plan-economie.md C3).
describe("the works of an island", () => {
  it("open at their level, cost more with each one built, and make nothing", () => {
    const S = setup();
    let s = plancheInit(S, T0);
    expect(() => plancheBuild(S, s, "ana", "fontaine", "1,0", T0)).toThrow("planche_level");
    s = plancheSetLevel(S, s, "ana", 3);
    const before = s.houses.ana?.ducats ?? 0n;
    s = plancheBuild(S, s, "ana", "fontaine", "1,0", T0);
    expect(before - (s.houses.ana?.ducats ?? 0n)).toBe(1_000n);
    // The second costs half as much again: its own price, × 1.5 for the one already built.
    const mid = s.houses.ana?.ducats ?? 0n;
    s = plancheBuild(S, s, "ana", "loggia", "0,1", T0);
    expect(mid - (s.houses.ana?.ducats ?? 0n)).toBe(3_000n);
    // A third fountain: × 1.5 twice.
    const last = s.houses.ana?.ducats ?? 0n;
    s = plancheBuild(S, s, "ana", "fontaine", "1,1", T0);
    expect(last - (s.houses.ana?.ducats ?? 0n)).toBe(2_250n);
    // A work is not raised.
    expect(() => plancheUpgrade(S, s, "ana", "1,0", T0 + 2 * HOUR)).toThrow("ile_top");
    // The ducats are spent: the lagoon's sum still holds.
    expect(plancheInvariant(s)).toBe(true);
  });

  it("keeps the grand works for the high level, and asks a plan where the board asks one", () => {
    const S = setup();
    let s = plancheSetLevel(S, plancheInit(S, T0), "ana", 4);
    expect(() => plancheBuild(S, s, "ana", "basilique", "1,0", T0)).toThrow("planche_level");
    s = plancheSetLevel(S, s, "ana", 5);
    s = plancheBuild(S, s, "ana", "basilique", "1,0", T0);
    expect(s.houses.ana?.ile?.tiles["1,0"]?.building?.type).toBe("basilique");
  });
});
