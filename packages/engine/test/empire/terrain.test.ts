import { describe, expect, it } from "vitest";
import {
  type EmpireSettingsInput,
  empireHouseAt,
  empireView,
  parseEmpireSettings,
  terrainBonusBps,
  terrainOf,
} from "../../src/index.js";
import type { EmpireHouse } from "../../src/state.js";
import { testEmpire, testSquareMap } from "../fixture.js";
import { HOUR, World, makeContext } from "../helpers.js";

// The terroirs (docs/plan-carte-vivante.md, lot 3; decision of the owner, 9 November 2026): each
// land tile has its terrain, seen before it is bought; the workshop that suits it yields more
// there. A bonus only: never a malus, never a ban (golden rule 1).
const terrain = {
  kinds: {
    forest: { buildings: ["lumber_camp"], bonusBps: 1_000 },
    fields: { buildings: ["farm"], bonusBps: 1_000 },
    sand: { buildings: ["sand_pit"], bonusBps: 1_500, coast: true },
  },
  weights: {
    veneto: { forest: 2, fields: 2, sand: 2, plain: 2 },
    default: { plain: 1 },
  },
};
const cities = [
  { code: "venezia", cell: "1,1", region: "veneto", x: 15, y: 15, size: 5 },
  { code: "padova", cell: "2,2", region: "veneto", x: 25, y: 25, size: 3 },
  { code: "milano", cell: "7,1", region: "lombardia", x: 75, y: 15, size: 5 },
];
// The land written where the tests need it: the farm's tile in fields, the clay pit's in forest,
// a forest to buy for the lumber camp, whose own tile is plain.
const cells = {
  ...testSquareMap.tiles,
  "0,1": { region: "veneto", terrain: "fields" },
  "1,0": { region: "veneto", terrain: "forest" },
  "1,2": { region: "veneto", coast: true, terrain: "plain" },
  "0,2": { region: "veneto", coast: true, terrain: "forest" },
};
const plain: EmpireSettingsInput = {
  ...testEmpire,
  casa: testEmpire.casa.map((c) => ({ ...c, materials: {}, buildMinutes: 0, costDucats: 0 })),
  workshops: { ...testEmpire.workshops, neighbourBps: 1_000 },
  start: {
    capitalDucats: 1_000_000,
    workshops: [
      { type: "farm", recipe: "grow_wheat" },
      { type: "clay_pit", recipe: "dig_clay" },
      { type: "lumber_camp", recipe: "cut_wood" },
    ],
  },
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
const empire: EmpireSettingsInput = { ...plain, map: { ...plain.map, cells, terrain } };
const s = parseEmpireSettings(empire);

function world(settings: EmpireSettingsInput = empire) {
  const w = new World(makeContext({ empire: settings }));
  w.do({ type: "empireJoin", playerId: "a" });
  return w;
}
const house = (w: World) => empireHouseAt(w.ctx, w.state, "a", w.now) as EmpireHouse;
const view = (w: World) => empireView(w.ctx, w.state, "a", w.now);
const error = (res: { ok: boolean; error?: string }) => (res.ok ? "" : res.error);
const idOf = (w: World, type: string) => house(w).workshops.find((x) => x.type === type)?.id ?? "";
/** What an hour of a workshop gives of its good. */
const made = (w: World, type: string, good: string) => {
  const id = idOf(w, type);
  const before = w.state.inventories.a?.[good]?.available ?? 0;
  w.do({ type: "empireRelaunch", playerId: "a", workshopId: id });
  w.advance(HOUR);
  w.do({ type: "empireRelaunch", playerId: "a", workshopId: id });
  return (w.state.inventories.a?.[good]?.available ?? 0) - before;
};
const move = (w: World, workshopId: string, tile: string) =>
  error(w.try({ type: "empireMoveWorkshop", playerId: "a", workshopId, tile }));

describe("a tile's terrain", () => {
  it("is the one written on the map, « plain » for none", () => {
    expect(terrainOf("0,1", s)).toBe("fields");
    expect(terrainOf("1,0", s)).toBe("forest");
    expect(terrainOf("1,2", s)).toBeNull();
  });

  it("is none without terroirs, on the sea, or under a town", () => {
    expect(terrainOf("0,1", parseEmpireSettings(plain))).toBeNull();
    expect(terrainOf("4,0", s)).toBeNull(); // the sea
    expect(terrainOf("1,1", s)).toBeNull(); // Venice
    expect(terrainOf("2,2", s)).toBeNull(); // Padua
  });

  it("is drawn from the tile and its region's weights, the same at every call", () => {
    const kinds = new Set([...Object.keys(terrain.kinds), null]);
    for (const tile of Object.keys(cells)) {
      expect(kinds.has(terrainOf(tile, s))).toBe(true);
      expect(terrainOf(tile, s)).toBe(terrainOf(tile, s));
    }
    // A region without weights of its own takes the default: here, plain land.
    for (const tile of ["6,0", "7,0", "6,2", "7,2"]) expect(terrainOf(tile, s)).toBeNull();
  });

  it("keeps the shore's kinds to the coast", () => {
    const land: Record<string, { region: string; coast?: boolean }> = {};
    for (let i = 0; i < 30; i++)
      for (let j = 0; j < 30; j++) land[`${i},${j}`] = { region: "veneto", coast: j === 0 };
    const wide = parseEmpireSettings({
      ...empire,
      map: { ...empire.map, cells: land, cities: [] },
    });
    let sandInland = 0;
    let sandOnCoast = 0;
    const count: Record<string, number> = {};
    for (const [tile, c] of Object.entries(land)) {
      const k = terrainOf(tile, wide) ?? "plain";
      count[k] = (count[k] ?? 0) + 1;
      if (k === "sand") c.coast ? sandOnCoast++ : sandInland++;
    }
    expect(sandInland).toBe(0);
    expect(sandOnCoast).toBeGreaterThan(0);
    // Inland, forest, fields and plain share the land by their weights (a third each, loosely).
    for (const k of ["forest", "fields", "plain"]) {
      expect(count[k]).toBeGreaterThan(200);
      expect(count[k]).toBeLessThan(400);
    }
    // Another seed, another drawing.
    const other = parseEmpireSettings({
      ...empire,
      map: { ...empire.map, cells: land, cities: [], terrain: { ...terrain, seed: 7 } },
    });
    const same = Object.keys(land).filter((t) => terrainOf(t, other) === terrainOf(t, wide));
    expect(same.length).toBeLessThan(700);
  });

  it("favours its workshops, and no other", () => {
    expect(terrainBonusBps(s, "0,1", "farm")).toBe(1_000);
    expect(terrainBonusBps(s, "0,1", "lumber_camp")).toBe(0);
    expect(terrainBonusBps(s, "1,2", "farm")).toBe(0);
    expect(terrainBonusBps(parseEmpireSettings(plain), "0,1", "farm")).toBe(0);
    expect(terrainBonusBps(s, undefined, "farm")).toBe(0);
  });
});

describe("a workshop on its terroir", () => {
  it("yields a share more than on plain land", () => {
    expect(house(world()).workshops.map((x) => x.tile)).toEqual(["0,1", "1,0", "1,2"]);
    expect(made(world(plain), "farm", "wheat")).toBe(20);
    expect(made(world(), "farm", "wheat")).toBe(22);
  });

  it("yields as before on a land that is not its own: never less", () => {
    // The clay pit stands in a forest, the lumber camp on plain land.
    expect(made(world(), "clay_pit", "clay")).toBe(made(world(plain), "clay_pit", "clay"));
    expect(made(world(), "lumber_camp", "wood")).toBe(made(world(plain), "lumber_camp", "wood"));
  });

  it("adds its terroir to its neighbourhood", () => {
    const w = world();
    w.do({ type: "empireUnlockCell", playerId: "a", cell: "0,0" });
    w.do({
      type: "empireBuildWorkshop",
      playerId: "a",
      workshopType: "mill",
      recipe: "mill_flour",
      tile: "0,0",
    });
    w.advance(HOUR);
    // The farm in its fields, the mill it feeds beside it: a share for each.
    expect(made(w, "farm", "wheat")).toBe(24);
  });

  it("is told in the view: the land seen and to buy, the workshop's share", () => {
    const w = world();
    const v = view(w);
    expect(v?.map.terrain?.["0,1"]).toBe("fields");
    expect(v?.map.terrain?.["1,0"]).toBe("forest");
    // The forest to buy shows before it is bought.
    expect(v?.map.buyable.map((b) => b.cell)).toContain("0,2");
    expect(v?.map.terrain?.["0,2"]).toBe("forest");
    // Plain land, towns: not listed.
    expect(v?.map.terrain?.["1,2"]).toBeUndefined();
    expect(v?.map.terrain?.["1,1"]).toBeUndefined();
    expect(v?.map.terrains?.forest).toEqual({ buildings: ["lumber_camp"], bonusBps: 1_000 });
    expect(v?.workshopPlaces[idOf(w, "farm")]?.terrainBps).toBe(1_000);
    expect(v?.workshopPlaces[idOf(w, "clay_pit")]?.terrainBps).toBe(0);
    // Without terroirs, nothing of it.
    expect(view(world(plain))?.map.terrain).toEqual({});
  });
});

describe("moving a workshop", () => {
  it("goes to a free tile of the house's own, at once and at no cost, and takes its terroir", () => {
    const w = world();
    const camp = idOf(w, "lumber_camp");
    const before = made(w, "lumber_camp", "wood");
    w.do({ type: "empireUnlockCell", playerId: "a", cell: "0,2" });
    const cash = w.state.accounts["cash:a"];
    expect(move(w, camp, "0,2")).toBe("");
    expect(house(w).workshops.find((x) => x.id === camp)?.tile).toBe("0,2");
    expect(w.state.accounts["cash:a"]).toBe(cash);
    expect(made(w, "lumber_camp", "wood")).toBe(Math.floor((before * 11) / 10));
    // Its old tile is free again.
    expect(move(w, idOf(w, "clay_pit"), "1,2")).toBe("");
  });

  it("keeps the lots it has made", () => {
    const w = world();
    const camp = idOf(w, "lumber_camp");
    w.do({ type: "empireUnlockCell", playerId: "a", cell: "0,2" });
    w.do({ type: "empireRelaunch", playerId: "a", workshopId: camp });
    w.advance(HOUR);
    const job = house(w).workshops.find((x) => x.id === camp)?.job;
    expect(move(w, camp, "0,2")).toBe("");
    expect(house(w).workshops.find((x) => x.id === camp)?.job).toEqual(job);
  });

  it("refuses the sea, a tile not its own, a tile taken, a workshop unknown", () => {
    const w = world();
    const camp = idOf(w, "lumber_camp");
    expect(move(w, "nope", "0,2")).toBe("unknown_building");
    expect(move(w, camp, "4,0")).toBe("unknown_cell");
    expect(move(w, camp, "0,2")).toBe("hidden_cell");
    expect(move(w, camp, "1,0")).toBe("built"); // the clay pit's
    expect(move(w, camp, "1,1")).toBe("built"); // Venice's
    expect(move(w, camp, "1,2")).toBe("built"); // its own
  });

  it("stays in its region", () => {
    const w = world({
      ...empire,
      regions: (testEmpire.regions ?? []).map((r) =>
        r.code === "lombardia" ? { ...r, casa: 1 } : r,
      ),
      map: { ...empire.map, unlock: { costDucats: 1, stepBps: 0, seaHops: 9 } },
    });
    for (const cell of ["2,1", "3,1", "6,1"])
      expect(error(w.try({ type: "empireUnlockCell", playerId: "a", cell }))).toBe("");
    expect(move(w, idOf(w, "lumber_camp"), "6,1")).toBe("unknown_region");
  });

  it("is of the square tiles only", () => {
    const hex = world({ ...testEmpire, start: plain.start });
    expect(move(hex, idOf(hex, "lumber_camp"), "0,2")).toBe("unknown_cell");
  });
});
