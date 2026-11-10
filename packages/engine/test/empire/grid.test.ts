import { describe, expect, it } from "vitest";
import {
  alongRoad,
  buyableTiles,
  gridRoad,
  gridRoadTiles,
  linkTiles,
  neighbours4,
  ownedRoadTiles,
  parseTile,
  placeFault,
  placeTowns,
  roadLength,
  tileAt,
  tileCentre,
  tileCost,
  tileDistance,
  tileKey,
  tilesTouch,
} from "../../src/index.js";
import { testSquareMap as M } from "../fixture.js";

// The square grid (docs/plan-porcellana.md § 2 bis): one tile is the unit of everything.
describe("the square tiles", () => {
  it("keys a tile « i,j » and reads it back", () => {
    expect(tileKey(3, -2)).toBe("3,-2");
    expect(parseTile("3,-2")).toEqual([3, -2]);
    // Read as before whatever the text, and the same at every call (its tiles are kept).
    expect(parseTile("3")).toEqual([3, Number.NaN]);
    expect(parseTile("")).toEqual([0, Number.NaN]);
    expect(parseTile("3,")).toEqual([3, 0]);
    expect(parseTile("3,4,5")).toEqual([3, 4]);
    expect(parseTile("a,b")).toEqual([Number.NaN, Number.NaN]);
    expect(parseTile(" 7 , 8 ")).toEqual([7, 8]);
    expect(parseTile("12,34")).toEqual(parseTile("12,34"));
    // What it gives is not to be written on: every caller reads the same tile.
    expect(() => {
      (parseTile("5,6") as number[])[0] = 99;
    }).toThrow();
    expect(parseTile("5,6")).toEqual([5, 6]);
  });

  it("finds the tile under a point, and the tile's middle", () => {
    expect(tileAt(0, 0, 10)).toBe("0,0");
    expect(tileAt(9.99, 19.99, 10)).toBe("0,1");
    expect(tileAt(-0.01, 10, 10)).toBe("-1,1");
    expect(tileCentre("2,1", 10)).toEqual([25, 15]);
    for (const k of ["0,0", "5,-3", "-4,7"]) expect(tileAt(...tileCentre(k, 10), 10)).toBe(k);
  });

  it("has four neighbours, by its sides, in a fixed order", () => {
    expect(neighbours4("2,2")).toEqual(["2,1", "3,2", "2,3", "1,2"]);
  });

  it("counts the distance in steps by the sides", () => {
    expect(tileDistance("0,0", "0,0")).toBe(0);
    expect(tileDistance("0,0", "3,2")).toBe(5);
    expect(tileDistance("2,-1", "-1,1")).toBe(5);
  });

  it("tells two tiles that touch by a side, not by a corner", () => {
    expect(tilesTouch("1,1", "1,2")).toBe(true);
    expect(tilesTouch("1,1", "2,2")).toBe(false);
    expect(tilesTouch("1,1", "1,1")).toBe(false);
  });
});

describe("buying tile by tile", () => {
  it("offers the land next to one's own by a side, never the sea nor one's own", () => {
    expect(buyableTiles(["1,0"], M, 0)).toEqual(["0,0", "1,1", "2,0"]);
    expect(buyableTiles(["3,0"], M, 0)).toEqual(["2,0", "3,1"]); // 4,0 is sea
  });

  it("offers a coast within the sea's hops from a coast one owns", () => {
    expect(buyableTiles(["4,2"], M, 3)).toEqual(["1,2", "2,2", "3,1", "3,2", "5,2", "6,1"]);
    expect(buyableTiles(["4,2"], M, 2)).not.toContain("6,1");
    expect(buyableTiles(["2,2"], M, 2)).toContain("2,4");
    expect(buyableTiles(["2,2"], M, 0)).not.toContain("2,4");
  });

  it("prices the next tile, dearer by the step for every tile owned beyond the first", () => {
    expect(tileCost(0, 40, 1_000)).toBe(4_000n);
    expect(tileCost(1, 40, 1_000)).toBe(4_000n);
    expect(tileCost(2, 40, 1_000)).toBe(4_400n);
    expect(tileCost(3, 40, 1_000)).toBe(4_840n);
  });
});

