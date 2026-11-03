import { describe, expect, it } from "vitest";
import {
  SLOT_STEP,
  cellCentreOf,
  cellsWithin,
  hopMs,
  parseEmpireSettings,
  placeCities,
  roadBetween,
  roadLength,
  roadTiles,
  slotAt,
  slotPoint,
  slotsTouch,
  townClashes,
} from "../../src/index.js";
import { testEmpire } from "../fixture.js";

// The small tiles (docs/plateau-reprise.md § 8): each sector cut in seven, a place on each.
const s = parseEmpireSettings({ ...testEmpire, map: { ...testEmpire.map, hexSize: 24 } });
const d = (a: [number, number], b: [number, number]) => Math.hypot(a[0] - b[0], a[1] - b[1]);

describe("a sector's seven small tiles", () => {
  it("puts the first at the sector's middle, six around it, a step away, 60° apart", () => {
    expect(slotPoint("1,0", 0, s)).toEqual(cellCentreOf("1,0", s));
    const c = slotPoint("1,0", 0, s);
    const ring = [1, 2, 3, 4, 5, 6].map((k) => slotPoint("1,0", k, s));
    for (const p of ring) expect(d(p, c)).toBeCloseTo(SLOT_STEP * 24, 6);
    for (let k = 0; k < 6; k++)
      expect(d(ring[k] as [number, number], ring[(k + 1) % 6] as [number, number])).toBeCloseTo(
        SLOT_STEP * 24,
        6,
      );
  });

  it("tiles the board: no two small tiles overlap, across the sectors' edges too", () => {
    const pts = cellsWithin("0,0", 2).flatMap((cell) =>
      [0, 1, 2, 3, 4, 5, 6].map((k) => slotPoint(cell, k, s)),
    );
    for (let i = 0; i < pts.length; i++)
      for (let j = i + 1; j < pts.length; j++)
        expect(d(pts[i] as [number, number], pts[j] as [number, number])).toBeGreaterThan(
          SLOT_STEP * 24 - 1e-6,
        );
    // The middle tile of « 0,0 » has six neighbours, all of its own sector.
    const mid = slotPoint("0,0", 0, s);
    expect(pts.filter((p) => Math.abs(d(p, mid) - SLOT_STEP * 24) < 1e-6)).toHaveLength(6);
  });

  it("says which touch: next to each other, never every other one of the ring", () => {
    const at = (k: number) => slotPoint("0,0", k, s);
    expect(slotsTouch(at(0), at(3), s)).toBe(true);
    expect(slotsTouch(at(1), at(2), s)).toBe(true);
    expect(slotsTouch(at(1), at(3), s)).toBe(false);
    expect(slotsTouch(at(2), at(5), s)).toBe(false);
  });

  it("finds the tile under a point", () => {
    const p = slotPoint("3,1", 4, s);
    expect(slotAt(p[0] + 2, p[1] - 1, s)).toEqual({ cell: "3,1", k: 4 });
  });
});

