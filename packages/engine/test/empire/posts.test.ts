import { describe, expect, it } from "vitest";
import {
  type EmpireSettingsInput,
  bookShareBps,
  cellAtPoint,
  cellCentreOf,
  citiesCovered,
  empireHouseAt,
  empireView,
  ensureMap,
  parseEmpireSettings,
} from "../../src/index.js";
import type { EmpireHouse } from "../../src/state.js";
import { testEmpire } from "../fixture.js";
import { HOUR, World, makeContext } from "../helpers.js";

// The map that grows (decision of the owner, 31 October 2026, evening): a counter put down at a
// free point of a cell it sees, its reach growing with its level; it serves the cities in reach.
// On the fixture's grid (hexes of 24): Venice at « 0,0 » (0, 0), Padua at « 0,1 » (≈ 20.8, 36),
// 41.6 off; Lombardy's « 3,0 » at (≈ 124.7, 0), Verona at « 3,1 », Milan at « 4,0 ».
const empire: EmpireSettingsInput = {
  ...testEmpire,
  casa: testEmpire.casa.map((c) => ({ ...c, materials: {}, buildMinutes: 0, costDucats: 0 })),
  start: { capitalDucats: 1_000_000, workshops: [] },
  counters: { maxLevel: 10, bookStepBps: 0, costTimes: 4 },
  map: {
    ...testEmpire.map,
    hexSize: 24,
    reach: { base: 30, perLevel: 15 },
    postSpacing: 10,
  },
};
const s = parseEmpireSettings(empire);

function world(casa = 1) {
  const w = new World(makeContext({ empire }));
  w.do({ type: "empireJoin", playerId: "a" });
  for (let i = 1; i < casa; i++) w.do({ type: "empireBuildCasa", playerId: "a" });
  return w;
}
const house = (w: World) => empireHouseAt(w.ctx, w.state, "a", w.now) as EmpireHouse;
const error = (res: { ok: boolean; error?: string }) => (res.ok ? "" : res.error);

describe("the grid's geometry, in the engine", () => {
  it("finds a cell's centre and the cell under a point", () => {
    expect(cellCentreOf("0,0", s)).toEqual([0, 0]);
    const [x, y] = cellCentreOf("0,1", s);
    expect(Math.round(x)).toBe(21);
    expect(y).toBe(36);
    expect(cellAtPoint(21, 36, s)).toBe("0,1");
    expect(cellAtPoint(5, -3, s)).toBe("0,0");
  });
});

describe("a counter put at a free point of a cell", () => {
  it("sees Venice's cell alone at the founding, the rest of Venetia found by the counters", () => {
    const w = world();
    expect(Object.keys(empireView(w.ctx, w.state, "a", w.now)?.map.cells ?? {})).toEqual(["0,0"]);
    expect(empireView(w.ctx, w.state, "a", w.now)?.map.cities.map((c) => c.code)).toEqual([
      "venezia",
    ]);
  });

  it("stands where it is put, inside the cell, apart from the others", () => {
    const w = world();
    expect(
      error(w.try({ type: "empirePlaceCounter", playerId: "a", cell: "0,0", x: 40, y: 3 })),
    ).toBe("unknown_cell");
    // Too near Venice's own counter.
    expect(
      error(w.try({ type: "empirePlaceCounter", playerId: "a", cell: "0,0", x: 4, y: 3 })),
    ).toBe("post_too_close");
    expect(
      error(w.try({ type: "empirePlaceCounter", playerId: "a", cell: "0,0", x: 12, y: 5 })),
    ).toBe("");
    w.advance(HOUR);
    const post = house(w).posts?.[0];
    expect(post).toMatchObject({ cell: "0,0", x: 12, y: 5, level: 1, region: "veneto" });
    expect(post?.id).toBeTruthy();
    expect(
      error(w.try({ type: "empirePlaceCounter", playerId: "a", cell: "0,0", x: 15, y: 8 })),
    ).toBe("post_too_close");
  });

  it("sits at its cell's centre when no point is given", () => {
    const w = world();
    w.do({ type: "empirePlaceCounter", playerId: "a", cell: "0,0", x: 12, y: 5 });
    w.advance(HOUR);
    w.do({ type: "empirePlaceCounter", playerId: "a", cell: "1,1" });
    w.advance(HOUR);
    const [cx, cy] = cellCentreOf("1,1", s);
    expect(house(w).posts?.find((p) => p.cell === "1,1")).toMatchObject({
      x: Math.round(cx),
      y: Math.round(cy),
    });
  });
});

describe("the reach of a counter", () => {
  it("serves the cities within it: Venice alone at first, Padua once Venice's counter grows", () => {
    const w = world();
    expect([...citiesCovered(house(w), s)]).toEqual(["venezia"]);
    expect(bookShareBps(house(w), "veneto", s)).toBe(5_000);
    expect(empireView(w.ctx, w.state, "a", w.now)?.map.home).toMatchObject({
      x: 0,
      y: 0,
      level: 1,
      reach: 30,
    });
    w.do({ type: "empireUpgradeCounter", playerId: "a", region: "home" });
    w.advance(HOUR);
    expect(house(w).homeLevel).toBe(2);
    expect([...citiesCovered(house(w), s)].sort()).toEqual(["padova", "venezia"]);
    expect(bookShareBps(house(w), "veneto", s)).toBe(10_000);
  });

  it("refuses a delivery to a city found but out of reach", () => {
    const w = world();
    // A counter away from Padua: it reveals Padua's cell, not within its reach.
    w.do({ type: "empirePlaceCounter", playerId: "a", cell: "0,0", x: -12, y: -5 });
    w.advance(HOUR);
    w.give("a", "bread", 20);
    expect(
      error(w.try({ type: "empireDeliver", playerId: "a", good: "bread", qty: 5, city: "padova" })),
    ).toBe("out_of_reach");
  });

  it("covers a city from a counter put toward it", () => {
    const w = world();
    w.do({ type: "empirePlaceCounter", playerId: "a", cell: "0,0", x: 8, y: 15 });
    w.advance(HOUR);
    expect([...citiesCovered(house(w), s)].sort()).toEqual(["padova", "venezia"]);
  });
});

describe("a city's weight in its region's book", () => {
  it("counts Venice, weighing three, for three parts in four", () => {
    const heavy = parseEmpireSettings({
      ...empire,
      map: {
        ...empire.map,
        cities: (testEmpire.map?.cities ?? []).map((c) =>
          c.code === "venezia" ? { ...c, weight: 3 } : c,
        ),
      },
    });
    const h = { casa: 1, workshops: [], builds: [] } as unknown as EmpireHouse;
    expect(bookShareBps(h, "veneto", heavy)).toBe(7_500);
  });
});

describe("a house of before", () => {
  it("has its counters given a point, a level and a name", () => {
    const h = {
      casa: 4,
      workshops: [],
      builds: [],
      counters: { lombardia: 3 },
      revealed: ["0,0", "1,0", "3,0"],
      mapVersion: s.map.version,
      posts: [{ cell: "3,0", region: "lombardia" }],
    } as unknown as EmpireHouse;
    ensureMap(h, s);
    const [cx, cy] = cellCentreOf("3,0", s);
    expect(h.posts?.[0]).toMatchObject({
      cell: "3,0",
      x: Math.round(cx),
      y: Math.round(cy),
      level: 3,
    });
    expect(h.posts?.[0]?.id).toBeTruthy();
  });
});
