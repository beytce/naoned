import {
  type ReactNode,
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
} from "react";
import {
  MAP_H,
  MAP_W,
  PLACES,
  curvePath,
  partialPath,
  pointOn,
  roadCurve,
} from "../../art/veneto.js";
import { PortolanTerrain } from "./Terrain.js";
import { type Label, type Placement, declutter } from "./declutter.js";
import {
  type Box,
  type Camera,
  type Insets,
  type Point,
  RES,
  blend,
  boxOf,
  clampCamera,
  fitLands,
  fitTerra,
  landFrames,
  parkingAngle,
  parkingSpots,
  project,
  reveal,
  toWorld,
  unproject,
  zoomAt,
} from "./geometry.js";

/**
 * The world map, the game's one screen: the Veneto by night, the cities as glowing medallions,
 * the merchant's counter among them with its carts parked beside it, and the carts gliding along
 * the roads. Pan with a finger, pinch or wheel to zoom, tap to select.
 *
 * Built for fluidity: the ground is one layer moved by the GPU, the markers keep their size and
 * are placed imperatively (no React render per frame), and the frame loop only runs while
 * something moves.
 */

export type Selection =
  | { kind: "home" }
  | { kind: "city"; code: string }
  | { kind: "cart"; id: string }
  | { kind: "land"; code: string }
  | { kind: "terra"; cell: number };

export interface CartTrip {
  route: string;
  departAt: number;
  arriveAt: number;
  backAt: number;
  /** Halted mid-way by an ambush waiting for an answer. */
  halted: boolean;
}

export interface MapMarker {
  /** "home", "city:<code>" or "cart:<id>". */
  key: string;
  /** Contents (the medallion, the token). */
  node: ReactNode;
  /** A cart on the road follows its trip; otherwise the marker stays at its place. */
  trip?: CartTrip | null;
  /** Where it stands now, in map units, when the screen places it. */
  at?: { x: number; y: number; flip?: boolean } | null;
  /**
   * Kept clear of the other labels (declutter.ts): 0 always shown where it stands, the larger the
   * sooner moved aside or hidden. Without one, the marker is drawn as it is.
   */
  priority?: number;
  /** Shown from this zoom on (0 the whole map, 1 closer, 2 closest): `data-tier` on its node. */
  tier?: 0 | 1 | 2;
}

/** The zoom's tier, from the scale over the whole map's: 0 under 1.4, 1 under 2.2, else 2. */
export function zoomTier(k: number): 0 | 1 | 2 {
  return k < 1.4 ? 0 : k < 2.2 ? 1 : 2;
}

export interface WorldMapHandle {
  /** Brings a place into view above the panel (eased). */
  show: (key: string) => void;
  /** The whole map again. */
  fit: () => void;
  /** The layer's opening frame again (the Terraferma: the merchant's own land). */
  focus: () => void;
}

/** Where a delivery stands on its road: 0 at the counter, 1 at the city, back to 0. */
export function tripShare(trip: CartTrip, now: number): number {
  if (now <= trip.arriveAt) {
    if (trip.halted) return 0.5;
    return Math.max(0, (now - trip.departAt) / Math.max(1, trip.arriveAt - trip.departAt));
  }
  return Math.max(0, 1 - (now - trip.arriveAt) / Math.max(1, trip.backAt - trip.arriveAt));
}

const WORLD_W = MAP_W * RES;
const WORLD_H = MAP_H * RES;
/** Cart parking: distance from the counter's centre (world pixels at the base zoom). */
const PARK_PX = 66;
const TAP_SLOP = 8;
/** Screen distance kept between a cart on the road and the counter, or the city it reaches. */
const HOME_EDGE_PX = 58;
const CITY_EDGE_PX = 46;

/** Room for the markers' size around the places (the lands are smaller than the cities). */
function padded(i: Insets, small = false): Insets {
  const k = small ? 22 : 34;
  return { top: i.top + k, right: i.right + k, bottom: i.bottom + k + 12, left: i.left + k };
}

