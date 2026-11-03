/**
 * The 3D map's camera, driven by the map's own (useCamera, logic.ts): an orthographic camera looking
 * down at the board's tilt (sin of its height = TILT) sees the ground exactly as the SVG map draws
 * it, a point (x, y) of the chart at (tx + x·s, ty + y·TILT·s) on the screen. So the camera of the
 * gestures, its bounds, its glides and its tests stay as they are, and every HTML layer over the
 * map (the places, the rings, the vehicles, the orbit, the timers) lies on the 3D ground to the
 * pixel. World units are chart units: x east, z south (the chart's y), y up, the land's top at 0.
 */
import { TILT } from "../../art/plateau/geom.js";
import type { Camera, Viewport } from "../../game/map/geometry.js";

/** The camera's height above the board, as an angle. */
export const ELEVATION = Math.asin(TILT);
/** How far the camera stands back from what it looks at (no effect on an orthographic view). */
export const DISTANCE = 400;

/** The orthographic camera for the map's camera: its zoom (px per unit), its target, its place. */
export function orthoFrom(
  cam: Camera,
  v: Viewport,
): { zoom: number; target: [number, number, number]; position: [number, number, number] } {
  const x = (v.w / 2 - cam.tx) / cam.s;
  const z = (v.h / 2 - cam.ty) / (TILT * cam.s);
  return {
    zoom: cam.s,
    target: [x, 0, z],
    position: [x, DISTANCE * Math.sin(ELEVATION), z + DISTANCE * Math.cos(ELEVATION)],
  };
}

/**
 * The point of the ground (y = 0) under a point of the screen: the camera's ray through it, met
 * with the ground's plane (an orthographic ray falls straight along the view). Chart units.
 */
export function groundAt(cam: Camera, v: Viewport, sx: number, sy: number): [number, number] {
  const o = orthoFrom(cam, v);
  // On the camera's plane through its target, the screen's point.
  const right = (sx - v.w / 2) / cam.s;
  const up = -(sy - v.h / 2) / cam.s;
  const [tx, , tz] = o.target;
  // The camera's up vector (0, cos e, −sin e); its view (0, −sin e, −cos e).
  const ce = Math.cos(ELEVATION);
  const se = Math.sin(ELEVATION);
  const px = tx + right;
  const py = up * ce;
  const pz = tz - up * se;
  // Along the view down to y = 0.
  const k = py / se;
  return [px, pz - k * ce];
}
