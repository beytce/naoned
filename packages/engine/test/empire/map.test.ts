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
  it("show Venetia's at the founding, and none beyond", () => {
    const w = world();
    const map = empireView(w.ctx, w.state, "a", w.now)?.map;
    expect(map?.cities.map((c) => c.code)).toEqual(["venezia", "padova"]);
    expect(Object.values(map?.cells ?? {}).every((c) => c.region === "veneto")).toBe(true);
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

describe("a house of before, taken up on the map", () => {
  it("sees Venetia and its regions' seats, its counters there, its Arsenal with a ship", () => {
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
          build: { minutes: 60, materials: {} },
        },
      },
    });
    ensureMap(h, ships);
    expect(h.posts).toEqual([{ cell: "4,0", region: "lombardia" }]);
    expect(h.revealed).toEqual(expect.arrayContaining(["0,0", "1,1", "4,0", "6,0", "3,1"]));
    expect(h.arsenal).toBe("0,0");
    // Taken up once: what it has stays.
    const again = structuredClone(h);
    ensureMap(again, ships);
    expect(again).toEqual(h);
  });
});
