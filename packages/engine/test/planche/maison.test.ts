import { describe, expect, it } from "vitest";
import {
  type MaisonRules,
  type PlancheSetup,
  maisonCommerce,
  maisonLevel,
  maisonUnlocks,
  maisonWeek,
  plancheBuild,
  plancheForced,
  plancheFreeBobbins,
  plancheInit,
  plancheSetLevel,
  plancheThread,
} from "../../src/index.js";

const HOUR = 3_600_000;
const T0 = Date.parse("2026-11-16T00:00:00Z");

/** The fixture's growth: a short curve of 6 levels, three titles, what each level opens. */
const rules = (): MaisonRules => ({
  curve: 10,
  maxLevel: 6,
  titles: [
    { from: 1, name: "Échoppe" },
    { from: 3, name: "Maison" },
    { from: 5, name: "Palais" },
  ],
  unlocks: [
    { level: 1, bobbins: 1, tiles: 5, tier: 1, towers: 1 },
    { level: 2, bobbins: 2 },
    { level: 4, tier: 2, towers: 2, tiles: 6 },
  ],
  weeklyCap: 100,
  catchUpBps: 5_000,
  commerce: { perDucats: 100, dailyCap: 10 },
});

/** The fixture's board: two houses, a town, two passages, an island with a workshop of each tier. */
function setup(): PlancheSetup {
  return {
    width: 12,
    height: 8,
    sliceMs: HOUR,
    goods: { sable: "Sable", verre: "Verre" },
    houses: [
      { id: "ana", name: "Ana", robot: false, x: 5, y: 4, makes: {}, soil: { sable: 1 } },
      { id: "ben", name: "Ben", robot: true, x: 6, y: 5, makes: {}, soil: { sable: 1 } },
    ],
    cities: [
      {
        id: "bourg",
        name: "Bourg",
        x: 1,
        y: 4,
        via: [],
        wants: {
          sable: { price: 100, floorBps: 3_000, cap: 100, regenPerHour: 10 },
          verre: { price: 500, floorBps: 3_000, cap: 100, regenPerHour: 10 },
        },
      },
      {
        id: "loin",
        name: "Loin",
        x: 10,
        y: 6,
        via: [],
        wants: { verre: { price: 900, floorBps: 3_000, cap: 100, regenPerHour: 10 } },
      },
    ],
    passages: [
      { id: "p1", name: "P1", x: 8, y: 5, holder: "corsair:A", tollBps: 0, board: "b", seals: 1 },
      { id: "p2", name: "P2", x: 8, y: 3, holder: "corsair:B", tollBps: 0, board: "b", seals: 1 },
    ],
    ile: {
      startTiles: ["0,0", "1,0", "0,1"],
      maxTiles: 36,
      tileCost: { base: 100, growthBps: 0 },
      levelYieldBps: [10_000, 15_000, 20_000],
      workshops: {
        pit: {
          name: "Sablière",
          tier: 1,
          terrain: "sable",
          inputs: {},
          outputs: { sable: 1 },
          lotsPerHour: 1,
          cost: [100, 200, 300],
          buildMs: [0, 0, 0],
        },
        kiln: {
          name: "Verrerie",
          tier: 2,
          terrain: "sable",
          inputs: { sable: 1 },
          outputs: { verre: 1 },
          lotsPerHour: 1,
          cost: [100, 200, 300],
          buildMs: [0, 0, 0],
        },
      },
      bonus: { terrainBps: 0, supplierBps: 0, nuisanceBps: 0 },
    },
    maison: rules(),
    rules: {
      bobbins: 5,
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

// The growth of the house (docs/plan-progression-maison.md M1).
describe("the house's level", () => {
  it("climbs a slowing curve, never back, and gives its title", () => {
    const R = rules();
    expect(maisonLevel(R, 0)).toMatchObject({ level: 1, from: 0, to: 10, title: "Échoppe" });
    expect(maisonLevel(R, 10).level).toBe(2);
    expect(maisonLevel(R, 39).level).toBe(2);
    expect(maisonLevel(R, 40)).toMatchObject({ level: 3, from: 40, to: 90, title: "Maison" });
    expect(maisonLevel(R, 250).title).toBe("Palais");
    // Never beyond the last level.
    expect(maisonLevel(R, 1_000_000)).toMatchObject({ level: 6, to: null });
  });

  it("opens what each level opens, keeping what the earlier ones opened", () => {
    const R = rules();
    expect(maisonUnlocks(R, 1)).toEqual({ bobbins: 1, tiles: 5, tier: 1, towers: 1 });
    expect(maisonUnlocks(R, 3)).toEqual({ bobbins: 2, tiles: 5, tier: 1, towers: 1 });
    expect(maisonUnlocks(R, 6)).toEqual({ bobbins: 2, tiles: 6, tier: 2, towers: 2 });
  });
});

describe("the week's Prestige", () => {
  it("is capped each week; what was not earned under the cap is half carried to the next", () => {
    const R = rules();
    expect(maisonWeek(R, 140, 0)).toEqual({ credited: 100, carry: 0 });
    // A quiet week: 30 earned, 70 left under the cap, 35 carried.
    expect(maisonWeek(R, 30, 0)).toEqual({ credited: 30, carry: 35 });
    // The next week may go 35 over the cap.
    expect(maisonWeek(R, 160, 35)).toEqual({ credited: 135, carry: 0 });
  });

  it("gives a little for the day's trade, capped each day", () => {
    const R = rules();
    // 100 ducats a point: 4 300 ducats sold, 43 points, but 10 at most.
    expect(maisonCommerce(R, 4_300n * 100n)).toBe(10);
    expect(maisonCommerce(R, 550n * 100n)).toBe(5);
    expect(maisonCommerce(R, 0n)).toBe(0);
  });
});

describe("the level on the board", () => {
  it("gives a house its bobbins, the size of its island, its workshops and its towers", () => {
    const S = setup();
    let s = plancheInit(S, T0);
    // At level 1: one bobbin.
    expect(plancheFreeBobbins(S, s, "ana")).toBe(1);
    s = plancheThread(S, s, "ana", "bourg", "sable", T0);
    expect(() => plancheThread(S, s, "ana", "bourg", "verre", T0)).toThrow("planche_no_bobbin");
    // The works of the second tier are not open yet.
    expect(() => plancheBuild(S, s, "ana", "kiln", "1,0", T0)).toThrow("planche_level");
    s = plancheSetLevel(S, s, "ana", 4);
    expect(s.houses.ana?.level).toBe(4);
    expect(plancheFreeBobbins(S, s, "ana")).toBe(1);
    s = plancheBuild(S, s, "ana", "kiln", "1,0", T0);
    expect(s.houses.ana?.ile?.tiles["1,0"]?.building?.type).toBe("kiln");
    // One tower held at level 1, a second at level 4.
    s = plancheForced(S, s, "ben", "p1", T0);
    s = plancheForced(S, s, "ben", "p2", T0);
    expect(s.passages.p1?.holder).toBe("ben");
    expect(s.passages.p2?.holder).not.toBe("ben");
    s = plancheForced(S, s, "ana", "p2", T0);
    s = plancheForced(S, s, "ana", "p1", T0);
    expect(s.passages.p1?.holder).toBe("ana");
    expect(s.passages.p2?.holder).toBe("ana");
  });

  it("never takes away what a level gave: a lower level asked is refused", () => {
    const S = setup();
    const s = plancheSetLevel(S, plancheInit(S, T0), "ana", 4);
    expect(() => plancheSetLevel(S, s, "ana", 2)).toThrow("planche_level_back");
  });
});
