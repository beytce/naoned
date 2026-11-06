/**
 * Porcellana's board (docs/plan-porcellana.md § 1), shared by the laboratory, the Porta's place and
 * the arms (docs/plan-porta-porcellana.md): square tiles in the shape given, falling into place
 * along the diagonal, the red roads drawing themselves, the chosen place lifted with its ring and
 * its blush, the pins and the card following the scene. A board is a spec (its rows, what stands on
 * each tile, its roads); what is chosen, marked, aimed at and how much room the dock takes are told
 * through `sh`, read at each frame.
 */
import { type ThreeEvent, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import {
  CanvasTexture,
  Group,
  MOUSE,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  type OrthographicCamera,
  RepeatWrapping,
  RingGeometry,
  SRGBColorSpace,
  TOUCH,
  Vector3,
} from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import type { PlaceCardHandle, PlaceCardInfo } from "./PlaceCard.js";
import { Stage } from "./Stage.js";
import { easeOutCubic, lifeOut, pinOut, routesDrawn, tileDelay, tileDrop } from "./arrival.js";
import { bake } from "./bake.js";
import { type Palette, createPalette } from "./materials.js";
import { slab } from "./models/ground.js";
import type { Built, ModelOpts } from "./models/model.js";
import { type Vehicle, cart, ship } from "./models/vehicles.js";
import { drawChevron, drawnIndices, ribbonGeometry, roundedPath, seaDashes } from "./ribbon.js";
import { Blush } from "./selection.js";
import { box } from "./shapes.js";
import { BISCUIT, BOARD, CAMERA, RIBBON, SELECT } from "./tokens.js";

const S = BOARD.tile + BOARD.gap;

// One palette for every model of a laboratory's board (the blush clones it while chosen).
let labPalette: Palette | null = null;
let labBiscuit: Palette | null = null;
export function palette(biscuit = false): Palette {
  if (biscuit) {
    labBiscuit ??= createPalette({ biscuit: true });
    return labBiscuit;
  }
  labPalette ??= createPalette();
  return labPalette;
}

export interface Place {
  id: string;
  label: string;
  plus?: boolean;
  info: PlaceCardInfo;
}

/** A cell of a laboratory's board. */
export interface Cell {
  water?: boolean;
  /** A tile of the lands of Rome, in biscuit (the Porta's proposal). */
  rome?: boolean;
  make?: (o: ModelOpts) => Built;
  vehicle?: (o: ModelOpts) => Vehicle;
  place?: Place;
}

export interface Spec {
  rows: string[][];
  /** The lands of Rome: the board in biscuit, the background too. */
  biscuit?: boolean;
  /** No cart along the roads (a battle's march). */
  noCarts?: boolean;
  /** A cell's content; null where there is no tile (the board has the shape it has). */
  cell(key: string, i: number, j: number): Cell | null;
  /** The roads in tile coordinates, each from where the goods leave to where they go. */
  routes?: [number, number][][];
  /** The sea roads, dashed, a ship going along each. */
  sea?: [number, number][][];
  viewH(aspect: number): number;
  families?: boolean;
}

interface Tile {
  group: Group;
  delay: number;
  built?: Built;
  vehicle?: Vehicle;
  place?: Place;
  lift: number;
}

export interface Shared {
  chosen: string | null;
  hover: string | null;
  running: boolean;
  goTo: [number, number] | null;
  pins: Map<string, HTMLButtonElement>;
  card: PlaceCardHandle | null;
  target: Vector3;
  /** Places lifted besides the chosen one (a tier and the crew picked at the Porta). */
  marked?: Set<string>;
  /** The zoom the camera takes on `goTo` (1.6 by default). */
  goZoom?: number;
  /** The room a dock takes at the foot of the screen, in pixels: what is aimed at stands above it. */
  inset?: number;
  /** The room a dock takes on the right (a computer), in pixels: what is aimed at stands left of it. */
  insetRight?: number;
}

const PHONE = () => window.innerWidth < 640;

export function TileBoard({
  spec,
  sh,
  onPick,
}: { spec: Spec; sh: Shared; onPick: (id: string | null) => void }) {
  const { camera, gl, size } = useThree();
  const live = useMemo(() => !window.matchMedia?.("(prefers-reduced-motion: reduce)").matches, []);
  const P = palette(spec.biscuit);
  const blush = useMemo(() => new Blush(P), [P]);
  const cols = Math.max(...spec.rows.map((r) => r.length));
  const rows = spec.rows.length;
  const wx = (i: number) => (i - (cols - 1) / 2) * S;
  const wz = (j: number) => (j - (rows - 1) / 2) * S;

  // biome-ignore lint/correctness/useExhaustiveDependencies: the board is built once for its spec.
  const board = useMemo(() => {
    const tiles: Tile[] = [];
    const opts: ModelOpts[] = [];
    const root = new Group();
    const curves = (spec.routes ?? []).map((r) =>
      roundedPath(r.map(([i, j]) => new Vector3(wx(i), RIBBON.lift, wz(j)))),
    );
    const samples = curves.flatMap((cv) => cv.getSpacedPoints(Math.ceil(cv.getLength() / 0.5)));
    for (let j = 0; j < rows; j++)
      for (let i = 0; i < cols; i++) {
        const key = spec.rows[j]?.[i] ?? "";
        const cell = spec.cell(key, i, j);
        if (!cell) continue;
        const g = new Group();
        g.position.set(wx(i), 0, wz(j));
        g.add(slab(cell.rome ? palette(true) : P, !!cell.water));
        // The dressing keeps off the roads that cross the tile.
        const keepOff = (x: number, z: number) =>
          samples.some((p) => (p.x - wx(i) - x) ** 2 + (p.z - wz(j) - z) ** 2 < 1.15 * 1.15);
        const o: ModelOpts = { seed: i * 31 + j * 17, running: sh.running, keepOff };
        opts.push(o);
        const built = cell.make?.(o);
        if (built) g.add(built.group);
        root.add(g);
        bake(g);
        const vehicle = cell.vehicle?.(o);
        if (vehicle) {
          vehicle.group.scale.setScalar(2);
          vehicle.group.position.y = cell.water ? BOARD.waterY - 0.5 : 0;
          vehicle.group.rotation.y = 0.5;
          g.add(vehicle.group);
        }
        tiles.push({
          group: g,
          delay: tileDelay(i, j, !!cell.water),
          built,
          vehicle,
          place: cell.place,
          lift: 0,
        });
      }
    const roads: {
      ribbon: Mesh;
      route: ReturnType<typeof roundedPath>;
      cart: Vehicle;
      off: number;
    }[] = [];
    const tex = (() => {
      const canvas = document.createElement("canvas");
      canvas.width = 128;
      canvas.height = 64;
      const ctx = canvas.getContext("2d");
      if (ctx) drawChevron(ctx, `#${P.accentColour.getHexString()}`);
      const tex = new CanvasTexture(canvas);
      tex.wrapS = RepeatWrapping;
      tex.colorSpace = SRGBColorSpace;
      tex.anisotropy = 8;
      return tex;
    })();
    const ribbonMat = new MeshStandardMaterial({
      map: tex,
      roughness: 0.7,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    });
    curves.forEach((route, k) => {
      const ribbon = new Mesh(ribbonGeometry(route), ribbonMat);
      ribbon.receiveShadow = true;
      root.add(ribbon);
      const c = cart(P, { seed: k, running: true });
      if (!spec.noCarts) root.add(c.group);
      roads.push({ ribbon, route, cart: c, off: k * 0.37 });
    });
    // The sea roads: dashes of accent on the water, a ship along each.
    const seas = (spec.sea ?? []).map((r, k) => {
      const route = roundedPath(
        r.map(([i, j]) => new Vector3(wx(i), BOARD.waterY + 0.02, wz(j))),
        1.4,
      );
      for (const d of seaDashes(route)) {
        const m = box(root, 0.42, 0.03, 0.12, d.p.x, d.p.y - 0.015, d.p.z, P.accent, 0.01);
        m.rotation.y = d.angle;
        m.castShadow = false;
      }
      const sh2 = ship(P, { seed: k, running: true });
      sh2.group.scale.setScalar(0.95);
      root.add(sh2.group);
      return { route, ship: sh2 };
    });
    const ring = new Mesh(
      new RingGeometry(SELECT.ring[0], SELECT.ring[1], 72),
      new MeshBasicMaterial({
        color: P.accentColour,
        transparent: true,
        opacity: 0,
        toneMapped: false,
      }),
    );
    ring.rotation.x = -Math.PI / 2;
    ring.renderOrder = 2;
    root.add(ring);
    return { root, tiles, opts, roads, seas, tex, ring };
  }, [P, spec]);

  useEffect(() => {
    const cam = camera as OrthographicCamera;
    const aspect = size.width / size.height;
    const vh = spec.viewH(aspect);
    cam.left = (-vh * aspect) / 2;
    cam.right = (vh * aspect) / 2;
    cam.top = vh / 2;
    cam.bottom = -vh / 2;
    cam.near = 0.1;
    cam.far = 500;
    cam.updateProjectionMatrix();
  }, [camera, size.width, size.height, spec]);

  const controls = useMemo(() => {
    const home = new Vector3(0, 0, 0);
    const { azimuth: az, elevation: el, distance: d } = CAMERA;
    camera.position.set(
      home.x + Math.sin(az) * Math.cos(el) * d,
      Math.sin(el) * d,
      home.z + Math.cos(az) * Math.cos(el) * d,
    );
    camera.lookAt(home);
    const c = new OrbitControls(camera, gl.domElement);
    c.target.copy(home);
    c.enableDamping = true;
    c.dampingFactor = CAMERA.damping;
    c.screenSpacePanning = false;
    c.minZoom = CAMERA.minZoom;
    c.maxZoom = CAMERA.maxZoom;
    c.minPolarAngle = CAMERA.minPolar;
    c.maxPolarAngle = CAMERA.maxPolar;
    c.minAzimuthAngle = az - CAMERA.turn;
    c.maxAzimuthAngle = az + CAMERA.turn;
    c.mouseButtons = { LEFT: MOUSE.PAN, MIDDLE: MOUSE.DOLLY, RIGHT: MOUSE.ROTATE };
    c.touches = { ONE: TOUCH.PAN, TWO: TOUCH.DOLLY_ROTATE };
    return c;
  }, [camera, gl]);
  useEffect(() => () => controls.dispose(), [controls]);

  const fly = useRef({ from: new Vector3(), to: new Vector3(), z0: 1, z1: 1, t: 1, last: "" });
  const clock = useRef({ t: live ? 0 : 10, life: 0 });
  const tmp = useMemo(() => new Vector3(), []);

  useFrame((_, rawDt) => {
    const dt = Math.min(0.05, rawDt);
    const c = clock.current;
    c.t += dt;
    if (live) c.life += dt;
    const cam = camera as OrthographicCamera;
    const chosenTile = board.tiles.find((t) => t.place?.id === sh.chosen) ?? null;
    for (const o of board.opts) o.running = sh.running;

    // The camera glides toward what is chosen (or a family's row), and back.
    const f = fly.current;
    const want = `${sh.chosen ?? ""}|${sh.goTo?.join(",") ?? ""}|${sh.goZoom ?? ""}|${Math.round(sh.inset ?? 0)}|${Math.round(sh.insetRight ?? 0)}|${size.width}x${size.height}`;
    if (want !== f.last) {
      f.last = want;
      f.from.copy(controls.target);
      if (chosenTile) f.to.copy(chosenTile.group.position);
      else if (sh.goTo) f.to.set(wx(sh.goTo[0]), 0, wz(sh.goTo[1]));
      else f.to.set(0, 0, 0);
      f.to.y = 0;
      f.z0 = cam.zoom;
      f.z1 = chosenTile
        ? PHONE()
          ? SELECT.zoomPhone
          : SELECT.zoomDesk
        : sh.goTo
          ? (sh.goZoom ?? 1.6)
          : 1;
      // Above the dock: the point aimed at in the middle of the room left, not of the screen.
      const unitsPerPx = (cam.top - cam.bottom) / f.z1 / size.height;
      if (sh.inset) {
        const d = ((sh.inset / 2) * unitsPerPx) / Math.sin(CAMERA.elevation);
        f.to.x += Math.sin(CAMERA.azimuth) * d;
        f.to.z += Math.cos(CAMERA.azimuth) * d;
      }
      if (sh.insetRight) {
        const d = (sh.insetRight / 2) * unitsPerPx;
        f.to.x += Math.cos(CAMERA.azimuth) * d;
        f.to.z -= Math.sin(CAMERA.azimuth) * d;
      }
      f.t = live ? 0 : 1;
      if (!live) {
        camera.position.add(f.to.clone().sub(controls.target));
        controls.target.copy(f.to);
        cam.zoom = f.z1;
        cam.updateProjectionMatrix();
      }
    }
    if (f.t < 1) {
      f.t = Math.min(1, f.t + dt / SELECT.fly);
      const k = easeOutCubic(f.t);
      const next = f.from.clone().lerp(f.to, k);
      camera.position.add(next.clone().sub(controls.target));
      controls.target.copy(next);
      cam.zoom = f.z0 + (f.z1 - f.z0) * k;
      cam.updateProjectionMatrix();
    }
    controls.update();
    sh.target.copy(controls.target);

    // The tiles drop in, the chosen one lifts; what works, works.
    for (const t of board.tiles) {
      const drop = tileDrop(c.t, t.delay);
      const lift = chosenTile === t || (t.place && sh.marked?.has(t.place.id)) ? SELECT.lift : 0;
      t.lift += (lift - t.lift) * (live ? SELECT.liftEase : 1);
      t.group.position.y = drop.y + t.lift;
      t.group.visible = drop.visible;
      t.built?.tick?.(c.life, live ? dt : 0);
      t.vehicle?.tick(c.life);
      if (t.built?.plus) {
        const on = sh.hover === t.place?.id || sh.chosen === t.place?.id;
        t.built.plus.position.y += ((on ? 0.12 : 0) - t.built.plus.position.y) * 0.15;
      }
    }
    // The roads draw themselves, then their chevrons run, then the carts go.
    const drawn = routesDrawn(c.t);
    if (live) board.tex.offset.x -= dt * RIBBON.speed;
    for (const road of board.roads) {
      const idx = road.ribbon.geometry.index?.count ?? 0;
      road.ribbon.geometry.setDrawRange(0, drawnIndices(idx, drawn));
      const u = (c.life * (1.3 / road.route.getLength()) + road.off) % 1;
      const p = road.route.getPointAt(u);
      const d = road.route.getTangentAt(u);
      road.cart.group.position.set(p.x, 0.02, p.z);
      road.cart.group.rotation.y = Math.atan2(-d.z, d.x);
      road.cart.tick(c.life);
      const out = drawn > 0.99 && lifeOut(c.t) && sh.running ? 1 : 0;
      road.cart.group.scale.setScalar(Math.max(0.001, Math.min(1, u * 12, (1 - u) * 12) * out));
    }
    // The ships go to and fro, waiting at each end.
    for (const sea of board.seas) {
      const ph = (c.life % 22) / 22;
      const there =
        ph < 0.2
          ? 0
          : ph < 0.5
            ? easeOutCubic((ph - 0.2) / 0.3)
            : ph < 0.7
              ? 1
              : 1 - easeOutCubic((ph - 0.7) / 0.3);
      const back = ph >= 0.5;
      const p = sea.route.getPointAt(there);
      const d = sea.route.getTangentAt(there).multiplyScalar(back ? -1 : 1);
      sea.ship.group.position.set(p.x, BOARD.waterY - 0.26 + Math.sin(c.life * 1.6) * 0.04, p.z);
      sea.ship.group.rotation.y = Math.atan2(-d.z, d.x);
      sea.ship.tick(c.life);
      sea.ship.group.visible = lifeOut(c.t);
    }

    // The ring and the blush.
    const ring = board.ring;
    const ringMat = ring.material as MeshBasicMaterial;
    // Without a place chosen, the first marked one takes the ring and the blush.
    const ringed =
      chosenTile ??
      (sh.marked?.size
        ? (board.tiles.find((x) => x.place && sh.marked?.has(x.place.id)) ?? null)
        : null);
    if (ringed) {
      const at = ringed.group.position;
      ring.position.set(at.x, at.y + 0.035, at.z);
      ringMat.opacity += (SELECT.ringOpacity - ringMat.opacity) * 0.1;
    } else ringMat.opacity += (0 - ringMat.opacity) * 0.15;
    ring.visible = ringMat.opacity > 0.01;
    blush.update(ringed?.group ?? null, live);

    // The pins and the card follow the scene.
    const w = size.width;
    const h = size.height;
    for (const t of board.tiles) {
      if (!t.place) continue;
      const el = sh.pins.get(t.place.id);
      if (!el) continue;
      const pin = t.built?.pin ?? [0, 2, 0];
      tmp
        .set(...pin)
        .add(t.group.position)
        .project(camera);
      const x = (tmp.x * 0.5 + 0.5) * w;
      const y = (-tmp.y * 0.5 + 0.5) * h;
      el.style.transform = `translate(${x.toFixed(1)}px,${y.toFixed(1)}px)`;
      const out =
        pinOut(c.t, t.delay) && !(t.place.plus && cam.zoom < 1.25 && sh.chosen !== t.place.id);
      el.dataset.out = String(out);
      if (t.place.id === sh.chosen) sh.card?.place(x, y, w, h);
    }
  });

  const tileOf = (e: ThreeEvent<PointerEvent | MouseEvent>) => {
    for (let o: typeof e.object | null = e.object; o; o = o.parent) {
      const t = board.tiles.find((x) => x.group === o);
      if (t) return t;
    }
    return null;
  };
  return (
    <>
      <Stage
        target={sh.target}
        phone={PHONE()}
        background={spec.biscuit ? BISCUIT.bg : undefined}
      />
      {/* biome-ignore lint/a11y/useKeyWithClickEvents: the keyboard reaches each place by its pin, a button. */}
      <primitive
        object={board.root}
        onClick={(e: ThreeEvent<MouseEvent>) => {
          if (e.delta > 6) return;
          e.stopPropagation();
          onPick(tileOf(e)?.place?.id ?? null);
        }}
        onPointerMove={(e: ThreeEvent<PointerEvent>) => {
          const id = tileOf(e)?.place?.id ?? null;
          sh.hover = id;
          gl.domElement.classList.toggle("pc-hot", !!id);
        }}
        onPointerOut={() => {
          sh.hover = null;
          gl.domElement.classList.remove("pc-hot");
        }}
      />
    </>
  );
}
