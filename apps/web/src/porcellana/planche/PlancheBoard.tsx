/**
 * The shared board in Porcellana (docs/plan-planche.md, CADRAGE-v4 §§ 3 and 12): the kit's tiles
 * from the white of the lagoon to the ink of the open sea, the houses on their islands, the towns,
 * the towers of the passages, and the threads: one's own in the roads' ribbon of accent with its
 * barges, the others' in thin ink.
 */
import {
  type PlancheSetup,
  type PlancheState,
  plancheIsCorsair,
  plancheRouteOpen,
} from "@comptoirs/engine";
import { type ThreeEvent, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import {
  CanvasTexture,
  Color,
  Group,
  InstancedMesh,
  MOUSE,
  Matrix4,
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
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { Stage } from "../Stage.js";
import { palette } from "../TileBoard.js";
import { bake } from "../bake.js";
import { fondaco } from "../models/fondaco.js";
import { market } from "../models/market.js";
import { flagCloth, rocca } from "../models/terra.js";
import { town } from "../models/towns.js";
import { type Vehicle, ship } from "../models/vehicles.js";
import { drawChevron, ribbonGeometry, roundedPath } from "../ribbon.js";
import { BOARD, CAMERA, COL, RIBBON } from "../tokens.js";

const S = BOARD.tile + BOARD.gap;

/** What the board is made of beside its houses and towns: where the land lies, how dark each tile is. */
export interface PlancheLand {
  land: (x: number, y: number) => boolean;
  /** 0 the white of the lagoon, 1 the ink of the open sea. */
  peril: (x: number, y: number) => number;
  rialto: { x: number; y: number };
}

export interface PlanchePick {
  kind: "house" | "city" | "passage";
  id: string;
}

function pickOf(o: Object3D | null): PlanchePick | null {
  for (let n = o; n; n = n.parent) if (n.userData.pick) return n.userData.pick as PlanchePick;
  return null;
}

export function PlancheBoard({
  setup,
  land,
  state,
  me,
  chosen,
  pins,
  onPick,
  phone,
  plain,
}: {
  setup: PlancheSetup;
  land: PlancheLand;
  state: PlancheState;
  me: string;
  chosen: PlanchePick | null;
  /** The labels that follow the scene, by `kind:id`. */
  pins: Map<string, HTMLElement>;
  onPick: (p: PlanchePick | null) => void;
  phone: boolean;
  plain: boolean;
}) {
  const { camera, gl, size } = useThree();
  const live = useMemo(() => !window.matchMedia?.("(prefers-reduced-motion: reduce)").matches, []);
  const P = palette(false);
  const { width: W, height: H } = setup;
  const wx = (x: number) => (x - (W - 1) / 2) * S;
  const wz = (y: number) => (y - (H - 1) / 2) * S;

  // The ground: every tile of the kit, once, tinted from porcelain to ink by its peril.
  // biome-ignore lint/correctness/useExhaustiveDependencies: built once for a board.
  const ground = useMemo(() => {
    const root = new Group();
    const tiles: [number, number, boolean][] = [];
    const isles = new Set<string>([
      ...setup.houses.map((h) => `${h.x},${h.y}`),
      ...setup.passages.map((p) => `${p.x},${p.y}`),
      `${land.rialto.x},${land.rialto.y}`,
    ]);
    for (let y = 0; y < H; y++)
      for (let x = 0; x < W; x++) tiles.push([x, y, land.land(x, y) || isles.has(`${x},${y}`)]);
    const m = new Matrix4();
    const c = new Color();
    const ink = new Color(COL.ink);
    const make = (isLand: boolean, base: string, rough: number) => {
      const list = tiles.filter((t) => t[2] === isLand);
      const geo = isLand
        ? new RoundedBoxGeometry(BOARD.tile, BOARD.thick, BOARD.tile, 3, BOARD.radius)
        : new RoundedBoxGeometry(S + 0.02, 1.2, S + 0.02, 1, 0.02);
      const mat = new MeshStandardMaterial({ color: "#ffffff", roughness: rough });
      const mesh = new InstancedMesh(geo, mat, list.length);
      list.forEach(([x, y], k) => {
        m.makeTranslation(wx(x), isLand ? -BOARD.thick / 2 : BOARD.waterY - 0.6, wz(y));
        mesh.setMatrixAt(k, m);
        mesh.setColorAt(k, c.set(base).lerp(ink, land.peril(x, y) * (isLand ? 0.82 : 0.7)));
      });
      mesh.receiveShadow = true;
      mesh.castShadow = isLand;
      root.add(mesh);
    };
    make(true, COL.ground, 0.86);
    make(false, COL.water, 0.38);
    return root;
  }, [setup, land]);

  // What stands on the board: the houses, the towns, the Rialto.
  // biome-ignore lint/correctness/useExhaustiveDependencies: built once for a board.
  const places = useMemo(() => {
    const root = new Group();
    const at = new Map<string, Vector3>();
    const put = (
      key: string,
      pick: PlanchePick | null,
      x: number,
      y: number,
      make: () => Group,
    ) => {
      const g = new Group();
      g.position.set(wx(x), 0, wz(y));
      if (pick) g.userData.pick = pick;
      g.add(make());
      bake(g);
      root.add(g);
      at.set(key, g.position.clone());
    };
    for (const h of setup.houses)
      put(`house:${h.id}`, { kind: "house", id: h.id }, h.x, h.y, () => {
        const b = fondaco(P).group;
        b.scale.setScalar(h.id === me ? 0.62 : 0.5);
        return b;
      });
    setup.cities.forEach((c, k) =>
      put(`city:${c.id}`, { kind: "city", id: c.id }, c.x, c.y, () => {
        const size = c.via.length ? 3 : 2;
        return town(P, { seed: k * 7 + 3, running: false, size }).group;
      }),
    );
    put("rialto", null, land.rialto.x, land.rialto.y, () => market(P).group);
    return { root, at };
  }, [setup, land, me]);

  // The towers of the passages: their flag tells who holds them.
  const holders = setup.passages.map((p) => state.passages[p.id]?.holder ?? "").join("|");
  // biome-ignore lint/correctness/useExhaustiveDependencies: rebuilt when a tower changes hands.
  const towers = useMemo(() => {
    const root = new Group();
    const ticks: ((t: number, dt: number) => void)[] = [];
    for (const p of setup.passages) {
      const holder = state.passages[p.id]?.holder ?? p.holder;
      const colour =
        holder === me
          ? `#${P.accentColour.getHexString()}`
          : plancheIsCorsair(holder)
            ? COL.ink
            : "#8A8279";
      const g = new Group();
      g.position.set(wx(p.x), 0, wz(p.y));
      g.userData.pick = { kind: "passage", id: p.id } satisfies PlanchePick;
      const b = rocca(P, flagCloth(colour));
      b.group.scale.setScalar(0.85);
      g.add(b.group);
      if (b.tick) ticks.push(b.tick);
      root.add(g);
      places.at.set(`passage:${p.id}`, g.position.clone());
    }
    return { root, ticks };
  }, [setup, holders, me]);

  // The threads: one's own in the ribbon of accent, the others' in thin ink.
  const threads = setup.houses
    .map((h) => `${h.id}:${(state.houses[h.id]?.threads ?? []).map((t) => t.to).join(",")}`)
    .join("|");
  const chevrons = useMemo(() => {
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
  }, [P]);
  // biome-ignore lint/correctness/useExhaustiveDependencies: the threads' signature stands for the state.
  const web = useMemo(() => {
    const root = new Group();
    const mine: { route: ReturnType<typeof roundedPath>; boat: Vehicle; open: boolean }[] = [];
    const accent = new MeshStandardMaterial({
      map: chevrons,
      roughness: 0.7,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    });
    const other = new MeshBasicMaterial({ color: COL.ink, transparent: true, opacity: 0.5 });
    const seen = new Set<string>();
    for (const h of setup.houses) {
      const own = h.id === me;
      for (const th of state.houses[h.id]?.threads ?? []) {
        const city = setup.cities.find((c) => c.id === th.to);
        // One line a house and a town, whatever the goods it carries.
        if (!city || seen.has(`${h.id}>${th.to}`)) continue;
        seen.add(`${h.id}>${th.to}`);
        const pts: Vector3[] = [new Vector3(wx(h.x), 0, wz(h.y))];
        const lift = own ? RIBBON.lift + 0.02 : RIBBON.lift;
        const leg = (x: number, y: number) => {
          const last = pts[pts.length - 1] as Vector3;
          // The others' threads turn the other way round, so that two do not lie on one another.
          if (own) pts.push(new Vector3(wx(x), 0, last.z));
          else pts.push(new Vector3(last.x, 0, wz(y)));
          pts.push(new Vector3(wx(x), 0, wz(y)));
        };
        for (const id of city.via) {
          const p = setup.passages.find((q) => q.id === id);
          if (p) leg(p.x, p.y);
        }
        leg(city.x, city.y);
        for (const p of pts) p.y = lift;
        const clean = pts.filter((p, k) => k === 0 || p.distanceTo(pts[k - 1] as Vector3) > 0.01);
        const route = roundedPath(clean);
        const ribbon = new Mesh(
          ribbonGeometry(route, own ? RIBBON.width : 0.2),
          own ? accent : other,
        );
        ribbon.receiveShadow = own;
        root.add(ribbon);
        if (own) {
          const boat = ship(P, { seed: 1, running: true });
          boat.group.scale.setScalar(0.9);
          root.add(boat.group);
          mine.push({ route, boat, open: plancheRouteOpen(setup, state, me, th.to, state.now) });
        }
      }
    }
    return { root, mine };
  }, [setup, threads, me, chevrons, holders]);

  const ring = useMemo(() => {
    const m = new Mesh(
      new RingGeometry(2.9, 3.2, 64),
      new MeshBasicMaterial({
        color: P.accentColour,
        transparent: true,
        opacity: 0,
        toneMapped: false,
      }),
    );
    m.rotation.x = -Math.PI / 2;
    m.renderOrder = 2;
    return m;
  }, [P]);

  useEffect(() => {
    const cam = camera as OrthographicCamera;
    const aspect = size.width / size.height;
    // A third of the board in sight at first: the lagoon and the nearest towns.
    // On a phone, the lagoon and a few towns: the rest is a pan away.
    const vh = phone ? 120 : Math.max(96, 150 / aspect);
    cam.left = (-vh * aspect) / 2;
    cam.right = (vh * aspect) / 2;
    cam.top = vh / 2;
    cam.bottom = -vh / 2;
    cam.near = 0.1;
    cam.far = 900;
    cam.updateProjectionMatrix();
  }, [camera, size.width, size.height, phone]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: the camera starts on one's own house, once.
  const controls = useMemo(() => {
    const mineAt = setup.houses.find((h) => h.id === me);
    const home = new Vector3(wx(mineAt?.x ?? W / 2) - S * 2, 0, wz(mineAt?.y ?? H / 2) + S);
    const { azimuth: az, elevation: el } = CAMERA;
    const distance = 320;
    camera.position.set(
      home.x + Math.sin(az) * Math.cos(el) * distance,
      Math.sin(el) * distance,
      home.z + Math.cos(az) * Math.cos(el) * distance,
    );
    camera.lookAt(home);
    const c = new OrbitControls(camera, gl.domElement);
    c.target.copy(home);
    c.enableDamping = true;
    c.dampingFactor = CAMERA.damping;
    c.screenSpacePanning = false;
    c.minZoom = 0.42;
    c.maxZoom = 3.2;
    c.minPolarAngle = CAMERA.minPolar;
    c.maxPolarAngle = CAMERA.maxPolar;
    c.mouseButtons = { LEFT: MOUSE.PAN, MIDDLE: MOUSE.DOLLY, RIGHT: MOUSE.ROTATE };
    c.touches = { ONE: TOUCH.PAN, TWO: TOUCH.DOLLY_ROTATE };
    return c;
  }, [camera, gl]);
  useEffect(() => () => controls.dispose(), [controls]);

  const clock = useRef(0);
  const tmp = useMemo(() => new Vector3(), []);
  useFrame((_, rawDt) => {
    const dt = Math.min(0.05, rawDt);
    clock.current += dt;
    const t = clock.current;
    controls.update();
    // The board stays in sight: the camera's aim never leaves it.
    controls.target.x = Math.max(wx(0), Math.min(wx(W - 1), controls.target.x));
    controls.target.z = Math.max(wz(0), Math.min(wz(H - 1), controls.target.z));
    if (live) chevrons.offset.x -= dt * RIBBON.speed;
    for (const tick of towers.ticks) tick(t, dt);
    web.mine.forEach((m, k) => {
      const len = m.route.getLength();
      const u = m.open && live ? (t * (7 / len) + k * 0.37) % 1 : 0.02;
      const p = m.route.getPointAt(u);
      const d = m.route.getTangentAt(u);
      m.boat.group.position.set(p.x, 0.05, p.z);
      m.boat.group.rotation.y = Math.atan2(-d.z, d.x);
      m.boat.tick(t);
    });
    const at = chosen ? places.at.get(`${chosen.kind}:${chosen.id}`) : undefined;
    const mat = ring.material as MeshBasicMaterial;
    if (at) ring.position.set(at.x, 0.06, at.z);
    mat.opacity += ((at ? 0.9 : 0) - mat.opacity) * 0.15;
    ring.visible = mat.opacity > 0.01;
    // The labels follow their places.
    for (const [key, el] of pins) {
      const p = places.at.get(key);
      if (!p) continue;
      tmp.set(p.x, key.startsWith("city") ? 5.2 : 4.4, p.z).project(camera);
      const x = (tmp.x * 0.5 + 0.5) * size.width;
      const y = (-tmp.y * 0.5 + 0.5) * size.height;
      el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) translate(-50%, -100%)`;
    }
  });

  const pick = (e: ThreeEvent<MouseEvent>) => {
    if (e.delta > 8) return;
    const p = pickOf(e.object);
    if (!p) return;
    e.stopPropagation();
    onPick(p);
  };

  return (
    <>
      <Stage target={controls.target} phone={phone} plain={plain} scale={3} />
      <primitive object={ground} />
      <primitive object={web.root} />
      {/* biome-ignore lint/a11y/useKeyWithClickEvents: every place has its label, a button. */}
      <primitive object={places.root} onClick={pick} />
      {/* biome-ignore lint/a11y/useKeyWithClickEvents: every passage has its label, a button. */}
      <primitive object={towers.root} onClick={pick} />
      <primitive object={ring} />
    </>
  );
}
