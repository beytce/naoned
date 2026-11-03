import { describe, expect, it } from "vitest";
import { HEX_SIZE, cellCentre } from "../src/art/hexmap.js";
import { C } from "../src/art/plateau/props.js";
import { PALETTE, linear, recolour, swatchOf } from "../src/empire/map3d/recolor.js";
import { type SceneInput, road, scene3d, zones } from "../src/empire/map3d/scene.js";

/** The house's map at its start, as the server sends it (a session of e2e/map3d.mjs). */
const start: SceneInput = {
  cells: { "2,4": { region: "veneto", coast: true } },
  revealed: ["2,4"],
  unlocked: ["2,4"],
  cities: [
    { code: "venezia", region: "veneto", x: 165, y: 140, size: 5 },
    { code: "padova", region: "veneto", x: 155, y: 141, size: 3 },
  ],
  home: { x: 178, y: 146 },
  posts: [],
  depot: null,
};

describe("the 3D map's scene", () => {
  it("lays a tile per sector seen and the unknown around it", () => {
    const s = scene3d(start);
    expect(s.tiles.filter((t) => t.kind === "own").map((t) => t.key)).toEqual(["2,4"]);
    expect(s.tiles.filter((t) => t.kind === "fog")).toHaveLength(6);
    const [x, y] = cellCentre("2,4");
    expect(s.tiles[0]).toMatchObject({ x, y });
    expect(s.bounds.maxX - s.bounds.minX).toBeCloseTo(2 * HEX_SIZE);
  });

  it("puts Venice and Padua where the game has them, the dressing clear of them", () => {
    const s = scene3d(start);
    expect(s.towns.map((t) => [t.code, t.x, t.y])).toEqual([
      ["venezia", 165, 140],
      ["padova", 155, 141],
    ]);
    // Venice, a capital, has more houses than Padua.
    expect(s.towns[0]?.houses.length).toBeGreaterThan(s.towns[1]?.houses.length ?? 0);
    for (const p of s.props)
      for (const t of s.towns) expect(Math.hypot(p.x - t.x, p.y - t.y)).toBeGreaterThan(5);
    for (const p of s.props)
      expect(Math.hypot(p.x - 178, p.y - 146)).toBeGreaterThan(p.kind === "pine" ? 4 : 7);
  });

  it("dresses a sector after its region and its seed, the same at every call", () => {
    const a = scene3d(start);
    const b = scene3d(start);
    expect(a).toEqual(b);
    expect(a.props.some((p) => p.kind === "pine")).toBe(true);
    // Veneto grows no mountains.
    expect(a.props.some((p) => p.kind === "mountain")).toBe(false);
  });

  it("lays the lanes the vehicles walk, the dressing kept off them", () => {
    const s = scene3d(start);
    // From the fondaco to each town, straight (logic.ts, vehiclePose).
    expect(s.lanes).toHaveLength(2);
    for (const lane of s.lanes) {
      expect(lane[0]).toEqual([178, 146]);
      const end = lane[lane.length - 1] as [number, number];
      expect(s.towns.some((t) => Math.hypot(t.x - end[0], t.y - end[1]) < 1e-9)).toBe(true);
    }
    for (const p of s.props)
      for (const lane of s.lanes)
        for (const [x, y] of lane) expect(Math.hypot(p.x - x, p.y - y)).toBeGreaterThan(3);
  });

  it("puts the Campo and the Porta where the SVG board has them", () => {
    const s = scene3d({ ...start, camp: "2,4", porta: "2,4" });
    const [x, y] = cellCentre("2,4");
    expect(s.camp).toEqual({ x, y: y + 7 });
    expect(s.porta).toEqual({ x: x + 9, y: y - 9 });
    expect(scene3d(start).camp).toBeNull();
  });

  it("gives each place a touch of its own, never over its neighbour's", () => {
    const z = zones([
      { id: "home", x: 178, y: 146 },
      { id: "city:venezia", x: 165, y: 140 },
      { id: "city:padova", x: 155, y: 141 },
      { id: "depot", x: 300, y: 300 },
    ]);
    for (const a of z)
      for (const b of z)
        if (a !== b)
          expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeGreaterThanOrEqual(a.r + b.r - 1e-9);
    // Venice and Padua, 10 apart: 5 each; the Remise alone: as large as a touch goes.
    expect(z.find((x) => x.id === "city:padova")?.r).toBeCloseTo(5.0249, 3);
    expect(z.find((x) => x.id === "depot")?.r).toBe(7);
  });

  it("walks a road from one end to the other, bent to one side", () => {
    const r = road([0, 0], [10, 0], 0.2, 10);
    expect(r[0]).toEqual([0, 0]);
    expect(r[10]?.[0]).toBeCloseTo(10);
    expect(r[10]?.[1]).toBeCloseTo(0);
    expect(Math.abs(r[5]?.[1] ?? 0)).toBeCloseTo(2);
  });
});

describe("the KayKit models in the night board's palette", () => {
  it("reads the atlas's swatch from a UV", () => {
    expect(swatchOf(0.15, 0.3).role).toBe("roof");
    expect(swatchOf(0.15, 0.1).role).toBe("wall");
    expect(swatchOf(0.2, 0.6).role).toBe("leaf");
    expect(swatchOf(0.05, 0.25).t).toBeCloseTo(0);
    expect(swatchOf(1, 1).role).toBe("trunk");
  });

  it("paints the roofs blue and swaps them for gold when asked", () => {
    const uv = [0.15, 0.3];
    const blue = linear(C.roof);
    const roof = recolour(uv);
    expect((roof[2] ?? 0) / (roof[0] ?? 1)).toBeCloseTo(blue[2] / blue[0]);
    const gold = recolour(uv, { roof: C.roofGold });
    expect(gold[0] ?? 0).toBeGreaterThan(gold[2] ?? 0);
  });

  it("takes every colour from the board's palette", () => {
    const board = new Set(Object.values(C));
    for (const hex of Object.values(PALETTE)) expect(board.has(hex as never)).toBe(true);
  });
});
