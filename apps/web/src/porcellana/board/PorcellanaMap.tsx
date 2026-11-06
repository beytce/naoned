/**
 * The Carte on square tiles (docs/plan-porcellana.md lot 3): the house's board drawn with the kit —
 * the tiles dropping into place, the roads of accent from each workshop to its fondaco, the « + »
 * plots round, the towns as islands, the sea along the coasts. A place touched lifts, takes the
 * blush and opens its card beside its pin; the card's round button opens its dock (the game's
 * target, as the map of before told it). It stands where EmpireMap stood when the world's map is of
 * square tiles.
 */
import "@fontsource/cormorant-garamond/600.css";
import "@fontsource/cormorant-garamond/700.css";
import "@fontsource/work-sans/400.css";
import "@fontsource/work-sans/500.css";
import "@fontsource/work-sans/600.css";
import "../porcellana.css";
import { Canvas, type ThreeEvent, useFrame, useThree } from "@react-three/fiber";
import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import {
  CanvasTexture,
  Group,
  MOUSE,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  type Object3D,
  type OrthographicCamera,
  RepeatWrapping,
  RingGeometry,
  SRGBColorSpace,
  TOUCH,
  Vector3,
} from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import type { EmpireMapHandle } from "../../empire/map/EmpireMap.js";
import type { Target } from "../../empire/map/logic.js";
import type { EmpirePayload } from "../../empire/types.js";
import { PlaceCard, type PlaceCardHandle } from "../PlaceCard.js";
import { Stage } from "../Stage.js";
import { easeOutCubic, pinOut, routesDrawn, tileDelay, tileDrop } from "../arrival.js";
import { bake } from "../bake.js";
import { type Palette, createPalette } from "../materials.js";
import { slab } from "../models/ground.js";
import type { Built, ModelOpts } from "../models/model.js";
import { drawChevron, drawnIndices, ribbonGeometry, roundedPath } from "../ribbon.js";
import { Blush } from "../selection.js";
import { BOARD, CAMERA, RIBBON, SELECT } from "../tokens.js";
import { modelOf } from "./models.js";
import { type BoardPlace, type BoardScene, type BoardTile, boardOf } from "./scene.js";

const S = BOARD.tile + BOARD.gap;
const PHONE = () => window.innerWidth < 640;

interface Live {
  key: string;
  sig: string;
  group: Group;
  built: Built | null;
  opts: ModelOpts;
  /** When it started to drop (the scene's clock). */
  from: number;
  lift: number;
}

interface Shared {
  scene: BoardScene;
  chosen: string | null;
  hover: string | null;
  pins: Map<string, HTMLButtonElement>;
  card: PlaceCardHandle | null;
  target: Vector3;
  goHome: number;
}

/** A tile's middle in the scene (x, z), from its tile coordinates. */
const world = (i: number, j: number): [number, number] => [i * S, j * S];

