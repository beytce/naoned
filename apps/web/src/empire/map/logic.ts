import { WORLD_VIEW, seatOf } from "../../art/mediterranean.js";
import { d } from "../../game/format.js";
import type { Camera, Viewport } from "../../game/map/geometry.js";
import { affordable, queueEnd, readyLots, shownAt } from "../logic.js";
import type { EmpireAction, EmpirePayload } from "../types.js";

/**
 * The empire's map, pure (the map at the centre of the game, step 1): how the camera covers the
 * screen, when Venice opens up close, what the fog hides, the counts in the corners and the
 * actions of a place touched.
 */

/** The chart, in its own units (art/mediterranean.tsx). */
export const CHART = { w: WORLD_VIEW.w, h: WORLD_VIEW.h } as const;
/** Venice's orbit across, in chart units: the house up close, laid on the map. */
export const ORBIT_UNITS = 46;
/** The orbit shows from this width on screen (px), fully from NEAR_PX + NEAR_RAMP. */
export const NEAR_PX = 220;
const NEAR_RAMP = 80;
/** The orbit at its largest on screen (px). */
const ORBIT_MAX_PX = 520;

/** The scale at which the chart just covers the screen: never a border of nothing. */
export function coverScale(view: Viewport): number {
  return Math.max(view.w / CHART.w, view.h / CHART.h);
}

/** The zoom's range: from the chart covering the screen to Venice's orbit at its largest. */
export function scaleBounds(view: Viewport): { min: number; max: number } {
  const min = coverScale(view);
  return { min, max: Math.max(min * 2.5, ORBIT_MAX_PX / ORBIT_UNITS) };
}

/** The camera kept on the chart: it always covers the screen, centred when smaller. */
export function coverClamp(cam: Camera, view: Viewport): Camera {
  const fit = (t: number, size: number, screen: number) =>
    size <= screen ? (screen - size) / 2 : Math.min(0, Math.max(screen - size, t));
  return {
    s: cam.s,
    tx: fit(cam.tx, CHART.w * cam.s, view.w),
    ty: fit(cam.ty, CHART.h * cam.s, view.h),
  };
}

/** The camera at a scale, centred on a chart point. */
export function centredOn(at: [number, number], s: number, view: Viewport): Camera {
  return coverClamp({ s, tx: view.w / 2 - at[0] * s, ty: view.h / 2 - at[1] * s }, view);
}

/** The orbit's width on screen (px) from which Venice's house shows: more on a large screen. */
export function nearPx(view: Viewport): number {
  return Math.max(NEAR_PX, Math.min(view.w, view.h) * 0.4);
}

/** How near the map is: far, the regions and their roads; near, Venice's house in orbit. */
export function detailOf(s: number, view: Viewport): "far" | "near" {
  return ORBIT_UNITS * s >= nearPx(view) ? "near" : "far";
}

/** How much of the orbit shows, from 0 (far) to 1 (near). */
export function nearness(s: number, view: Viewport): number {
  return Math.min(1, Math.max(0, (ORBIT_UNITS * s - nearPx(view)) / NEAR_RAMP));
}

/**
 * The camera far out: every region in sight (the house's and those on the edge of the dark),
 * framed with room around, never smaller than the screen.
 */
export function farCamera(p: EmpirePayload, view: Viewport): Camera {
  const fog = fogOf(p);
  const seats = Object.entries(fog)
    .filter(([, f]) => f !== "hidden")
    .map(([code]) => seatOf(code));
  if (seats.length === 0) seats.push(seatOf("veneto"));
  const margin = 45;
  const x0 = Math.min(...seats.map((s) => s[0])) - margin;
  const x1 = Math.max(...seats.map((s) => s[0])) + margin;
  const y0 = Math.min(...seats.map((s) => s[1])) - margin;
  const y1 = Math.max(...seats.map((s) => s[1])) + margin;
  const cover = coverScale(view);
  const fit = Math.min(view.w / (x1 - x0), view.h / (y1 - y0));
  return centredOn(
    [(x0 + x1) / 2, (y0 + y1) / 2],
    Math.max(cover, Math.min(fit, cover * 1.6)),
    view,
  );
}

