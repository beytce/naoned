/**
 * Porcellana's laboratory (?lab=porcellana, docs/plan-porcellana.md lots 1 and 2): the kit on a
 * board, with the arrival, the selection (lift, ring, blush) and the place card, to see each model
 * as the owner validated it before it goes on the map. Two views: the small board of the kit (a
 * Fondaco, the Market, a road of accent and its cart, the lagoon), and the catalogue (&vue=catalogue:
 * every model of the game, by family, working or idle). Its texts are examples.
 */
import "@fontsource/cormorant-garamond/600.css";
import "@fontsource/cormorant-garamond/700.css";
import "@fontsource/work-sans/400.css";
import "@fontsource/work-sans/500.css";
import "@fontsource/work-sans/600.css";
import "./porcellana.css";
import { Canvas, type ThreeEvent, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
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
import { PlaceCard, type PlaceCardHandle, type PlaceCardInfo } from "./PlaceCard.js";
import { Stage } from "./Stage.js";
import { easeOutCubic, lifeOut, pinOut, routesDrawn, tileDelay, tileDrop } from "./arrival.js";
import { bake } from "./bake.js";
import { CATALOGUE, FAMILIES, type Family } from "./catalogue.js";
import { type Palette, createPalette } from "./materials.js";
import { fondaco } from "./models/fondaco.js";
import { grove, plot, slab } from "./models/ground.js";
import { market } from "./models/market.js";
import type { Built, ModelOpts } from "./models/model.js";
import { type Vehicle, cart } from "./models/vehicles.js";
import { drawChevron, drawnIndices, ribbonGeometry, roundedPath } from "./ribbon.js";
import { Blush } from "./selection.js";
import { BOARD, CAMERA, RIBBON, SELECT } from "./tokens.js";

const S = BOARD.tile + BOARD.gap;

// One palette for every model of a laboratory's board (the blush clones it while chosen).
let labPalette: Palette | null = null;
function palette(): Palette {
  labPalette ??= createPalette();
  return labPalette;
}

interface Place {
  id: string;
  label: string;
  plus?: boolean;
  info: PlaceCardInfo;
}

/** A cell of a laboratory's board. */
interface Cell {
  water?: boolean;
  make?: (o: ModelOpts) => Built;
  vehicle?: (o: ModelOpts) => Vehicle;
  place?: Place;
}

interface Spec {
  rows: string[][];
  cell(key: string, i: number, j: number): Cell;
  /** A road in tile coordinates, from where the goods leave to where they go. */
  route?: [number, number][];
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

interface Shared {
  chosen: string | null;
  hover: string | null;
  running: boolean;
  goTo: [number, number] | null;
  pins: Map<string, HTMLButtonElement>;
  card: PlaceCardHandle | null;
  target: Vector3;
}

const PHONE = () => window.innerWidth < 640;

function Scene({
  spec,
  sh,
  onPick,
}: { spec: Spec; sh: Shared; onPick: (id: string | null) => void }) {
  const { camera, gl, size } = useThree();
  const live = useMemo(() => !window.matchMedia?.("(prefers-reduced-motion: reduce)").matches, []);
  const P = palette();
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
    for (let j = 0; j < rows; j++)
      for (let i = 0; i < cols; i++) {
        const key = spec.rows[j]?.[i] ?? "~";
        const cell = spec.cell(key, i, j);
        const g = new Group();
        g.position.set(wx(i), 0, wz(j));
        g.add(slab(P, !!cell.water));
        const o: ModelOpts = { seed: i * 31 + j * 17, running: sh.running };
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
    let road: {
      ribbon: Mesh;
      tex: CanvasTexture;
      route: ReturnType<typeof roundedPath>;
      cart: Vehicle;
    } | null = null;
    if (spec.route) {
      const route = roundedPath(spec.route.map(([i, j]) => new Vector3(wx(i), RIBBON.lift, wz(j))));
      const canvas = document.createElement("canvas");
      canvas.width = 128;
      canvas.height = 64;
      const ctx = canvas.getContext("2d");
      if (ctx) drawChevron(ctx, `#${P.accentColour.getHexString()}`);
      const tex = new CanvasTexture(canvas);
      tex.wrapS = RepeatWrapping;
      tex.colorSpace = SRGBColorSpace;
      tex.anisotropy = 8;
      const ribbon = new Mesh(
        ribbonGeometry(route),
        new MeshStandardMaterial({
          map: tex,
          roughness: 0.7,
          polygonOffset: true,
          polygonOffsetFactor: -2,
          polygonOffsetUnits: -2,
        }),
      );
      ribbon.receiveShadow = true;
      root.add(ribbon);
      const c = cart(P, { seed: 0, running: true });
      root.add(c.group);
      road = { ribbon, tex, route, cart: c };
    }
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
    return { root, tiles, opts, road, ring };
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
    const want = `${sh.chosen ?? ""}|${sh.goTo?.join(",") ?? ""}`;
    if (want !== f.last) {
      f.last = want;
      f.from.copy(controls.target);
      if (chosenTile) f.to.copy(chosenTile.group.position);
      else if (sh.goTo) f.to.set(wx(sh.goTo[0]), 0, wz(sh.goTo[1]));
      else f.to.set(0, 0, 0);
      f.to.y = 0;
      f.z0 = cam.zoom;
      f.z1 = chosenTile ? (PHONE() ? SELECT.zoomPhone : SELECT.zoomDesk) : sh.goTo ? 1.6 : 1;
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
      const lift = chosenTile === t ? SELECT.lift : 0;
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
    // The road draws itself, then its chevrons run, then the cart goes.
    const road = board.road;
    if (road) {
      const drawn = routesDrawn(c.t);
      const idx = road.ribbon.geometry.index?.count ?? 0;
      road.ribbon.geometry.setDrawRange(0, drawnIndices(idx, drawn));
      if (live) road.tex.offset.x -= dt * RIBBON.speed;
      const u = (c.life * (1.3 / road.route.getLength())) % 1;
      const p = road.route.getPointAt(u);
      const d = road.route.getTangentAt(u);
      road.cart.group.position.set(p.x, 0.02, p.z);
      road.cart.group.rotation.y = Math.atan2(-d.z, d.x);
      road.cart.tick(c.life);
      const out = drawn > 0.99 && lifeOut(c.t) ? 1 : 0;
      road.cart.group.scale.setScalar(Math.max(0.001, Math.min(1, u * 12, (1 - u) * 12) * out));
    }

    // The ring and the blush.
    const ring = board.ring;
    const ringMat = ring.material as MeshBasicMaterial;
    if (chosenTile) {
      const at = chosenTile.group.position;
      ring.position.set(at.x, at.y + 0.035, at.z);
      ringMat.opacity += (SELECT.ringOpacity - ringMat.opacity) * 0.1;
    } else ringMat.opacity += (0 - ringMat.opacity) * 0.15;
    ring.visible = ringMat.opacity > 0.01;
    blush.update(chosenTile?.group ?? null, live);

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
      <Stage target={sh.target} phone={PHONE()} />
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

/** The small board of the kit (lot 1). */
const KIT: Spec = {
  rows: ["TFzPT", "PzzMz", "~~~~~"].map((r) => [...r]),
  route: [
    [1, 0.38],
    [1, 1],
    [2.62, 1],
  ],
  viewH: (a) => (a >= 1 ? Math.max(28, 44 / a) : 30),
  cell(key, i, j) {
    const id = `${key}${i}${j}`;
    // The dressing keeps off the road (column 1 from the Fondaco down, row 1 to the Market).
    const offRoad = (x: number, z: number) =>
      (i === 1 && Math.abs(x) < 1.1) || (j === 1 && i > 0 && i < 3 && Math.abs(z) < 1.1);
    switch (key) {
      case "F":
        return {
          make: () => fondaco(palette()),
          place: {
            id,
            label: "1",
            info: {
              name: "Le Fondaco",
              sub: "Ton comptoir · Casa 3",
              line: "Tout converge ici : la route rouge y porte ce que tes ateliers produisent.",
              go: "Entrer au Fondaco",
            },
          },
        };
      case "M":
        return {
          make: () => market(palette()),
          place: {
            id,
            label: "2",
            info: {
              name: "San Marco",
              sub: "Le Marché · la Dogana",
              line: "Vendre et acheter au prix de Venise.",
              go: "Ouvrir la Dogana",
            },
          },
        };
      case "P":
        return {
          make: () => plot(palette()),
          place: {
            id,
            label: "+",
            plus: true,
            info: {
              name: "Parcelle libre",
              sub: "Case à acheter · 40 ducats",
              line: "Achète-la, puis bâtis-y un atelier.",
              go: "Acheter la case",
            },
          },
        };
      case "T":
        return { make: (o) => grove(palette(), o.seed, 9, undefined, offRoad) };
      case "z":
        return { make: (o) => grove(palette(), o.seed + 7, 4, ["round", "cypress"], offRoad) };
      default:
        return { water: true };
    }
  },
};

/** The catalogue (lot 2): every model, family by family. */
const CATALOGUE_ROWS = [
  ["lumber_camp", "sawmill", "mill", "farm", "glassworks", "clay_pit", "sand_pit"],
  ["brickworks", "palazzo", "field", "fondaco", "market", "campo", "porta"],
  ["arsenal", "post", "depot", "grove", "forest", "rocks", "mountain"],
  ["~", "ship", "~", "~", "gondola", "~", "~"],
  ["hamlet1", "hamlet2", "town3", "city4", "city5", "venice", "salute"],
  ["plot", "locked", "cart", "mule", "rider", ".", "."],
];
const BY_KEY = new Map(CATALOGUE.map((e, n) => [e.key, { e, n: n + 1 }]));

/** The first row of a family on the catalogue's board, its middle column. */
export function familyRow(f: Family): [number, number] {
  for (let j = 0; j < CATALOGUE_ROWS.length; j++)
    if ((CATALOGUE_ROWS[j] ?? []).some((k) => BY_KEY.get(k)?.e.family === f)) return [3, j];
  return [3, 0];
}

const CAT: Spec = {
  rows: CATALOGUE_ROWS,
  families: true,
  viewH: (a) => (a >= 1 ? Math.max(48, 82 / a) : 40),
  cell(key, i, j) {
    if (key === ".") return { make: (o) => grove(palette(), o.seed, 5) };
    const found = BY_KEY.get(key);
    if (!found) return { water: true };
    const { e, n } = found;
    const make = e.make;
    const vehicle = e.vehicle;
    return {
      water: !!vehicle && !!e.water,
      make: make ? (o) => make(palette(), o) : undefined,
      vehicle: vehicle ? (o) => vehicle(palette(), o) : undefined,
      place: {
        id: `${key}${i}${j}`,
        label: String(n),
        plus: key === "plot",
        info: { name: e.name, sub: e.sub, line: e.sign, go: `Ouvrir : ${e.name}` },
      },
    };
  },
};

export default function PorcellanaLab() {
  const view = new URLSearchParams(window.location.search).get("vue");
  const spec = view === "catalogue" ? CAT : KIT;
  const [chosen, setChosen] = useState<string | null>(null);
  const [running, setRunning] = useState(true);
  const [family, setFamily] = useState<Family | null>(null);
  const sh = useRef<Shared>({
    chosen: null,
    hover: null,
    running: true,
    goTo: null,
    pins: new Map(),
    card: null,
    target: new Vector3(),
  }).current;
  sh.chosen = chosen;
  sh.running = running;
  sh.goTo = family ? familyRow(family) : null;
  const places = useMemo(() => {
    const out: Place[] = [];
    spec.rows.forEach((row, j) => {
      row.forEach((key, i) => {
        const p = spec.cell(key, i, j).place;
        if (p) out.push(p);
      });
    });
    return out;
  }, [spec]);
  const current = places.find((p) => p.id === chosen);
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.key === "Escape") setChosen(null);
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, []);
  return (
    <div className="porcellana fixed inset-0" data-porcellana-lab>
      <Canvas
        orthographic
        dpr={[1, 2]}
        gl={{ antialias: true, powerPreference: "high-performance" }}
        onCreated={({ camera }) => {
          (camera as OrthographicCamera & { manual?: boolean }).manual = true;
        }}
        onPointerMissed={() => setChosen(null)}
      >
        <Scene spec={spec} sh={sh} onPick={setChosen} />
      </Canvas>
      <div className="pc-vignette" />
      <div className="pc-pins">
        {places.map((p) => (
          <button
            key={p.id}
            type="button"
            className="pc-pin"
            data-on={String(p.id === chosen)}
            data-plus={String(!!p.plus)}
            data-out="false"
            aria-label={p.info.name}
            ref={(el) => {
              if (el) sh.pins.set(p.id, el);
              else sh.pins.delete(p.id);
            }}
            onClick={() => setChosen(p.id)}
          >
            {p.label}
          </button>
        ))}
      </div>
      <nav className="pc-tools pc-pill" aria-label="Laboratoire">
        <a className="pc-tool" href="?lab=porcellana" aria-current={view !== "catalogue"}>
          Plateau
        </a>
        <a
          className="pc-tool"
          href="?lab=porcellana&vue=catalogue"
          aria-current={view === "catalogue"}
        >
          Catalogue
        </a>
        <button
          type="button"
          className="pc-tool"
          aria-pressed={running}
          onClick={() => setRunning((r) => !r)}
        >
          {running ? "En marche" : "À l'arrêt"}
        </button>
      </nav>
      {spec.families ? (
        <div className="pc-strip-wrap">
          <div className="pc-strip pc-pill">
            {FAMILIES.map((f) => (
              <button
                key={f.key}
                type="button"
                className="pc-chip"
                aria-pressed={family === f.key}
                onClick={() => {
                  setChosen(null);
                  setFamily((x) => (x === f.key ? null : f.key));
                }}
              >
                {f.name}
              </button>
            ))}
          </div>
        </div>
      ) : null}
      {current ? (
        <PlaceCard
          ref={(h) => {
            sh.card = h;
          }}
          info={current.info}
          onGo={() => {}}
          onClose={() => setChosen(null)}
        />
      ) : null}
    </div>
  );
}
