import { describe, expect, it } from "vitest";
import {
  cityFrame,
  onRoute,
  parsePath,
  roadPoints,
  shareAt,
  toWorld,
} from "../src/routes3d/layout.js";

describe("routes3d layout", () => {
  it("puts a map point in world units, x east and z south", () => {
    expect(toWorld([302, 246])).toEqual({ x: 30.2, z: 24.6 });
  });

  it("samples a path of lines, horizontals and quadratic curves", () => {
    const pts = parsePath("M0 0 L10 0 H20 Q30 0 30 10 Z", 4);
    expect(pts[0]).toEqual([0, 0]);
    expect(pts).toContainEqual([10, 0]);
    expect(pts).toContainEqual([20, 0]);
    expect(pts).toContainEqual([30, 10]);
    // Closed: back to the start.
    expect(pts[pts.length - 1]).toEqual([0, 0]);
    // The curve passes inside its control corner.
    const mid = pts[pts.indexOf(pts.find((p) => p[0] === 20) as [number, number]) + 2];
    expect(mid?.[0]).toBeGreaterThan(20);
    expect(mid?.[1]).toBeGreaterThan(0);
  });

  it("samples a road from its depot to its city", () => {
    const pts = roadPoints("terraferma:padova", 8);
    expect(pts).toHaveLength(9);
    expect(pts[0]).toEqual({ x: 13.4, z: 30 });
    expect(pts[8]?.x).toBeCloseTo(21.8);
    expect(pts[8]?.z).toBeCloseTo(26.2);
    expect(roadPoints("nowhere:padova", 8)).toEqual([]);
  });

  it("frames the cities and the depot with a margin", () => {
    const f = cityFrame(["venezia", "verona"], "terraferma", 2);
    expect(f.minX).toBeCloseTo(5);
    expect(f.maxX).toBeCloseTo(32.2);
    expect(f.minZ).toBeCloseTo(20.6);
    expect(f.maxZ).toBeCloseTo(32);
  });
});

describe("vehicles on the road", () => {
  const dv = { departAt: 0, arriveAt: 100, backAt: 300, halted: false };
  it("goes out, then comes back", () => {
    expect(shareAt(dv, 50)).toEqual({ share: 0.5, out: true });
    expect(shareAt(dv, 200)).toEqual({ share: 0.5, out: false });
    expect(shareAt(dv, 400)).toEqual({ share: 0, out: false });
  });
  it("stays half-way while halted by an ambush", () => {
    expect(shareAt({ ...dv, halted: true }, 80)).toEqual({ share: 0.5, out: true });
  });
  it("runs along its road", () => {
    const r = onRoute("terraferma:padova", 0);
    expect(r?.at).toEqual({ x: 13.4, z: 30 });
    expect(Math.hypot(r?.dir.x ?? 0, r?.dir.z ?? 0)).toBeCloseTo(1);
  });
});
