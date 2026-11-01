import { describe, expect, it } from "vitest";
import {
  type EmpireSettingsInput,
  bookShareBps,
  cellDistance,
  cellsWithin,
  empireHouseAt,
  empireView,
  ensureMap,
  parseEmpireSettings,
} from "../../src/index.js";
import type { EmpireHouse } from "../../src/state.js";
import { testEmpire } from "../fixture.js";
import { HOUR, World, makeContext, openLombardy } from "../helpers.js";

// The fixture's map: Venetia's four cells, Lombardy's three cities (Milan and Verona seen from a
// counter on « 3,0 », Brescia two cells further), the Levant far east.
const empire: EmpireSettingsInput = {
  ...testEmpire,
  casa: testEmpire.casa.map((c) => ({ ...c, materials: {}, buildMinutes: 0, costDucats: 0 })),
  start: { capitalDucats: 1_000_000, workshops: [] },
  counters: { maxLevel: 10, bookStepBps: 0, costTimes: 4 },
  markets: {
    depthBase: 10,
    depthPerHouse: 5,
    boardPerHouse: 0,
    smallShareBps: 0,
    smallCasa: 20,
    orderPremiumBps: 0,
    taxBps: 0,
  },
};
const s = parseEmpireSettings(empire);

function world() {
  const w = new World(makeContext({ empire }));
  w.do({ type: "empireJoin", playerId: "a" });
  for (let i = 1; i < 4; i++) w.do({ type: "empireBuildCasa", playerId: "a" });
  return w;
}
const house = (w: World) => {
  const h = empireHouseAt(w.ctx, w.state, "a", w.now);
  if (!h) throw new Error("no house");
  return h;
};
const error = (res: { ok: boolean; error?: string }) => (res.ok ? "" : res.error);

describe("the hex grid", () => {
  it("counts its distances and its rings", () => {
    expect(cellDistance("0,0", "3,0")).toBe(3);
    expect(cellDistance("0,0", "1,-1")).toBe(1);
    expect(cellDistance("2,1", "0,2")).toBe(2);
    expect(cellsWithin("0,0", 1)).toHaveLength(7);
    expect(cellsWithin("0,0", 2)).toHaveLength(19);
    expect(cellsWithin("5,5", 2).every((c) => cellDistance(c, "5,5") <= 2)).toBe(true);
  });
});

describe("the cities hidden on the map", () => {
  it("show Venetia's at the founding, then the nearest sector of each region the Casa reaches", () => {
    const w = new World(makeContext({ empire }));
    w.do({ type: "empireJoin", playerId: "a" });
    const map = () => empireView(w.ctx, w.state, "a", w.now)?.map;
    expect(map()?.cities.map((c) => c.code)).toEqual(["venezia", "padova"]);
    expect(Object.values(map()?.cells ?? {}).every((c) => c.region === "veneto")).toBe(true);
    // Lombardy's Casa (4): its sector nearest to what is known comes in sight, at the edge of
    // Venetia, never one far off (step 4); Milan stays hidden beyond it.
    for (let i = 1; i < 4; i++) w.do({ type: "empireBuildCasa", playerId: "a" });
    expect(map()?.cells["3,0"]).toEqual({ region: "lombardia", coast: false });
    expect(map()?.cities.map((c) => c.code)).toEqual(["venezia", "padova"]);
    expect(error(w.try({ type: "empirePlaceCounter", playerId: "a", cell: "4,0" }))).toBe(
      "hidden_cell",
    );
    expect(error(w.try({ type: "empirePlaceCounter", playerId: "a", cell: "3,0" }))).toBe("");
  });

  it("give each city found its share of its region's book, all of them the whole", () => {
    const w = world();
    openLombardy(w);
    // Milan and Verona found, Brescia still hidden: two thirds of Lombardy's book.
    expect(bookShareBps(house(w), "lombardia", s)).toBe(6_666);
    expect(bookShareBps(house(w), "veneto", s)).toBe(10_000);
    w.do({ type: "empirePlaceCounter", playerId: "a", cell: "4,0" });
    w.advance(7 * HOUR);
    expect(bookShareBps(house(w), "lombardia", s)).toBe(10_000);
  });

  it("take deliveries only once found", () => {
    const w = world();
    openLombardy(w);
    w.give("a", "bread", 50);
    expect(
      error(
        w.try({ type: "empireDeliver", playerId: "a", good: "bread", qty: 5, city: "brescia" }),
      ),
    ).toBe("hidden_cell");
    expect(
      error(
        w.try({ type: "empireDeliver", playerId: "a", good: "bread", qty: 5, city: "atlantis" }),
      ),
    ).toBe("unknown_city");
    // Venice's own city: its region's whole book, the city found from the founding.
    expect(
      error(
        w.try({ type: "empireDeliver", playerId: "a", good: "bread", qty: 5, city: "venezia" }),
      ),
    ).toBe("");
    expect(w.state.inventories.a?.bread?.available).toBe(45);
  });
});

describe("a house of an older drawing of the grid", () => {
  it("is drawn again on the new one: no cell of before left far off", () => {
    const h = {
      casa: 4,
      revealed: ["0,0", "17,9", "20,12"],
      mapVersion: 0,
      posts: [{ cell: "17,9", region: "veneto" }],
      workshops: [],
      builds: [],
    } as unknown as EmpireHouse;
    ensureMap(h, s);
    expect(h.mapVersion).toBe(s.map.version);
    expect(h.revealed).toEqual(["0,0", "0,1", "1,0", "1,1"]);
    expect(h.posts).toBeUndefined();
  });
});

describe("a house of before, taken up on the map", () => {
  it("sees Venetia and its regions' seats, its counters there", () => {
    const h = {
      casa: 6,
      counters: { lombardia: 2 },
      vehicles: [{ id: "v1", type: "cocca", busyUntil: 0 }],
      workshops: [],
      builds: [],
    } as unknown as EmpireHouse;
    const ships = parseEmpireSettings({
      ...empire,
      vehicles: {
        cocca: {
          casa: 1,
          capacity: 100,
          costDucats: 0,
          regions: ["veneto"],
          speedBps: 0,
        },
      },
    });
    ensureMap(h, ships);
    expect(h.posts).toEqual([expect.objectContaining({ cell: "4,0", region: "lombardia" })]);
    expect(h.revealed).toEqual(expect.arrayContaining(["0,0", "1,1", "4,0", "6,0", "3,1"]));
    // No Arsenal any more (1 November).
    expect(h.arsenal).toBeUndefined();
    // Taken up once: what it has stays.
    const again = structuredClone(h);
    ensureMap(again, ships);
    expect(again).toEqual(h);
  });
});
