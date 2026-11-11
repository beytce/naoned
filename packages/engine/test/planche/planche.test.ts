import { describe, expect, it } from "vitest";
import {
  type PlancheSetup,
  type PlancheState,
  plancheAdvance,
  plancheBuild,
  plancheBuyTile,
  plancheForced,
  plancheFreeBobbins,
  plancheInit,
  plancheInvariant,
  planchePrice,
  plancheRobot,
  plancheRouteOpen,
  plancheSupply,
  plancheThread,
  plancheToll,
  plancheUnthread,
  plancheUpgrade,
} from "../../src/index.js";

const HOUR = 3_600_000;
const DAY = 24 * HOUR;

/** A small board of the fixture: two houses, two towns, a passage held by a corsair. */
function setup(over: Partial<PlancheSetup["rules"]> = {}): PlancheSetup {
  return {
    width: 12,
    height: 8,
    sliceMs: HOUR / 6,
    goods: { verre: "Verre", drap: "Drap" },
    houses: [
      { id: "ana", name: "Ana", robot: false, x: 5, y: 4, makes: { verre: 12 } },
      { id: "ben", name: "Ben", robot: true, x: 6, y: 5, makes: { verre: 12 } },
    ],
    cities: [
      {
        id: "padoue",
        name: "Padoue",
        x: 1,
        y: 4,
        via: [],
        wants: { verre: { price: 1_000, floorBps: 2_000, cap: 100, regenPerHour: 5 } },
      },
      {
        id: "raguse",
        name: "Raguse",
        x: 10,
        y: 6,
        via: ["segna"],
        wants: { verre: { price: 4_000, floorBps: 5_000, cap: 200, regenPerHour: 10 } },
      },
    ],
    passages: [
      {
        id: "segna",
        name: "Segna",
        x: 8,
        y: 5,
        holder: "corsair:ivo",
        tollBps: 1_000,
        board: "segna",
        seals: 2,
      },
    ],
    rules: {
      bobbins: 2,
      store: 200,
      startStock: 50,
      startDucats: 0,
      threadPerHour: 10,
      patinaBpsPerDay: 500,
      patinaMaxBps: 5_000,
      tollMaxBps: 1_500,
      tollBurnBps: 3_000,
      freeAfterForceMs: DAY,
      rewindMsPerTile: 60_000,
      ...over,
    },
  };
}
const T0 = Date.parse("2026-11-11T08:00:00Z");
const ducats = (s: PlancheState, id: string) => s.houses[id]?.ducats ?? -1n;
const stock = (s: PlancheState, id: string, good = "verre") => s.houses[id]?.stock[good] ?? -1;

