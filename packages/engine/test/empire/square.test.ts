import { describe, expect, it } from "vitest";
import {
  type EmpireSettingsInput,
  cellAtPoint,
  cellCentreOf,
  cellDistance,
  cellsWithin,
  empireHouseAt,
  empireView,
  parseEmpireSettings,
  placeCities,
  roadBetween,
  tileFault,
} from "../../src/index.js";
import type { EmpireHouse } from "../../src/state.js";
import { testEmpire, testSquareMap } from "../fixture.js";
import { HOUR, World, makeContext } from "../helpers.js";

// The map in square tiles (docs/plan-porcellana.md § 2 bis, M3; decision of the owner, 5 November
// 2026): the tile the unit of everything, bought one at a time next to one's own by a side.
const cities = [
  { code: "venezia", cell: "1,1", region: "veneto", x: 15, y: 15, size: 5 },
  { code: "padova", cell: "2,2", region: "veneto", x: 25, y: 25, size: 3 },
  { code: "treviso", cell: "0,0", region: "veneto", x: 5, y: 5, size: 2 },
  { code: "milano", cell: "7,1", region: "lombardia", x: 75, y: 15, size: 5 },
  { code: "acri", cell: "2,4", region: "levante", x: 25, y: 45, size: 2 },
];
const empire: EmpireSettingsInput = {
  ...testEmpire,
  casa: testEmpire.casa.map((c) => ({ ...c, materials: {}, buildMinutes: 0, costDucats: 0 })),
  start: { capitalDucats: 1_000_000, workshops: [] },
  regions: (testEmpire.regions ?? []).map((r) => (r.code === "levante" ? { ...r, casa: 1 } : r)),
  map: {
    ...testEmpire.map,
    grid: "square",
    tileSize: testSquareMap.tileSize,
    cells: testSquareMap.tiles,
    cities,
    tiles: true,
    revealRadius: 1,
    unlock: { costDucats: 40, stepBps: 1_000, seaHops: 3 },
  },
};
const s = parseEmpireSettings(empire);

function world() {
  const w = new World(makeContext({ empire }));
  w.do({ type: "empireJoin", playerId: "a" });
  return w;
}
const house = (w: World) => empireHouseAt(w.ctx, w.state, "a", w.now) as EmpireHouse;
const map = (w: World) => empireView(w.ctx, w.state, "a", w.now)?.map;
const cash = (w: World) => w.state.accounts["cash:a"] ?? 0n;
const error = (res: { ok: boolean; error?: string }) => (res.ok ? "" : res.error);
const unlock = (w: World, cell: string) => w.try({ type: "empireUnlockCell", playerId: "a", cell });

describe("the square map's geometry", () => {
  it("measures by the sides, finds the tile under a point, its middle", () => {
    expect(cellDistance("0,0", "3,2", s)).toBe(5);
    expect(cellAtPoint(12, 8, s)).toBe("1,0");
    expect(cellCentreOf("2,1", s)).toEqual([25, 15]);
    expect(cellsWithin("2,2", 1, s).sort()).toEqual(["1,2", "2,1", "2,2", "2,3", "3,2"]);
  });

  it("puts each town on a land tile of its own, none side by side", () => {
    const placed = placeCities(cities, s);
    expect(placed.map((c) => c.cell)).toEqual(cities.map((c) => c.cell));
  });

  it("puts a fondaco on a tile's middle, never on or next to a town, nor next to a fondaco", () => {
    const towns = cities.map((c): [number, number] => [c.x, c.y]);
    expect(tileFault(s, "3,1", [35, 15], towns, [])).toBeNull();
    expect(tileFault(s, "3,1", [34, 15], towns, [])).toBe("unknown_cell");
    expect(tileFault(s, "2,1", [25, 15], towns, [])).toBe("on_city");
    expect(tileFault(s, "3,0", [35, 5], towns, [[35, 15]])).toBe("post_too_close");
    expect(tileFault(s, "4,0", [45, 5], towns, [])).toBe("unknown_cell"); // the sea
  });

  it("walks the roads from tile to tile by their sides, from one point to the other", () => {
    const road = roadBetween([5, 25], [75, 25], s);
    expect(road[0]).toEqual([5, 25]);
    expect(road.at(-1)).toEqual([75, 25]);
    for (let i = 1; i < road.length; i++) {
      const [ax, ay] = road[i - 1] as [number, number];
      const [bx, by] = road[i] as [number, number];
      expect(Math.hypot(bx - ax, by - ay)).toBeLessThanOrEqual(10.01);
    }
  });
});

