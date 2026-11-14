import { describe, expect, it } from "vitest";
import {
  type IleRules,
  type IleState,
  ileBonusBps,
  ileBuild,
  ileBuyTile,
  ileBuyable,
  ileInit,
  ileMove,
  ileRates,
  ileSlice,
  ileSupplies,
  ileTileCost,
  ileUpgrade,
} from "../../src/index.js";

const HOUR = 3_600_000;
const MIN = 60_000;

/** The rules of the test: a raw good, a worked good, a nuisance. Never Venice's. */
const R: IleRules = {
  maxTiles: 9,
  startTiles: ["0,0", "1,0", "0,1", "1,1"],
  tileCost: { base: 1_000, growthBps: 5_000 },
  levelYieldBps: [10_000, 18_000, 26_000],
  bonus: { terrainBps: 5_000, supplierBps: 2_000, nuisanceBps: -2_000 },
  workshops: {
    camp: {
      name: "Camp",
      tier: 1,
      terrain: "foret",
      inputs: {},
      outputs: { bois: 10 },
      lotsPerHour: 1,
      cost: [2_000, 8_000, 20_000],
      buildMs: [10 * MIN, HOUR, 4 * HOUR],
    },
    scierie: {
      name: "Scierie",
      tier: 2,
      terrain: "rive",
      inputs: { bois: 10 },
      outputs: { planches: 5 },
      lotsPerHour: 1,
      cost: [3_000, 9_000, 25_000],
      buildMs: [10 * MIN, HOUR, 4 * HOUR],
      nuisance: ["ferme"],
    },
    ferme: {
      name: "Ferme",
      tier: 1,
      terrain: "pre",
      inputs: {},
      outputs: { ble: 8 },
      lotsPerHour: 1,
      cost: [1_000, 4_000, 10_000],
      buildMs: [10 * MIN, HOUR, 4 * HOUR],
    },
  },
};
/** A fixed island: the terrains by tile. */
const LAND: Record<string, "foret" | "rive" | "pre" | "argile" | "sable"> = {
  "0,0": "pre",
  "1,0": "foret",
  "0,1": "rive",
  "1,1": "pre",
  "2,0": "foret",
  "2,1": "rive",
  "0,2": "sable",
  "1,2": "argile",
  "-1,0": "pre",
  "0,-1": "rive",
  "1,-1": "foret",
  "-1,1": "sable",
};
const terrain = (x: number, y: number) => LAND[`${x},${y}`] ?? "pre";
const T0 = 1_000_000;

function built(): IleState {
  let s = ileInit(R, terrain);
  s = ileBuild(R, s, "camp", "1,0", T0).ile;
  s = ileBuild(R, s, "scierie", "0,1", T0).ile;
  return s;
}
/** Runs an island for `ms` in slices of ten minutes, from a store. */
function run(s0: IleState, stock: Record<string, number>, from: number, ms: number, cap = 1_000) {
  let s = s0;
  for (let t = from; t < from + ms; t += 10 * MIN) s = ileSlice(R, s, stock, cap, 10 * MIN, t);
  return s;
}