/** The scale at which Venice's orbit shows whole and comfortable on this screen. */
export function nearScale(view: Viewport): number {
  const px = Math.min(
    ORBIT_MAX_PX,
    Math.max(nearPx(view) + NEAR_RAMP, Math.min(view.w, view.h) * 0.92),
  );
  return Math.min(scaleBounds(view).max, px / ORBIT_UNITS);
}

/** The house's vehicles: those at home, free to leave, and all of them. No cap is set. */
export function fleetOf(p: EmpirePayload, now: number): { free: number; total: number } {
  const mine = p.view?.vehicles.mine ?? [];
  return { free: mine.filter((v) => v.busyUntil <= now).length, total: mine.length };
}

/** The counts of the top right corner, in their order: ducats, Favour, Seals. */
export function hudOf(p: EmpirePayload): { id: "ducats" | "favour" | "seals"; value: string }[] {
  const h = p.view?.house;
  return [
    { id: "ducats", value: d(p.cash) },
    { id: "favour", value: String(h?.favour ?? 0) },
    { id: "seals", value: String(h?.seals ?? 0) },
  ];
}

/**
 * What the fog leaves of each region: open (the house is there), on its edge (one the Casa
 * reached may open, and the next ones the Casa will reach, so that the way on shows), or hidden
 * in the dark, its name unknown.
 */
export function fogOf(p: EmpirePayload): Record<string, "open" | "edge" | "hidden"> {
  const view = p.view;
  if (!view) return {};
  const casa = view.house.casa;
  const closed = view.regions.filter((r) => r.code !== "veneto" && r.counter === 0);
  const ahead = closed.filter((r) => r.casa > casa).map((r) => r.casa);
  const next = ahead.length > 0 ? Math.min(...ahead) : null;
  return Object.fromEntries(
    view.regions.map((r) => [
      r.code,
      r.code === "veneto" || r.counter > 0
        ? "open"
        : r.casa <= casa || r.casa === next || r.buildingUntil !== null
          ? "edge"
          : "hidden",
    ]),
  );
}

/** May the house build its next Casa now: its demands met, its cost and materials at hand. */
export function canCasa(p: EmpirePayload): boolean {
  const view = p.view;
  const next = view?.nextCasa;
  if (!view || !next) return false;
  return (
    next.requirementMet === true &&
    affordable(p.cash, next.cost) &&
    Object.entries(next.materials).every(([g, n]) => (p.stock[g] ?? 0) >= n) &&
    view.house.builds.length < view.buildSlots &&
    !view.house.builds.some((b) => b.kind === "casa")
  );
}

/** A place of the map, touched. */
export type Target =
  | { kind: "workshop"; id: string }
  | { kind: "casa" }
  | { kind: "free" }
  | { kind: "region"; code: string }
  | { kind: "arsenal" };

export type ActionIcon =
  | "harvest"
  | "restart"
  | "upgrade"
  | "build"
  | "send"
  | "banner"
  | "anchor"
  | "workshops"
  | "lock"
  | "details";

/** One square of the action panel: a command to send, or a sheet to open. */
export interface MapAction {
  id: string;
  icon: ActionIcon;
  /** Its price, in ducats, under it. */
  cost?: string;
  disabled?: boolean;
  action?: EmpireAction;
  open?: string;
  /** The words, from the i18n (fr.empire.scene.actions), with their number. */
  words: { key: string; n?: number };
}