describe("the towns on their small tiles", () => {
  it("gives each town a tile, never touching another town's, and leaves one for a fondaco", () => {
    const cities = [
      { code: "venezia", cell: "0,0", region: "veneto", x: 6, y: -4, size: 5 },
      { code: "padova", cell: "0,0", region: "veneto", x: -8, y: 2, size: 3 },
      { code: "milano", cell: "4,0", region: "lombardia" },
    ];
    const placed = placeCities(cities, s, ["0,0"]);
    expect(placed.map((c) => c.code)).toEqual(["venezia", "padova", "milano"]);
    for (const c of placed) expect(slotAt(c.x, c.y, s).cell).toBe(c.cell);
    // Two towns of a sector on its ring; a town alone may stand in its sector's middle.
    for (const c of placed.slice(0, 2)) expect(slotAt(c.x, c.y, s).k).toBeGreaterThan(0);
    const [v, p] = placed as [(typeof placed)[0], (typeof placed)[0]];
    expect(slotsTouch([v.x, v.y], [p.x, p.y], s)).toBe(false);
    // A tile of the sector left, touching neither town.
    const free = [1, 2, 3, 4, 5, 6]
      .map((k) => slotPoint("0,0", k, s))
      .filter((q) => placed.every((c) => !slotsTouch(q, [c.x, c.y], s) && d(q, [c.x, c.y]) > 1));
    expect(free.length).toBeGreaterThanOrEqual(1);
    // Each town on the tile nearest its old point among those allowed: Venice to the east.
    expect(v.x).toBeGreaterThan(0);
    expect(p.x).toBeLessThan(v.x);
  });

  it("keeps no two towns touching, and a fondaco's tile free where asked, the next sectors' towns counted", () => {
    // Two towns in each of three sectors side by side; the first fondaco goes in « 0,0 ».
    const cities = ["0,0", "1,0", "0,1"].flatMap((cell, i) => [
      { code: `a${i}`, cell, region: "veneto" },
      { code: `b${i}`, cell, region: "veneto" },
    ]);
    const placed = placeCities(cities, s, ["0,0"]);
    expect(townClashes(placed, s)).toEqual([]);
    const free = [1, 2, 3, 4, 5, 6]
      .map((k) => slotPoint("0,0", k, s))
      .filter((q) => placed.every((c) => !slotsTouch(q, [c.x, c.y], s)));
    expect(free.length).toBeGreaterThanOrEqual(1);
  });

  it("is the same at every call", () => {
    const cities = [{ code: "acri", cell: "9,0", region: "levante" }];
    expect(placeCities(cities, s)).toEqual(placeCities(cities, s));
  });
});

describe("the roads from tile to tile", () => {
  const towns = [
    { code: "venezia", cell: "0,0", region: "veneto", x: 0, y: 0 },
    { code: "padova", cell: "0,1", region: "veneto", x: 0, y: 0 },
  ];
  const m = parseEmpireSettings({
    ...testEmpire,
    map: {
      ...testEmpire.map,
      hexSize: 24,
      tiles: true,
      cities: placeCities(towns, s, ["0,0"]),
    },
  });
  const v = m.map.cities[0] as { x: number; y: number };
  const p = m.map.cities[1] as { x: number; y: number };

  it("runs from one place's tile to the other's, step by step across the tiles", () => {
    const r = roadTiles([v.x, v.y], [p.x, p.y], m);
    expect(r[0]).toEqual(slotAt(v.x, v.y, m));
    expect(r.at(-1)).toEqual(slotAt(p.x, p.y, m));
    for (let i = 1; i < r.length; i++) {
      const a = slotPoint((r[i - 1] as { cell: string }).cell, (r[i - 1] as { k: number }).k, m);
      const b = slotPoint((r[i] as { cell: string }).cell, (r[i] as { k: number }).k, m);
      expect(d(a, b)).toBeCloseTo(SLOT_STEP * 24, 4);
    }
  });

  it("goes around a town's tile when it can", () => {
    const r = roadTiles([v.x, v.y], [p.x, p.y], m).slice(1, -1);
    for (const t of r) {
      const at = slotPoint(t.cell, t.k, m);
      for (const c of m.map.cities)
        expect(d(at, [c.x as number, c.y as number])).toBeGreaterThan(1);
    }
  });

  it("is a soft line from one place to the other, never shorter than the straight way", () => {
    const pts = roadBetween([v.x, v.y], [p.x, p.y], m);
    expect(pts[0]).toEqual([v.x, v.y]);
    expect(pts.at(-1)).toEqual([p.x, p.y]);
    expect(roadLength(pts)).toBeGreaterThanOrEqual(d([v.x, v.y], [p.x, p.y]) - 1e-9);
    expect(roadBetween([v.x, v.y], [p.x, p.y], m)).toEqual(pts);
  });

  it("times a hop on its road on the small tiles, straight elsewhere", () => {
    const slow = parseEmpireSettings({
      ...testEmpire,
      map: m.map,
      moves: { departSeconds: 10, unitsPerSecond: 8, maxStops: 15, secondsPerUnit: 10 },
    });
    const len = roadLength(roadBetween([v.x, v.y], [p.x, p.y], slow));
    expect(hopMs(slow, [v.x, v.y], [p.x, p.y])).toBe(Math.round(len * 10 * 1_000));
  });
});
