import { describe, expect, it } from "vitest";
import {
  type EmpireSettingsInput,
  cellAtPoint,
  cellCentreOf,
  citySpot,
  empireHouseAt,
  empireView,
  ensureMap,
  parseEmpireSettings,
  placeCities,
  tileCentre,
  tileKey,
} from "../../src/index.js";
import type { EmpireHouse } from "../../src/state.js";
import { testEmpire } from "../fixture.js";
import { World, makeContext } from "../helpers.js";

// A world turned from hexagons to square tiles (docs/plan-porcellana.md M4, the owner's leave of
// 5 November 2026): a house loses nothing it built.
const hexEmpire: EmpireSettingsInput = {
  ...testEmpire,
  casa: testEmpire.casa.map((c) => ({ ...c, materials: {}, buildMinutes: 0, costDucats: 0 })),
  start: {
    capitalDucats: 1_000_000,
    workshops: [
      { type: "farm", recipe: "grow_wheat" },
      { type: "clay_pit", recipe: "dig_clay" },
    ],
  },
  map: { ...testEmpire.map, unlock: { costDucats: 100, stepBps: 5_000, seaHops: 9 } },
};
const hexS = parseEmpireSettings(hexEmpire);
// The square map drawn over the hexagonal one: a tile is land where its middle lies in a sector.
const SIZE = 10;
const tiles: Record<string, { region: string; coast?: boolean }> = {};
for (let i = -6; i < 50; i++)
  for (let j = -6; j < 8; j++) {
    const [x, y] = tileCentre(tileKey(i, j), SIZE);
    const c = hexS.map.cells[cellAtPoint(x, y, hexS)];
    if (c) tiles[tileKey(i, j)] = { region: c.region };
  }
const squareMap = {
  ...hexEmpire.map,
  grid: "square" as const,
  tileSize: SIZE,
  cells: tiles,
  unlock: { costDucats: 25, stepBps: 1_000, seaHops: 20 },
};
const sqS0 = parseEmpireSettings({ ...hexEmpire, map: squareMap });
const cities = placeCities(
  hexS.map.cities.map((c) => {
    const [x, y] = citySpot(c, hexS);
    return { ...c, x, y };
  }),
  sqS0,
);
const squareEmpire: EmpireSettingsInput = {
  ...hexEmpire,
  map: { ...squareMap, cities, version: (hexS.map.version ?? 1) + 1 },
};
const sqS = parseEmpireSettings(squareEmpire);

describe("a world turned to square tiles", () => {
  const w = new World(makeContext({ empire: hexEmpire }));
  w.do({ type: "empireJoin", playerId: "a" });
  w.do({ type: "empireUnlockCell", playerId: "a", cell: "1,0" });
  const cash = w.state.accounts["cash:a"];
  const was = empireHouseAt(w.ctx, w.state, "a", w.now) as EmpireHouse;
  // Taken up at the house's first read on the square map (ensureMap, called by every command).
  const h = structuredClone(was);
  ensureMap(h, sqS);
  const sq = new World(makeContext({ empire: squareEmpire }));
  sq.state = w.state;
  sq.totals = w.totals;
  sq.now = w.now;

  it("gives the house every tile of the sectors it owned", () => {
    expect(was.unlocked).toEqual(["0,0", "1,0"]);
    expect(h.grid).toBe("square");
    const inside = Object.keys(tiles).filter((t) => {
      const [x, y] = cellCentreOf(t, sqS);
      return ["0,0", "1,0"].includes(cellAtPoint(x, y, hexS));
    });
    expect(inside.length).toBeGreaterThan(8);
    for (const t of inside) expect(h.unlocked).toContain(t);
  });

  it("seats its workshops on tiles of its own, apart from the towns, each on its own", () => {
    const seated = h.workshops.map((x) => x.tile);
    expect(seated.every((t) => typeof t === "string")).toBe(true);
    expect(new Set(seated).size).toBe(seated.length);
    const towns = new Set(cities.map((c) => c.cell));
    for (const t of seated) {
      expect(h.unlocked).toContain(t);
      expect(towns.has(t as string)).toBe(false);
    }
  });

  it("moves no money, and the game goes on: a tile bought on the square map", () => {
    expect(sq.state.accounts["cash:a"]).toBe(cash);
    const view = empireView(sq.ctx, sq.state, "a", sq.now);
    const next = view?.map?.buyable[0]?.cell ?? "";
    expect(next).not.toBe("");
    sq.do({ type: "empireUnlockCell", playerId: "a", cell: next });
    const after = empireHouseAt(sq.ctx, sq.state, "a", sq.now) as EmpireHouse;
    expect(after.grid).toBe("square");
    expect([...(after.unlocked ?? [])].sort()).toEqual([...(h.unlocked ?? []), next].sort());
    expect(after.workshops.map((x) => x.tile)).toEqual(h.workshops.map((x) => x.tile));
  });

  it("is taken up once: a second read changes nothing", () => {
    const again = structuredClone(h);
    ensureMap(again, sqS);
    expect(again).toEqual(h);
  });
});
