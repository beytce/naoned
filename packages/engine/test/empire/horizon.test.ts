import { describe, expect, it } from "vitest";
import {
  type EmpireSettingsInput,
  HORIZON_TILES,
  empireView,
  tileDistance,
} from "../../src/index.js";
import { testEmpire, testSquareMap } from "../fixture.js";
import { World, makeContext } from "../helpers.js";

// The horizon (docs/plan-carte-vivante.md, lot 4; decision of the owner, 9 November 2026): the land
// beyond what the house owns and may buy, a few tiles out, told to the board so that it draws it
// low and pale — where one might grow next. Nothing of it is the house's, nothing of it is bought.
const cities = [
  { code: "venezia", cell: "1,1", region: "veneto", x: 15, y: 15, size: 5 },
  { code: "padova", cell: "3,2", region: "veneto", x: 35, y: 25, size: 3 },
  { code: "acri", cell: "2,4", region: "levante", x: 25, y: 45, size: 2 },
];
const empire: EmpireSettingsInput = {
  ...testEmpire,
  start: {
    capitalDucats: 1_000_000,
    workshops: [{ type: "farm", recipe: "grow_wheat" }],
  },
  map: {
    ...testEmpire.map,
    grid: "square",
    tileSize: testSquareMap.tileSize,
    cells: { ...testSquareMap.tiles, "3,0": { region: "veneto", terrain: "forest" } },
    cities,
    tiles: true,
    revealRadius: 1,
    unlock: { costDucats: 40, stepBps: 1_000, seaHops: 3 },
    terrain: {
      kinds: { forest: { buildings: ["lumber_camp"], bonusBps: 1_000 } },
      weights: { default: { plain: 1 } },
    },
  },
};

function mapOf(settings: EmpireSettingsInput = empire) {
  const w = new World(makeContext({ empire: settings }));
  w.do({ type: "empireJoin", playerId: "a" });
  const map = empireView(w.ctx, w.state, "a", w.now)?.map;
  if (!map) throw new Error("no map");
  return map;
}

describe("the horizon", () => {
  const map = mapOf();
  const beyond = map.horizon.map((h) => h.cell);

  it("is the land a few tiles beyond the house's own, never what it owns or may buy", () => {
    expect(beyond.length).toBeGreaterThan(0);
    const shown = new Set([...map.unlocked, ...map.buyable.map((b) => b.cell)]);
    for (const cell of beyond) {
      expect(shown.has(cell), cell).toBe(false);
      // Land of the map, within reach of a tile of the house's.
      expect(testSquareMap.tiles[cell] ?? (cell === "3,0" ? {} : undefined), cell).toBeDefined();
      expect(Math.min(...map.unlocked.map((t) => tileDistance(t, cell)))).toBeLessThanOrEqual(
        HORIZON_TILES,
      );
    }
    // Lombardy lies too far east of Venice's tile.
    expect(beyond).not.toContain("7,0");
    // The same at every call, sorted.
    expect(beyond).toEqual([...beyond].sort());
    expect(mapOf().horizon).toEqual(map.horizon);
  });

  it("tells a town that stands there by its size, when the board does not show it yet", () => {
    // Acre, of the Levant the Casa has not reached: a silhouette on the horizon.
    expect(map.cities.map((c) => c.code)).not.toContain("acri");
    expect(map.horizon.find((h) => h.cell === "2,4")).toEqual({ cell: "2,4", town: 2 });
    // Padua, of Venetia, is on the board already: no town told twice.
    expect(map.cities.map((c) => c.code)).toContain("padova");
    expect(map.horizon.find((h) => h.cell === "3,2")?.town).toBeUndefined();
  });

  it("has its land told with the rest", () => {
    expect(beyond).toContain("3,0");
    expect(map.terrain["3,0"]).toBe("forest");
  });

  it("is none on the hexagonal map", () => {
    expect(mapOf({ ...testEmpire, start: empire.start }).horizon).toEqual([]);
  });
});
