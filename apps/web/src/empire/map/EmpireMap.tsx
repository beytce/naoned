import { cellsWithin } from "@comptoirs/engine";
import {
  Suspense,
  forwardRef,
  lazy,
  memo,
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { artSource } from "../../art/Illustration.js";
import { GoodsMark } from "../../art/goods.js";
import { HEX_SIZE, cellCentre, hexPath, neighbours } from "../../art/hexmap.js";
import { ROUTES, alongPath, pathOf, routeBetween, seatOf } from "../../art/mediterranean.js";
import { P } from "../../art/palette.js";
import { PlateauShapes } from "../../art/plateau/Plateau.js";
import { board } from "../../art/plateau/board.js";
import { TILT } from "../../art/plateau/geom.js";
import type { Camera, Viewport } from "../../game/map/geometry.js";
import { Icon } from "../../game/map/icons.js";
import { fr } from "../../i18n.js";
import { clock } from "../../ui.js";
import { EmpireOrbit } from "../Orbit.js";
import { regionName } from "../World.js";
import { workshopStatus } from "../logic.js";
import { bestQuote } from "../logic.js";
import type { Board3DHandle, DomainScene } from "../map3d/Board3D.js";
import { Guard3D } from "../map3d/Guard.js";
import { groundAt } from "../map3d/camera.js";
import { STEP, domainOf } from "../map3d/domain.js";
import { MAP_3D } from "../map3d/flag.js";
import { sceneInputOf, sitesOf } from "../map3d/scene.js";
import { pt } from "../porta/texts.js";
import type { EmpireAction, EmpirePayload } from "../types.js";
import { DomainLabels } from "./Domain.js";
import { Fleet } from "./Fleet.js";
import {
  CHART,
  ORBIT_UNITS,
  type Placing,
  type Target,
  centredOn,
  cityLooks,
  edgeArrow,
  farCamera,
  fleetSpots,
  nearestPlace,
  placeable,
  placesOf,
  postLevels,
  postsRaised,
  snapToTile,
  wantedBy,
  zoomBounds,
  zoomBounds3d,
} from "./logic.js";
import { useCamera } from "./useCamera.js";

const t = fr.empire;

export interface EmpireMapHandle {
  /** Up close on Venice's house, or back out to the map. */
  toggle(): void;
  /** Up close on Venice's house. */
  home(): void;
  /** Out to the map. */
  far(): void;
  /** Out of a fondaco's domain, back to the map around it. */
  leave(): void;
  /**
   * « Maison » (3D): the camera back over the first fondaco; already there, its domain plunged into.
   */
  house(): void;
  /** The information layer shown (Alt held) or not. */
  info(on: boolean): void;
  /** The map moved a step (a key: -1, 0 or 1 on each axis), or zoomed by a factor. */
  pan(dx: number, dy: number): void;
  zoom(k: number): void;
}

/** A key moves the map by this share of the screen. */
const PAN_STEP = 0.12;

/** A sector across the screen, as the example's systems (step 4): Venice's, at the start. */
const sectorOn = (v: Viewport) =>
  centredOn(
    seatOf("veneto"),
    Math.min((v.w * 0.95) / (Math.sqrt(3) * HEX_SIZE), (v.h * 0.62) / (2 * HEX_SIZE)),
    v,
  );
/**
 * Up close on a counter, its workshops in orbit around it (the map that grows): the camera zooms
 * around the bubble, which stays where it was on the screen, unless its orbit would leave it.
 */
const orbitOn = (at: [number, number], from: Camera) => (v: Viewport) => {
  const s = (Math.min(v.w, v.h) * 0.86) / ORBIT_UNITS;
  const sx = at[0] * from.s + from.tx;
  const sy = at[1] * TILT * from.s + from.ty;
  const half = (ORBIT_UNITS / 2) * s;
  // The HUD above, the round buttons below: the orbit stays between them.
  const keep = (p: number, lo: number, hi: number) =>
    hi - lo < 2 * half ? (lo + hi) / 2 : Math.min(hi - half, Math.max(lo + half, p));
  const px = keep(sx, 8, v.w - 8);
  const py = keep(sy, 96, v.h - 104);
  return { s, tx: px - at[0] * s, ty: py - at[1] * TILT * s };
};

/**
 * A fondaco's domain across the screen (its nineteen tiles and their shore), a little above the
 * middle: the bar at the foot under it.
 */
const domainFrame =
  (at: [number, number], rings = 2) =>
  (v: Viewport) => {
    // The rings of workshops across (their shore a little cut on a phone): closer while the first
    // ring holds them all.
    const across = (rings <= 1 ? 3.4 : 5) * STEP;
    const s = Math.min((v.w * 0.98) / across, Math.max(80, v.h - 300) / (across * TILT));
    return { s, tx: v.w / 2 - at[0] * s, ty: (v.h - 120) / 2 - at[1] * TILT * s };
  };

/** The board in 3D (?map=3d, docs/plateau-reprise.md § 7): its own chunk, fetched only then. */
const Board3D = lazy(() => import("../map3d/Board3D.js"));

/** The chart is never drawn larger than this across (px): a phone's GPU keeps up with it. */
const MAX_RASTER = 4_096;

/**
 * The empire's map (the map at the centre of the game): the whole screen, on a phone as on a
 * computer, in planes that do not slide alike — the night far behind, the chart under the finger,
 * the mists between it and the places — so that the eye feels its depth. What the house has not
 * reached lies in the dark; up close on Venice, its house opens in orbit where it stands.
 *
 * Smooth (step 3): the chart is drawn once at a scale (`base`) and only moved and scaled by the
 * GPU during a gesture, then drawn again sharp when the camera rests; the places sit in one layer
 * moved with it and grow and shrink with the chart (after Hades' Star, 1 November 2026: a city is
 * small when far), their names hidden when far; only the region names and the timers keep their
 * size (`--inv`); one paint per frame.
 */
export const EmpireMap = forwardRef<
  EmpireMapHandle,
  {
    p: EmpirePayload;
    now: number;
    busy: boolean;
    act: (a: EmpireAction) => Promise<void>;
    onTarget: (target: Target | null) => void;
    /** Placing a counter or the Arsenal: the cells it may go on light up, a touch picks one. */
    placing?: Placing | null;
    picked?: Picked | null;
    onPick?: (at: Picked) => void;
    /** The Campo touched: the Terraferma. */
    onCamp?: () => void;
    /** The vehicle chosen (its halo), and picking where to send it (a touch on a place). */
    selected?: string | null;
    aiming?: boolean;
    /** A vehicle sent to a place (a drag, a touch while picking, a right click). */
    onMove?: (vehicleId: string, place: string) => void;
    /** A hop arrived by the clock: the house's state to settle. */
    onArrive?: () => void;
    /** The house's name, under its first fondaco. */
    houseName?: string;
    /** A fondaco's domain plunged into (its region), or left (null): on the 3D board. */
    onDomain?: (region: string | null) => void;
  }
>(function EmpireMap(
  {
    p,
    now,
    busy,
    act,
    onTarget,
    placing = null,
    picked = null,
    onPick,
    onCamp,
    selected = null,
    aiming = false,
    onMove,
    onArrive,
    houseName = "",
    onDomain,
  },
  ref,
) {
  const root = useRef<HTMLDivElement>(null);
  const back = useRef<HTMLDivElement>(null);
  const mist = useRef<HTMLDivElement>(null);
  const ground = useRef<HTMLDivElement>(null);
  const pins = useRef<HTMLDivElement>(null);
  const arrows = useRef<HTMLDivElement>(null);
  // The board in 3D, under the layers: its camera follows the map's at each paint.
  const board3d = useRef<Board3DHandle | null>(null);
  // A place touched (its mark, or its hexagon on the 3D board): the latest handler.
  const touchRef = useRef<((id: string) => void) | null>(null);
  // The counter whose workshops are deployed around it, opened at its touch (never by a zoom).
  const [opened, setOpened] = useState<string | null>(null);
  const openedNow = useRef<string | null>(null);
  openedNow.current = opened;
  const openedRegion = useRef("veneto");
  const openedAt = useRef<[number, number]>([0, 0]);
  // On the 3D board, a fondaco touched is its domain plunged into (decision of the owner,
  // 3 November 2026): a little scene of its own, the map's marks put away.
  const domainOn = MAP_3D && opened !== null;
  const domainRef = useRef(domainOn);
  domainRef.current = domainOn;
  // biome-ignore lint/correctness/useExhaustiveDependencies: told when it changes
  useEffect(() => onDomain?.(domainOn ? openedRegion.current : null), [domainOn, opened]);
  const view = p.view;
  const casa = view?.house.casa ?? 1;
  const farOn = (v: Viewport) => farCamera(p, v);
  // The scale the chart is drawn at; between two rests the GPU scales it.
  const [base, setBase] = useState(() => {
    const v = { w: window.innerWidth, h: window.innerHeight };
    return Math.min(MAX_RASTER / CHART.w, sectorOn(v).s);
  });
  const drawn = useRef(base);
  drawn.current = base;
  // The scale the places are drawn for (Venice's sector across the screen): nearer, they grow;
  // farther, they shrink, as the chart does.
  const ref0 = useRef(sectorOn({ w: window.innerWidth, h: window.innerHeight }).s);

  const paint = useCallback((cam: Camera, v: Viewport) => {
    board3d.current?.view(cam, v);
    const { s, tx, ty } = cam;
    const k = s / drawn.current;
    // The planes of the depth: the night at a sixth of the move, the mists at half.
    if (back.current)
      back.current.style.transform = `translate3d(${tx * 0.15}px, ${ty * 0.15}px, 0)`;
    if (mist.current) mist.current.style.transform = `translate3d(${tx * 0.5}px, ${ty * 0.5}px, 0)`;
    const moved = `translate3d(${tx}px, ${ty}px, 0) scale(${k})`;
    if (ground.current) ground.current.style.transform = moved;
    const layer = pins.current;
    if (layer) {
      layer.style.transform = moved;
      // The names of regions and the timers keep their size; the places follow the chart.
      layer.style.setProperty("--inv", String(1 / k));
      // The places shrink with the chart, to a third of their size at the least.
      // On the 3D board, up close: the places grow no more than half again their size (a mark the
      // size of a tile would hide it); as the map scales the layer by k, the mark by --chartk.
      const grown = MAP_3D
        ? Math.min(1.5, Math.max(0.3, s / ref0.current)) / k
        : Math.max(0.3, drawn.current / ref0.current);
      layer.style.setProperty("--chartk", String(grown));
    }
    // The arrows at the screen's edge toward the fondaco and the vehicles out of sight (3D).
    for (const el of arrows.current?.querySelectorAll<HTMLElement>("[data-arrow]") ?? []) {
      const [ax = 0, ay = 0] = (el.dataset.chart ?? "0,0").split(",").map(Number);
      const a = edgeArrow([ax * s + tx, ay * TILT * s + ty], v);
      el.style.display = a ? "" : "none";
      if (a) {
        el.style.transform = `translate(${a.x - 22}px, ${a.y - 22}px)`;
        const tip = el.firstElementChild as HTMLElement | null;
        if (tip) tip.style.transform = `rotate(${a.angle}rad)`;
      }
    }
    // Far, the places' names give way (after Hades' Star: a planet's name shows near).
    const far = s / ref0.current < 0.62;
    if (root.current && (root.current.dataset.far === "1") !== far) {
      if (far) root.current.dataset.far = "1";
      else delete root.current.dataset.far;
    }
  }, []);

  // A counter put down or raised: its ring fills with gold, then a burst and a wave (900 ms).
  const levels = postLevels(p);
  const levelKey = [...levels].map(([id, l]) => `${id}:${l}`).join(",");
  const seenLevels = useRef<Map<string, number> | null>(null);
  const [raised, setRaised] = useState<{ key: string; x: number; y: number }[]>([]);
  // biome-ignore lint/correctness/useExhaustiveDependencies: the levels change with their key
  useEffect(() => {
    const now = postLevels(p);
    const ids = postsRaised(seenLevels.current, now);
    seenLevels.current = now;
    if (ids.length === 0) return;
    const map = p.view?.map;
    const at = (id: string): [number, number] | null => {
      if (id === "home") return homeAt(p);
      const x = map?.posts.find((y) => y.id === id);
      return x ? [x.x, x.y] : null;
    };
    const fresh = ids.flatMap((id) => {
      const xy = at(id);
      return xy ? [{ key: `${id}:${now.get(id)}`, x: xy[0], y: xy[1] }] : [];
    });
    setRaised((xs) => [...xs, ...fresh]);
    const keys = new Set(fresh.map((f) => f.key));
    window.setTimeout(() => setRaised((xs) => xs.filter((x) => !keys.has(x.key))), 1_200);
  }, [levelKey]);

  /** The information layer (after Hades' Star's tilde): every name, the orders, the holds. */
  const showInfo = useCallback((on: boolean) => {
    const el = root.current;
    if (!el) return;
    if (on) el.dataset.info = "1";
    else delete el.dataset.info;
  }, []);

  // Every house starts on Venice's sector, across the screen.
  const camera = useCamera({
    root,
    initial: sectorOn,
    onPaint: paint,
    // Never farther than the house's whole map (1 November: the zoom went to the whole sea, and
    // the places grown to be touched broke the phone's memory).
    // On the 3D board, as near as a small tile across the screen (3 November).
    bounds: (v) => (MAP_3D ? zoomBounds3d(p, v) : zoomBounds(p, v)),
    // A double touch on the sea: near, around the point touched, and far (the whole map) in
    // turn (after Hades' Star).
    onDoubleTap: (at) => {
      const v = camera.view();
      const c = camera.cam();
      const near = sectorOn(v).s;
      if (c.s >= near * 0.8) return camera.easeTo(farOn);
      // The point of the chart under the finger comes to the middle of the screen, near.
      const wx = (at.x - c.tx) / c.s;
      const wy = (at.y - c.ty) / c.s;
      camera.easeTo({ s: near, tx: v.w / 2 - wx * near, ty: v.h / 2 - wy * near });
    },
    // A finger held still: the information layer, while it stays down.
    onHold: (on) => showInfo(on),
    // The sea touched: the panel and the deployed workshops fold away. On the 3D board, a ray
    // through the scene first: a place touched is touched (docs/plateau-reprise.md § 7, step 2).
    onTap: (at) => {
      // In a domain, the sea around touched does nothing (its labels take the touches).
      if (domainRef.current) return;
      const id = board3d.current?.hit(at.x, at.y) ?? null;
      if (id && touchRef.current) {
        touchRef.current(id);
        return;
      }
      onTarget(null);
      setOpened(null);
    },
    // At rest: the chart drawn again at the camera's scale, when it has moved far from it.
    onRest: (cam, v) => {
      // Pinched out of a domain, far enough: back to the map.
      if (
        domainRef.current &&
        cam.s < domainFrame(openedAt.current, domainRings(openedRegion.current))(v).s * 0.55
      ) {
        setOpened(null);
        return;
      }
      const want = Math.min(MAX_RASTER / CHART.w, cam.s);
      if (Math.abs(want / drawn.current - 1) > 0.12) setBase(want);
    },
  });
  /** How many rings of a fondaco's domain hold something (its workshops, sites, free place). */
  const domainRings = (region: string) =>
    Math.max(
      1,
      ...domainOf(p, region, [0, 0])
        .filter((t) => t.kind !== "land" && t.kind !== "shore")
        .map((t) => t.ring),
    );
  /** A counter touched: its workshops deploy around its bubble, the camera zooming around it. */
  const deploy = (region: string, at: [number, number], id = region) => {
    setOpened(id);
    openedRegion.current = region;
    openedAt.current = at;
    camera.easeTo(MAP_3D ? domainFrame(at, domainRings(region)) : orbitOn(at, camera.cam()));
  };
  /** « Maison » (3D): back over the first fondaco; already there, its domain. */
  const goHouse = () => {
    unfollow.current();
    const at = homeAt(p);
    const v = camera.view();
    const c = camera.cam();
    const want = centredOn(at, sectorOn(v).s, v);
    const here =
      Math.abs(c.s / want.s - 1) < 0.15 &&
      Math.hypot(c.tx - want.tx, c.ty - want.ty) < Math.min(v.w, v.h) * 0.12;
    if (here || openedNow.current === "home") deploy("veneto", at, "home");
    else {
      setOpened(null);
      camera.easeTo(() => want);
    }
  };
  useImperativeHandle(ref, () => ({
    toggle: () => {
      unfollow.current();
      if (openedNow.current) setOpened(null);
      camera.easeTo(openedNow.current ? sectorOn : farOn);
    },
    home: () => {
      unfollow.current();
      deploy("veneto", homeAt(p), "home");
    },
    far: () => {
      unfollow.current();
      setOpened(null);
      camera.easeTo(farOn);
    },
    house: () => goHouse(),
    leave: () => {
      const at = openedAt.current;
      setOpened(null);
      camera.easeTo((v) => centredOn(at, sectorOn(v).s, v));
    },
    info: showInfo,
    pan: (dx, dy) => {
      unfollow.current();
      const v = camera.view();
      camera.panBy(-dx * v.w * PAN_STEP, -dy * v.h * PAN_STEP);
    },
    zoom: (k) => camera.zoomBy(k),
  }));
  // The places put on the chart at its scale, when they or the scale change (never per frame).
  useLayoutEffect(() => {
    for (const el of pins.current?.querySelectorAll<HTMLElement>("[data-at]") ?? []) {
      const [x = 0, y = 0] = (el.dataset.at ?? "0,0").split(",").map(Number);
      el.style.left = `${x * base}px`;
      el.style.top = `${y * TILT * base}px`;
    }
    camera.repaint();
  });

  // A fondaco's reach shows only when it is touched, or when a vehicle of it is chosen (decision
  // of the owner, 1 November 2026); the placing shows the reach it would have.
  // A vehicle on its way, touched: on the 3D board, the camera follows it until it arrives or a
  // finger takes the map again (decision of the owner, 3 November).
  const latest = useRef(p);
  latest.current = p;
  // The camera's commands of the player (Recentrer, the keys' pan, home, far) end the following.
  const unfollow = useRef<() => void>(() => {});
  const followed =
    MAP_3D && selected ? view?.vehicles.mine.find((v) => v.id === selected) : undefined;
  const followKey =
    followed && followed.legs.length > 0 ? `${followed.id}:${followed.legs.length}` : "";
  // biome-ignore lint/correctness/useExhaustiveDependencies: followed by its key, the clock by `now`
  useEffect(() => {
    if (!followKey) return;
    const skew = now - Date.now();
    let raf = 0;
    let on = true;
    const stop = () => {
      on = false;
    };
    unfollow.current = stop;
    // A finger that drags the map ends it; a pinch or the wheel (a zoom) does not.
    const fingers = new Map<number, [number, number]>();
    const down = (e: PointerEvent) => fingers.set(e.pointerId, [e.clientX, e.clientY]);
    const drag = (e: PointerEvent) => {
      const from = fingers.get(e.pointerId);
      if (from && fingers.size === 1 && Math.hypot(e.clientX - from[0], e.clientY - from[1]) > 12)
        stop();
    };
    const up = (e: PointerEvent) => fingers.delete(e.pointerId);
    root.current?.addEventListener("pointerdown", down);
    window.addEventListener("pointermove", drag);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    const step = () => {
      if (!on) return;
      const t = Date.now() + skew;
      // The latest state (« Partir » brings its leaving forward), not the one it began with.
      const at = fleetSpots(latest.current, t, true).find((x) => x.v.id === selected);
      // Until its last stop is reached (waiting to leave, then on its way).
      if (!at || !at.v.legs.some((l) => l.arrivesAt > t)) return;
      // A zoom of the keys glides first; the camera comes back over the vehicle at its scale.
      if (!camera.animating()) {
        const c = camera.cam();
        camera.jumpTo(centredOn([at.x, at.y], c.s, camera.view()));
      }
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => {
      on = false;
      cancelAnimationFrame(raf);
      root.current?.removeEventListener("pointerdown", down);
      window.removeEventListener("pointermove", drag);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
    };
  }, [followKey]);
  const chosenAt = selected ? view?.vehicles.mine.find((v) => v.id === selected)?.at : undefined;
  const reachShown = opened ?? (chosenAt && !chosenAt.startsWith("city:") ? chosenAt : null);
  // The domain plunged into: its tiles around the fondaco, each workshop's state (domain.ts).
  // biome-ignore lint/correctness/useExhaustiveDependencies: p stands for its house's workshops
  const domainTiles = useMemo(
    () => (domainOn ? domainOf(p, openedRegion.current, openedAt.current) : null),
    [domainOn, opened, view?.house, view?.workshopSlots, view?.regions],
  );
  const domainScene: DomainScene | null = domainTiles
    ? {
        key: opened ?? "",
        tiles: domainTiles,
        states: Object.fromEntries(
          (view?.house.workshops ?? []).map((w) => [w.id, workshopStatus(p, w, now).state]),
        ),
      }
    : null;
  // The 3D board in: its camera set from the map's at once (a stable callback: never again at a
  // tick of the clock, which would ask the board a frame each second).
  // Until the 3D board is in (its code and its models fetched), the marks take the touches as on
  // the SVG map; then the scene does (a ray), the marks letting the finger through.
  const [threeReady, setThreeReady] = useState(false);
  const onThreeReady = useCallback(() => setThreeReady(true), []);
  const onBoard3d = useCallback((h: Board3DHandle | null) => {
    board3d.current = h;
    if (h) camRef.current.repaint();
  }, []);
  // On the 3D board, the ground's point under a touch, by the camera's ray (camera.ts).
  const groundOf = useCallback((cx: number, cy: number): [number, number] | null => {
    const r = root.current?.getBoundingClientRect();
    const c = camRef.current;
    if (!r || !c) return null;
    return groundAt(c.cam(), c.view(), cx - r.left, cy - r.top);
  }, []);
  const camRef = useRef(camera);
  camRef.current = camera;
  // The chart changes with the house's map and the placing, never with the clock.
  // biome-ignore lint/correctness/useExhaustiveDependencies: p stands for its view's map
  const chart = useMemo(
    () =>
      view ? (
        <Chart
          p={p}
          base={base}
          placing={placing}
          picked={picked}
          onPick={onPick}
          onSector={(cell) => onTarget({ kind: "sector", cell })}
          reachShown={reachShown}
          ground={MAP_3D ? groundOf : undefined}
        />
      ) : null,
    [view?.map, view?.regions, base, placing, picked, onPick, reachShown],
  );
  if (!view) return null;
  const map = view.map;
  // The cities under the workshops deployed give way to them.
  const centre = opened ? openedAt.current : null;
  // Picking where to send the vehicle chosen: the places it may go to are lit, a touch sends it.
  const targets = aiming && selected ? new Set(placesOf(p).map((x) => x.place)) : null;
  const lit = new Set(
    [...(targets ?? [])].filter((x) => x.startsWith("city:")).map((x) => x.slice(5)),
  );
  // The vehicle chosen: the cities it would serve light up, with what it would bring them (after
  // Hades' Star: a ship's destinations shine); the others step back.
  const chosen = selected ? view.vehicles.mine.find((v) => v.id === selected) : undefined;
  // The cities of the orders aboard light up (an empty hold lights none, dims none).
  const wanted = chosen && chosen.loads.length > 0 ? wantedBy(p, chosen) : null;
  const sendTo = (place: string) => {
    if (!targets?.has(place) || !selected) return false;
    onMove?.(selected, place);
    return true;
  };
  // On the 3D board, the Remise, the Campo and the Porta stand on small tiles (§ 8): their marks
  // with them.
  const sites3d = MAP_3D ? sitesOf(sceneInputOf(p)) : null;
  const siteAt = (id: "depot" | "camp" | "porta", x: number, y: number) => {
    const at = sites3d?.[id];
    return at ? `${at.x},${at.y}` : `${x},${y}`;
  };
  /** A place touched, by its mark or its hexagon on the 3D board: what it does. */
  const touchPlace = (id: string) => {
    if (id.startsWith("vehicle:")) onTarget({ kind: "vehicle", id: id.slice(8) });
    else if (id === "home") {
      if (!sendTo("home"))
        opened === "home" ? onTarget({ kind: "casa" }) : deploy("veneto", homeAt(p), "home");
    } else if (id.startsWith("city:")) {
      if (!sendTo(id)) {
        onTarget({ kind: "city", code: id.slice(5) });
        // The town over its sheet, never hidden under it (after the map's audit, 3 November).
        const c = map.cities.find((x) => x.code === id.slice(5));
        if (c) {
          const cam = camera.cam();
          const v = camera.view();
          const y = c.y * TILT * cam.s + cam.ty;
          if (y > v.h * 0.4) camera.easeTo({ ...cam, ty: cam.ty - (y - v.h * 0.3) }, 380);
        }
      }
    } else if (id === "depot") onTarget({ kind: "depot" });
    else if (id === "porta") onTarget({ kind: "porta" });
    else if (id === "arsenal") onTarget({ kind: "arsenal" });
    else if (id === "camp") onCamp?.();
    else {
      const post = map.posts.find((x) => x.id === id);
      if (post && !sendTo(post.id))
        opened === post.id
          ? onTarget({ kind: "region", code: post.region })
          : deploy(post.region, [post.x, post.y], post.id);
    }
  };
  touchRef.current = touchPlace;
  /** A point of the screen on the chart. */
  const toChart = (cx: number, cy: number): [number, number] => {
    const r = root.current?.getBoundingClientRect();
    const c = camera.cam();
    return [(cx - (r?.left ?? 0) - c.tx) / c.s, (cy - (r?.top ?? 0) - c.ty) / c.s / TILT];
  };
  /** A right click with a vehicle chosen: it goes to the place nearest (the computer's gesture). */
  const rightClick = (e: React.MouseEvent) => {
    if (!selected) return;
    e.preventDefault();
    const near = nearestPlace(p, toChart(e.clientX, e.clientY), 30 / camera.cam().s);
    if (near) onMove?.(selected, near.place);
  };
  const underOrbit = (x: number, y: number) =>
    centre !== null && Math.hypot(x - centre[0], y - centre[1]) < ORBIT_UNITS / 2;

  return (
    <div
      ref={root}
      className="absolute inset-0 touch-none select-none overflow-hidden bg-[#08111F]"
      data-map="empire"
      data-three={MAP_3D && threeReady ? "" : undefined}
      data-orbit={opened ?? undefined}
      data-domain={domainOn ? "" : undefined}
      data-placing={placing?.kind}
      data-aiming={targets ? "" : undefined}
      onContextMenu={rightClick}
    >
      {/* The board in 3D, under every layer, its camera the map's. */}
      {MAP_3D && (
        <Guard3D>
          <Suspense fallback={null}>
            <Board3D
              ref={onBoard3d}
              p={p}
              domain={domainScene}
              cities={cityLooks(p)}
              onReady={onThreeReady}
            />
          </Suspense>
        </Guard3D>
      )}
      {/* The night, far behind: a glow over the lagoon and its scattered lights. */}
      {!MAP_3D && (
        <div ref={back} className="pointer-events-none absolute -inset-[40%]" aria-hidden="true">
          <div className="absolute inset-0 [background:radial-gradient(ellipse_at_45%_40%,#1B3558_0%,#0E1E36_45%,#070E1A_100%)]" />
          <svg className="absolute inset-0 h-full w-full opacity-70" aria-hidden="true">
            <defs>
              <pattern id="night-lights" width="140" height="140" patternUnits="userSpaceOnUse">
                <circle cx="12" cy="20" r="1" fill="#BFE3FF" opacity="0.5" />
                <circle cx="80" cy="44" r="0.7" fill="#F3D492" opacity="0.6" />
                <circle cx="46" cy="96" r="1.2" fill="#BFE3FF" opacity="0.35" />
                <circle cx="118" cy="120" r="0.8" fill="#BFE3FF" opacity="0.5" />
                <circle cx="104" cy="8" r="0.6" fill="#F3D492" opacity="0.4" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#night-lights)" />
          </svg>
        </div>
      )}

      {/* The chart, under the finger: drawn at `base`, moved and scaled by the GPU. */}
      <div
        ref={ground}
        className="map-layer pointer-events-none absolute left-0 top-0 origin-top-left"
        style={{ width: CHART.w * base, height: CHART.h * TILT * base }}
      >
        {chart}
      </div>

      {/* The mists, between the chart and the places, drifting slowly. */}
      {!MAP_3D && (
        <div ref={mist} className="pointer-events-none absolute -inset-[50%]" aria-hidden="true">
          <div className="mist-drift absolute left-[30%] top-[35%] h-[30%] w-[45%] [background:radial-gradient(closest-side,rgb(191_227_255/0.06),transparent)]" />
          <div className="mist-drift absolute left-[55%] top-[55%] h-[22%] w-[35%] [background:radial-gradient(closest-side,rgb(125_181_150/0.06),transparent)] [animation-delay:-14s]" />
        </div>
      )}

      {/* Until the 3D board is in: the night and a word, never a bare screen of floating names. */}
      {MAP_3D && !threeReady && (
        <div
          className="pointer-events-none absolute inset-0 z-[15] flex flex-col items-center justify-center gap-3 bg-[#16263E]"
          data-board-loading
        >
          <span className="h-10 w-10 animate-spin rounded-full border-2 border-gold/30 border-t-gold" />
          <span className="font-place text-sm uppercase tracking-[0.14em] text-cream-dim">
            {t.scene.loading}
          </span>
        </div>
      )}
      {/* The fondaco and the vehicles on their way out of sight: an arrow at the edge each (3D). */}
      {MAP_3D && !domainOn && (
        <div ref={arrows} className="pointer-events-none absolute inset-0 z-10" data-arrows>
          {[
            ...(map.home && map.home.placed !== false
              ? [{ id: "home", x: map.home.x, y: map.home.y }]
              : []),
            ...fleetSpots(p, now, true)
              .filter((f) => f.pose.hop)
              .map((f) => ({ id: `vehicle:${f.v.id}`, x: f.x, y: f.y })),
          ].map((a) => (
            <button
              key={a.id}
              type="button"
              data-arrow={a.id}
              data-chart={`${a.x},${a.y}`}
              style={{ display: "none" }}
              aria-label={a.id === "home" ? t.nav.home : (t.vehicleNames.mule ?? "")}
              onClick={() =>
                a.id === "home" ? goHouse() : onTarget({ kind: "vehicle", id: a.id.slice(8) })
              }
              className="pointer-events-auto absolute left-0 top-0 flex h-11 w-11 items-center justify-center rounded-full bg-night/85 shadow-lg shadow-black/50 ring-1 ring-gold/60 active:scale-95"
            >
              <span className="flex items-center justify-center text-gold">
                <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
                  <path
                    d="M5 3 L13 9 L5 15"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
              <span className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full bg-night ring-1 ring-gold/60 [&_svg]:h-4 [&_svg]:w-4">
                {a.id === "home" ? Icon.home() : null}
              </span>
            </button>
          ))}
        </div>
      )}
      {/* The places, moved with the chart, kept at their size on screen. */}
      <div
        ref={pins}
        className="map-layer pointer-events-none absolute left-0 top-0 origin-top-left"
        style={{ width: CHART.w * base, height: CHART.h * TILT * base }}
      >
        {/* A fondaco's domain (3D): its labels over its tiles, the map's marks put away. */}
        {domainOn && domainTiles && (
          <DomainLabels
            p={p}
            now={now}
            base={base}
            tiles={domainTiles}
            busy={busy}
            act={act}
            onWorkshop={(id) => onTarget({ kind: "workshop", id })}
            onCasa={() =>
              onTarget(
                openedRegion.current === "veneto"
                  ? { kind: "casa" }
                  : { kind: "region", code: openedRegion.current },
              )
            }
            onFree={() =>
              openedRegion.current === "veneto"
                ? onTarget({ kind: "free" })
                : onTarget({ kind: "region", code: openedRegion.current })
            }
          />
        )}
        {/* The workshops of the counter touched, deployed around it (the SVG map's orbit). */}
        {opened &&
          !MAP_3D &&
          (() => {
            const [ox, oy] = openedAt.current;
            const region = openedRegion.current;
            return (
              <div
                key={opened}
                className="absolute -translate-x-1/2 -translate-y-1/2"
                style={{ left: ox * base, top: oy * TILT * base, width: ORBIT_UNITS * base }}
                data-orbit-open={opened}
              >
                {/* Centred by the frame above, grown by the one inside: the animation's own
                    transform never moves the ring off its bubble. */}
                <div className="orbit-in pointer-events-auto">
                  <EmpireOrbit
                    p={p}
                    now={now}
                    busy={busy}
                    act={act}
                    region={region}
                    bare
                    onWorkshop={(id) => onTarget({ kind: "workshop", id })}
                    onCasa={() =>
                      onTarget(
                        region === "veneto" ? { kind: "casa" } : { kind: "region", code: region },
                      )
                    }
                    onFree={() =>
                      region === "veneto"
                        ? onTarget({ kind: "free" })
                        : onTarget({ kind: "region", code: region })
                    }
                  />
                </div>
              </div>
            );
          })()}
        <Names p={p} />
        {/* The first fondaco stays itself when its workshops deploy: touched again, its Casa. */}
        <HomeMark p={p} name={houseName} onClick={() => touchPlace("home")} />
        {/* Venice is a town as the others, with its orders (the fondaco is no town). */}
        {map.cities.map((c) => (
          <CityMark
            key={c.code}
            p={p}
            code={c.code}
            at={[c.x, c.y]}
            region={c.region}
            size={c.size ?? 1}
            lit={lit.has(c.code)}
            wanted={wanted?.get(c.code)}
            dim={wanted !== null && !wanted.has(c.code)}
            hidden={underOrbit(c.x, c.y)}
            onClick={() => touchPlace(`city:${c.code}`)}
          />
        ))}
        {map.posts.map((x) => {
          const [px, py] = [x.x, x.y];
          return (
            <div key={x.id} data-at={`${px},${py}`} className="map-place" data-post={x.cell}>
              {/* A counter touched: its workshops deploy around it; touched again, its panel. */}
              <button
                type="button"
                onClick={() => touchPlace(x.id)}
                aria-label={t.world.postName[x.region] ?? t.placing.postCard}
                className="pointer-events-auto flex flex-col items-center gap-0.5 active:scale-95"
              >
                <span className="flex h-11 w-11 items-center justify-center [&_svg]:hidden">
                  {Icon.banner()}
                </span>
                <span className="map-name">{t.world.postName[x.region] ?? t.placing.postCard}</span>
              </button>
            </div>
          );
        })}
        {raised.map((r) => (
          <div
            key={r.key}
            className="map-pin pointer-events-none"
            style={{ left: r.x * base, top: r.y * base }}
            data-post-raised
          >
            <PostRaise />
          </div>
        ))}
        {map.sites.map((x) => {
          const [px, py] = cellCentre(x.cell);
          return (
            <div key={`s${x.cell}`} data-at={`${px},${py}`} className="map-pin" data-site={x.cell}>
              <span className="whitespace-nowrap rounded-full bg-night-3 px-2 py-0.5 font-display text-xs font-bold tabular-nums text-info ring-1 ring-info/70">
                {clock(x.endsAt - now)}
              </span>
            </div>
          );
        })}
        {/* The vehicles, standing in orbit or gliding from place to place (the hops). */}
        <Fleet
          p={p}
          now={now}
          base={base}
          selected={selected}
          onSelect={(id) => onTarget({ kind: "vehicle", id })}
          onMove={(id, place) => onMove?.(id, place)}
          onArrive={() => onArrive?.()}
          toChart={toChart}
          unitsPerPx={() => 1 / camera.cam().s}
        />
        {map.camp &&
          (() => {
            const [px, py] = cellCentre(map.camp);
            return (
              <div data-at={siteAt("camp", px, py + 7)} className="map-place">
                {/* The Campo touched: the Terraferma opens (1 November: it did nothing before). */}
                <button
                  type="button"
                  onClick={() => touchPlace("camp")}
                  data-camp-mark
                  aria-label={t.placing.campCard}
                  className="pointer-events-auto flex flex-col items-center gap-0.5 active:scale-95"
                >
                  <span className="flex h-11 w-11 items-center justify-center [&_svg]:hidden">
                    {Icon.troops()}
                  </span>
                  <span className="map-name">{t.placing.campCard}</span>
                </button>
              </div>
            );
          })()}
        {map.depot &&
          (() => {
            const [px, py] = cellCentre(map.depot);
            return (
              <div data-at={siteAt("depot", px - 9, py + 9)} className="map-place">
                <button
                  type="button"
                  onClick={() => touchPlace("depot")}
                  data-depot-mark
                  className="pointer-events-auto flex flex-col items-center gap-0.5 active:scale-95"
                >
                  <span className="flex h-11 w-11 items-center justify-center [&_svg]:hidden">
                    {Icon.cart()}
                  </span>
                  <span className="map-name">{t.scene.depot}</span>
                </button>
              </div>
            );
          })()}
        {p.view?.porta?.cell &&
          (() => {
            // The Porta: the gate to the lands of Rome (docs/plan-porta.md § 3).
            const [px, py] = cellCentre(p.view.porta.cell);
            return (
              <div data-at={siteAt("porta", px + 9, py - 9)} className="map-place">
                <button
                  type="button"
                  onClick={() => touchPlace("porta")}
                  data-porta-mark
                  className="pointer-events-auto flex flex-col items-center gap-0.5 active:scale-95"
                >
                  <span className="flex h-11 w-11 items-center justify-center [&_svg]:hidden">
                    {Icon.skirmish()}
                  </span>
                  <span className="map-name">{pt.porta}</span>
                </button>
              </div>
            );
          })()}
        {map.arsenal &&
          (() => {
            const [px, py] = cellCentre(map.arsenal);
            return (
              <div data-at={`${px},${py}`} className="map-pin">
                <button
                  type="button"
                  onClick={() => touchPlace("arsenal")}
                  data-arsenal-mark
                  className="pointer-events-auto flex flex-col items-center gap-0.5 active:scale-95"
                >
                  <span className="flex h-11 w-11 items-center justify-center rounded-full bg-night-3 text-info ring-2 ring-info/70 shadow-md shadow-black/50 [&_svg]:h-5 [&_svg]:w-5">
                    {Icon.anchor()}
                  </span>
                  <span className="map-name">{t.scene.arsenal}</span>
                </button>
              </div>
            );
          })()}
      </div>
    </div>
  );
});

/**
 * The chart itself, drawn at `base` (chart units × base = px): the ground, the dark over what is
 * not seen, the land cells seen, the roads, and while placing the cells lit. Memoized: it changes
 * with the house's map, not with the clock.
 */
const Chart = memo(function Chart({
  p,
  base,
  placing,
  picked,
  onPick,
  onSector,
  reachShown = null,
  ground,
}: {
  p: EmpirePayload;
  base: number;
  placing: Placing | null;
  picked: Picked | null;
  onPick?: (at: Picked) => void;
  /** A sector to buy touched (the sectors bought one by one). */
  onSector?: (cell: string) => void;
  /** The fondaco whose reach shows (« home », a post's id), or none. */
  reachShown?: string | null;
  /** The ground's point under a touch, on the 3D board (the camera's ray). */
  ground?: (clientX: number, clientY: number) => [number, number] | null;
}) {
  const view = p.view;
  if (!view) return null;
  const map = view.map;
  const seen = new Set(map.revealed);
  const lands = Object.entries(map.cells);
  const allowed = placing ? placeable(p, placing) : null;
  const preview = picked && placing?.kind === "post" ? cellsWithin(picked.cell, map.radius) : [];
  const placingFondaco = placing?.kind === "post" || placing?.kind === "home";
  // A touch on a lit cell: its point on the chart, where the counter goes (the map that grows).
  const pick = (cell: string, e: { clientX: number; clientY: number; currentTarget: Element }) => {
    // On the 3D board, the ray from the camera down to the ground (docs/plateau-reprise.md § 7).
    const g = e.clientX !== 0 ? ground?.(e.clientX, e.clientY) : null;
    if (g) {
      onPick?.(snapToTile(p, cell, Math.round(g[0]), Math.round(g[1])));
      return;
    }
    // The cell lies in the tilted ground: its own matrix gives the chart's point.
    const m = (e.currentTarget as SVGGraphicsElement).getScreenCTM?.()?.inverse();
    if (!m || e.clientX === 0) {
      const [x, y] = cellCentre(cell);
      onPick?.(snapToTile(p, cell, Math.round(x), Math.round(y)));
      return;
    }
    const pt = new DOMPoint(e.clientX, e.clientY).matrixTransform(m);
    onPick?.(snapToTile(p, cell, Math.round(pt.x), Math.round(pt.y)));
  };
  const reachBase = map.reach?.base ?? 0;
  const seatSeen = (code: string) => seen.has(seatCellOf(p, code));
  const shapes = MAP_3D
    ? null
    : board({
        cells: map.cells,
        revealed: map.revealed,
        unlocked: map.unlocked,
        cities: map.cities,
        home: map.home,
        posts: map.posts,
        depot: map.depot,
        camp: map.camp,
        porta: view.porta?.cell ?? null,
      });
  return (
    <svg
      viewBox={`0 0 ${CHART.w} ${CHART.h * TILT}`}
      width={CHART.w * base}
      height={CHART.h * TILT * base}
      className="block"
      aria-hidden="true"
    >
      {/* The board: a thick tile per sector seen, its dressing, its towns and buildings (drawn
          in 3D under the map when it is, docs/plateau-reprise.md § 7). */}
      {shapes && <PlateauShapes shapes={shapes} />}
      <g transform={`scale(1 ${TILT})`}>
        {ROUTES.filter((r) => seatSeen(r.from) && seatSeen(r.to)).map((r) => {
          const lit =
            (view.regions.find((x) => x.code === r.from)?.counter ?? 0) > 0 &&
            (view.regions.find((x) => x.code === r.to)?.counter ?? 0) > 0;
          return (
            <path
              key={`${r.from}:${r.to}`}
              d={pathOf(routeBetween(r.from, r.to))}
              fill="none"
              stroke={r.sea ? P.info : P.cream}
              strokeOpacity={lit ? 0.75 : 0.3}
              strokeWidth={lit ? 2 : 1.4}
              strokeDasharray={r.sea ? "6 5" : "2 5"}
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
            />
          );
        })}
        {/* The sectors to buy next to one's own: a dashed gold edge, a touch to buy. */}
        {!placing && (map.buyable ?? []).length > 0 && (
          <g data-buyable-cells>
            {map.buyable.map((b) => (
              <path
                key={`b${b.cell}`}
                d={hexPath(b.cell, 1.6)}
                fill={P.gold}
                fillOpacity={MAP_3D ? 0 : view.house.casa >= b.casa ? 0.06 : 0.02}
                stroke={P.gold}
                strokeOpacity={MAP_3D ? 0 : view.house.casa >= b.casa ? 0.75 : 0.3}
                strokeWidth="1.4"
                strokeDasharray="4 3"
                vectorEffect="non-scaling-stroke"
                style={{ pointerEvents: "all", cursor: "pointer" }}
                data-buyable={b.cell}
                onClick={() => onSector?.(b.cell)}
                onKeyDown={(e) => e.key === "Enter" && onSector?.(b.cell)}
              />
            ))}
          </g>
        )}
        {/* Placing: the cells it may go on, lit; the one picked, and what it would reveal. */}
        {allowed && (
          <g data-placing-cells>
            {preview.map((cell) => (
              <path
                key={`r${cell}`}
                d={hexPath(cell, 0.8)}
                fill={P.gold}
                fillOpacity="0.08"
                stroke={P.gold}
                strokeOpacity="0.5"
                strokeDasharray="2 2"
                strokeWidth="1"
                vectorEffect="non-scaling-stroke"
              />
            ))}
            {allowed.map((cell) => (
              <path
                key={cell}
                d={hexPath(cell, 1)}
                fill={cell === picked?.cell ? P.gold : P.info}
                fillOpacity={cell === picked?.cell ? 0.25 : 0.14}
                stroke={cell === picked?.cell ? P.gold : P.info}
                strokeWidth={cell === picked?.cell ? 2.4 : 1.4}
                vectorEffect="non-scaling-stroke"
                style={{ pointerEvents: "all", cursor: "pointer" }}
                data-cell={cell}
                onClick={(e) => pick(cell, e)}
                onKeyDown={(e) =>
                  e.key === "Enter" &&
                  pick(cell, { clientX: 0, clientY: 0, currentTarget: e.currentTarget })
                }
              />
            ))}
            {/* The point picked, and the reach the counter would have there. */}
            {picked && placingFondaco && reachBase > 0 && (
              <g data-picked-reach style={{ pointerEvents: "none" }}>
                <circle
                  cx={picked.x}
                  cy={picked.y}
                  r={reachBase}
                  fill={P.gold}
                  fillOpacity="0.1"
                  stroke={P.gold}
                  strokeWidth="1.6"
                  strokeDasharray="4 3"
                  vectorEffect="non-scaling-stroke"
                />
                <circle cx={picked.x} cy={picked.y} r="1.6" fill={P.gold} />
              </g>
            )}
          </g>
        )}
        {/* A fondaco's reach, when touched or its vehicle chosen: the cities inside are its to serve. */}
        {reachBase > 0 && reachShown && (
          <g data-reach style={{ pointerEvents: "none" }}>
            {[{ id: "home", ...map.home }, ...map.posts]
              .filter((x) => x.id === reachShown)
              .map((x) => (
                <circle
                  key={x.id}
                  cx={x.x}
                  cy={x.y}
                  r={x.reach}
                  fill={P.gold}
                  fillOpacity="0.05"
                  stroke={P.gold}
                  strokeOpacity="0.55"
                  strokeWidth="1.2"
                  strokeDasharray="3 3"
                  vectorEffect="non-scaling-stroke"
                  data-reach-of={x.id}
                />
              ))}
          </g>
        )}
      </g>
    </svg>
  );
});

/** Each region named once, over the middle of its cells seen, the same size at every zoom. */
function Names({ p }: { p: EmpirePayload }) {
  const lands = Object.entries(p.view?.map.cells ?? {});
  const byRegion = lands.reduce<Record<string, [number, number][]>>((acc, [cell, c]) => {
    const list = acc[c.region] ?? [];
    list.push(cellCentre(cell));
    acc[c.region] = list;
    return acc;
  }, {});
  return (
    <>
      {Object.entries(byRegion)
        .filter(([region]) => region !== "veneto")
        .map(([region, pts]) => {
          const x = pts.reduce((n, q) => n + q[0], 0) / pts.length;
          const y = pts.reduce((n, q) => n + q[1], 0) / pts.length - 9;
          return (
            <div key={region} data-at={`${x},${y}`} className="map-pin" aria-hidden="true">
              <span className="whitespace-nowrap font-place text-xs font-bold uppercase tracking-[0.2em] text-[#BFE3FF]/50">
                {regionName(region)}
              </span>
            </div>
          );
        })}
    </>
  );
}

/** The seat of a region on the map: its first city's cell, Venice for Venetia. */
function seatCellOf(p: EmpirePayload, region: string): string {
  return p.view?.map.cities.find((c) => c.region === region)?.cell ?? "";
}

/** Each region's colour on the map: its sectors' wash and its cities' globes. */
const REGION_TINT: Record<string, string> = {
  veneto: "#E8B24C",
  lombardia: "#7DB596",
  friuli: "#6EC8F5",
  romagna: "#C98E52",
  dalmazia: "#4C8366",
  germania: "#93B95C",
  grecia: "#F6E8CC",
  levante: "#E36A4A",
  costantinopoli: "#8E6BD8",
  fiandra: "#A6A3B5",
};
const tintOf = (region: string) => REGION_TINT[region] ?? "#BFE3FF";

/** A point picked to put something on: its cell, and where on the chart. */
export type Picked = { cell: string; x: number; y: number };

/** Venice's own counter on the chart. */
function homeAt(p: EmpirePayload): [number, number] {
  const h = p.view?.map.home;
  return h ? [h.x, h.y] : seatOf("veneto");
}

/**
 * The house's first fondaco on the map: its gold sun, its Casa written in it, the house's name
 * under it; no town (decision of the owner, 1 November 2026): Venice has its own bubble and its
 * orders. Touched, its workshops deploy.
 */
/**
 * A counter put down or raised (after Hades' Star's upgrades, in the Lagune: an arc, never a
 * bar): its ring fills with gold, then a short burst and a gold wave.
 */
function PostRaise() {
  const r = 30;
  const round = 2 * Math.PI * r;
  return (
    <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
      <svg
        width={72}
        height={72}
        viewBox="0 0 72 72"
        className="post-fill block"
        aria-hidden="true"
      >
        <circle
          cx={36}
          cy={36}
          r={r}
          fill="none"
          stroke="rgb(var(--gold))"
          strokeWidth={4}
          strokeLinecap="round"
          strokeDasharray={round}
          transform="rotate(-90 36 36)"
          style={{ "--round": `${round}` } as React.CSSProperties}
        />
      </svg>
      <span className="post-burst absolute inset-0 rounded-full bg-gold/60" />
      <span className="post-wave absolute inset-0 rounded-full ring-2 ring-gold" />
    </span>
  );
}

function HomeMark({
  p,
  name,
  onClick,
}: {
  p: EmpirePayload;
  name: string;
  onClick: () => void;
}) {
  const [x, y] = homeAt(p);
  const label = t.world.homeName(name);
  return (
    <div data-at={`${x},${y}`} data-home className="map-place">
      <button
        type="button"
        onClick={onClick}
        data-region="veneto"
        aria-label={label}
        className="pointer-events-auto flex flex-col items-center gap-0.5 active:scale-95"
      >
        {/* The fondaco stands on the board (art/plateau): here, its touch. */}
        <span className="block h-16 w-16" data-casa={p.view?.house.casa ?? 1} />
        <span className="map-name">{label}</span>
      </button>
    </div>
  );
}

/**
 * A city found on the map, a globe at its real place in its sector (as the example's planets):
 * its region's colour, a ring of lagoon where the house trades, of gold where a counter would
 * open it; its region's best paid good on it.
 */
function CityMark({
  p,
  code,
  at,
  region,
  size,
  hidden,
  lit,
  wanted,
  dim = false,
  onClick,
}: {
  p: EmpirePayload;
  code: string;
  at: [number, number];
  region: string;
  /** 1 (a market town) to 5 (a capital): its bubble's size. */
  size: number;
  hidden: boolean;
  /** Within the reach of the vehicle making a round: lit to be loaded. */
  lit: boolean;
  /** The units the vehicle chosen would bring it: its bubble shines (after Hades' Star). */
  wanted?: number;
  /** A vehicle is chosen and would bring it nothing: it steps back. */
  dim?: boolean;
  onClick: () => void;
}) {
  const map = p.view?.map;
  const r = p.view?.regions.find((x) => x.code === region);
  // Served when a counter has it in reach (the map that grows), else where the region is open.
  const open = map?.reach ? map.covered.includes(code) : (r?.counter ?? 0) > 0;
  const orders = p.view?.orders.find((x) => x.city === code);
  const best = open && !orders ? bestQuote(p, region) : null;
  const [x, y] = at;
  // The bubble grows with the town (after Hades' Star's planets); its ring, how full it is of
  // orders (full: none new until one is loaded); its badge, the orders waiting.
  const px = 30 + 6 * Math.min(5, Math.max(1, size));
  const ring = px + 10;
  const r0 = ring / 2 - 2.5;
  const round = 2 * Math.PI * r0;
  const fill = orders ? orders.fillBps / 10_000 : 0;
  const waiting = orders?.orders.length ?? 0;
  return (
    <div
      data-at={`${x},${y}`}
      className={`map-place transition-opacity duration-[var(--t-base)] ${hidden ? "pointer-events-none opacity-0" : dim ? "opacity-50" : ""}`}
      data-wanted={wanted ?? undefined}
    >
      <button
        type="button"
        onClick={onClick}
        data-city={code}
        data-city-region={region}
        data-look={open ? "open" : "reachable"}
        data-size={size}
        data-fill={orders ? orders.fillBps : undefined}
        data-tour-target={lit ? "" : undefined}
        aria-label={t.cityNames[code] ?? code}
        className="pointer-events-auto flex flex-col items-center gap-0.5 active:scale-95"
      >
        <span
          className="relative flex items-center justify-center"
          style={{ width: ring, height: ring }}
        >
          {orders && !MAP_3D && (
            <svg
              className="absolute inset-0"
              width={ring}
              height={ring}
              viewBox={`0 0 ${ring} ${ring}`}
              aria-hidden="true"
              data-fill-ring
              data-full={fill >= 1 ? "" : undefined}
              style={{ transform: `translateY(${ring * 0.22}px) scaleY(${TILT})` }}
            >
              <circle
                cx={ring / 2}
                cy={ring / 2}
                r={r0}
                fill={fill >= 1 ? "rgb(244 197 84 / 0.14)" : "rgb(110 224 184 / 0.12)"}
                stroke="rgb(14 26 43 / 0.45)"
                strokeWidth="5"
              />
              <circle
                cx={ring / 2}
                cy={ring / 2}
                r={r0}
                fill="none"
                stroke={fill >= 1 ? "#F2C24F" : "#6EE0B8"}
                strokeWidth="4"
                strokeLinecap="round"
                strokeDasharray={`${round * fill} ${round}`}
                transform={`rotate(-90 ${ring / 2} ${ring / 2})`}
                className="transition-[stroke-dasharray] duration-700"
              />
            </svg>
          )}
          <span
            className={`relative flex items-center justify-center rounded-full ${lit || wanted !== undefined ? "ring-4 ring-gold" : ""}`}
            style={{ width: px, height: px }}
          >
            {wanted !== undefined && <WantedHalo n={wanted} />}
            {best && (
              <span className="rounded-full bg-night/70 p-0.5">
                <GoodsMark code={best} size={18} />
              </span>
            )}
          </span>
        </span>
        <span className="map-name">{t.cityNames[code] ?? code}</span>
        {/* The information layer: its orders on its cap, however far. */}
        {orders && (
          <span className="info-only rounded-full bg-night/85 px-1.5 font-display text-xs font-bold tabular-nums text-gold ring-1 ring-gold/60">
            {t.orders.infoCount(waiting, orders.cap)}
          </span>
        )}
      </button>
    </div>
  );
}

/**
 * A city the vehicle chosen would serve (after Hades' Star: the destinations of a ship's cargo
 * shine): a gold halo that breathes around its bubble, and what it would bring there.
 */
function WantedHalo({ n }: { n: number }) {
  return (
    <>
      <span
        className="city-wanted pointer-events-none absolute -inset-2 rounded-full ring-2 ring-gold"
        aria-hidden="true"
      />
      <span
        className="pointer-events-none absolute -bottom-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-gold px-1.5 font-display text-xs font-bold leading-4 text-ink ring-2 ring-night"
        data-wanted-badge
      >
        +{n}
      </span>
    </>
  );
}