// The shared board and its threads (docs/CADRAGE-v4.md §§ 3, 5, 6, 7; docs/plan-planche.md).
describe("the board and its threads", () => {
  it("starts every house with its stock, its bobbins, and every town's demand full", () => {
    const S = setup();
    const s = plancheInit(S, T0);
    expect(stock(s, "ana")).toBe(50);
    expect(plancheFreeBobbins(S, s, "ana")).toBe(2);
    expect(planchePrice(S, s, "padoue", "verre")).toBe(1_000);
    expect(plancheInvariant(s)).toBe(true);
  });

  it("makes goods by the hour, up to the store and no further", () => {
    const S = setup();
    const s = plancheAdvance(S, plancheInit(S, T0), T0 + 5 * HOUR);
    expect(stock(s, "ana")).toBe(110);
    expect(stock(plancheAdvance(S, s, T0 + 3 * DAY), "ana")).toBe(200);
  });

  it("stretches a thread on a free bobbin, and none without one", () => {
    const S = setup({ bobbins: 1 });
    const s = plancheThread(S, plancheInit(S, T0), "ana", "padoue", "verre", T0);
    expect(s.houses.ana?.threads).toHaveLength(1);
    expect(plancheFreeBobbins(S, s, "ana")).toBe(0);
    expect(() => plancheThread(S, s, "ana", "padoue", "verre", T0)).toThrow("planche_no_bobbin");
  });

  it("refuses a town, a good or a house it does not know", () => {
    const S = setup();
    const s = plancheInit(S, T0);
    expect(() => plancheThread(S, s, "ana", "nulle", "verre", T0)).toThrow("planche_unknown");
    expect(() => plancheThread(S, s, "ana", "padoue", "drap", T0)).toThrow("planche_not_wanted");
    expect(() => plancheThread(S, s, "__proto__", "padoue", "verre", T0)).toThrow(
      "planche_unknown",
    );
  });

  it("delivers along a thread: the stock goes, the ducats come, the town's price falls", () => {
    const S = setup();
    let s = plancheThread(S, plancheInit(S, T0), "ana", "padoue", "verre", T0);
    s = plancheAdvance(S, s, T0 + 2 * HOUR);
    // 12 made and 10 sent an hour: the stock grows by 2 an hour
    expect(stock(s, "ana")).toBe(54);
    expect(ducats(s, "ana")).toBeGreaterThan(15_000n);
    expect(ducats(s, "ana")).toBeLessThan(20_000n);
    expect(planchePrice(S, s, "padoue", "verre")).toBeLessThan(1_000);
    expect(s.houses.ana?.delivered).toBe(20);
    expect(plancheInvariant(s)).toBe(true);
  });

  it("shares a town's demand between the houses that serve it: each sells for less", () => {
    const S = setup();
    const alone = plancheAdvance(
      S,
      plancheThread(S, plancheInit(S, T0), "ana", "padoue", "verre", T0),
      T0 + 8 * HOUR,
    );
    let both = plancheThread(S, plancheInit(S, T0), "ana", "padoue", "verre", T0);
    both = plancheThread(S, both, "ben", "padoue", "verre", T0);
    both = plancheAdvance(S, both, T0 + 8 * HOUR);
    expect(ducats(both, "ana")).toBeLessThan(ducats(alone, "ana"));
    expect(ducats(both, "ana")).toBe(ducats(both, "ben"));
    expect(planchePrice(S, both, "padoue", "verre")).toBeLessThan(
      planchePrice(S, alone, "padoue", "verre"),
    );
  });

  it("stops selling to a town whose demand is spent, and loses nothing", () => {
    const S = setup();
    let s = plancheThread(S, plancheInit(S, T0), "ana", "padoue", "verre", T0);
    s = plancheThread(S, s, "ben", "padoue", "verre", T0);
    s = plancheAdvance(S, s, T0 + 3 * DAY);
    // the town takes 5 an hour between them once its 100 are gone
    const sold = (s.houses.ana?.delivered ?? 0) + (s.houses.ben?.delivered ?? 0);
    expect(sold).toBeLessThanOrEqual(100 + 5 * 72);
    expect(sold).toBeGreaterThan(100 + 5 * 72 - 4);
    expect(stock(s, "ana")).toBe(200);
  });

  it("gives a thread held in place its patina: it carries more each day", () => {
    const S = setup({ store: 100_000, startStock: 50_000 });
    // a town that never tires, so that only the thread's own flow is measured
    const padoue = S.cities[0];
    if (padoue)
      padoue.wants.verre = { price: 1_000, floorBps: 2_000, cap: 1_000_000, regenPerHour: 1_000 };
    const s0 = plancheThread(S, plancheInit(S, T0), "ana", "padoue", "verre", T0);
    const first = plancheAdvance(S, s0, T0 + DAY);
    const tenth = plancheAdvance(S, first, T0 + 10 * DAY);
    const eleventh = plancheAdvance(S, tenth, T0 + 11 * DAY);
    const day1 = first.houses.ana?.delivered ?? 0;
    const day11 = (eleventh.houses.ana?.delivered ?? 0) - (tenth.houses.ana?.delivered ?? 0);
    expect(day1).toBe(240);
    // ten whole days held at 5 % a day, capped at 50 %
    expect(day11).toBe(360);
  });

  it("takes a thread back: its patina is lost, its bobbin is a while coming home", () => {
    const S = setup({ bobbins: 1 });
    let s = plancheThread(S, plancheInit(S, T0), "ana", "padoue", "verre", T0);
    s = plancheUnthread(S, plancheAdvance(S, s, T0 + DAY), "ana", "padoue", "verre", T0 + DAY);
    expect(s.houses.ana?.threads).toHaveLength(0);
    expect(plancheFreeBobbins(S, s, "ana")).toBe(0);
    // four tiles away, a minute a tile: home by the next slice of time
    const back = plancheAdvance(S, s, T0 + DAY + HOUR / 6);
    expect(plancheFreeBobbins(S, back, "ana")).toBe(1);
    expect(() => plancheUnthread(S, back, "ana", "padoue", "verre", T0)).toThrow(
      "planche_no_thread",
    );
  });

  it("is the same whether the time is advanced at once or in pieces", () => {
    const S = setup();
    const s = plancheThread(S, plancheInit(S, T0), "ana", "padoue", "verre", T0);
    const once = plancheAdvance(S, s, T0 + 7 * HOUR);
    let pieces = s;
    for (let h = 1; h <= 7; h++) pieces = plancheAdvance(S, pieces, T0 + h * HOUR);
    expect(pieces).toEqual(once);
  });
});