/** The actions of a place touched, in their order; the last one always opens its details. */
export function actionsOf(p: EmpirePayload, target: Target, now: number): MapAction[] {
  const view = p.view;
  if (!view) return [];
  const out: MapAction[] = [];
  switch (target.kind) {
    case "workshop": {
      const ws = view.house.workshops.find((w) => w.id === target.id);
      if (!ws) return [];
      const ready = readyLots(ws, now);
      const end = queueEnd(ws);
      if (ready > 0)
        out.push({
          id: "collect",
          icon: "harvest",
          words: { key: "collect", n: ready },
          action: { type: "empireRelaunch", workshopId: ws.id },
        });
      else if (!end || end <= now)
        out.push({
          id: "relaunch",
          icon: "restart",
          words: { key: "relaunch" },
          action: { type: "empireRelaunch", workshopId: ws.id },
        });
      const up = view.upgrades[ws.id] ?? null;
      const building = view.house.builds.some((b) => b.workshopId === ws.id);
      if (building)
        out.push({ id: "upgrade", icon: "upgrade", words: { key: "building" }, disabled: true });
      else if (up)
        out.push({
          id: "upgrade",
          icon: "upgrade",
          words: { key: "upgrade", n: up.level },
          cost: up.cost,
          disabled: !affordable(p.cash, up.cost),
          action: { type: "empireUpgrade", workshopId: ws.id },
        });
      // At its highest for the Casa reached: the next Casa lifts it.
      else out.push({ id: "upgrade", icon: "lock", words: { key: "maxed" }, disabled: true });
      out.push({
        id: "details",
        icon: "details",
        words: { key: "details" },
        open: `workshop:${ws.id}`,
      });
      return out;
    }
    case "casa": {
      const next = view.nextCasa;
      if (next && !view.house.builds.some((b) => b.kind === "casa"))
        out.push({
          id: "casa",
          icon: "build",
          words: { key: "casa", n: next.level },
          cost: next.cost,
          disabled: !canCasa(p),
          action: { type: "empireBuildCasa" },
        });
      out.push({
        id: "workshops",
        icon: "workshops",
        words: { key: "workshops" },
        open: "workshops",
      });
      out.push({ id: "details", icon: "details", words: { key: "details" }, open: "casa" });
      return out;
    }
    case "free":
      return [{ id: "build", icon: "build", words: { key: "build" }, open: "new" }];
    case "region": {
      const r = view.regions.find((x) => x.code === target.code);
      if (!r) return [];
      if (r.code !== "veneto" && r.counter === 0 && view.house.casa < r.casa)
        return [
          { id: "closed", icon: "lock", words: { key: "closed", n: r.casa }, disabled: true },
        ];
      if (r.next && r.buildingUntil === null) {
        const short = r.next.charter && view.house.favour < r.charterFavour;
        out.push({
          id: r.next.charter ? "charter" : "counter",
          icon: r.next.charter ? "banner" : "upgrade",
          words: r.next.charter ? { key: "charter" } : { key: "counter", n: r.next.level },
          cost: r.next.cost,
          disabled: short || !affordable(p.cash, r.next.cost),
          action: r.next.charter
            ? { type: "empireCharter", region: r.code }
            : { type: "empireUpgradeCounter", region: r.code },
        });
      }
      if (r.counter > 0)
        out.push({
          id: "convoy",
          icon: "send",
          words: { key: "convoy" },
          open: `voyage:${r.code}`,
        });
      out.push({
        id: "details",
        icon: "details",
        words: { key: "details" },
        open: `region:${r.code}`,
      });
      return out;
    }
    case "arsenal":
      return [
        { id: "ship", icon: "anchor", words: { key: "ship" }, open: "production:vehicles" },
        { id: "details", icon: "details", words: { key: "details" }, open: "arsenal" },
      ];
  }
}

/** The Arsenal, on the lagoon beside Venice (step 1: a fixed place; step 2 will let it be put). */
export function arsenalAt(): [number, number] {
  const [x, y] = seatOf("veneto");
  return [x + 26, y + 14];
}

/** Is the Arsenal on the map: its first ship near the Casa reached. */
export function arsenalShown(p: EmpirePayload): boolean {
  const view = p.view;
  if (!view) return false;
  return view.vehicles.shop.some((s) => s.build && shownAt(view.house.casa, s.casa));
}
