import { afterEach, describe, expect, it } from "vitest";
import { TILT } from "../src/art/plateau/geom.js";
import { bandOf, setBand } from "../src/empire/map/band.js";
import { centredOn } from "../src/empire/map/logic.js";

describe("the screen's useful band (audit of 4 November)", () => {
  afterEach(() => setBand(0, 0));

  it("is the whole screen until measured", () => {
    expect(bandOf({ w: 390, h: 844 })).toEqual({ top: 0, h: 844, mid: 422 });
  });

  it("lies between the HUD and the foot's panel", () => {
    setBand(80, 244);
    expect(bandOf({ w: 390, h: 844 })).toEqual({ top: 80, h: 520, mid: 340 });
  });

  it("never shrinks under a third of the screen", () => {
    setBand(400, 400);
    const b = bandOf({ w: 320, h: 568 });
    expect(b.h).toBeCloseTo(568 / 3);
    expect(b.top + b.h).toBeLessThanOrEqual(568);
  });

  it("centres a place framed by the camera in it", () => {
    setBand(80, 244);
    const v = { w: 390, h: 844 };
    const at: [number, number] = [400, 300];
    const c = centredOn(at, 2, v);
    // Unclamped by the chart's edges here: the point's place on the screen is the band's middle.
    if (c.tx === v.w / 2 - at[0] * 2) expect(c.ty + at[1] * TILT * 2).toBeCloseTo(340);
  });
});