describe("the passages", () => {
  it("shut a route a corsair holds, until the house has forced it", () => {
    const S = setup();
    const s = plancheInit(S, T0);
    expect(plancheRouteOpen(S, s, "ana", "raguse", T0)).toBe(false);
    expect(() => plancheThread(S, s, "ana", "raguse", "verre", T0)).toThrow("planche_route_shut");
    const forced = plancheForced(S, s, "ana", "segna", T0);
    expect(forced.passages.segna?.seals).toBe(1);
    expect(forced.passages.segna?.holder).toBe("corsair:ivo");
    expect(plancheRouteOpen(S, forced, "ana", "raguse", T0 + HOUR)).toBe(true);
    expect(plancheRouteOpen(S, forced, "ben", "raguse", T0 + HOUR)).toBe(false);
    // the free passage lasts a day; the thread then waits, without loss
    expect(plancheRouteOpen(S, forced, "ana", "raguse", T0 + DAY + HOUR)).toBe(false);
  });

  it("pass to the house that breaks the last seal, which then opens the route to all", () => {
    const S = setup();
    let s = plancheForced(S, plancheInit(S, T0), "ana", "segna", T0);
    s = plancheForced(S, s, "ana", "segna", T0 + HOUR);
    expect(s.passages.segna?.holder).toBe("ana");
    expect(s.passages.segna?.seals).toBe(2);
    expect(plancheRouteOpen(S, s, "ben", "raguse", T0 + 2 * HOUR)).toBe(true);
    expect(() => plancheForced(S, s, "ana", "segna", T0 + 2 * HOUR)).toThrow("planche_own_passage");
  });

  it("levy the holder's toll on the others' threads, a share of it burnt", () => {
    const S = setup();
    // a flat price, so that the toll is counted on a round sum
    const raguse = S.cities[1];
    if (raguse) raguse.wants.verre = { price: 4_000, floorBps: 10_000, cap: 200, regenPerHour: 10 };
    let s = plancheForced(S, plancheInit(S, T0), "ana", "segna", T0);
    s = plancheForced(S, s, "ana", "segna", T0);
    s = plancheThread(S, s, "ben", "raguse", "verre", T0);
    s = plancheAdvance(S, s, T0 + HOUR);
    // 10 glasses at 4 000: 40 000, of which 10 % is toll; 30 % of the toll is burnt
    expect(ducats(s, "ben")).toBe(36_000n);
    expect(ducats(s, "ana")).toBe(2_800n);
    expect(s.burnt).toBe(1_200n);
    expect(plancheInvariant(s)).toBe(true);
  });

  it("let the holder set the toll, never above the cap, and nobody else", () => {
    const S = setup();
    let s = plancheForced(S, plancheInit(S, T0), "ana", "segna", T0);
    s = plancheForced(S, s, "ana", "segna", T0);
    expect(plancheToll(S, s, "ana", "segna", 500).passages.segna?.tollBps).toBe(500);
    expect(plancheToll(S, s, "ana", "segna", 9_000).passages.segna?.tollBps).toBe(1_500);
    expect(() => plancheToll(S, s, "ben", "segna", 500)).toThrow("planche_not_holder");
  });
});

describe("a house held by the computer", () => {
  it("stretches its free bobbins where they bring most, and never back to the town it leaves", () => {
    const S = setup({ bobbins: 1 });
    let s = plancheRobot(S, plancheInit(S, T0), "ben", T0);
    expect(s.houses.ben?.threads.map((t) => t.to)).toEqual(["padoue"]);
    // a whole day later its thread is still there: Raguse is shut, Padoue is the only town it can serve
    s = plancheAdvance(S, s, T0 + DAY);
    s = plancheRobot(S, s, "ben", T0 + DAY);
    expect(s.houses.ben?.threads.map((t) => t.to)).toEqual(["padoue"]);
    expect(plancheInvariant(s)).toBe(true);
  });
});

