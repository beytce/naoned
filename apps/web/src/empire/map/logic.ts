import { cellsWithin } from "@comptoirs/engine";
import { cellCentre } from "../../art/hexmap.js";
import { WORLD_VIEW, seatOf } from "../../art/mediterranean.js";
import { d } from "../../game/format.js";
import type { Camera, Viewport } from "../../game/map/geometry.js";
import { fr } from "../../i18n.js";
import { affordable, queueEnd, readyLots } from "../logic.js";
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
 * The camera far out: every land cell the house sees, framed with room around, never smaller
 * than the screen, short of the house up close.
 */
export function farCamera(p: EmpirePayload, view: Viewport): Camera {
  const seen = Object.keys(p.view?.map.cells ?? {}).map(cellCentre);
  if (seen.length === 0) seen.push(seatOf("veneto"));
  const margin = 40;
  const x0 = Math.min(...seen.map((s) => s[0])) - margin;
  const x1 = Math.max(...seen.map((s) => s[0])) + margin;
  const y0 = Math.min(...seen.map((s) => s[1])) - margin;
  const y1 = Math.max(...seen.map((s) => s[1])) + margin;
  const cover = coverScale(view);
  const fit = Math.min(view.w / (x1 - x0), view.h / (y1 - y0));
  const far = (nearPx(view) - 30) / ORBIT_UNITS;
  return centredOn(
    [(x0 + x1) / 2, (y0 + y1) / 2],
    Math.max(cover, Math.min(fit, cover * 1.6, far)),
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

/** What may be put on the map: a counter, or the Arsenal. */
export type Placing = { kind: "post" | "camp" | "depot" | "porta"; region?: string };

/**
 * The cells where the house may put what it places: for a counter, the land cells it sees, of a
 * region its Casa has reached, with no counter there yet (of one region when it says which); for
 * the Arsenal, the coasts it sees.
 */
export function placeable(p: EmpirePayload, placing: Placing): string[] {
  const view = p.view;
  if (!view) return [];
  const map = view.map;
  const casa = view.house.casa;
  const reached = new Set(view.regions.filter((r) => r.casa <= casa).map((r) => r.code));
  const taken = new Set([
    ...map.posts.map((x) => x.cell),
    ...map.sites.map((x) => x.cell),
    ...(map.arsenal ? [map.arsenal] : []),
    ...(map.camp ? [map.camp] : []),
    ...(map.depot ? [map.depot] : []),
  ]);
  return Object.entries(map.cells)
    .filter(([cell, c]) =>
      placing.kind === "camp" || placing.kind === "depot"
        ? !taken.has(cell)
        : placing.kind === "porta"
          ? // A sector holds several buildings: the Porta goes on any cell seen.
            map.revealed.includes(cell)
          : reached.has(c.region) &&
            // With a reach, counters share a cell, apart (the map that grows).
            (map.reach ? true : !taken.has(cell)) &&
            (placing.region === undefined || c.region === placing.region),
    )
    .map(([cell]) => cell)
    .sort();
}

/** What a placing costs on a cell: its region's counter, or the Arsenal. */
export function placingCost(p: EmpirePayload, placing: Placing, cell: string): string | null {
  const view = p.view;
  if (!view) return null;
  if (placing.kind === "camp") return view.map.campSite?.cost ?? null;
  if (placing.kind === "depot") return view.map.depotSite?.cost ?? null;
  if (placing.kind === "porta") return view.porta?.site?.cost ?? null;
  const region = view.map.cells[cell]?.region;
  return view.regions.find((r) => r.code === region)?.postCost ?? null;
}

/** The cities a counter on `cell` would find: those within its radius, not seen yet. */
export function wouldFind(p: EmpirePayload, cell: string): number {
  const map = p.view?.map;
  if (!map) return 0;
  const seen = new Set(map.revealed);
  const around = cellsWithin(cell, map.radius).filter((c) => !seen.has(c));
  return around.length;
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
  | { kind: "city"; code: string }
  | { kind: "arsenal" }
  | { kind: "depot" }
  /** A sector to buy, next to one's own (1 November). */
  | { kind: "sector"; cell: string }
  /** A vehicle chosen for a round (after Hades' Star). */
  | { kind: "vehicle"; id: string }
  | { kind: "porta" };

export type ActionIcon =
  | "harvest"
  | "restart"
  | "upgrade"
  | "build"
  | "send"
  | "banner"
  | "anchor"
  | "cart"
  | "plus"
  | "workshops"
  | "lock"
  | "details";

/** One square of the action panel: a command to send, or a sheet to open. */
export interface MapAction {
  id: string;
  icon: ActionIcon;
  /** Its price, in ducats, under it. */
  cost?: string;
  /** A good it carries: its mark for a sign. */
  good?: string;
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
    case "region":
    case "city": {
      const code =
        target.kind === "region"
          ? target.code
          : (view.map.cities.find((c) => c.code === target.code)?.region ?? "");
      const r = view.regions.find((x) => x.code === code);
      if (!r) return [];
      if (r.code !== "veneto" && r.counter === 0 && view.house.casa < r.casa)
        return [
          { id: "closed", icon: "lock", words: { key: "closed", n: r.casa }, disabled: true },
        ];
      // A city: its region's goods the house holds, delivered there (the engine counts the book).
      if (target.kind === "city" && r.counter > 0)
        for (const good of r.demands) {
          const held = p.stock[good] ?? 0;
          if (held > 0)
            out.push({
              id: `deliver:${good}`,
              icon: "send",
              good,
              words: { key: "deliver", n: held },
              action: { type: "empireDeliver", good, qty: held, city: target.code },
            });
        }
      if (r.next && r.buildingUntil === null)
        out.push({
          id: "counter",
          icon: "upgrade",
          words: { key: "counter", n: r.next.level },
          cost: r.next.cost,
          disabled: !affordable(p.cash, r.next.cost),
          action: { type: "empireUpgradeCounter", region: r.code },
        });
      // A counter put down: the first opens the region, more find its hidden cities.
      if (
        r.postCost &&
        r.buildingUntil === null &&
        (r.counter === 0 || r.cities.found < r.cities.all)
      )
        out.push({
          id: "post",
          icon: "banner",
          words: { key: "post" },
          cost: r.postCost,
          disabled: !affordable(p.cash, r.postCost),
          open: `place:post:${r.code}`,
        });
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
    case "depot":
      return [
        { id: "vehicles", icon: "cart", words: { key: "vehicles" }, open: "remise" },
        // The Porta's arms are bought at the Remise (docs/plan-porta.md § 4).
        ...(p.view?.porta?.site
          ? [{ id: "arms", icon: "build" as const, words: { key: "arms" }, open: "arms" }]
          : []),
      ];
    case "vehicle":
      return [];
    case "sector": {
      const b = view.map.buyable.find((x) => x.cell === target.cell);
      if (!b) return [];
      const closed = view.house.casa < b.casa;
      return [
        closed
          ? { id: "closed", icon: "lock", words: { key: "closed", n: b.casa }, disabled: true }
          : {
              id: "unlock",
              icon: "plus",
              words: { key: "unlock" },
              cost: view.map.sectorCost,
              disabled: !affordable(p.cash, view.map.sectorCost),
              action: { type: "empireUnlockCell", cell: target.cell },
            },
      ];
    }
    case "porta":
      return [
        { id: "porta", icon: "banner", words: { key: "porta" }, open: "porta" },
        { id: "arms", icon: "build", words: { key: "arms" }, open: "arms" },
      ];
  }
}

/** The Arsenal's place on the chart: its cell's centre, once it stands. */
export function arsenalAt(p: EmpirePayload): [number, number] | null {
  const cell = p.view?.map.arsenal;
  return cell ? cellCentre(cell) : null;
}

/**
 * A point picked for a counter (the map that grows): too close to another counter, and the
 * cities it would serve that no counter serves yet.
 */
export function pointCheck(
  p: EmpirePayload,
  at: { x: number; y: number },
): { tooClose: boolean; serves: string[] } {
  const map = p.view?.map;
  if (!map?.reach) return { tooClose: false, serves: [] };
  const gap = map.postSpacing;
  const posts = [map.home, ...map.posts];
  const tooClose = gap > 0 && posts.some((x) => (x.x - at.x) ** 2 + (x.y - at.y) ** 2 < gap * gap);
  const r = map.reach.base;
  const serves = map.cities
    .filter((c) => !map.covered.includes(c.code))
    .filter((c) => (c.x - at.x) ** 2 + (c.y - at.y) ** 2 <= r * r)
    .map((c) => c.code);
  return { tooClose, serves };
}

/** A counter's name: Venice, or its region and its rank there. */
export function postLabel(
  p: EmpirePayload,
  post: string,
  regionName: (r: string) => string,
): string {
  const stores = p.view?.stores ?? [];
  const i = stores.findIndex((x) => x.post === post);
  const at = stores[i];
  if (!at || post === "home") return fr.empire.market.venice;
  const n = stores.slice(1, i + 1).filter((x) => x.region === at.region).length;
  return fr.empire.market.post(regionName(at.region), n);
}

/** Where a counter stands on the chart: Venice's, or one put down. */
export function postPoint(p: EmpirePayload, post: string): [number, number] | null {
  const map = p.view?.map;
  if (!map) return null;
  if (post === "home") return [map.home.x, map.home.y];
  const x = map.posts.find((q) => q.id === post);
  return x ? [x.x, x.y] : null;
}

/** A round being made (after Hades' Star): the vehicle, its stops in order. */
export interface TourDraft {
  vehicleId: string;
  stops: { city: string; order: number; qty: number }[];
  /** The city whose orders are shown to load. */
  focus: string | null;
}

/** The counter a vehicle stands at, with its point and its reach. */
export function vehiclePost(
  p: EmpirePayload,
  vehicleId: string,
): { id: string; x: number; y: number; reach: number } | null {
  const map = p.view?.map;
  const v = p.view?.vehicles.mine.find((x) => x.id === vehicleId);
  if (!map || !v) return null;
  if (v.at === "home") return { id: "home", ...map.home };
  const post = map.posts.find((x) => x.id === v.at);
  return post ? { id: post.id, x: post.x, y: post.y, reach: post.reach } : null;
}

/** The cities a vehicle may bring orders to: those within its counter's reach. */
export function tourCities(p: EmpirePayload, vehicleId: string): string[] {
  const at = vehiclePost(p, vehicleId);
  if (!at) return [];
  return (p.view?.map.cities ?? [])
    .filter((c) => (c.x - at.x) ** 2 + (c.y - at.y) ** 2 <= at.reach * at.reach)
    .map((c) => c.code);
}

/** What an order still asks, less what the round being made already carries to it. */
export function orderLeft(
  p: EmpirePayload,
  tour: TourDraft | null,
  city: string,
  i: number,
): number {
  const o = p.view?.orders.find((x) => x.city === city)?.orders[i];
  if (!o) return 0;
  const planned = (tour?.stops ?? [])
    .filter((s) => s.city === city && s.order === i)
    .reduce((n, s) => n + s.qty, 0);
  return Math.max(0, o.qty - o.filled - planned);
}

/** The round's load against the vehicle's hold. */
export function tourLoad(p: EmpirePayload, tour: TourDraft): { load: number; hold: number } {
  const v = p.view?.vehicles.mine.find((x) => x.id === tour.vehicleId);
  return { load: tour.stops.reduce((n, s) => n + s.qty, 0), hold: v?.capacity ?? 0 };
}

/** What the vehicle's counter holds of a good, less what the round already takes of it. */
export function tourStock(p: EmpirePayload, tour: TourDraft, good: string): number {
  const v = p.view?.vehicles.mine.find((x) => x.id === tour.vehicleId);
  const held = p.view?.stores.find((x) => x.post === v?.at)?.goods[good] ?? 0;
  const orders = p.view?.orders ?? [];
  const taken = tour.stops
    .filter((s) => orders.find((o) => o.city === s.city)?.orders[s.order]?.good === good)
    .reduce((n, s) => n + s.qty, 0);
  return Math.max(0, held - taken);
}

/** The round's minutes: from the counter through each city, and back. */
export function tourMinutes(p: EmpirePayload, tour: TourDraft): number {
  const at = vehiclePost(p, tour.vehicleId);
  const speed = p.view?.map.tourUnitsPerMinute ?? 0;
  if (!at || speed <= 0) return 0;
  let from: [number, number] = [at.x, at.y];
  let units = 0;
  for (const s of tour.stops) {
    const c = p.view?.map.cities.find((x) => x.code === s.city);
    if (!c) continue;
    units += Math.hypot(c.x - from[0], c.y - from[1]);
    from = [c.x, c.y];
  }
  units += Math.hypot(at.x - from[0], at.y - from[1]);
  return units / speed;
}

/** A free land vehicle of a counter that serves the city, the one holding most of a good first. */
export function vehicleFor(
  p: EmpirePayload,
  city: string,
  now: number,
  good?: string,
): string | null {
  const view = p.view;
  if (!view) return null;
  const land = view.vehicles.mine.filter((v) => v.busyUntil <= now);
  const ok = land.filter((v) => tourCities(p, v.id).includes(city));
  const held = (id: string) => {
    const at = view.vehicles.mine.find((v) => v.id === id)?.at;
    return good ? (view.stores.find((x) => x.post === at)?.goods[good] ?? 0) : 0;
  };
  return [...ok].sort((a, b) => held(b.id) - held(a.id))[0]?.id ?? null;
}
