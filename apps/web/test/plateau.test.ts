import { describe, expect, it } from "vitest";
import { HEX_SIZE, cellCentre } from "../src/art/hexmap.js";
import { TILT, box, facesEye, hashOf, project, rng, shade } from "../src/art/plateau/geom.js";

describe("the night board's renderer", () => {
  it("tilts the ground and stands the volumes", () => {
    expect(project([10, 20, 0])).toEqual([10, 20 * TILT]);
    expect(project([10, 20, 5])).toEqual([10, 20 * TILT - 5]);
  });

  it("draws only the faces that face the eye", () => {
    expect(facesEye([0, 0, 1])).toBe(true);
    expect(facesEye([0, 1, 0])).toBe(true);
    expect(facesEye([0, -1, 0])).toBe(false);
    expect(facesEye([0, 0, -1])).toBe(false);
    // A box shows its top and its two front sides at most, never its back nor its bottom.
    const shapes = box(0, 0, 0, 10, 6, 4, 0.5, "#E9F0F8");
    expect(shapes.length).toBeGreaterThanOrEqual(2);
    expect(shapes.length).toBeLessThanOrEqual(3);
  });

  it("shades within the colour", () => {
    expect(shade("#808080", 1)).toBe("#808080");
    expect(shade("#808080", 0.5)).toBe("#404040");
    expect(shade("#000000", 2)).toBe("#ffffff");
  });

  it("seeds a sector's dressing by its key", () => {
    expect(hashOf("10,5")).toBe(hashOf("10,5"));
    expect(hashOf("10,5")).not.toBe(hashOf("10,6"));
    const r = rng(42);
    const s = rng(42);
    expect([r(), r(), r()]).toEqual([s(), s(), s()]);
  });
});