// The island of a house (docs/plan-ile.md I1): tiles, terrains, workshops, neighbourhoods, chains.
describe("the island", () => {
  it("starts with its four tiles, the Fondaco on the first, each with its terrain", () => {
    const s = ileInit(R, terrain);
    expect(Object.keys(s.tiles).sort()).toEqual(["0,0", "0,1", "1,0", "1,1"]);
    expect(s.tiles["0,0"]?.building?.type).toBe("fondaco");
    expect(s.tiles["1,0"]?.terrain).toBe("foret");
  });

  it("offers the tiles that touch it, dearer with each one bought, up to its size", () => {
    let s = ileInit(R, terrain);
    expect(ileBuyable(R, s).sort()).toEqual([
      "-1,0",
      "-1,1",
      "0,-1",
      "0,2",
      "1,-1",
      "1,2",
      "2,0",
      "2,1",
    ]);
    expect(ileTileCost(R, s)).toBe(1_000n);
    const bought = ileBuyTile(R, s, "2,0", terrain);
    expect(bought.cost).toBe(1_000n);
    s = bought.ile;
    expect(s.tiles["2,0"]?.terrain).toBe("foret");
    expect(ileTileCost(R, s)).toBe(1_500n);
    expect(() => ileBuyTile(R, s, "5,5", terrain)).toThrow("ile_not_buyable");
    for (const k of ["2,1", "0,2", "1,2", "-1,0"]) s = ileBuyTile(R, s, k, terrain).ile;
    expect(Object.keys(s.tiles)).toHaveLength(9);
    expect(ileBuyable(R, s)).toEqual([]);
    expect(() => ileBuyTile(R, s, "0,-1", terrain)).toThrow("ile_full");
  });

  it("tells, before a workshop is laid, what each free tile would give it", () => {
    let s = ileInit(R, terrain);
    // on its own terrain: +50 %
    expect(ileBonusBps(R, s, "camp", "1,0")).toBe(5_000);
    expect(ileBonusBps(R, s, "camp", "1,1")).toBe(0);
    s = ileBuild(R, s, "camp", "1,0", T0).ile;
    // the sawmill by the shore (+50 %) and next to its supplier (+20 %)
    expect(ileBonusBps(R, s, "scierie", "0,1")).toBe(5_000);
    expect(ileBonusBps(R, s, "scierie", "1,1")).toBe(2_000);
    s = ileBuild(R, s, "ferme", "1,1", T0).ile;
    // next to a farm, the sawmill loses a fifth
    expect(ileBonusBps(R, s, "scierie", "0,1")).toBe(5_000 - 2_000);
  });

  it("tells which neighbour feeds which, the pairs the supplier's bonus rests on", () => {
    let s = ileInit(R, terrain);
    expect(ileSupplies(R, s)).toEqual([]);
    s = ileBuild(R, s, "camp", "1,0", T0).ile;
    // the Fondaco beside it feeds nothing; no sawmill yet
    expect(ileSupplies(R, s)).toEqual([]);
    s = ileBuild(R, s, "scierie", "1,1", T0).ile;
    expect(ileSupplies(R, s)).toEqual([{ from: "1,0", to: "1,1", good: "bois" }]);
  });

  it("builds on a free tile it owns only, for its price, and refuses an unknown workshop", () => {
    const s = ileInit(R, terrain);
    const r = ileBuild(R, s, "camp", "1,0", T0);
    expect(r.cost).toBe(2_000n);
    expect(r.ile.tiles["1,0"]?.building).toMatchObject({
      type: "camp",
      level: 1,
      readyAt: T0 + 10 * MIN,
    });
    expect(() => ileBuild(R, r.ile, "camp", "1,0", T0)).toThrow("ile_taken");
    expect(() => ileBuild(R, s, "camp", "4,4", T0)).toThrow("ile_not_owned");
    expect(() => ileBuild(R, s, "__proto__", "1,0", T0)).toThrow("ile_unknown");
    expect(() => ileBuild(R, s, "camp", "0,0", T0)).toThrow("ile_taken");
  });

  it("makes nothing while a workshop is being built", () => {
    const stock: Record<string, number> = {};
    run(built(), stock, T0, 10 * MIN);
    expect(stock.bois ?? 0).toBe(0);
  });

  it("makes its raw goods by the hour, its terrain's bonus counted", () => {
    const stock: Record<string, number> = {};
    run(built(), stock, T0 + 10 * MIN, 2 * HOUR);
    // the camp on the forest: 10 a lot, a lot an hour, +50 %; the sawmill takes what it needs
    const made = (stock.bois ?? 0) + 2 * (stock.planches ?? 0);
    expect(made).toBe(30);
  });

  it("works the raw into the finer good along the chain, and waits without loss when it lacks", () => {
    const stock: Record<string, number> = {};
    const s = run(built(), stock, T0 + 10 * MIN, 10 * HOUR);
    expect(stock.planches ?? 0).toBeGreaterThan(0);
    // the sawmill takes 10 wood for 5 planks: never more planks than half the wood made
    expect((stock.planches ?? 0) * 2 + (stock.bois ?? 0)).toBe(150);
    expect(ileRates(R, s, T0 + 10 * HOUR).scierie).toBeGreaterThan(0);
  });

  it("stops a workshop when the store of its good is full, and owes nothing after", () => {
    const stock: Record<string, number> = {};
    run(built(), stock, T0 + 10 * MIN, 48 * HOUR, 40);
    expect(stock.bois ?? 0).toBeLessThanOrEqual(40);
    expect(stock.planches ?? 0).toBeLessThanOrEqual(40);
  });

  it("raises a workshop a level: dearer, a while in the building, then more", () => {
    let s = built();
    const up = ileUpgrade(R, s, "1,0", T0 + HOUR);
    expect(up.cost).toBe(8_000n);
    s = up.ile;
    expect(s.tiles["1,0"]?.building).toMatchObject({ level: 2, readyAt: T0 + 2 * HOUR });
    const stock: Record<string, number> = {};
    run(s, stock, T0 + 2 * HOUR, 2 * HOUR);
    // level 2: × 1.8, on the forest + 50 %: 2.7 lots an hour, five whole lots in two hours
    expect((stock.bois ?? 0) + 2 * (stock.planches ?? 0)).toBe(50);
    expect(() =>
      ileUpgrade(R, ileUpgrade(R, s, "1,0", T0 + 3 * HOUR).ile, "1,0", T0 + 9 * HOUR),
    ).toThrow("ile_top");
    expect(() => ileUpgrade(R, s, "1,1", T0)).toThrow("ile_empty");
  });

  it("moves a workshop to a free tile, which builds again a while", () => {
    let s = built();
    s = ileMove(R, s, "1,0", "1,1", T0 + HOUR);
    expect(s.tiles["1,0"]?.building).toBeUndefined();
    expect(s.tiles["1,1"]?.building).toMatchObject({
      type: "camp",
      level: 1,
      readyAt: T0 + HOUR + 10 * MIN,
    });
    expect(() => ileMove(R, s, "0,0", "1,0", T0)).toThrow("ile_fixed");
    expect(() => ileMove(R, s, "1,1", "0,1", T0)).toThrow("ile_taken");
  });

  it("gives every rate of its workshops by the hour", () => {
    const rates = ileRates(R, built(), T0 + HOUR);
    // the sawmill by the shore (+50 %), its camp not beside it
    expect(rates).toEqual({ camp: 15, scierie: 7.5 });
  });
});
