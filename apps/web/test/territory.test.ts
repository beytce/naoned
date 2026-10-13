import { describe, expect, it } from "vitest";
import { territories } from "../src/campaign3d/territory.js";

const sites = [
  { code: "a", x: 0, y: 0, holder: "rossi" },
  { code: "b", x: 40, y: 0, holder: "verdi" },
  { code: "c", x: 0, y: 40, holder: "rossi" },
];

describe("campaign territories", () => {
  it("gives each land the ground nearer to it than to any other, within a radius", () => {
    const t = territories(sites, 30, 24);
    const a = t.cells.a ?? [];
    expect(a.length).toBeGreaterThan(3);
    // The bisector with b (x = 20) and with c (y = 20) bound a's cell.
    for (const [x, y] of a) {
      expect(x).toBeLessThanOrEqual(20.0001);
      expect(y).toBeLessThanOrEqual(20.0001);
      expect(Math.hypot(x, y)).toBeLessThanOrEqual(30.0001);
    }
  });

  it("draws borders between holders only, and around the edge of the map", () => {
    const t = territories(sites, 30, 24);
    // Between a and b (two families): a border on x = 20.
    const ab = t.borders.filter(
      (e) => Math.abs(e.from[0] - 20) < 1e-6 && Math.abs(e.to[0] - 20) < 1e-6,
    );
    expect(ab.length).toBeGreaterThan(0);
    // Between a and c (one family): no border on y = 20 inside the Rossi's ground.
    const ac = t.borders.filter(
      (e) =>
        e.holder === "rossi" &&
        Math.abs(e.from[1] - 20) < 1e-6 &&
        Math.abs(e.to[1] - 20) < 1e-6 &&
        e.from[0] < 20 &&
        e.to[0] < 20,
    );
    expect(ac).toEqual([]);
  });
});
