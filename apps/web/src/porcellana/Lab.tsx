/**
 * Porcellana's laboratory (?lab=porcellana, docs/plan-porcellana.md lot 1): the kit on a small
 * board — the Fondaco, the Market (San Marco), groves, a « + » plot, a road of accent with its cart,
 * the lagoon — with the arrival, the selection (lift, ring, blush) and the place card, to see each
 * model as the owner validated it before it goes on the map. Its texts are examples.
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
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  type OrthographicCamera,
  RepeatWrapping,
  RingGeometry,
  SRGBColorSpace,
  Vector3,
} from "three";
import { MOUSE, TOUCH } from "three";
import { CylinderGeometry } from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { PlaceCard, type PlaceCardHandle, type PlaceCardInfo } from "./PlaceCard.js";
import { Stage } from "./Stage.js";
import { easeOutCubic, lifeOut, pinOut, routesDrawn, tileDelay, tileDrop } from "./arrival.js";
import { bake } from "./bake.js";
import { createPalette } from "./materials.js";
import { fondaco } from "./models/fondaco.js";
import { grove, plot, slab } from "./models/ground.js";
import { market } from "./models/market.js";
import type { Built } from "./models/model.js";
import { drawChevron, drawnIndices, ribbonGeometry, roundedPath } from "./ribbon.js";
import { Blush } from "./selection.js";
import { box, crate, dyn, put } from "./shapes.js";
import { BOARD, CAMERA, RIBBON, SELECT } from "./tokens.js";

const LAYOUT = ["TFzPT", "PzzMz", "~~~~~"];
const COLS = 5;
const ROWS = 3;
const S = BOARD.tile + BOARD.gap;
const wx = (i: number) => (i - (COLS - 1) / 2) * S;
const wz = (j: number) => (j - (ROWS - 1) / 2) * S;
const ROUTE: [number, number][] = [
  [1, 0.38],
  [1, 1],
  [2.62, 1],
];

interface Place {
  id: string;
  label: string;
  plus?: boolean;
  info: PlaceCardInfo;
}
const PLACES: Record<string, Omit<Place, "id">> = {
  F: {
    label: "1",
    info: {
      name: "Le Fondaco",
      sub: "Ton comptoir · Casa 3",
      line: "Tout converge ici : la route rouge y porte ce que tes ateliers produisent.",
      go: "Entrer au Fondaco",
    },
  },
  M: {
    label: "2",
    info: {
      name: "San Marco",
      sub: "Le Marché · la Dogana",
      line: "Vendre et acheter au prix de Venise.",
      go: "Ouvrir la Dogana",
    },
  },
  P: {
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

interface Tile {
  key: string;
  group: Group;
  delay: number;
  built?: Built;
  place?: Place;
  lift: number;
}

interface Shared {
  chosen: string | null;
  hover: string | null;
  pins: Map<string, HTMLButtonElement>;
  card: PlaceCardHandle | null;
  target: Vector3;
}

const PHONE = () => window.innerWidth < 640;

function Scene({ shared, onPick }: { shared: Shared; onPick: (id: string | null) => void }) {
  const { camera, gl, size } = useThree();
  const live = useMemo(() => !window.matchMedia?.("(prefers-reduced-motion: reduce)").matches, []);
  const P = useMemo(() => createPalette(), []);
  const blush = useMemo(() => new Blush(P), [P]);

  const board = useMemo(() => {
    const tiles: Tile[] = [];
    const root = new Group();
    const route = roundedPath(ROUTE.map(([i, j]) => new Vector3(wx(i), RIBBON.lift, wz(j))));
    const samples = route.getSpacedPoints(60);
    for (let j = 0; j < ROWS; j++)
      for (let i = 0; i < COLS; i++) {
        const ch = LAYOUT[j]?.[i] ?? "~";
        const water = ch === "~";
        const g = new Group();
        g.position.set(wx(i), 0, wz(j));
        g.add(slab(P, water));
        const keepOff = (x: number, z: number) =>
          samples.some((p) => (p.x - wx(i) - x) ** 2 + (p.z - wz(j) - z) ** 2 < 1.1 * 1.1);
        const built =
          ch === "F"
            ? fondaco(P)
            : ch === "M"
              ? market(P)
              : ch === "P"
                ? plot(P)
                : ch === "T"
                  ? grove(P, i * 31 + j * 17, 9, ["round", "cypress", "fir"], keepOff)
                  : ch === "z"
                    ? grove(P, i * 13 + j * 29 + 7, 4, ["round", "cypress"], keepOff)
                    : undefined;
        if (built) g.add(built.group);
        root.add(g);
        bake(g);
        const def = PLACES[ch];
        tiles.push({
          key: `${i},${j}`,
          group: g,
          delay: tileDelay(i, j, water),
          built,
          place: def ? { id: `${ch}${i}${j}`, ...def } : undefined,
          lift: 0,
        });
      }
    // The road and its cart.
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
    const cart = dyn(new Group());
    box(cart, 0.62, 0.12, 0.38, 0, 0.12, 0, P.m("wood"), 0.02);
    const wheel = new CylinderGeometry(0.13, 0.13, 0.05, 20).rotateX(Math.PI / 2);
    for (const s of [-1, 1]) put(cart, wheel, P.ink, 0, 0.13, s * 0.22);
    crate(cart, -0.1, 0.24, 0, P.accent, 0.3);
    crate(cart, 0.18, 0.24, 0.02, P.m("trim"), 0.24);
    root.add(cart);
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
    return { root, tiles, ribbon, tex, route, cart, ring };
  }, [P]);

  // The camera: orthographic in world units, three quarters, a little turn allowed.
  const viewH = useRef(40);
  useEffect(() => {
    const cam = camera as OrthographicCamera;
    const aspect = size.width / size.height;
    viewH.current = aspect >= 1 ? Math.max(28, 44 / aspect) : 30;
    cam.left = (-viewH.current * aspect) / 2;
    cam.right = (viewH.current * aspect) / 2;
    cam.top = viewH.current / 2;
    cam.bottom = -viewH.current / 2;
    cam.near = 0.1;
    cam.far = 500;
    cam.updateProjectionMatrix();
  }, [camera, size.width, size.height]);

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

  const fly = useRef({
    from: new Vector3(),
    to: new Vector3(),
    z0: 1,
    z1: 1,
    t: 1,
    last: null as string | null,
  });
  const clock = useRef({ t: live ? 0 : 10, life: 0 });
  const tmp = useMemo(() => new Vector3(), []);

  useFrame((_, rawDt) => {
    const dt = Math.min(0.05, rawDt);
    const c = clock.current;
    c.t += dt;
    if (live) c.life += dt;
    const cam = camera as OrthographicCamera;
    const chosenTile = board.tiles.find((t) => t.place?.id === shared.chosen) ?? null;

    // The camera glides toward what is chosen, and back.
    const f = fly.current;
    if (shared.chosen !== f.last) {
      f.last = shared.chosen;
      f.from.copy(controls.target);
      f.to.copy(chosenTile ? chosenTile.group.position : new Vector3());
      f.to.y = 0;
      f.z0 = cam.zoom;
      f.z1 = chosenTile ? (PHONE() ? SELECT.zoomPhone : SELECT.zoomDesk) : 1;
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
    shared.target.copy(controls.target);

    // The tiles drop in, the chosen one lifts.
    for (const t of board.tiles) {
      const drop = tileDrop(c.t, t.delay);
      const want = chosenTile === t ? SELECT.lift : 0;
      t.lift += (want - t.lift) * (live ? SELECT.liftEase : 1);
      t.group.position.y = drop.y + t.lift;
      t.group.visible = drop.visible;
      t.built?.tick?.(c.life, live ? dt : 0);
      if (t.built?.plus) {
        const on = shared.hover === t.place?.id || shared.chosen === t.place?.id;
        t.built.plus.position.y += ((on ? 0.12 : 0) - t.built.plus.position.y) * 0.15;
      }
    }
    // The road draws itself, then its chevrons run, then the cart goes.
    const drawn = routesDrawn(c.t);
    const idx = board.ribbon.geometry.index?.count ?? 0;
    board.ribbon.geometry.setDrawRange(0, drawnIndices(idx, drawn));
    if (live) board.tex.offset.x -= dt * RIBBON.speed;
    const u = (c.life * (1.3 / board.route.getLength())) % 1;
    const p = board.route.getPointAt(u);
    const d = board.route.getTangentAt(u);
    board.cart.position.set(p.x, 0.02, p.z);
    board.cart.rotation.y = Math.atan2(-d.z, d.x);
    board.cart.scale.setScalar(
      Math.max(0.001, Math.min(1, u * 12, (1 - u) * 12) * (drawn > 0.99 && lifeOut(c.t) ? 1 : 0)),
    );

    // The ring and the blush.
    const ring = board.ring;
    const ringMat = ring.material as MeshBasicMaterial;
    if (chosenTile) {
      ring.position.set(
        chosenTile.group.position.x,
        chosenTile.group.position.y + 0.035,
        chosenTile.group.position.z,
      );
      ringMat.opacity += (SELECT.ringOpacity - ringMat.opacity) * 0.1;
    } else ringMat.opacity += (0 - ringMat.opacity) * 0.15;
    ring.visible = ringMat.opacity > 0.01;
    blush.update(chosenTile?.group ?? null, live);

    // The pins and the card follow the scene.
    const w = size.width;
    const h = size.height;
    for (const t of board.tiles) {
      if (!t.place || !t.built) continue;
      const el = shared.pins.get(t.place.id);
      if (!el) continue;
      tmp
        .set(...t.built.pin)
        .add(t.group.position)
        .project(camera);
      const x = (tmp.x * 0.5 + 0.5) * w;
      const y = (-tmp.y * 0.5 + 0.5) * h;
      el.style.transform = `translate(${x.toFixed(1)}px,${y.toFixed(1)}px)`;
      const out =
        pinOut(c.t, t.delay) && !(t.place.plus && cam.zoom < 1.25 && shared.chosen !== t.place.id);
      el.dataset.out = String(out);
      if (t.place.id === shared.chosen) shared.card?.place(x, y, w, h);
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
      <Stage target={shared.target} phone={PHONE()} />
      {/* biome-ignore lint/a11y/useKeyWithClickEvents: the keyboard reaches each place by its pin, a button. */}
      <primitive
        object={board.root}
        onClick={(e: ThreeEvent<MouseEvent>) => {
          if (e.delta > 6) return;
          e.stopPropagation();
          const t = tileOf(e);
          onPick(t?.place?.id ?? null);
        }}
        onPointerMove={(e: ThreeEvent<PointerEvent>) => {
          const id = tileOf(e)?.place?.id ?? null;
          shared.hover = id;
          gl.domElement.classList.toggle("pc-hot", !!id);
        }}
        onPointerOut={() => {
          shared.hover = null;
          gl.domElement.classList.remove("pc-hot");
        }}
      />
    </>
  );
}

export default function PorcellanaLab() {
  const [chosen, setChosen] = useState<string | null>(null);
  const shared = useRef<Shared>({
    chosen: null,
    hover: null,
    pins: new Map(),
    card: null,
    target: new Vector3(),
  }).current;
  shared.chosen = chosen;
  const places = useMemo(() => {
    const out: Place[] = [];
    LAYOUT.forEach((row, j) => {
      [...row].forEach((ch, i) => {
        const def = PLACES[ch];
        if (def) out.push({ id: `${ch}${i}${j}`, ...def });
      });
    });
    return out;
  }, []);
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
        <Scene shared={shared} onPick={setChosen} />
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
              if (el) shared.pins.set(p.id, el);
              else shared.pins.delete(p.id);
            }}
            onClick={() => setChosen(p.id)}
          >
            {p.label}
          </button>
        ))}
      </div>
      {current ? (
        <PlaceCard
          ref={(h) => {
            shared.card = h;
          }}
          info={current.info}
          onGo={() => {}}
          onClose={() => setChosen(null)}
        />
      ) : null}
    </div>
  );
}
