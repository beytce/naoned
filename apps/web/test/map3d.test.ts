import { type EmpireSettings, slotAt, slotPoint } from "@comptoirs/engine";
import { describe, expect, it } from "vitest";
import { HEX_SIZE } from "../src/art/hexmap.js";
import { C } from "../src/art/plateau/props.js";
import { PALETTE, linear, recolour, swatchOf } from "../src/empire/map3d/recolor.js";
import { type SceneInput, TILE_R, road, scene3d, zones } from "../src/empire/map3d/scene.js";

/** The house's map at its start, as the server sends it (the towns and the fondaco on tiles). */
const start: SceneInput = {
  cells: { "2,4": { region: "veneto", coast: true } },
  revealed: ["2,4"],
  unlocked: ["2,4"],
  cities: [
    { code: "venezia", region: "veneto", x: 169, y: 129, size: 5 },
    { code: "padova", region: "veneto", x: 151, y: 149, size: 3 },
  ],
  home: { x: 178, y: 154 },
  posts: [],
  depot: null,
};
const S = { map: { hexSize: HEX_SIZE } } as EmpireSettings;

describe("the 3D map's scene, on the small tiles", () => {
  it("cuts each sector seen in seven small tiles, and the unknown around it", () => {
    const s = scene3d(start);
    const own = s.tiles.filter((t) => t.kind === "own");
    expect(own).toHaveLength(7);
    expect(own.map((t) => [t.x, t.y])).toEqual(
      [0, 1, 2, 3, 4, 5, 6].map((k) => slotPoint("2,4", k, S)),
    );
    expect(s.tiles.filter((t) => t.kind === "fog")).toHaveLength(6 * 7);
    expect(TILE_R).toBeCloseTo(HEX_SIZE / Math.sqrt(7), 6);
  });

  it("gives each place its tile: the towns, the fondaco; the free ones a kind of their own", () => {
    const s = scene3d(start);
    const themeAt = (x: number, y: number) => {
      const t = slotAt(x, y, S);
      return s.tiles.find((u) => u.cell === t.cell && u.k === t.k)?.theme;
    };
    expect(themeAt(169, 129)).toBe("town");
    expect(themeAt(151, 149)).toBe("town");
    expect(themeAt(178, 154)).toBe("fondaco");
    const free = s.tiles.filter((t) => t.kind === "own" && !["town", "fondaco"].includes(t.theme));
    expect(free).toHaveLength(4);
    for (const t of free)
      expect(["forest", "mountain", "field", "rocks", "plain", "farm"]).toContain(t.theme);
    // Venice, a capital, has more houses than Padua.
    expect(s.towns[0]?.houses.length).toBeGreaterThan(s.towns[1]?.houses.length ?? 0);
  });

  it("keeps each tile's dressing inside it, never on a town's or a fondaco's", () => {
    const s = scene3d(start);
    for (const p of s.props) {
      const t = slotAt(p.x, p.y, S);
      const tile = s.tiles.find((u) => u.cell === t.cell && u.k === t.k);
      expect(["town", "fondaco"]).not.toContain(tile?.theme);
    }
  });

  it("dresses the tiles after their region and their seed, the same at every call", () => {
    expect(scene3d(start)).toEqual(scene3d(start));
    // Veneto grows no mountains.
    expect(scene3d(start).props.some((p) => p.kind === "mountain")).toBe(false);
    // Germany's sectors, forests and mountains.
    const north: SceneInput = {
      ...start,
      cells: { "2,4": { region: "germania" } },
      cities: [],
      home: null,
    };
    const kinds = new Set(
      scene3d(north)
        .tiles.filter((t) => t.kind === "own")
        .map((t) => t.theme),
    );
    expect([...kinds].some((k) => k === "forest" || k === "mountain")).toBe(true);
  });

  it("lays the lanes the vehicles walk, the dressing kept off them", () => {
    const s = scene3d(start);
    expect(s.lanes).toHaveLength(2);
    for (const lane of s.lanes) {
      expect(lane[0]).toEqual([178, 154]);
      const end = lane[lane.length - 1] as [number, number];
      expect(s.towns.some((t) => Math.hypot(t.x - end[0], t.y - end[1]) < 1e-9)).toBe(true);
    }
    for (const p of s.props.filter((q) => q.kind !== "mountain"))
      for (const lane of s.lanes)
        for (const [x, y] of lane) expect(Math.hypot(p.x - x, p.y - y)).toBeGreaterThan(2);
  });

  it("puts the Campo and the Porta on free tiles of their sectors", () => {
    const s = scene3d({ ...start, camp: "2,4", porta: "2,4" });
    for (const at of [s.camp, s.porta]) {
      const t = slotAt(at?.x ?? 0, at?.y ?? 0, S);
      expect(t.cell).toBe("2,4");
      const theme = s.tiles.find((u) => u.cell === t.cell && u.k === t.k)?.theme;
      expect(["camp", "porta"]).toContain(theme);
    }
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