export const WorldMap = forwardRef<
  WorldMapHandle,
  {
    region: string;
    cities: string[];
    /**
     * Which map is shown: the trade's (cities, counter, carts), the campaign's (lands) or the
     * Terraferma's.
     */
    layer: "trade" | "campaign" | "terra";
    /**
     * The places of the campaign, in map units, by marker key; those beyond the drawn
     * map's western edge (Lombardy, Bruges) are a pan away.
     */
    spots: { key: string; x: number; y: number }[];
    /**
     * Where the Terraferma opens, in map units: the merchant's land and what lies around it (none:
     * the whole map).
     */
    focus?: { x: number; y: number }[];
    /** Drawn under the markers, in map units (the campaign's territories and marches). */
    overlay?: ReactNode;
    markers: MapMarker[];
    /** Parked carts, in their order beside the counter. */
    parked: string[];
    /** Roads drawn faintly from the counter (city codes). */
    roads: string[];
    /** Roads lit: the cities a selected cart can serve. */
    litRoads: string[];
    /** The road of the departure being prepared. */
    planned: string | null;
    /** Server time minus local time. */
    clockOffset: number;
    insets: Insets;
    selectedKey: string | null;
    /** A tap off the markers, with the point of the map under it (map units). */
    onEmptyTap: (at: { x: number; y: number }) => void;
  }