describe("buying tile by tile", () => {
  it("starts with Venice's tile, its land neighbours by a side to buy", () => {
    const w = world();
    expect(house(w).unlocked).toEqual(["1,1"]);
    const buyable = map(w)?.buyable.map((b) => b.cell) ?? [];
    expect(buyable).toEqual(expect.arrayContaining(["0,1", "1,0", "1,2", "2,1"]));
    expect(buyable).not.toContain("0,0"); // a corner is no side (and no coast)
    expect(buyable).not.toContain("2,4"); // the Levant's coast is four steps off
  });

  it("sells a tile next to one's own, dearer for each already owned", () => {
    const w = world();
    const before = cash(w);
    expect(error(unlock(w, "2,1"))).toBe("");
    expect(before - cash(w)).toBe(40n * 100n);
    expect(error(unlock(w, "3,1"))).toBe("");
    expect(house(w).unlocked).toEqual(["1,1", "2,1", "3,1"]);
  });

  it("grows in the direction one wants, never across a corner, never on the sea", () => {
    const w = world();
    expect(error(unlock(w, "0,0"))).toBe("not_adjacent");
    expect(error(unlock(w, "1,0"))).toBe("");
    expect(error(unlock(w, "0,0"))).toBe("");
    expect(error(unlock(w, "4,1"))).toBe("unknown_cell");
  });

  it("crosses the sea from a coast of one's own to a coast within reach", () => {
    const w = world();
    // From Venice's coast (1,1) the Levant's 2,4 is four steps off; from the coast 1,2, three.
    expect(error(unlock(w, "2,4"))).toBe("not_adjacent");
    expect(error(unlock(w, "1,2"))).toBe("");
    expect(error(unlock(w, "2,4"))).toBe("");
  });

  it("puts the first fondaco down on a tile of one's own, clear of the towns", () => {
    const w = world();
    unlock(w, "2,1");
    unlock(w, "3,1");
    const put = (cell: string, x: number, y: number) =>
      error(w.try({ type: "empirePlaceHome", playerId: "a", cell, x, y }));
    expect(put("2,1", 25, 15)).toBe("on_city");
    expect(put("3,1", 35, 15)).toBe("");
    expect(house(w).home).toEqual({ cell: "3,1", x: 35, y: 15 });
  });
});

describe("the workshops on their tiles (D7)", () => {
  const withWorkshops: EmpireSettingsInput = {
    ...empire,
    workshops: { ...testEmpire.workshops, neighbourBps: 1_000 },
    start: {
      capitalDucats: 1_000_000,
      workshops: [
        { type: "farm", recipe: "grow_wheat" },
        { type: "clay_pit", recipe: "dig_clay" },
        { type: "lumber_camp", recipe: "cut_wood" },
      ],
    },
  };
  const make = () => {
    const w = new World(makeContext({ empire: withWorkshops }));
    w.do({ type: "empireJoin", playerId: "a" });
    return w;
  };
  const build = (w: World, tile: string | undefined, type = "mill", recipe = "mill_flour") =>
    error(
      w.try({
        type: "empireBuildWorkshop",
        playerId: "a",
        workshopType: type,
        recipe,
        ...(tile ? { tile } : {}),
      }),
    );
  const wheatIn = (w: World) => {
    const farm = house(w).workshops.find((x) => x.type === "farm")?.id ?? "";
    w.do({ type: "empireRelaunch", playerId: "a", workshopId: farm });
    w.advance(HOUR);
    w.do({ type: "empireRelaunch", playerId: "a", workshopId: farm });
    return w.state.inventories.a?.wheat?.available ?? 0;
  };

  it("seats the first workshops on the free tiles nearest the fondaco, given to the house", () => {
    const w = make();
    const tiles = house(w).workshops.map((x) => x.tile);
    expect(tiles).toEqual(["0,1", "1,0", "1,2"]);
    expect(house(w).unlocked).toEqual(expect.arrayContaining(["1,1", "0,1", "1,0", "1,2"]));
  });

  it("builds a workshop only on a free tile of the house's own, of its region", () => {
    const w = make();
    expect(build(w, undefined)).toBe("unknown_cell");
    expect(build(w, "4,0")).toBe("unknown_cell"); // the sea
    expect(build(w, "3,0")).toBe("hidden_cell"); // not the house's
    expect(build(w, "1,0")).toBe("built"); // the clay pit's
    expect(build(w, "1,1")).toBe("built"); // Venice's
    unlock(w, "0,2");
    expect(build(w, "0,2")).toBe("");
  });

  it("gives a share more to two workshops side by side when one feeds the other", () => {
    const w = make();
    expect(wheatIn(make())).toBe(20);
    unlock(w, "0,2");
    build(w, "0,2");
    w.advance(HOUR);
    expect(house(w).workshops.find((x) => x.type === "mill")?.tile).toBe("0,2");
    expect(wheatIn(w)).toBe(22);
  });
});

describe("the square map's view", () => {
  it("shows the towns of the regions reached, and the roads of the workshops to their fondaco", () => {
    const w = new World(
      makeContext({
        empire: {
          ...empire,
          start: {
            capitalDucats: 1_000_000,
            workshops: [
              { type: "farm", recipe: "grow_wheat" },
              { type: "clay_pit", recipe: "dig_clay" },
            ],
          },
        },
      }),
    );
    w.do({ type: "empireJoin", playerId: "a" });
    const v = map(w);
    expect(v?.cities.map((c) => c.code)).toEqual(expect.arrayContaining(["venezia", "padova"]));
    expect(v?.cities.map((c) => c.code)).not.toContain("milano"); // Lombardy asks the Casa 4
    expect(v?.roads).toHaveLength(2);
    for (const r of v?.roads ?? []) {
      expect(r.to).toBe("home");
      expect(r.pts.length).toBeGreaterThanOrEqual(2);
    }
  });
});
