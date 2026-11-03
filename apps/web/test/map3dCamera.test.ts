import { OrthographicCamera, Vector3 } from "three";
import { describe, expect, it } from "vitest";
import { TILT } from "../src/art/plateau/geom.js";
import { groundAt, orthoFrom } from "../src/empire/map3d/camera.js";

const v = { w: 390, h: 844 };
const cams = [
  { s: 8.9, tx: -1300, ty: -400 },
  { s: 2.3, tx: 12, ty: 80 },
  { s: 31, tx: -5200, ty: -2400 },
];

/** A ground point of the chart seen through a real three.js camera set by `orthoFrom`. */
function seen(cam: (typeof cams)[number], x: number, y: number): [number, number] {
  const o = orthoFrom(cam, v);
  const c = new OrthographicCamera(-v.w / 2, v.w / 2, v.h / 2, -v.h / 2, 1, 2000);
  c.position.set(...o.position);
  c.zoom = o.zoom;
  c.lookAt(...o.target);
  c.updateProjectionMatrix();
  c.updateMatrixWorld(true);
  const p = new Vector3(x, 0, y).project(c);
  return [((p.x + 1) / 2) * v.w, ((1 - p.y) / 2) * v.h];
}

describe("the 3D map's camera, driven by the map's own", () => {
  it("sees the ground where the SVG map draws it, to the pixel", () => {
    for (const cam of cams)
      for (const [x, y] of [
        [165, 140],
        [178, 146],
        [100, 260],
        [-40, 12],
      ] as const) {
        const [sx, sy] = seen(cam, x, y);
        expect(sx).toBeCloseTo(cam.tx + x * cam.s, 3);
        expect(sy).toBeCloseTo(cam.ty + y * TILT * cam.s, 3);
      }
  });

  it("finds the ground's point under a touch (the ray back to the board)", () => {
    for (const cam of cams)
      for (const [x, y] of [
        [165, 140],
        [12.5, 300],
      ] as const) {
        const [gx, gy] = groundAt(cam, v, cam.tx + x * cam.s, cam.ty + y * TILT * cam.s);
        expect(gx).toBeCloseTo(x, 6);
        expect(gy).toBeCloseTo(y, 6);
      }
  });
});
