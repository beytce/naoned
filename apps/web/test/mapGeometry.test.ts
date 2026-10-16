import { describe, expect, it } from "vitest";
import {
  RES,
  blend,
  boxOf,
  clampCamera,
  fitCamera,
  fitLands,
  landFrames,
  parkingAngle,
  parkingSpots,
  pointAlong,
  project,
  reveal,
  roundTrip,
  toWorld,
  unproject,
  zoomAt,
} from "../src/game/map/geometry.js";

const view = { w: 390, h: 844 };
const insets = { top: 140, right: 16, bottom: 120, left: 16 };

describe("map geometry", () => {
  it("draws the map larger than its units", () => {
    expect(toWorld([10, 20])).toEqual({ x: 10 * RES, y: 20 * RES });
  });

  it("boxes points with a margin", () => {
    expect(
      boxOf(
        [
          { x: 0, y: 10 },
          { x: 50, y: -5 },
        ],
        2,
      ),
    ).toEqual({ x0: -2, y0: -7, x1: 52, y1: 12 });
  });

  it("fits a box inside the screen minus the insets, centred", () => {
    const box = { x0: 100, y0: 100, x1: 500, y1: 700 };
    const cam = fitCamera(box, view, insets);
    const a = project(cam, { x: box.x0, y: box.y0 });
    const b = project(cam, { x: box.x1, y: box.y1 });
    expect(a.x).toBeGreaterThanOrEqual(insets.left - 0.01);
    expect(b.x).toBeLessThanOrEqual(view.w - insets.right + 0.01);
    expect(a.y).toBeGreaterThanOrEqual(insets.top - 0.01);
    expect(b.y).toBeLessThanOrEqual(view.h - insets.bottom + 0.01);
    // The tighter side touches its edges.
    expect(Math.max(b.x - a.x - (view.w - 32), b.y - a.y - (view.h - 260))).toBeCloseTo(0);
  });

  it("projects and unprojects back", () => {
    const cam = { s: 0.5, tx: 12, ty: -30 };
    const p = { x: 321, y: 77 };
    const q = unproject(cam, project(cam, p));
    expect(q.x).toBeCloseTo(p.x);
    expect(q.y).toBeCloseTo(p.y);
  });

  it("zooms around the finger, within bounds", () => {
    const cam = { s: 1, tx: 0, ty: 0 };
    const at = { x: 200, y: 300 };
    const before = unproject(cam, at);
    const z = zoomAt(cam, 2, at, 0.5, 3);
    const after = unproject(z, at);
    expect(z.s).toBe(2);
    expect(after.x).toBeCloseTo(before.x);
    expect(after.y).toBeCloseTo(before.y);
    expect(zoomAt(cam, 10, at, 0.5, 3).s).toBe(3);
    expect(zoomAt(cam, 0.01, at, 0.5, 3).s).toBe(0.5);
  });

  it("keeps the map from being panned away", () => {
    const box = { x0: 0, y0: 0, x1: 400, y1: 400 };
    const far = clampCamera({ s: 1, tx: 5000, ty: -5000 }, box, view, insets);
    const c = project(far, { x: 200, y: 200 });
    expect(c.x).toBeLessThanOrEqual(view.w - insets.right + 200 + 0.01);
    expect(c.y).toBeGreaterThanOrEqual(insets.top - 200 - 0.01);
    const near = { s: 1, tx: 0, ty: 200 };
    expect(clampCamera(near, box, view, insets)).toEqual(near);
  });

  it("reveals a point hidden under the panel, and leaves a visible one alone", () => {
    const cam = { s: 1, tx: 0, ty: 0 };
    const hidden = { x: 195, y: 820 };
    const moved = reveal(cam, hidden, view, insets);
    const q = project(moved, hidden);
    expect(q.y).toBeLessThan(view.h - insets.bottom);
    expect(reveal(cam, { x: 195, y: 400 }, view, insets)).toBe(cam);
  });

  it("eases between two cameras", () => {
    const a = { s: 1, tx: 0, ty: 0 };
    const b = { s: 2, tx: 100, ty: -100 };
    expect(blend(a, b, 0)).toEqual(a);
    expect(blend(a, b, 1)).toEqual(b);
    expect(blend(a, b, 0.5).s).toBeGreaterThan(1.5);
  });

  it("parks carts side by side across the chosen direction", () => {
    const one = parkingSpots(1, { x: 100, y: 100 }, 50, Math.PI / 2);
    expect(one[0]).toEqual({ x: 100, y: 150 });
    const two = parkingSpots(2, { x: 0, y: 0 }, 60, 0, 40);
    expect(two.map((p) => p.x)).toEqual([60, 60]);
    expect(Math.abs((two[0]?.y ?? 0) - (two[1]?.y ?? 0))).toBeCloseTo(40);
    const four = parkingSpots(4, { x: 0, y: 0 }, 60, 0, 40);
    expect(four[3]?.x).toBeCloseTo(100);
  });

  it("parks carts in the widest free sector, away from the name below", () => {
    const c = { x: 0, y: 0 };
    // Cities to the right and to the left: the carts go up.
    const a = parkingAngle(
      c,
      [
        { x: 100, y: 0 },
        { x: -100, y: 0 },
      ],
      300,
    );
    expect(Math.sin(a)).toBeLessThan(-0.9);
    // Far cities do not count: only the name below blocks, the carts go opposite it.
    const b = parkingAngle(c, [{ x: 0, y: -1000 }], 300);
    expect(Math.sin(b)).toBeLessThan(-0.9);
  });

  it("parks a counter near the edge toward the map's middle", () => {
    // A counter on the east edge, with a free sector both east and west: the carts go west.
    const c = { x: 1000, y: 500 };
    const a = parkingAngle(c, [{ x: 1000, y: 380 }], 300, { x: 500, y: 500 });
    expect(Math.cos(a)).toBeLessThan(-0.5);
  });

  it("frames the campaign on the drawn map, the lands beyond it a pan away", () => {
    const lands = [
      { x: -450, y: 600 },
      { x: 100, y: 200 },
      { x: 900, y: 1000 },
    ];
    const { box, fitBox } = landFrames(lands, 1080);
    expect(box.x0).toBe(-450);
    expect(fitBox).toEqual({ x0: 100, y0: 200, x1: 900, y1: 1000 });
    expect(landFrames([{ x: -10, y: 0 }], 1080).fitBox.x0).toBe(-10);
  });

  it("shows every land when the screen has room, the drawn map's alone otherwise", () => {
    const box = { x0: -450, y0: 200, x1: 1060, y1: 1190 };
    const fitBox = { x0: 100, y0: 200, x1: 1060, y1: 1190 };
    const none = { top: 0, right: 0, bottom: 0, left: 0 };
    // A wide screen: the height sets the scale, Lombardy fits at no cost.
    const wide = fitLands(box, fitBox, { w: 1600, h: 900 }, none);
    expect(wide).toEqual(fitCamera(box, { w: 1600, h: 900 }, none));
    // A phone: the whole would shrink everything, the drawn map stays framed.
    expect(fitLands(box, fitBox, view, insets)).toEqual(fitCamera(fitBox, view, insets));
  });

  it("moves along a broken line by length", () => {
    const line = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 30 },
    ];
    expect(pointAlong(line, 0).p).toEqual({ x: 0, y: 0 });
    expect(pointAlong(line, 0.25).p).toEqual({ x: 10, y: 0 });
    expect(pointAlong(line, 0.5).p).toEqual({ x: 10, y: 10 });
    expect(pointAlong(line, 1).p).toEqual({ x: 10, y: 30 });
    expect(pointAlong(line, 0.1).dx).toBeGreaterThan(0);
  });

  it("sails out then back on a round trip", () => {
    expect(roundTrip(0)).toEqual({ t: 0, back: false });
    expect(roundTrip(0.25)).toEqual({ t: 0.5, back: false });
    expect(roundTrip(0.5).t).toBe(1);
    expect(roundTrip(0.75)).toEqual({ t: 0.5, back: true });
    expect(roundTrip(2)).toEqual({ t: 0, back: true });
  });
});
