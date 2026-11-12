/**
 * The shared board in Porcellana (docs/plan-planche.md, CADRAGE-v4 §§ 3 and 12): the kit's tiles
 * from the white of the lagoon to the ink of the open sea, the houses on their islands, the towns,
 * the towers of the passages, and the threads: one's own in the roads' ribbon of accent with its
 * barges, the others' in thin ink.
 */
import {
  ILE_FONDACO,
  type PlancheSetup,
  type PlancheState,
  plancheIsCorsair,
  planchePatina,
  plancheRouteOpen,
} from "@comptoirs/engine";
import { type ThreeEvent, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import {
  BufferAttribute,
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
  PlaneGeometry,
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
import { CATALOGUE } from "../catalogue.js";
import { fondaco } from "../models/fondaco.js";
import { market } from "../models/market.js";
import { flagCloth, rocca } from "../models/terra.js";
import { town } from "../models/towns.js";
import { type Vehicle, ship } from "../models/vehicles.js";
import { drawChevron, ribbonGeometry, roundedPath } from "../ribbon.js";
import { BOARD, CAMERA, COL, RIBBON, SEA, THREAD } from "../tokens.js";

const S = BOARD.tile + BOARD.gap;
const BY_KEY = new Map(CATALOGUE.map((e) => [e.key, e]));

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
  zoom = 1,
  rival,
  whole = false,
  marks = [],
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
  /** The scale asked from the interface: 1 the lagoon, less the whole world. */
  zoom?: number;
  /** One's rival of the week: its threads in a bolder ink (docs/plan-classement.md). */
  rival?: string;
  /** The whole lagoon in view, centred (docs/plan-lagunes.md G5); one's own sestiere otherwise. */
  whole?: boolean;
  /** Labels laid on the board itself (the sestieri's names on the water), by key and tile. */
  marks?: { key: string; x: number; y: number }[];
}) {
  const { camera, gl, size } = useThree();
  const live = useMemo(() => !window.matchMedia?.("(prefers-reduced-motion: reduce)").matches, []);
  const P = palette(false);
  const { width: W, height: H } = setup;
  const wx = (x: number) => (x - (W - 1) / 2) * S;
  const wz = (y: number) => (y - (H - 1) / 2) * S;

  // The ground (docs/audit-visuel-2026-11-11): the land in the kit's tiles, biscuit, darker toward
  // the open sea; the houses' islands in porcelain; the water in one piece, without joints, washed
  // from the lagoon's white to the ink of the open sea, a little stained.
  // biome-ignore lint/correctness/useExhaustiveDependencies: built once for a board.
  const ground = useMemo(() => {
    const root = new Group();
    const isles = new Set<string>(setup.houses.map((h) => `${h.x},${h.y}`));
    const rocks = new Set<string>([
      ...setup.passages.map((p) => `${p.x},${p.y}`),
      `${land.rialto.x},${land.rialto.y}`,
    ]);
    const tiles: [number, number, string][] = [];
    for (let y = 0; y < H; y++)
      for (let x = 0; x < W; x++) {
        const k = `${x},${y}`;
        if (isles.has(k)) tiles.push([x, y, "isle"]);
        else if (rocks.has(k) || land.land(x, y)) tiles.push([x, y, "land"]);
      }
    const m = new Matrix4();
    const c = new Color();
    const ink = new Color(COL.ink);
    const geo = new RoundedBoxGeometry(BOARD.tile, BOARD.thick, BOARD.tile, 3, BOARD.radius);
    const mat = new MeshStandardMaterial({ color: "#ffffff", roughness: 0.86 });
    const mesh = new InstancedMesh(geo, mat, tiles.length);
    tiles.forEach(([x, y, kind], k) => {
      m.makeTranslation(wx(x), -BOARD.thick / 2, wz(y));
      mesh.setMatrixAt(k, m);
      if (kind === "isle") c.set(SEA.isle);
      else c.set(SEA.land).lerp(ink, land.peril(x, y) * 0.72);
      mesh.setColorAt(k, c);
    });
    mesh.receiveShadow = true;
    mesh.castShadow = true;
    root.add(mesh);
    // The water: one sheet, its colour at each vertex.
    const seg = 4;
    const sheet = new PlaneGeometry(W * S, H * S, W * seg, H * seg);
    sheet.rotateX(-Math.PI / 2);
    const pos = sheet.getAttribute("position");
    const col = new Float32Array(pos.count * 3);
    const lagoon = new Color(SEA.lagoon);
    const mid = new Color(SEA.mid);
    const deep = new Color(SEA.deep);
    for (let i = 0; i < pos.count; i++) {
      const gx = pos.getX(i) / S + (W - 1) / 2;
      const gy = pos.getZ(i) / S + (H - 1) / 2;
      // The ink comes early: the open sea reads dark from the lagoon's edge.
      const p = Math.min(1, Math.sqrt(land.peril(gx, gy)) * 1.15);
      if (p < 0.5) c.copy(lagoon).lerp(mid, p * 2);
      else c.copy(mid).lerp(deep, (p - 0.5) * 2);
      const n = Math.sin(gx * 1.7 + gy * 0.9) * Math.sin(gx * 0.6 - gy * 1.3);
      c.multiplyScalar(1 + n * SEA.stain * (0.4 + p));
      col.set([c.r, c.g, c.b], i * 3);
    }
    sheet.setAttribute("color", new BufferAttribute(col, 3));
    const water = new Mesh(
      sheet,
      new MeshStandardMaterial({ color: "#ffffff", vertexColors: true, roughness: 0.38 }),
    );
    water.position.y = BOARD.waterY;
    water.receiveShadow = true;
    root.add(water);
    // Its edge: a slab under the sheet, so that the board keeps its thickness.
    const edge = new Mesh(
      new RoundedBoxGeometry(W * S, 1.2, H * S, 2, 0.4),
      new MeshStandardMaterial({ color: SEA.mid, roughness: 0.6 }),
    );
    edge.position.y = BOARD.waterY - 0.61;
    root.add(edge);
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
        b.scale.setScalar(h.id === me ? 0.55 : 0.42);
        return b;
      });
    // A town on the Rialto's tile is the Rialto itself: the market of Venice stands there.
    setup.cities.forEach((c, k) => {
      const rialto = c.x === land.rialto.x && c.y === land.rialto.y;
      put(`city:${c.id}`, { kind: "city", id: c.id }, c.x, c.y, () => {
        if (rialto) return market(P).group;
        const size = c.via.length ? 3 : 2;
        return town(P, { seed: k * 7 + 3, running: false, size }).group;
      });
    });
    if (!setup.cities.some((c) => c.x === land.rialto.x && c.y === land.rialto.y))
      put("rialto", null, land.rialto.x, land.rialto.y, () => market(P).group);
    return { root, at };
  }, [setup, land, me]);

  // Each island in small round its house: its four highest workshops at the tile's corners, so
  // that a rival's trade reads from afar (docs/plan-ile.md I5).
  const isles = setup.houses
    .map((h) =>
      Object.values(state.houses[h.id]?.ile?.tiles ?? {})
        .map((t) => t.building)
        .filter((b): b is NonNullable<typeof b> => !!b && b.type !== ILE_FONDACO)
        .sort((a, b) => b.level - a.level || a.type.localeCompare(b.type))
        .slice(0, 4)
        .map((b) => b.type)
        .join(","),
    )
    .join("|");
  // biome-ignore lint/correctness/useExhaustiveDependencies: the islands' signature stands for the state.
  const minis = useMemo(() => {
    const root = new Group();
    const corners = [
      [-2.05, -2.05],
      [2.05, -2.05],
      [-2.05, 2.05],
      [2.05, 2.05],
    ] as const;
    isles.split("|").forEach((list, k) => {
      const h = setup.houses[k];
      if (!h || !list) return;
      list.split(",").forEach((type, n) => {
        const entry = BY_KEY.get(type);
        const model = entry?.make?.(P, { seed: k * 11 + n, running: false });
        const [cx, cz] = corners[n] ?? [0, 0];
        if (!model) return;
        const g = new Group();
        model.group.scale.setScalar(0.55);
        g.add(model.group);
        g.position.set(wx(h.x) + cx, 0, wz(h.y) + cz);
        bake(g);
        root.add(g);
      });
    });
    return root;
  }, [isles, setup, P]);

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
    .map(
      (h) =>
        `${h.id}:${(state.houses[h.id]?.threads ?? [])
          .map((t) => `${t.to}~${Math.floor(planchePatina(setup, t, state.now) / 500)}`)
          .join(",")}`,
    )
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
    tex.repeat.x = RIBBON.period / THREAD.period;
    return tex;
  }, [P]);
  // The others' threads: dashes of ink.
  const dashes = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 64;
    canvas.height = 16;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.fillStyle = COL.ink;
      ctx.beginPath();
      ctx.roundRect(2, 2, 36, 12, 6);
      ctx.fill();
    }
    const tex = new CanvasTexture(canvas);
    tex.wrapS = RepeatWrapping;
    tex.colorSpace = SRGBColorSpace;
    tex.repeat.x = RIBBON.period / THREAD.otherDash;
    return tex;
  }, []);
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
    const other = new MeshBasicMaterial({
      map: dashes,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
    });
    const foe = new MeshBasicMaterial({ map: dashes, depthWrite: false });
    const shadow = new MeshStandardMaterial({ color: THREAD.shadow, roughness: 0.8 });
    const sheen = new MeshBasicMaterial({ color: THREAD.sheen, toneMapped: false });
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
        // By the detour, the thread goes round the passages (docs/plan-hex-commerce.md H1).
        for (const id of th.detour ? [] : city.via) {
          const p = setup.passages.find((q) => q.id === id);
          if (p) leg(p.x, p.y);
        }
        leg(city.x, city.y);
        for (const p of pts) p.y = lift;
        const clean = pts.filter((p, k) => k === 0 || p.distanceTo(pts[k - 1] as Vector3) > 0.01);
        const route = roundedPath(clean);
        const ribbon = new Mesh(
          ribbonGeometry(route, own ? THREAD.width : h.id === rival ? THREAD.rival : THREAD.other),
          own ? accent : h.id === rival ? foe : other,
        );
        ribbon.receiveShadow = own;
        root.add(ribbon);
        if (own) {
          // Its shadow, toward the camera and a little lower: the ribbon has a thickness.
          const under = new Mesh(ribbonGeometry(route, THREAD.width), shadow);
          under.position.set(THREAD.shadowOffset, -0.015, THREAD.shadowOffset);
          root.add(under);
          // The sheen of the patina, along its far edge: the longer held, the wider.
          const share = planchePatina(setup, th, state.now) / Math.max(1, setup.rules.patinaMaxBps);
          const w = THREAD.sheenMin + (THREAD.sheenMax - THREAD.sheenMin) * share;
          const shine = new Mesh(ribbonGeometry(route, w), sheen);
          const off = -(THREAD.width / 2 - w / 2 - 0.12) / Math.SQRT2;
          shine.position.set(off, 0.012, off);
          root.add(shine);
          const boat = ship(P, { seed: 1, running: true });
          boat.group.scale.setScalar(THREAD.boat);
          root.add(boat.group);
          mine.push({
            route,
            boat,
            open: !!th.detour || plancheRouteOpen(setup, state, me, th.to, state.now),
          });
        }
      }
    }
    return { root, mine };
  }, [setup, threads, me, chevrons, dashes, holders, rival]);

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
    // A lagoon of 48 is far wider than a phone: one may step back until it is all in view.
    c.minZoom = Math.min(0.42, (110 / (W * S)) * 0.8);
    c.maxZoom = 3.2;
    c.minPolarAngle = CAMERA.minPolar;
    c.maxPolarAngle = CAMERA.maxPolar;
    c.mouseButtons = { LEFT: MOUSE.PAN, MIDDLE: MOUSE.DOLLY, RIGHT: MOUSE.ROTATE };
    c.touches = { ONE: TOUCH.PAN, TWO: TOUCH.DOLLY_ROTATE };
    return c;
  }, [camera, gl]);
  useEffect(() => () => controls.dispose(), [controls]);
  // The scale (monde, lagune): the camera's zoom eases toward it. The whole lagoon: the zoom that
  // shows its width, and its middle; back to one's own house when one comes back.
  const zoomTo = useRef(zoom);
  const aimTo = useRef<Vector3 | null>(null);
  // biome-ignore lint/correctness/useExhaustiveDependencies: the board's size is fixed.
  useEffect(() => {
    const cam = camera as OrthographicCamera;
    const span = cam.right - cam.left || 110;
    zoomTo.current = whole ? Math.min(zoom, span / (W * S * 1.08)) : zoom;
    const mineAt = setup.houses.find((h) => h.id === me);
    aimTo.current = whole
      ? new Vector3(0, 0, 0)
      : new Vector3(wx(mineAt?.x ?? W / 2) - S * 2, 0, wz(mineAt?.y ?? H / 2) + S);
    // On line one's house is known only once the server has answered: the view goes to it then.
  }, [zoom, whole, me]);
  // biome-ignore lint/correctness/useExhaustiveDependencies: the board's size is fixed.
  const markAt = useMemo(
    () => new Map(marks.map((m) => [m.key, new Vector3(wx(m.x), 0, wz(m.y))])),
    [marks],
  );

  const clock = useRef(0);
  /** The scale last reached: once there, the reader's own zoom is left alone. */
  const lastZoom = useRef(1);
  const tmp = useMemo(() => new Vector3(), []);
  useFrame((_, rawDt) => {
    const dt = Math.min(0.05, rawDt);
    clock.current += dt;
    const t = clock.current;
    const cam = camera as OrthographicCamera;
    if (Math.abs(cam.zoom - zoomTo.current) > 0.002 && zoomTo.current !== lastZoom.current) {
      cam.zoom += (zoomTo.current - cam.zoom) * (live ? 0.12 : 1);
      cam.updateProjectionMatrix();
    } else lastZoom.current = zoomTo.current;
    // The aim eases toward the scale's middle, then is left to the reader.
    const aim = aimTo.current;
    if (aim) {
      const d = aim.clone().sub(controls.target);
      if (d.length() < 0.5 || !live) {
        controls.target.add(d);
        camera.position.add(d);
        aimTo.current = null;
      } else {
        d.multiplyScalar(0.12);
        controls.target.add(d);
        camera.position.add(d);
      }
    }
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
      const p = places.at.get(key) ?? markAt.get(key);
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
      <primitive object={minis} />
      {/* biome-ignore lint/a11y/useKeyWithClickEvents: every place has its label, a button. */}
      <primitive object={places.root} onClick={pick} />
      {/* biome-ignore lint/a11y/useKeyWithClickEvents: every passage has its label, a button. */}
      <primitive object={towers.root} onClick={pick} />
      <primitive object={ring} />
    </>
  );
}
