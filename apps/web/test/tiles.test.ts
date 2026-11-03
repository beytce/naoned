import { type EmpireSettings, slotPoint, slotsTouch } from "@comptoirs/engine";
import { describe, expect, it } from "vitest";
import { roadOf, snapToTile, vehiclePose } from "../src/empire/map/logic.js";
import type { EmpirePayload } from "../src/empire/types.js";

// A fondaco put down on the small tiles (3 November, the long voyages): the point picked comes to
// the middle of the free tile nearest it, never next to a town.
const s = { map: { hexSize: 24 } } as EmpireSettings;
const tile = (k: number): [number, number] => {
  const [x, y] = slotPoint("2,4", k, s);
  return [Math.round(x), Math.round(y)];
};
const [vx, vy] = tile(1);
const [px, py] = tile(3);
const p = {
  view: {
    map: {
      tiles: true,
      hexSize: 24,
      home: { x: 0, y: 0, level: 1, reach: 36, placed: false },
      posts: [],
      cities: [
        { code: "venezia", cell: "2,4", region: "veneto", x: vx, y: vy, size: 5 },
        { code: "padova", cell: "2,4", region: "veneto", x: px, y: py, size: 3 },
      ],
    },
  },
} as unknown as EmpirePayload;

describe("a fondaco's point on the small tiles", () => {
  it("comes to the free tile's middle, whatever point of the sector is touched", () => {
    for (const k of [0, 1, 2, 4, 6]) {
      const [x, y] = slotPoint("2,4", k, s);
      const at = snapToTile(p, "2,4", Math.round(x) + 2, Math.round(y) - 1);
      expect([at.x, at.y]).toEqual(tile(5));
    }
    expect(slotsTouch(tile(5), [vx, vy], s)).toBe(false);
    expect(slotsTouch(tile(5), [px, py], s)).toBe(false);
  });

  it("leaves the point as it is on a map without the small tiles", () => {
    const flat = { view: { map: { ...p.view?.map, tiles: false } } } as unknown as EmpirePayload;
    expect(snapToTile(flat, "2,4", 170, 140)).toEqual({ cell: "2,4", x: 170, y: 140 });
  });
});

describe("a vehicle on its road (the small tiles)", () => {
  it("walks the road tile after tile, its time's share of it", () => {
    const home = tile(5);
    const q = {
      view: {
        ...p.view,
        map: {
          ...p.view?.map,
          cells: { "2,4": { region: "veneto" } },
          home: { x: home[0], y: home[1], level: 1, reach: 36 },
        },
      },
    } as unknown as EmpirePayload;
    const road = roadOf(q, home, [vx, vy]);
    expect(road[0]).toEqual(home);
    expect(road.at(-1)).toEqual([vx, vy]);
    expect(road.length).toBeGreaterThan(2);
    const v = {
      id: "m",
      type: "mule",
      at: "home",
      legs: [{ from: "home", to: "city:venezia", departAt: 0, arrivesAt: 1_000 }],
    } as NonNullable<EmpirePayload["view"]>["vehicles"]["mine"][number];
    const half = vehiclePose(q, v, 500);
    // On the road, not on the straight line between its ends.
    const near = Math.min(...road.map(([x, y]) => Math.hypot(x - half.x, y - half.y)));
    expect(near).toBeLessThan(6);
  });
});
