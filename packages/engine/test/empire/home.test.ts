import { describe, expect, it } from "vitest";
import {
  type EmpireSettingsInput,
  citiesCovered,
  empireHouseAt,
  empireView,
  homePost,
  parseEmpireSettings,
} from "../../src/index.js";
import type { EmpireHouse } from "../../src/state.js";
import { testEmpire } from "../fixture.js";
import { World, makeContext } from "../helpers.js";

// The house's first fondaco is no city (decision of the owner, 1 November 2026): it stands at a
// point of its own, put down once by the player in the sector of the start, never on a town;
// until then at the world's point. Venice is a town as the others, with its orders.
// On the fixture's grid (hexes of 24): Venice at « 0,0 » (0, 0), Padua at « 0,1 » (≈ 20.8, 36).
const empire: EmpireSettingsInput = {
  ...testEmpire,
  start: { capitalDucats: 1_000, workshops: [] },
  map: {
    ...testEmpire.map,
    hexSize: 24,
    reach: { base: 30, perLevel: 15 },
    postSpacing: 10,
    home: { x: 10, y: 0 },
    cityClearance: 5,
  },
};
const s = parseEmpireSettings(empire);

function world(settings: EmpireSettingsInput = empire) {
  const w = new World(makeContext({ empire: settings }));
  w.do({ type: "empireJoin", playerId: "a" });
  return w;
}
const house = (w: World) => empireHouseAt(w.ctx, w.state, "a", w.now) as EmpireHouse;
const view = (w: World) => empireView(w.ctx, w.state, "a", w.now);
const error = (res: { ok: boolean; error?: string }) => (res.ok ? "" : res.error);
const place = (w: World, cell: string, x: number, y: number) =>
  w.try({ type: "empirePlaceHome", playerId: "a", cell, x, y });

describe("the first fondaco, a place of its own", () => {
  it("stands at the world's point until put down, Venice a town in its reach", () => {
    const w = world();
    expect(homePost(house(w), s)).toEqual(expect.objectContaining({ x: 10, y: 0, cell: "0,0" }));
    expect(view(w)?.map.home).toEqual(expect.objectContaining({ x: 10, y: 0, placed: false }));
    expect(citiesCovered(house(w), s).has("venezia")).toBe(true);
    expect(view(w)?.map.cities.some((c) => c.code === "venezia")).toBe(true);
  });

  it("is put down once, free, at a point of a cell of the start the house sees", () => {
    const w = world();
    const cash = w.state.accounts["cash:a"];
    expect(place(w, "0,0", -10, 6).ok).toBe(true);
    expect(w.state.accounts["cash:a"]).toBe(cash);
    expect(house(w).home).toEqual({ cell: "0,0", x: -10, y: 6 });
    expect(view(w)?.map.home).toEqual(expect.objectContaining({ x: -10, y: 6, placed: true }));
    expect(error(place(w, "0,0", -8, 6))).toBe("built");
  });

  it("is never put on a town, nor out of its cell, nor where the house does not see", () => {
    const w = world();
    expect(error(place(w, "0,0", 2, 2))).toBe("on_city");
    expect(error(place(w, "0,0", 60, 0))).toBe("unknown_cell");
    expect(error(place(w, "0,1", 20, 30))).toBe("hidden_cell");
    expect(error(place(w, "0,0", 1.5, 9))).toBe("unknown_cell");
  });

  it("stands on Venice in a world without its point (as before)", () => {
    const w = world({ ...empire, map: { ...empire.map, home: null } });
    expect(
      homePost(house(w), parseEmpireSettings({ ...empire, map: { ...empire.map, home: null } })),
    ).toEqual(expect.objectContaining({ x: 0, y: 0 }));
  });
});