describe("where a place may stand", () => {
  it("wants land, on no town, touching no other place by a side", () => {
    expect(placeFault(M, "9,9", [], [])).toBe("unknown_tile");
    expect(placeFault(M, "4,0", [], [])).toBe("unknown_tile");
    expect(placeFault(M, "1,1", ["1,1"], [])).toBe("on_city");
    expect(placeFault(M, "1,0", ["1,1"], [])).toBe("on_city");
    expect(placeFault(M, "2,2", [], ["2,1"])).toBe("too_close");
    expect(placeFault(M, "0,0", ["1,1"], ["2,1"])).toBeNull(); // corners may meet
  });

  it("puts every town on a land tile of its own, none touching another by a side", () => {
    const placed = placeTowns(M.cities, M);
    const tiles = placed.map((c) => c.tile);
    expect(new Set(tiles).size).toBe(tiles.length);
    for (const c of placed) expect(M.tiles[c.tile]).toBeDefined();
    for (const a of placed)
      for (const b of placed) if (a !== b) expect(tilesTouch(a.tile, b.tile)).toBe(false);
  });

  it("keeps a town on the tile under its point when it can, the nearest free one else", () => {
    const placed = Object.fromEntries(placeTowns(M.cities, M).map((c) => [c.code, c]));
    expect(placed.venezia?.tile).toBe("1,1");
    expect(placed.milano?.tile).toBe("7,1");
    expect(placed.acri?.tile).toBe("2,4");
    // treviso's tile (1,0) touches venezia's: it moves to the nearest that touches none.
    expect(placed.treviso?.tile).not.toBe("1,0");
    expect(placed.venezia?.x).toBe(15);
    expect(placed.venezia?.y).toBe(15);
  });

  it("places the same at every call, whatever the order given", () => {
    const a = placeTowns(M.cities, M);
    const b = placeTowns([...M.cities].reverse(), M);
    const by = (l: typeof a) => Object.fromEntries(l.map((c) => [c.code, c.tile]));
    expect(by(b)).toEqual(by(a));
  });
});

describe("the roads, tile by tile", () => {
  const towns = new Set(placeTowns(M.cities, M).map((c) => c.tile));

  it("goes by the sides, the shortest way, from tile to tile", () => {
    const path = gridRoadTiles("0,0", "3,0", M, new Set());
    expect(path[0]).toBe("0,0");
    expect(path.at(-1)).toBe("3,0");
    expect(path).toHaveLength(4);
    for (let i = 1; i < path.length; i++)
      expect(tilesTouch(path[i - 1] as string, path[i] as string)).toBe(true);
  });

  it("goes around a town when it can, and crosses the sea only for want of land", () => {
    const around = gridRoadTiles("0,1", "2,1", M, new Set(["1,1"]));
    expect(around).not.toContain("1,1");
    const across = gridRoadTiles("3,2", "2,4", M, towns);
    expect(across.some((t) => !M.tiles[t])).toBe(true);
  });

  it("is the same at every call", () => {
    expect(gridRoadTiles("0,0", "7,2", M, towns)).toEqual(gridRoadTiles("0,0", "7,2", M, towns));
  });

  it("draws from the place's point through the tiles' middles, corners rounded", () => {
    const pts = gridRoad([3, 3], [36, 4], M, new Set());
    expect(pts[0]).toEqual([3, 3]);
    expect(pts.at(-1)).toEqual([36, 4]);
    expect(roadLength(pts)).toBeGreaterThan(30);
    expect(roadLength(pts)).toBeLessThan(40);
  });

  it("walks along a line by its share", () => {
    const line: [number, number][] = [
      [0, 0],
      [10, 0],
      [10, 10],
    ];
    expect(alongRoad(line, 0.25)).toEqual({ x: 5, y: 0, angle: 0 });
    expect(alongRoad(line, 0.75).y).toBeCloseTo(5);
  });
});

// The mules walk the house's own tiles (decision of the owner, 7 November 2026): no way across the
// sea, nor across land not bought.
describe("the roads through the house's own tiles", () => {
  const towns = new Set(["1,1", "6,1"]);
  it("walks only the tiles owned, from one end to the other", () => {
    const owned = new Set(["0,0", "1,0", "2,0", "3,0"]);
    expect(ownedRoadTiles("0,0", "3,0", M, towns, owned)).toEqual(["0,0", "1,0", "2,0", "3,0"]);
    // The town at 1,1 is reached from the tile by its side.
    expect(ownedRoadTiles("3,0", "1,1", M, towns, owned)).toEqual(["3,0", "2,0", "1,0", "1,1"]);
  });

  it("finds no way when a tile between is not owned, nor across the sea", () => {
    expect(ownedRoadTiles("0,0", "3,0", M, towns, new Set(["0,0", "1,0", "3,0"]))).toBeNull();
    // Coasts owned on both sides of the sea: no way between.
    const coasts = new Set(["1,2", "2,2", "2,4", "3,4"]);
    expect(ownedRoadTiles("2,2", "3,4", M, towns, coasts)).toBeNull();
  });

  it("goes round the towns among the tiles owned when it can", () => {
    const owned = new Set(["0,1", "0,0", "1,0", "2,0", "2,1", "1,1"]);
    expect(ownedRoadTiles("0,1", "2,1", M, towns, owned)).toEqual([
      "0,1",
      "0,0",
      "1,0",
      "2,0",
      "2,1",
    ]);
  });

  it("names the tiles to buy to link two places, the fewest, by land only", () => {
    const owned = new Set(["3,1"]);
    // From 3,1 to the town at 1,1: 2,1 alone between.
    expect(linkTiles("3,1", "1,1", M, towns, owned)).toEqual(["2,1"]);
    expect(linkTiles("3,1", "1,1", M, towns, new Set(["3,1", "2,1"]))).toEqual([]);
    // Across the sea: no link by land.
    expect(linkTiles("3,1", "2,4", M, towns, owned)).toBeNull();
    // Never through a town.
    expect(linkTiles("0,1", "2,1", M, towns, new Set(["0,1"]))).not.toContain("1,1");
  });
});