function Board({
  sh,
  onPick,
}: {
  sh: Shared;
  onPick: (id: string | null) => void;
}) {
  const { camera, gl, size } = useThree();
  const live = useMemo(() => !window.matchMedia?.("(prefers-reduced-motion: reduce)").matches, []);
  const P: Palette = useMemo(() => createPalette(), []);
  const blush = useMemo(() => new Blush(P), [P]);
  const root = useMemo(() => new Group(), []);
  const tiles = useRef(new Map<string, Live>());
  const clock = useRef({ t: live ? 0 : 10, life: 0 });

  // The roads: a ribbon each, one texture whose chevrons run.
  const tex = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 128;
    canvas.height = 64;
    const ctx = canvas.getContext("2d");
    if (ctx) drawChevron(ctx, `#${P.accentColour.getHexString()}`);
    const t = new CanvasTexture(canvas);
    t.wrapS = RepeatWrapping;
    t.colorSpace = SRGBColorSpace;
    t.anisotropy = 8;
    return t;
  }, [P]);
  const ribbonMat = useMemo(
    () =>
      new MeshStandardMaterial({
        map: tex,
        roughness: 0.7,
        polygonOffset: true,
        polygonOffsetFactor: -2,
        polygonOffsetUnits: -2,
      }),
    [tex],
  );
  const roads = useRef<{ sig: string; meshes: Mesh[]; samples: Vector3[] }>({
    sig: "",
    meshes: [],
    samples: [],
  });
  const ring = useMemo(() => {
    const m = new Mesh(
      new RingGeometry(SELECT.ring[0], SELECT.ring[1], 72),
      new MeshBasicMaterial({
        color: P.accentColour,
        transparent: true,
        opacity: 0,
        toneMapped: false,
      }),
    );
    m.rotation.x = -Math.PI / 2;
    m.renderOrder = 2;
    root.add(m);
    return m;
  }, [P, root]);

  /** The board brought to the scene now: the tiles changed rebuilt, the new ones dropping in. */
  const sync = (scene: BoardScene) => {
    const size = scene.tileSize;
    const toWorld = ([x, y]: [number, number]) =>
      new Vector3((x / size - 0.5) * S, RIBBON.lift, (y / size - 0.5) * S);
    const roadSig = scene.roads.map((r) => `${r.from}>${r.to}:${r.pts.length}`).join("|");
    if (roadSig !== roads.current.sig) {
      for (const m of roads.current.meshes) {
        root.remove(m);
        m.geometry.dispose();
      }
      const curves = scene.roads
        .filter((r) => r.pts.length >= 2)
        .map((r) => roundedPath(r.pts.map(toWorld)));
      roads.current = {
        sig: roadSig,
        meshes: curves.map((c) => {
          const m = new Mesh(ribbonGeometry(c), ribbonMat);
          m.receiveShadow = true;
          root.add(m);
          return m;
        }),
        samples: curves.flatMap((c) => c.getSpacedPoints(Math.ceil(c.getLength() / 0.5))),
      };
    }
    const seen = new Set<string>();
    for (const tile of scene.tiles) {
      seen.add(tile.key);
      const sig = `${tile.model}|${tile.size ?? ""}|${tile.water}|${tile.model === "lane" ? roadSig : ""}`;
      const was = tiles.current.get(tile.key);
      if (was && was.sig === sig) continue;
      if (was) root.remove(was.group);
      tiles.current.set(tile.key, build(tile, sig, was));
    }
    for (const [k, l] of tiles.current)
      if (!seen.has(k)) {
        root.remove(l.group);
        tiles.current.delete(k);
      }
  };

  const build = (tile: BoardTile, sig: string, was: Live | undefined): Live => {
    const [x, z] = world(tile.i, tile.j);
    const g = new Group();
    g.position.set(x, 0, z);
    g.add(slab(P, tile.water));
    const samples = roads.current.samples;
    const opts: ModelOpts = {
      seed: tile.seed,
      running: tile.running,
      keepOff: (lx, lz) =>
        samples.some((p) => (p.x - x - lx) ** 2 + (p.z - z - lz) ** 2 < 1.15 * 1.15),
    };
    const built = modelOf(P, tile, opts);
    if (built) g.add(built.group);
    root.add(g);
    bake(g);
    g.userData.tileKey = tile.key;
    // A tile there before keeps its place; a new one drops in now (bought, built).
    const from = was
      ? was.from
      : clock.current.t > 3
        ? clock.current.t
        : tileDelay(tile.i - minI.current, tile.j - minJ.current, tile.water);
    return { key: tile.key, sig, group: g, built, opts, from, lift: was?.lift ?? 0 };
  };
  const minI = useRef(0);
  const minJ = useRef(0);

  // The camera: orthographic, three quarters, a little turn allowed; over the first fondaco.
  useEffect(() => {
    const cam = camera as OrthographicCamera;
    const aspect = size.width / size.height;
    const vh = aspect >= 1 ? Math.max(30, 48 / aspect) : 32;
    cam.left = (-vh * aspect) / 2;
    cam.right = (vh * aspect) / 2;
    cam.top = vh / 2;
    cam.bottom = -vh / 2;
    cam.near = 0.1;
    cam.far = 600;
    cam.updateProjectionMatrix();
  }, [camera, size.width, size.height]);
  const controls = useMemo(() => {
    const c = new OrbitControls(camera, gl.domElement);
    c.enableDamping = true;
    c.dampingFactor = CAMERA.damping;
    c.screenSpacePanning = false;
    c.minZoom = CAMERA.minZoom;
    c.maxZoom = CAMERA.maxZoom;
    c.minPolarAngle = CAMERA.minPolar;
    c.maxPolarAngle = CAMERA.maxPolar;
    c.minAzimuthAngle = CAMERA.azimuth - CAMERA.turn;
    c.maxAzimuthAngle = CAMERA.azimuth + CAMERA.turn;
    c.mouseButtons = { LEFT: MOUSE.PAN, MIDDLE: MOUSE.DOLLY, RIGHT: MOUSE.ROTATE };
    c.touches = { ONE: TOUCH.PAN, TWO: TOUCH.DOLLY_ROTATE };
    return c;
  }, [camera, gl]);
  useEffect(() => () => controls.dispose(), [controls]);
  const look = (at: Vector3) => {
    const { azimuth: az, elevation: el, distance: d } = CAMERA;
    camera.position.set(
      at.x + Math.sin(az) * Math.cos(el) * d,
      Math.sin(el) * d,
      at.z + Math.cos(az) * Math.cos(el) * d,
    );
    camera.lookAt(at);
    controls.target.copy(at);
  };
  const homeAt = () => {
    const [i = 0, j = 0] = sh.scene.home.split(",").map(Number);
    const [x, z] = world(i, j);
    return new Vector3(x, 0, z);
  };
  // biome-ignore lint/correctness/useExhaustiveDependencies: once, at the opening.
  useEffect(() => {
    minI.current = Math.min(...sh.scene.tiles.map((t) => t.i));
    minJ.current = Math.min(...sh.scene.tiles.map((t) => t.j));
    sync(sh.scene);
    look(homeAt());
  }, []);

  const fly = useRef({
    from: new Vector3(),
    to: new Vector3(),
    z0: 1,
    z1: 1,
    t: 1,
    last: "",
    home: 0,
  });
  const tmp = useMemo(() => new Vector3(), []);
  const lastScene = useRef(sh.scene);

  useFrame((_, rawDt) => {
    const dt = Math.min(0.05, rawDt);
    const c = clock.current;
    c.t += dt;
    if (live) c.life += dt;
    if (lastScene.current !== sh.scene) {
      lastScene.current = sh.scene;
      sync(sh.scene);
    }
    const cam = camera as OrthographicCamera;
    const byKey = new Map(sh.scene.tiles.map((t) => [t.key, t]));
    const chosenKey = sh.scene.tiles.find((t) => t.place?.id === sh.chosen)?.key ?? null;
    const chosen = chosenKey ? (tiles.current.get(chosenKey) ?? null) : null;

    // The camera glides to what is chosen, or home when asked.
    const f = fly.current;
    const want = `${sh.chosen ?? ""}|${sh.goHome}`;
    if (want !== f.last) {
      const homeAsked = sh.goHome !== f.home;
      f.home = sh.goHome;
      f.last = want;
      if (chosen || homeAsked) {
        f.from.copy(controls.target);
        f.to.copy(chosen ? chosen.group.position : homeAt());
        f.to.y = 0;
        f.z0 = cam.zoom;
        f.z1 = chosen ? (PHONE() ? SELECT.zoomPhone : SELECT.zoomDesk) : 1;
        f.t = live ? 0 : 1;
        if (!live) {
          camera.position.add(f.to.clone().sub(controls.target));
          controls.target.copy(f.to);
          cam.zoom = f.z1;
          cam.updateProjectionMatrix();
        }
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

    // The tiles drop in, the chosen one lifts; what works, works (the game says so).
    for (const l of tiles.current.values()) {
      const tile = byKey.get(l.key);
      l.opts.running = !!tile?.running;
      const drop = tileDrop(c.t, l.from);
      const lift = chosen === l ? SELECT.lift : 0;
      l.lift += (lift - l.lift) * (live ? SELECT.liftEase : 1);
      l.group.position.y = drop.y + l.lift;
      l.group.visible = drop.visible;
      l.built?.tick?.(c.life, live ? dt : 0);
      if (l.built?.plus) {
        const on = sh.hover === tile?.place?.id || sh.chosen === tile?.place?.id;
        l.built.plus.position.y += ((on ? 0.12 : 0) - l.built.plus.position.y) * 0.15;
      }
    }
    const drawn = routesDrawn(c.t);
    for (const m of roads.current.meshes)
      m.geometry.setDrawRange(0, drawnIndices(m.geometry.index?.count ?? 0, drawn));
    if (live) tex.offset.x -= dt * RIBBON.speed;

    // The ring and the blush.
    const ringMat = ring.material as MeshBasicMaterial;
    if (chosen) {
      const at = chosen.group.position;
      ring.position.set(at.x, at.y + 0.035, at.z);
      ringMat.opacity += (SELECT.ringOpacity - ringMat.opacity) * 0.1;
    } else ringMat.opacity += (0 - ringMat.opacity) * 0.15;
    ring.visible = ringMat.opacity > 0.01;
    blush.update(chosen?.group ?? null, live);

    // The pins and the card follow the scene.
    const w = size.width;
    const h = size.height;
    for (const tile of sh.scene.tiles) {
      if (!tile.place) continue;
      const el = sh.pins.get(tile.place.id);
      const l = tiles.current.get(tile.key);
      if (!el || !l) continue;
      const pin = l.built?.pin ?? [0, 2, 0];
      tmp
        .set(...pin)
        .add(l.group.position)
        .project(camera);
      const x = (tmp.x * 0.5 + 0.5) * w;
      const y = (-tmp.y * 0.5 + 0.5) * h;
      el.style.transform = `translate(${x.toFixed(1)}px,${y.toFixed(1)}px)`;
      const out =
        pinOut(c.t, l.from) && !(tile.place.plus && cam.zoom < 1.25 && sh.chosen !== tile.place.id);
      el.dataset.out = String(out);
      if (tile.place.id === sh.chosen) sh.card?.place(x, y, w, h);
    }
  });

  const placeOf = (e: ThreeEvent<PointerEvent | MouseEvent>): BoardPlace | null => {
    for (let o: Object3D | null = e.object; o; o = o.parent) {
      const k = o.userData.tileKey as string | undefined;
      if (k) return sh.scene.tiles.find((t) => t.key === k)?.place ?? null;
    }
    return null;
  };
  return (
    <>
      <Stage target={sh.target} phone={PHONE()} />
      {/* biome-ignore lint/a11y/useKeyWithClickEvents: the keyboard reaches each place by its pin, a button. */}
      <primitive
        object={root}
        onClick={(e: ThreeEvent<MouseEvent>) => {
          if (e.delta > 6) return;
          e.stopPropagation();
          onPick(placeOf(e)?.id ?? null);
        }}
        onPointerMove={(e: ThreeEvent<PointerEvent>) => {
          const id = placeOf(e)?.id ?? null;
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

export interface PorcellanaMapProps {
  p: EmpirePayload;
  now: number;
  /** A place's round button pressed: the game opens its dock; null: nothing chosen any more. */
  onTarget: (t: Target | null) => void;
  /** The game's target now: when it closes its dock, the place is let go. */
  target: Target | null;
}

const PorcellanaMap = forwardRef<EmpireMapHandle, PorcellanaMapProps>(function PorcellanaMap(
  { p, now, onTarget, target },
  ref,
) {
  // Read again each second at most: the workshops' states move with the clock.
  const second = Math.floor(now / 1_000);
  // biome-ignore lint/correctness/useExhaustiveDependencies: `second` stands for `now`.
  const scene = useMemo(() => boardOf(p, second * 1_000), [p, second]);
  const [chosen, setChosen] = useState<string | null>(null);
  const [carded, setCarded] = useState(false);
  const sh = useRef<Shared | null>(null);
  if (scene && !sh.current)
    sh.current = {
      scene,
      chosen: null,
      hover: null,
      pins: new Map(),
      card: null,
      target: new Vector3(),
      goHome: 0,
    };
  if (sh.current && scene) {
    sh.current.scene = scene;
    sh.current.chosen = chosen;
  }
  // The game closed the place's dock: the place is let go.
  const hadTarget = useRef(false);
  useEffect(() => {
    if (target) hadTarget.current = true;
    else if (hadTarget.current) {
      hadTarget.current = false;
      setChosen(null);
      setCarded(false);
    }
  }, [target]);
  const goHome = () => {
    if (sh.current) sh.current.goHome++;
    setChosen(null);
    setCarded(false);
  };
  useImperativeHandle(ref, () => ({
    toggle: goHome,
    home: goHome,
    far: goHome,
    leave: goHome,
    recenter: goHome,
    house: goHome,
    info: () => {},
    pan: () => {},
    zoom: () => {},
  }));
  const pick = (id: string | null) => {
    setChosen(id);
    setCarded(id !== null);
    if (id === null) onTarget(null);
  };
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.key === "Escape") pick(null);
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  });
  if (!scene || !sh.current) return null;
  const shared = sh.current;
  const places = scene.tiles.flatMap((t) => (t.place ? [t.place] : []));
  const current = places.find((x) => x.id === chosen);
  return (
    <div className="porcellana absolute inset-0" data-porcellana-map>
      <Canvas
        orthographic
        dpr={[1, 2]}
        gl={{ antialias: true, powerPreference: "high-performance" }}
        onCreated={({ camera }) => {
          (camera as OrthographicCamera & { manual?: boolean }).manual = true;
        }}
        onPointerMissed={() => pick(null)}
      >
        <Board sh={shared} onPick={pick} />
      </Canvas>
      <div className="pc-vignette" />
      <div className="pc-pins">
        {places.map((x) => (
          <button
            key={x.id}
            type="button"
            className="pc-pin"
            data-place={x.id}
            data-on={String(x.id === chosen || x.ready)}
            data-plus={String(!!x.plus)}
            data-out="false"
            aria-label={x.name}
            ref={(el) => {
              if (el) shared.pins.set(x.id, el);
              else shared.pins.delete(x.id);
            }}
            onClick={() => pick(x.id)}
          >
            {x.pin}
          </button>
        ))}
      </div>
      {current && carded ? (
        <PlaceCard
          ref={(h) => {
            shared.card = h;
          }}
          info={{ name: current.name, sub: current.sub, line: current.line, go: current.go }}
          onGo={() => {
            setCarded(false);
            onTarget(current.target);
          }}
          onClose={() => pick(null)}
        />
      ) : null}
    </div>
  );
});

export default PorcellanaMap;
