import { describe, expect, it } from "vitest";
import {
  ROUTES,
  SEATS,
  WORLD_VIEW,
  alongPath,
  routeBetween,
  seatOf,
} from "../src/art/mediterranean.js";
import { bestQuote, regionLook } from "../src/empire/logic.js";
import type { EmpirePayload, EmpireQuote } from "../src/empire/types.js";

const REGIONS = Object.keys(SEATS);

describe("the world map", () => {
  it("seats the ten regions inside the frame, a finger apart", () => {
    expect(REGIONS).toHaveLength(10);
    for (const code of REGIONS) {
      const [x, y] = seatOf(code);
      expect(x).toBeGreaterThan(WORLD_VIEW.x + 10);
      expect(x).toBeLessThan(WORLD_VIEW.x + WORLD_VIEW.w - 10);
      expect(y).toBeGreaterThan(WORLD_VIEW.y + 10);
      expect(y).toBeLessThan(WORLD_VIEW.y + WORLD_VIEW.h - 10);
    }
    // 40 units of the 440 wide frame: 32 px on a 360 px phone, more than a marker.
    for (const a of REGIONS)
      for (const b of REGIONS) {
        if (a >= b) continue;
        const [ax, ay] = seatOf(a);
        const [bx, by] = seatOf(b);
        expect(Math.hypot(ax - bx, ay - by), `${a}–${b}`).toBeGreaterThan(40);
      }
  });

  it("keeps the real geography: Flanders north-west, the Levant south-east, Venice between", () => {
    const [fx, fy] = seatOf("fiandra");
    const [vx, vy] = seatOf("veneto");
    const [lx, ly] = seatOf("levante");
    expect(fx).toBeLessThan(vx);
    expect(fy).toBeLessThan(vy);
    expect(lx).toBeGreaterThan(vx);
    expect(ly).toBeGreaterThan(vy);
  });

  it("joins every region to Venice by its roads", () => {
    for (const code of REGIONS) {
      if (code === "veneto") continue;
      expect(ROUTES.some((r) => r.from === code || r.to === code)).toBe(true);
      const path = routeBetween("veneto", code);
      expect(path[0]).toEqual(seatOf("veneto"));
      expect(path.at(-1)).toEqual(seatOf(code));
    }
    // The Levant through Dalmatia and Greece, not across the land.
    expect(routeBetween("veneto", "levante").length).toBeGreaterThan(6);
  });

  it("places a convoy along its road by the share of the way", () => {
    const path: [number, number][] = [
      [0, 0],
      [10, 0],
      [10, 10],
    ];
    expect(alongPath(path, 0)).toEqual([0, 0]);
    expect(alongPath(path, 0.5)).toEqual([10, 0]);
    expect(alongPath(path, 0.75)).toEqual([10, 5]);
    expect(alongPath(path, 2)).toEqual([10, 10]);
  });

  it("shows a region as the house's own, open, to open or fogged", () => {
    const r = (code: string, casa: number, counter: number) => ({ code, casa, counter });
    expect(regionLook(r("veneto", 1, 1), 1)).toBe("home");
    expect(regionLook(r("lombardia", 6, 1), 6)).toBe("open");
    expect(regionLook(r("lombardia", 6, 0), 6)).toBe("reachable");
    expect(regionLook(r("levante", 9, 0), 6)).toBe("closed");
  });

  it("names a region's best paid good from its prices", () => {
    const q = (region: string, good: string, price: string) =>
      ({ region, good, price }) as EmpireQuote;
    const p = {
      market: [
        q("lombardia", "salt", "900"),
        q("lombardia", "glass", "3000"),
        q("veneto", "silk", "9000"),
      ],
    } as EmpirePayload;
    expect(bestQuote(p, "lombardia")).toBe("glass");
    expect(bestQuote(p, "dalmazia")).toBeNull();
  });
});