>(function WorldMap(props, ref) {
  const root = useRef<HTMLDivElement>(null);
  const ground = useRef<HTMLDivElement>(null);
  const lines = useRef<SVGSVGElement>(null);
  const nodes = useRef(new Map<string, HTMLElement>());
  const cam = useRef<Camera>({ s: 0.4, tx: 0, ty: 0 });
  const fitted = useRef<Camera | null>(null);
  // The labels kept apart: where each goes, measured again when the zoom changes.
  const placement = useRef<Placement>(new Map());
  const measured = useRef<{
    s: number;
    markers: unknown;
    sizes: Map<string, { cx: number; cy: number; w: number; h: number }>;
    hud: { x0: number; x1: number; y0: number; y1: number }[];
  } | null>(null);
  const anim = useRef<{ from: Camera; to: Camera; start: number; ms: number } | null>(null);
  const velocity = useRef<{ x: number; y: number } | null>(null);
  const frame = useRef(0);
  const live = useRef(props);
  live.current = props;

  const cityKey = props.cities.join(",");
  const { homeW, fixedPlaces, tradeBox, parkAngle } = useMemo(() => {
    const homeW = toWorld(PLACES[props.region] ?? [180, 260]);
    const fixedPlaces: Record<string, Point> = { home: homeW };
    for (const c of cityKey.split(",")) {
      const p = PLACES[c];
      if (p) fixedPlaces[`city:${c}`] = toWorld(p);
    }
    const box: Box = boxOf(Object.values(fixedPlaces));
    // The neighbours close by and their names written under them, and where every road leaves
    // the counter.
    const near = (q: Point) => Math.hypot(q.x - homeW.x, q.y - homeW.y) <= 130 * RES;
    const others = Object.entries(fixedPlaces)
      .filter(([k]) => k !== "home")
      .flatMap(([k, p]) => {
        const curve = roadCurve(`${props.region}:${k.slice(5)}`);
        const lead = curve ? pointOn(curve, 0.08) : null;
        const around = [p, { x: p.x, y: p.y + 36 * RES }].filter(near);
        return lead ? [...around, toWorld([lead.x, lead.y])] : around;
      });
    const parkAngle = parkingAngle(homeW, others, Number.POSITIVE_INFINITY, {
      x: (box.x0 + box.x1) / 2,
      y: (box.y0 + box.y1) / 2,
    });
    return { homeW, fixedPlaces, tradeBox: box, parkAngle };
  }, [props.region, cityKey]);
  // Another layer's places: the camera frames those on the drawn map, the others a pan away.
  const spotKey = props.spots.map((l) => `${l.key}|${l.x}|${l.y}`).join(";");
  const other = useMemo(() => {
    const places: Record<string, Point> = {};
    for (const part of spotKey ? spotKey.split(";") : []) {
      const [key = "", x = "0", y = "0"] = part.split("|");
      places[key] = toWorld([Number(x), Number(y)]);
    }
    return { places, ...landFrames(Object.values(places), MAP_W * RES) };
  }, [spotKey]);
  const onOther = props.layer !== "trade" && props.spots.length > 0;
  const box = onOther ? other.box : tradeBox;
  const fitBox = onOther ? other.fitBox : tradeBox;
  const activePlaces = onOther ? other.places : fixedPlaces;
  const places = useRef(activePlaces);
  places.current = activePlaces;

  const viewport = useCallback(
    () => ({
      w: root.current?.clientWidth ?? window.innerWidth,
      h: root.current?.clientHeight ?? window.innerHeight,
    }),
    [],
  );

  /** Where a marker stands now, in world pixels. */
  const where = useCallback(
    (key: string, now: number): { p: Point; flip: boolean } | null => {
      const fixed = places.current[key];
      if (fixed) return { p: fixed, flip: false };
      const marker = live.current.markers.find((m) => m.key === key);
      if (marker?.at) return { p: toWorld([marker.at.x, marker.at.y]), flip: !!marker.at.flip };
      const trip = marker?.trip;
      if (trip) {
        const c = roadCurve(trip.route);
        if (c) {
          // The cart leaves from the counter's edge and stops at the city's, never on them.
          const chord = Math.hypot(c.to[0] - c.from[0], c.to[1] - c.from[1]) * RES * cam.current.s;
          const t0 = Math.min(0.4, HOME_EDGE_PX / Math.max(1, chord));
          const t1 = 1 - Math.min(0.4, CITY_EDGE_PX / Math.max(1, chord));
          const share = tripShare(trip, now);
          const pt = pointOn(c, t0 + (t1 - t0) * share);
          const back = now > trip.arriveAt;
          const dx = back ? -pt.dx : pt.dx;
          return { p: toWorld([pt.x, pt.y]), flip: dx < 0 };
        }
      }
      const i = live.current.parked.indexOf(key.slice(5));
      if (i < 0) return null;
      const spots = parkingSpots(live.current.parked.length, { x: 0, y: 0 }, PARK_PX, parkAngle);
      const s = spots[i] ?? { x: 0, y: 0 };
      // Parking keeps its screen distance from the counter whatever the zoom.
      return {
        p: { x: homeW.x + s.x / cam.current.s, y: homeW.y + s.y / cam.current.s },
        flip: false,
      };
    },
    [homeW, parkAngle],
  );

  /** Places the ground, the lines and every marker for the current camera and time. */
  const paint = useCallback(() => {
    const c = cam.current;
    const t = `translate3d(${c.tx}px, ${c.ty}px, 0) scale(${c.s})`;
    if (ground.current) ground.current.style.transform = t;
    if (lines.current) lines.current.style.transform = t;
    const now = Date.now() + live.current.clockOffset;
    const tier = String(zoomTier(fitted.current ? c.s / fitted.current.s : 1));
    if (root.current && root.current.dataset.zoom !== tier) root.current.dataset.zoom = tier;
    const shown = new Map<string, Point>();
    for (const [key, el] of nodes.current) {
      const at = where(key, now);
      if (!at) {
        el.style.visibility = "hidden";
        continue;
      }
      shown.set(key, project(c, at.p));
      el.dataset.flip = at.flip ? "1" : "0";
    }
    const place = (key: string, el: HTMLElement, q: Point) => {
      const p = placement.current.get(key);
      el.style.visibility = p === null ? "hidden" : "visible";
      el.style.transform = `translate3d(${(q.x + (p?.dx ?? 0)).toFixed(1)}px, ${(q.y + (p?.dy ?? 0)).toFixed(1)}px, 0)`;
    };
    // The labels kept apart. Their sizes (around their anchor) and the HUD's blocks are measured
    // when the zoom or the labels change; a pan only moves them, laid out again from those.
    const markers = live.current.markers;
    const ranked = new Map(
      markers.flatMap((m) => (m.priority === undefined ? [] : [[m.key, m.priority] as const])),
    );
    if (ranked.size === 0) {
      placement.current = new Map();
    } else {
      const last = measured.current;
      if (!last || last.markers !== markers || Math.abs(last.s - c.s) > c.s * 0.002) {
        // Measured where they stand, none moved aside.
        placement.current = new Map();
        for (const [key, q] of shown) {
          const el = nodes.current.get(key);
          if (el) place(key, el, q);
        }
        const box = root.current?.getBoundingClientRect();
        const ox = box?.left ?? 0;
        const oy = box?.top ?? 0;
        const sizes = new Map<string, { cx: number; cy: number; w: number; h: number }>();
        for (const key of ranked.keys()) {
          const el = nodes.current.get(key);
          const q = shown.get(key);
          if (!el || !q) continue;
          // The marker and the words it hangs around it, as one box.
          const parts = [el.firstElementChild, ...el.querySelectorAll("[data-map-label]")];
          let x0 = Number.POSITIVE_INFINITY;
          let y0 = Number.POSITIVE_INFINITY;
          let x1 = Number.NEGATIVE_INFINITY;
          let y1 = Number.NEGATIVE_INFINITY;
          for (const part of parts) {
            const r = part?.getBoundingClientRect();
            if (!r || r.width === 0) continue;
            x0 = Math.min(x0, r.left);
            y0 = Math.min(y0, r.top);
            x1 = Math.max(x1, r.right);
            y1 = Math.max(y1, r.bottom);
          }
          if (x1 <= x0) continue;
          sizes.set(key, {
            cx: (x0 + x1) / 2 - ox - q.x,
            cy: (y0 + y1) / 2 - oy - q.y,
            w: x1 - x0,
            h: y1 - y0,
          });
        }
        const hud = [...document.querySelectorAll("[data-hud]")]
          .map((el) => el.getBoundingClientRect())
          .filter((r) => r.width > 0)
          .map((r) => ({ x0: r.left - ox, x1: r.right - ox, y0: r.top - oy, y1: r.bottom - oy }));
        measured.current = { s: c.s, markers, sizes, hud };
      }
      const { sizes, hud } = measured.current as NonNullable<typeof measured.current>;
      const labels: Label[] = [];
      for (const [key, size] of sizes) {
        const q = shown.get(key);
        const priority = ranked.get(key);
        if (!q || priority === undefined) continue;
        labels.push({ key, x: q.x + size.cx, y: q.y + size.cy, w: size.w, h: size.h, priority });
      }
      placement.current = declutter(labels, hud);
    }
    for (const [key, q] of shown) {
      const el = nodes.current.get(key);
      if (el) place(key, el, q);
    }
  }, [where]);

  /** Runs frames while something moves: an eased camera, a glide, a cart on the road. */
  const loop = useCallback(() => {
    if (frame.current) return;
    const step = () => {
      frame.current = 0;
      let moving = false;
      const a = anim.current;
      if (a) {
        const k = (performance.now() - a.start) / a.ms;
        cam.current = blend(a.from, a.to, k);
        if (k >= 1) anim.current = null;
        else moving = true;
      }
      const v = velocity.current;
      if (v && !a) {
        cam.current = clampCamera(
          { ...cam.current, tx: cam.current.tx + v.x * 16, ty: cam.current.ty + v.y * 16 },
          box,
          viewport(),
          live.current.insets,
        );
        v.x *= 0.92;
        v.y *= 0.92;
        if (Math.hypot(v.x, v.y) < 0.02) velocity.current = null;
        else moving = true;
      }
      if (live.current.markers.some((m) => m.trip)) moving = true;
      paint();
      if (moving && !document.hidden) frame.current = requestAnimationFrame(step);
    };
    frame.current = requestAnimationFrame(step);
  }, [paint, box, viewport]);

  const easeTo = useCallback(
    (to: Camera, ms = 420) => {
      velocity.current = null;
      anim.current = { from: cam.current, to, start: performance.now(), ms };
      loop();
    },
    [loop],
  );

  const fit = useCallback(() => {
    const v = viewport();
    const f = fitLands(box, fitBox, v, padded(live.current.insets, live.current.layer !== "trade"));
    fitted.current = f;
    return f;
  }, [box, fitBox, viewport]);

  // Where a layer opens: the Terraferma on the merchant's own land and around it (read when it
  // opens, so that his land growing does not move the camera), any other on its whole map.
  const opened = useRef<Camera | null>(null);
  const opening = useCallback(() => {
    const whole = fit();
    const near = live.current.focus;
    const cam =
      live.current.layer === "terra" && near && near.length > 0
        ? fitTerra(
            boxOf(near.map((p) => toWorld([p.x, p.y]))),
            box,
            viewport(),
            padded(live.current.insets, true),
          )
        : whole;
    opened.current = cam;
    return cam;
  }, [fit, box, viewport]);

  useImperativeHandle(
    ref,
    () => ({
      show: (key: string) => {
        const now = Date.now() + live.current.clockOffset;
        const at = where(key, now);
        if (!at) return;
        // During a glide (a new layer), from where it is going, not from where it passes.
        const base = anim.current?.to ?? cam.current;
        const next = reveal(
          base,
          at.p,
          viewport(),
          padded(live.current.insets, live.current.layer !== "trade"),
          8,
        );
        if (next !== base) easeTo(next);
      },
      fit: () => easeTo(fit()),
      focus: () => easeTo(opening()),
    }),
    [where, easeTo, fit, opening, viewport],
  );

  // First fit; a new layer glides to its own frame; again when the screen turns or resizes.
  const framed = useRef(false);
  useLayoutEffect(() => {
    if (framed.current) easeTo(opening(), 560);
    else {
      cam.current = opening();
      paint();
      framed.current = true;
    }
    const onResize = () => {
      cam.current = opening();
      paint();
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [opening, paint, easeTo]);

  // The HUD grew or shrank over the map (the rival's line came, a line of the Terraferma's note
  // wrapped): the map framed again in the room left, unless the player has moved it.
  const topInset = props.insets.top;
  const lastTop = useRef(topInset);
  useEffect(() => {
    if (lastTop.current === topInset) return;
    lastTop.current = topInset;
    const before = opened.current;
    const at = anim.current?.to ?? cam.current;
    const framedThere =
      !before ||
      (Math.abs(at.s - before.s) <= before.s * 0.001 &&
        Math.abs(at.tx - before.tx) < 1 &&
        Math.abs(at.ty - before.ty) < 1);
    if (framedThere) easeTo(opening(), 300);
  }, [topInset, opening, easeTo]);

  // New markers, trips or selection: place them, and keep the frames going if carts roll.
  useEffect(() => {
    paint();
    loop();
  });

  useEffect(() => {
    const wake = () => !document.hidden && loop();
    document.addEventListener("visibilitychange", wake);
    return () => {
      document.removeEventListener("visibilitychange", wake);
      cancelAnimationFrame(frame.current);
      frame.current = 0;
    };
  }, [loop]);

  // Gestures: one finger pans (with a glide on release), two pinch, the wheel zooms.
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const pointers = new Map<number, Point>();
    let moved = 0;
    let last: { p: Point; t: number } | null = null;
    let pinch: { d: number; mid: Point } | null = null;
    let lastTap = 0;
    const bounds = () => {
      const f = fitted.current ?? fit();
      return { min: f.s * 0.8, max: f.s * 3.2 };
    };
    const local = (e: PointerEvent | WheelEvent): Point => {
      const r = el.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    };
    const down = (e: PointerEvent) => {
      if (e.button !== 0 && e.pointerType === "mouse") return;
      pointers.set(e.pointerId, local(e));
      anim.current = null;
      velocity.current = null;
      if (pointers.size === 1) {
        moved = 0;
        last = { p: local(e), t: performance.now() };
      }
      if (pointers.size === 2) {
        const [a, b] = [...pointers.values()] as [Point, Point];
        pinch = {
          d: Math.hypot(a.x - b.x, a.y - b.y),
          mid: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 },
        };
      }
    };
    const move = (e: PointerEvent) => {
      const prev = pointers.get(e.pointerId);
      if (!prev) return;
      const p = local(e);
      pointers.set(e.pointerId, p);
      if (pointers.size >= 2 && pinch) {
        const [a, b] = [...pointers.values()] as [Point, Point];
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
        const { min, max } = bounds();
        let c = zoomAt(cam.current, d / Math.max(1, pinch.d), mid, min, max);
        c = { ...c, tx: c.tx + mid.x - pinch.mid.x, ty: c.ty + mid.y - pinch.mid.y };
        cam.current = clampCamera(c, box, viewport(), live.current.insets);
        pinch = { d, mid };
        moved += TAP_SLOP + 1;
        paint();
        return;
      }
      const dx = p.x - prev.x;
      const dy = p.y - prev.y;
      moved += Math.abs(dx) + Math.abs(dy);
      if (moved <= TAP_SLOP) return;
      el.dataset.dragging = "1";
      cam.current = clampCamera(
        { ...cam.current, tx: cam.current.tx + dx, ty: cam.current.ty + dy },
        box,
        viewport(),
        live.current.insets,
      );
      const t = performance.now();
      if (last) {
        const dt = Math.max(1, t - last.t);
        velocity.current = { x: (p.x - last.p.x) / dt, y: (p.y - last.p.y) / dt };
      }
      last = { p, t };
      paint();
    };
    const up = (e: PointerEvent) => {
      if (!pointers.has(e.pointerId)) return;
      pointers.delete(e.pointerId);
      if (pointers.size < 2) pinch = null;
      if (pointers.size > 0) return;
      const tapped = moved <= TAP_SLOP;
      // A glide only after a real flick (the finger still moving when lifted).
      const sinceMove = last ? performance.now() - last.t : 999;
      if (!tapped && velocity.current && sinceMove < 60) loop();
      else velocity.current = null;
      setTimeout(() => {
        delete el.dataset.dragging;
      }, 0);
      if (!tapped) return;
      const onMarker = (e.target as HTMLElement | null)?.closest("[data-marker]");
      if (onMarker) return;
      const t = performance.now();
      if (t - lastTap < 300) easeTo(fit());
      lastTap = t;
      const w = unproject(cam.current, local(e));
      live.current.onEmptyTap({ x: w.x / RES, y: w.y / RES });
    };
    // A drag that started on a marker is not a tap on it.
    const click = (e: MouseEvent) => {
      if (el.dataset.dragging === "1") {
        e.stopPropagation();
        e.preventDefault();
      }
    };
    const wheel = (e: WheelEvent) => {
      e.preventDefault();
      const { min, max } = bounds();
      anim.current = null;
      cam.current = clampCamera(
        zoomAt(cam.current, Math.exp(-e.deltaY * 0.0015), local(e), min, max),
        box,
        viewport(),
        live.current.insets,
      );
      paint();
    };
    el.addEventListener("pointerdown", down);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    el.addEventListener("click", click, true);
    el.addEventListener("wheel", wheel, { passive: false });
    return () => {
      el.removeEventListener("pointerdown", down);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
      el.removeEventListener("click", click, true);
      el.removeEventListener("wheel", wheel);
    };
  }, [box, fit, paint, loop, easeTo, viewport]);

  const register = (key: string) => (el: HTMLElement | null) => {
    if (el) nodes.current.set(key, el);
    else nodes.current.delete(key);
  };

  const route = (city: string) => `${props.region}:${city}`;
  const trips = props.markers.flatMap((m) => (m.trip ? [m.trip] : []));
  const now = Date.now() + props.clockOffset;

  return (
    <div
      ref={root}
      className="world-map absolute inset-0 touch-none select-none overflow-hidden"
      // Clipped, not merely hidden: a focus or a scroll-into-view must never shift the world.
      style={{ overflow: "clip" }}
      aria-label="Carte"
    >
      <div className="world-sky pointer-events-none absolute inset-0" aria-hidden="true" />
      <div
        ref={ground}
        className="world-ground pointer-events-none absolute left-0 top-0 origin-top-left will-change-transform"
        style={{ width: WORLD_W, height: WORLD_H }}
      >
        <PortolanTerrain />
      </div>
      <svg
        ref={lines}
        viewBox={`0 0 ${MAP_W} ${MAP_H}`}
        width={WORLD_W}
        height={WORLD_H}
        className="pointer-events-none absolute left-0 top-0 origin-top-left overflow-visible will-change-transform"
        aria-hidden="true"
      >
        {props.overlay && (
          <g key={props.layer} className="animate-fade">
            {props.overlay}
          </g>
        )}
        {props.roads.map((c) => {
          const curve = roadCurve(route(c));
          if (!curve) return null;
          const lit = props.litRoads.includes(c);
          return (
            <path
              key={c}
              d={curvePath(curve)}
              fill="none"
              stroke={lit ? "rgb(var(--gold))" : "rgb(var(--cream))"}
              strokeOpacity={lit ? 0.45 : 0.1}
              strokeWidth={lit ? 1.6 : 1.1}
              strokeDasharray="1.5 4"
              strokeLinecap="round"
            />
          );
        })}
        {trips.map((trip) => {
          const curve = roadCurve(trip.route);
          if (!curve) return null;
          const share = tripShare(trip, now);
          const out = now <= trip.arriveAt;
          return (
            <path
              key={`${trip.route}-${trip.departAt}`}
              d={out ? partialPath(curve, share, 1) : partialPath(curve, 0, share)}
              fill="none"
              stroke={trip.halted ? "rgb(var(--vermilion))" : "rgb(var(--lagoon))"}
              strokeOpacity="0.75"
              strokeWidth="1.8"
              strokeDasharray="1.5 3.5"
              strokeLinecap="round"
              className="route-march"
            />
          );
        })}
        {props.planned &&
          (() => {
            const curve = roadCurve(route(props.planned));
            return curve ? (
              <path
                d={curvePath(curve)}
                fill="none"
                stroke="rgb(var(--lagoon))"
                strokeWidth="2.4"
                strokeDasharray="2 3"
                strokeLinecap="round"
                className="route-march"
              />
            ) : null;
          })()}
      </svg>
      {props.markers.map((m) => (
        <div
          key={m.key}
          ref={register(m.key)}
          data-marker={m.key}
          data-selected={props.selectedKey === m.key ? "1" : undefined}
          data-tier={m.tier}
          className={`map-marker animate-fade absolute left-0 top-0 ${m.key.startsWith("cart:") ? "z-[3]" : m.priority === 0 ? "z-[4]" : "z-[2]"}`}
          style={{ visibility: "hidden" }}
        >
          {m.node}
        </div>
      ))}
    </div>
  );
});