/** The board of the fixture with islands: a camp and a sawmill, a town that wants planks. */
function withIsles(): PlancheSetup {
  const S = setup({ startDucats: 10_000, startStock: 0 });
  S.goods = { bois: "Bois", planches: "Planches" };
  for (const h of S.houses) {
    h.makes = {};
    h.soil = { foret: 1, rive: 1 };
    h.plan = ["camp", "scierie"];
  }
  const padoue = S.cities[0];
  if (padoue)
    padoue.wants = { planches: { price: 1_000, floorBps: 3_000, cap: 100, regenPerHour: 5 } };
  S.ile = {
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
        buildMs: [10 * 60_000, HOUR, 4 * HOUR],
      },
      scierie: {
        name: "Scierie",
        tier: 2,
        terrain: "rive",
        inputs: { bois: 10 },
        outputs: { planches: 5 },
        lotsPerHour: 1,
        cost: [3_000, 9_000, 25_000],
        buildMs: [10 * 60_000, HOUR, 4 * HOUR],
      },
    },
  };
  return S;
}

describe("the island on the board", () => {
  it("gives each house its island: four tiles, the Fondaco, terrains of its soil only", () => {
    const S = withIsles();
    const s = plancheInit(S, T0);
    const ile = s.houses.ana?.ile;
    expect(Object.keys(ile?.tiles ?? {})).toHaveLength(4);
    expect(ile?.tiles["0,0"]?.building?.type).toBe("fondaco");
    for (const t of Object.values(ile?.tiles ?? {})) expect(["foret", "rive"]).toContain(t.terrain);
    // the same house gets the same island every time
    expect(plancheInit(S, T0).houses.ana?.ile).toEqual(ile);
  });

  it("pays for a workshop from the purse, and refuses what the purse cannot pay", () => {
    const S = withIsles();
    let s = plancheInit(S, T0);
    s = plancheBuild(S, s, "ana", "camp", "1,0", T0);
    expect(ducats(s, "ana")).toBe(8_000n);
    expect(s.spent).toBe(2_000n);
    expect(plancheInvariant(s)).toBe(true);
    s = plancheBuyTile(S, s, "ana", "2,0", T0);
    expect(ducats(s, "ana")).toBe(7_000n);
    // raising the camp costs 8 000: more than the purse holds
    expect(() => plancheUpgrade(S, s, "ana", "1,0", T0 + HOUR)).toThrow("planche_poor");
    expect(ducats(s, "ana")).toBe(7_000n);
  });

  it("makes its goods on the island, and the threads sell them", () => {
    const S = withIsles();
    let s = plancheInit(S, T0);
    s = plancheBuild(S, s, "ana", "camp", "1,0", T0);
    s = plancheBuild(S, s, "ana", "scierie", "0,1", T0);
    s = plancheThread(S, s, "ana", "padoue", "planches", T0);
    s = plancheAdvance(S, s, T0 + 12 * HOUR);
    expect(s.houses.ana?.delivered).toBeGreaterThan(0);
    expect(s.houses.ana?.earned).toBeGreaterThan(0n);
    expect(plancheInvariant(s)).toBe(true);
  });

  it("tells what a house has to sell of a good, an hour, net of what its island uses", () => {
    const S = withIsles();
    let s = plancheInit(S, T0);
    s = plancheBuild(S, s, "ana", "camp", "1,0", T0);
    const rates = plancheSupply(S, s, "ana", T0 + HOUR);
    expect(rates.bois).toBeGreaterThan(0);
    s = plancheBuild(S, s, "ana", "scierie", "0,1", T0);
    const after = plancheSupply(S, s, "ana", T0 + HOUR);
    expect(after.planches).toBeGreaterThan(0);
    expect(after.bois ?? 0).toBeLessThan(rates.bois ?? 0);
  });

  it("lets a house of the computer build its island by its plan, then sell", () => {
    const S = withIsles();
    let s = plancheInit(S, T0);
    for (let h = 0; h < 48; h += 8) {
      s = plancheAdvance(S, s, T0 + h * HOUR);
      s = plancheRobot(S, s, "ben", T0 + h * HOUR);
    }
    const types = Object.values(s.houses.ben?.ile?.tiles ?? {}).map((t) => t.building?.type);
    expect(types).toContain("camp");
    expect(types).toContain("scierie");
    expect(s.houses.ben?.threads.length).toBeGreaterThan(0);
    expect(plancheInvariant(s)).toBe(true);
  });
});
