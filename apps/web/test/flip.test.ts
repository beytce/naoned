import { describe, expect, it } from "vitest";
import {
  flipAngle,
  flipDelay,
  flipLift,
  flipTotal,
  flipZoom,
  showsBack,
  stageOpacity,
  terraBack,
} from "../src/porcellana/flip.js";
import { FLIP } from "../src/porcellana/tokens.js";

// The way into the Terraferma: the map's tiles turn over from the Campo, the camera draws back,
// the Terraferma's board takes over.
describe("the wave of tiles turning over", () => {
  it("starts at the Campo and spreads by distance, capped", () => {
    expect(flipDelay(0)).toBe(0);
    expect(flipDelay(4)).toBeCloseTo(4 * FLIP.step);
    expect(flipDelay(1_000)).toBe(FLIP.spread);
  });
  it("turns a tile from face up to its back, with an overshoot that settles", () => {
    expect(flipAngle(0, 0.2)).toBe(0);
    const peak = Math.max(...Array.from({ length: 60 }, (_, k) => flipAngle(k / 60, 0)));
    expect(peak).toBeGreaterThan(Math.PI);
    expect(flipAngle(FLIP.turn, 0)).toBeCloseTo(Math.PI);
    expect(flipAngle(10, 0.5)).toBeCloseTo(Math.PI);
  });
  it("turns back, the far tiles first, all face up at the end", () => {
    expect(flipAngle(0, 0, true)).toBeCloseTo(Math.PI);
    const far = flipAngle(0.3, FLIP.spread, true);
    const near = flipAngle(0.3, 0, true);
    expect(far).toBeLessThan(near);
    expect(flipAngle(flipTotal(true), 0, true)).toBeCloseTo(0);
  });
  it("lifts a tile at mid-turn only, and shows its back past the half", () => {
    expect(flipLift(0)).toBe(0);
    expect(flipLift(Math.PI / 2)).toBeCloseTo(FLIP.lift);
    expect(flipLift(Math.PI)).toBeCloseTo(0);
    expect(showsBack(1)).toBe(false);
    expect(showsBack(2)).toBe(true);
  });
});

describe("the camera and the handoff", () => {
  it("draws the camera far back, and home again on the way out", () => {
    expect(flipZoom(0)).toBe(1);
    expect(flipZoom(FLIP.zoomFrom + FLIP.zoomFor)).toBeCloseTo(FLIP.zoomTo);
    expect(flipZoom(0, true)).toBeCloseTo(FLIP.zoomTo);
    expect(flipZoom(flipTotal(true) + 1, true)).toBeCloseTo(1);
  });
  it("fades the Terraferma's board in once the tiles have turned, out at once on the way back", () => {
    expect(stageOpacity(FLIP.handoff)).toBe(0);
    expect(stageOpacity(FLIP.handoff + FLIP.fade)).toBe(1);
    expect(FLIP.handoff + FLIP.fade).toBeLessThanOrEqual(FLIP.total + 1e-9);
    // Every tile has turned before the board is fully over the map.
    expect(FLIP.spread + FLIP.turn).toBeLessThanOrEqual(FLIP.handoff + FLIP.fade);
    expect(stageOpacity(0, true)).toBe(1);
    expect(stageOpacity(FLIP.fade, true)).toBe(0);
  });
});

describe("the Terraferma on the tiles' backs", () => {
  // A map of 3 × 2: the merchant's camp at (1, 0), a rival at (2, 0), water at (0, 1).
  const v = {
    map: { width: 3, height: 2, terrain: "pppwpp" },
    owner: [-1, 0, 1, -1, -1, -1],
    holders: [
      { me: true, ally: false, nation: null },
      { me: false, ally: false, nation: null },
    ],
    me: { capital: 1 },
  };
  it("puts the merchant's camp under the Campo, in red", () => {
    expect(terraBack(v, 0, 0)).toBe(0xc9_55_49);
  });
  it("glazes a rival in ink, free land in porcelain, water and the world's edge in lagoon", () => {
    expect(terraBack(v, 1, 0)).toBe(0xb3_b0_ab);
    expect(terraBack(v, -1, 0)).toBe(0xee_eb_e5);
    expect(terraBack(v, -1, 1)).toBe(0xc9_d3_d6);
    expect(terraBack(v, 5, 5)).toBe(0xc9_d3_d6);
  });
  it("shows plain porcelain without a week's view", () => {
    expect(terraBack(null, 2, 3)).toBe(0xee_eb_e5);
  });
});
