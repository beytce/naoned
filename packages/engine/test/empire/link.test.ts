import { describe, expect, it } from "vitest";
import { type EmpireSettingsInput, empireHouseAt, empireView } from "../../src/index.js";
import type { EmpireHouse } from "../../src/state.js";
import { testSquareMap } from "../fixture.js";
import { HOUR, World, makeContext } from "../helpers.js";
import { ordersEmpire } from "./ordersFixture.js";

// The mules walk the house's own land (decision of the owner, 7 November 2026): a city is served
// only when a chain of tiles bought, side by side, links it to a fondaco; no hop on the sea nor on
// land not bought. A new house is given the tiles linking its fondaco to its nearest town.
//
//        i=0  1  2  3  4  5  6  7
//   j=0   T  .  .  .  ~  ~  L  L        T treviso, V venezia, P padova, M milano, A acri
//   j=1   .  V  .  F  ~  ~  M  L        F the fondaco (3,1)
//   j=2   .  .  P  .  .  .  L  L
//   j=3   ~  ~  ~  ~  ~  ~  ~  ~
//   j=4   ~  ~  A  .  ~  ~  ~  ~
const cities = [
  { code: "venezia", cell: "1,1", region: "veneto", x: 15, y: 15, size: 3 },
  { code: "padova", cell: "2,2", region: "veneto", x: 25, y: 25, size: 2 },
  { code: "treviso", cell: "0,0", region: "veneto", x: 5, y: 5, size: 2 },
  { code: "milano", cell: "7,1", region: "lombardia", x: 75, y: 15, size: 3 },
  { code: "acri", cell: "2,4", region: "levante", x: 25, y: 45, size: 2 },
];
const empire = (freeTiles: number): EmpireSettingsInput => ({
  ...ordersEmpire,
  start: { capitalDucats: 100_000, workshops: [], vehicles: ["cart"], freeTiles },
  regions: (ordersEmpire.regions ?? []).map((r) => (r.code === "levante" ? { ...r, casa: 1 } : r)),
  map: {
    ...ordersEmpire.map,
    grid: "square",
    tileSize: testSquareMap.tileSize,
    cells: testSquareMap.tiles,
    cities,
    tiles: true,
    revealRadius: 1,
    home: { x: 35, y: 15 },
    reach: { base: 60, perLevel: 10 },
    unlock: { costDucats: 40, stepBps: 0, seaHops: 3 },
  },
});

function world(freeTiles = 0) {
  const w = new World(makeContext({ empire: empire(freeTiles) }));
  w.do({ type: "empireJoin", playerId: "a" });
  return w;
}
/** A farm on the tile north of the fondaco (3,0), linking no town: the towns ask its wheat. */
function farming() {
  const w = world();
  w.do({ type: "empireUnlockCell", playerId: "a", cell: "3,0" });
  w.do({
    type: "empireBuildWorkshop",
    playerId: "a",
    workshopType: "farm",
    recipe: "grow_wheat",
    tile: "3,0",
  });
  w.advance(12 * HOUR);
  return w;
}
const house = (w: World) => empireHouseAt(w.ctx, w.state, "a", w.now) as EmpireHouse;
const view = (w: World) => empireView(w.ctx, w.state, "a", w.now);
const error = (res: { ok: boolean; error?: string }) => (res.ok ? "" : res.error);
const unlock = (w: World, cell: string) => w.try({ type: "empireUnlockCell", playerId: "a", cell });
const served = (w: World, city: string) =>
  view(w)?.orders.find((o) => o.city === city)?.posts ?? [];
const deliver = (w: World, city: string) =>
  w.try({ type: "empireDeliverCity", playerId: "a", city });
const fill = (w: World, city: string) => {
  for (const o of view(w)?.orders.find((x) => x.city === city)?.orders ?? [])
    w.give("a", o.good, o.qty);
};

describe("the cities linked by the house's own tiles", () => {
  it("serves no city the tiles bought do not link to the fondaco, however near", () => {
    const w = farming();
    expect(house(w).home?.cell).toBe("3,1");
    expect(served(w, "padova")).toEqual([]);
    expect(served(w, "venezia")).toEqual([]);
    expect(view(w)?.orders.find((o) => o.city === "padova")?.orders.length).toBeGreaterThan(0);
    fill(w, "padova");
    expect(error(deliver(w, "padova"))).toBe("not_linked");
  });

  it("names the tiles to buy to link each city in reach, by land only", () => {
    const w = world();
    const toLink = view(w)?.map?.toLink ?? {};
    expect(toLink.padova).toEqual(["2,1"]);
    expect(toLink.treviso?.length).toBeGreaterThanOrEqual(2);
    expect(toLink.acri).toBeUndefined(); // across the sea: no land joins it
  });

  it("serves a city once a tile bought links it, the mule walking the tiles owned", () => {
    const w = farming();
    expect(error(unlock(w, "2,1"))).toBe("");
    expect(served(w, "padova")).toEqual(["home"]);
    expect(served(w, "venezia")).toEqual(["home"]);
    expect(served(w, "treviso")).toEqual([]); // 1,0 or 0,1 still to buy
    expect(view(w)?.map?.toLink?.padova).toBeUndefined();
    fill(w, "padova");
    expect(error(deliver(w, "padova"))).toBe("");
    const road = view(w)?.vehicles.mine[0]?.legs[0]?.road ?? [];
    expect(road.length).toBeGreaterThan(1);
    // Every point of the road on a tile of the house's own, or the town's.
    const owned = new Set([...(house(w).unlocked ?? []), "2,2"]);
    for (const [x, y] of road)
      expect(owned.has(`${Math.floor(x / 10)},${Math.floor(y / 10)}`)).toBe(true);
  });

  it("never crosses the sea to a coast bought beyond it", () => {
    const w = world();
    unlock(w, "3,2");
    unlock(w, "2,4");
    expect(house(w).unlocked).toContain("2,4");
    expect(served(w, "acri")).toEqual([]);
  });
});

describe("the first tiles of a new house", () => {
  it("link its fondaco to its nearest town, then the nearest free tiles", () => {
    const w = world(3);
    const owned = house(w).unlocked ?? [];
    expect(owned).toContain("2,1");
    // Its own tile, Venice's (the house's from the start), and three given.
    expect(owned.filter((t) => t !== "3,1" && t !== "1,1")).toHaveLength(3);
    expect(served(w, "padova")).toEqual(["home"]);
  });
});
