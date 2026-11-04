import type { Viewport } from "../../game/map/geometry.js";

/**
 * The useful band of the screen (audit of 4 November, 3D M8 and UI U-2): what the HUD leaves at
 * the top and the foot's panel at the bottom. A place framed by the camera is centred in it, so
 * that no town slips under the purse and no fondaco under the panel. Measured on the page
 * (EmpireGame, `useBand`); none until then (the tests, the first frame).
 */
const band = { top: 0, bottom: 0 };

export function setBand(top: number, bottom: number) {
  band.top = Math.max(0, top);
  band.bottom = Math.max(0, bottom);
}

/** The band on this screen: its top, its height and its middle (px), never under a third. */
export function bandOf(v: Viewport): { top: number; h: number; mid: number } {
  const room = Math.max(v.h / 3, v.h - band.top - band.bottom);
  const top = Math.min(band.top, v.h - room);
  return { top, h: room, mid: top + room / 2 };
}

/** Measured on the page: the HUD's lowest edge at the top, the foot's highest at the bottom. */
export function measureBand() {
  const h = window.innerHeight;
  const lowest = (sel: string) =>
    Math.max(
      0,
      ...[...document.querySelectorAll(sel)].map((e) => e.getBoundingClientRect().bottom),
    );
  const top = lowest("[data-house-header], [data-hud-counts] > :first-child, [data-trip]");
  const foot = [...document.querySelectorAll("[data-bottom-slot] > .slot-in")]
    .map((e) => e.getBoundingClientRect())
    .filter((r) => r.height > 0 && r.top < h);
  const bottom = foot.length ? h - Math.min(...foot.map((r) => r.top)) : 0;
  setBand(top + 8, bottom + 8);
}
