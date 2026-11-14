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
  plancheEncreLine,
  plancheIsCorsair,
  plancheMudaHold,
  plancheMudaLoaded,
  plancheMudaPassed,
  plancheMudaPhase,
  plancheNoirPhase,
  planchePatina,
  plancheRouteOpen,
} from "@comptoirs/engine";
import { type ThreeEvent, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import {
  BufferAttribute,
  CanvasTexture,
  CatmullRomCurve3,
  Color,
  CurvePath,
  Group,
  InstancedMesh,
  MOUSE,
  type Material,
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
  SphereGeometry,
  TOUCH,
  TorusGeometry,
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
import { box, crate, cyl, disposeBuilt } from "../shapes.js";
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
  /** A house, a town, a passage; a black strait; a strait of the Muda (docs/plan-muda.md). */
  kind: "house" | "city" | "passage" | "noir" | "muda";
  id: string;
}

/** The flags of the powers that keep the black straits. */
const POWER_FLAG: Record<string, string> = {
  turc: "#2F5D50",
  genes: "#3A4A6B",
  milan: "#6B5A3A",
};
/** The ink of the black straits' towers. */
const INK_TOWER = new MeshStandardMaterial({ color: "#2A2725", roughness: 0.85 });
/** A link of a phase not reached: pale, waiting. */
const INK_GHOST = new MeshStandardMaterial({ color: "#B9B1A6", roughness: 0.85 });

/** A model inked: every surface but its flag in the black of the open sea's powers. */
function inked(g: Object3D, keep: Material): void {
  g.traverse((o) => {
    const m = o as Mesh;
    if (m.isMesh && m.material !== keep) m.material = INK_TOWER;
  });
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

  // The ground (docs/audit-visuel-2026-11-11): the land in the kit's tiles, biscuit, a little greyer
  // toward the open sea; the houses' islands in porcelain; the water in one piece, without joints, washed
  // from the lagoon's white to the ink of the open sea, a little stained.
  // biome-ignore lint/correctness/useExhaustiveDependencies: built once for a board.
  const ground = useMemo(() => {
    const root = new Group();
    const round = setup.houses.some((h) => h.sestiere);
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
      else c.set(SEA.land).lerp(ink, land.peril(x, y) * 0.3);
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
      // The ink comes early: the open sea reads dark from the lagoon's edge. Round a lagoon of
      // sestieri it stays a frame: grey past the mouths, ink only toward the corners.
      const p = round
        ? land.peril(gx, gy) * 0.85
        : Math.min(1, Math.sqrt(land.peril(gx, gy)) * 1.15);
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
        // The Muda's pier (docs/plan-muda.md N6): the mole of San Marco and its two columns.
        if (c.ring === "muda") {
          const g = new Group();
          box(g, 5.2, 0.42, 2.0, 0, 0, -0.6, P.m("wall2"), 0.06);
          box(g, 5.4, 0.08, 2.2, 0, 0.42, -0.6, P.m("trim"), 0.02);
          for (const x of [-1.6, 1.6]) {
            cyl(g, 0.5, 0.56, 0.4, x, 0.5, -0.9, P.m("trim"), 12);
            cyl(g, 0.26, 0.3, 3.1, x, 0.9, -0.9, P.m("wall"), 12);
            box(g, 0.7, 0.26, 0.7, x, 4.0, -0.9, P.m("trim"), 0.03);
          }
          // The lion on one, the saint on the other: in the accent, the Republic's.
          box(g, 0.7, 0.42, 0.34, -1.6, 4.26, -0.9, P.accent, 0.06);
          cyl(g, 0.16, 0.2, 0.62, 1.6, 4.26, -0.9, P.m("wall"), 10);
          return g;
        }
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

  // Each house's fleet at anchor south of its island (docs/plan-arsenal.md): who has armed, and how
  // much, reads from afar. Four hulls at most, the rest told in its card.
  const fleets = setup.houses
    .map((h) => Math.min(4, state.houses[h.id]?.fleet?.ships.length ?? 0))
    .join(",");
  // biome-ignore lint/correctness/useExhaustiveDependencies: the fleets' signature stands for the state.
  const anchored = useMemo(() => {
    const root = new Group();
    fleets.split(",").forEach((n, k) => {
      const h = setup.houses[k];
      if (!h) return;
      for (let i = 0; i < Number(n); i++) {
        const boat = ship(P, { seed: k * 5 + i, running: false });
        boat.group.scale.setScalar(THREAD.boat * 1.15);
        boat.group.position.set(wx(h.x) - 1.6 + i * 1.1, 0, wz(h.y) + 3.1 + (i % 2) * 0.35);
        boat.group.rotation.y = Math.PI / 2;
        root.add(boat.group);
      }
    });
    bake(root);
    return root;
  }, [fleets, setup, P]);

  // The beacon of each house's company (docs/plan-compagnie.md K4): a small lighthouse at its
  // island's corner, a ring of light for each of its levels.
  const beacons = setup.houses.map((h) => state.houses[h.id]?.beacon ?? 0).join(",");
  // biome-ignore lint/correctness/useExhaustiveDependencies: the beacons' signature stands for the state.
  const lighthouses = useMemo(() => {
    const root = new Group();
    const lamp = new MeshStandardMaterial({
      color: "#F2C14E",
      emissive: "#F2C14E",
      emissiveIntensity: 0.6,
    });
    const ring = new MeshStandardMaterial({
      color: P.accentColour,
      transparent: true,
      opacity: 0.55,
    });
    beacons.split(",").forEach((n, k) => {
      const level = Number(n);
      const h = setup.houses[k];
      if (!h || level <= 0) return;
      const g = new Group();
      g.position.set(wx(h.x) + 2.4, 0, wz(h.y) - 2.4);
      cyl(g, 0.32, 0.46, 2.6, 0, 0, 0, P.m("wall"), 12);
      box(g, 0.98, 0.12, 0.98, 0, 0.9, 0, P.accent, 0.02);
      const light = new Mesh(new SphereGeometry(0.34, 12, 8), lamp);
      light.position.set(0, 2.9, 0);
      g.add(light);
      for (let l = 0; l < level; l++) {
        const halo = new Mesh(new TorusGeometry(0.7 + l * 0.42, 0.05, 6, 28), ring);
        halo.rotation.x = Math.PI / 2;
        halo.position.set(0, 2.9, 0);
        g.add(halo);
      }
      root.add(g);
    });
    bake(root);
    return root;
  }, [beacons, setup, P]);

  // The black straits (docs/plan-muda.md N5): towers in the ink of the powers, never held; at
  // their foot, three links of chain that blacken as the week's guard hardens.
  const phases = (setup.noir?.straits ?? [])
    .map((x) => plancheNoirPhase(setup, state, x.id, state.now).phase)
    .join(",");
  // biome-ignore lint/correctness/useExhaustiveDependencies: rebuilt when a guard hardens.
  const darks = useMemo(() => {
    const root = new Group();
    const ticks: ((t: number, dt: number) => void)[] = [];
    const n = setup.noir?.phases.length ?? 3;
    phases.split(",").forEach((ph, k) => {
      const x = setup.noir?.straits[k];
      if (!x) return;
      const cloth = flagCloth(POWER_FLAG[x.power] ?? COL.ink);
      const g = new Group();
      g.position.set(wx(x.x), 0, wz(x.y));
      g.userData.pick = { kind: "noir", id: x.id } satisfies PlanchePick;
      const b = rocca(P, cloth);
      inked(b.group, cloth);
      b.group.scale.setScalar(0.95);
      g.add(b.group);
      if (b.tick) ticks.push(b.tick);
      for (let l = 0; l < n; l++) {
        const link = new Mesh(
          new TorusGeometry(0.34, 0.1, 8, 18),
          l <= Number(ph) ? INK_TOWER : INK_GHOST,
        );
        link.scale.set(1, 0.62, 1);
        link.rotation.set(Math.PI / 2, 0, l % 2 ? Math.PI / 2 : 0);
        link.position.set(-0.9 + l * 0.62, 0.2, 2.6);
        g.add(link);
      }
      root.add(g);
      places.at.set(`noir:${x.id}`, g.position.clone());
    });
    return { root, ticks };
  }, [setup, phases]);

  // The Muda (docs/plan-muda.md N6): its straits on the way to Alexandria, a corsair's tower until
  // the convoy has passed; the convoy, by the pier while it loads, its crates rising with its hold,
  // then before the first strait it has not passed, then home.
  const M = setup.muda;
  const mudaPhase = M ? plancheMudaPhase(setup, state.now) : "before";
  const passed = M ? plancheMudaPassed(setup, state, state.now) : 0;
  const fill = M
    ? Math.min(4, Math.ceil((plancheMudaLoaded(state, state.now) / plancheMudaHold(setup)) * 4))
    : 0;
  // biome-ignore lint/correctness/useExhaustiveDependencies: rebuilt when the convoy moves or loads.
  const convoy = useMemo(() => {
    const root = new Group();
    const ticks: ((t: number, dt: number) => void)[] = [];
    if (!M) return { root, ticks };
    const pier = setup.cities.find((c) => c.id === M.pier);
    M.straits.forEach((x, k) => {
      const through = k < passed;
      const cloth = flagCloth(through ? `#${P.accentColour.getHexString()}` : "#8A8279");
      const g = new Group();
      g.position.set(wx(x.x), 0, wz(x.y));
      g.userData.pick = { kind: "muda", id: x.id } satisfies PlanchePick;
      const b = rocca(P, cloth);
      b.group.scale.setScalar(0.6);
      g.add(b.group);
      if (b.tick) ticks.push(b.tick);
      root.add(g);
      places.at.set(`muda:${x.id}`, g.position.clone());
    });
    if (!pier) return { root, ticks };
    const atSea = mudaPhase === "sailing" || (mudaPhase === "waiting" && passed > 0);
    const next = M.straits[passed];
    const last = M.straits[M.straits.length - 1];
    const [cx, cz] = !atSea
      ? [wx(pier.x), wz(pier.y) + 2.2]
      : next
        ? [wx(next.x), wz(next.y) - 3.2]
        : [wx(last?.x ?? pier.x) + 4, wz(last?.y ?? pier.y) + 2];
    const g = new Group();
    g.position.set(cx, 0, cz);
    for (let i = 0; i < 3; i++) {
      const boat = ship(P, { seed: 31 + i, running: false });
      boat.group.scale.setScalar(THREAD.boat * 1.5);
      boat.group.position.set(-2.2 + i * 2.2, 0, (i % 2) * 0.5);
      boat.group.rotation.y = atSea ? -Math.PI / 2 : Math.PI / 2;
      g.add(boat.group);
      // Its share of the hold, in crates on the deck.
      for (let c = 0; c < Math.min(fill, 2 + (i === 1 ? 1 : 0)); c++)
        crate(
          g,
          -2.4 + i * 2.2 + (c % 2) * 0.36,
          0.55 + Math.floor(c / 2) * 0.3,
          (i % 2) * 0.5,
          c % 2 ? P.m("wood") : P.accent,
          0.3,
        );
    }
    root.add(g);
    places.at.set("convoy", g.position.clone());
    bake(g);
    return { root, ticks };
  }, [setup, mudaPhase, passed, fill]);

  // The ink tide (docs/plan-maree.md T6, docs/plan-lagune-ronde.md L4): a crown of ink round the
  // lagoon, from the tide's line to the board's edges, a wash of grey over the three tiles before
  // it, and the line itself drawn on the water in the accent.
  const inkLine = setup.encre ? plancheEncreLine(setup, state) : null;
  // biome-ignore lint/correctness/useExhaustiveDependencies: rebuilt when the line moves.
  const ink = useMemo(() => {
    const root = new Group();
    if (inkLine === null) return root;
    const tiles = inkLine / 100;
    const side = Math.max(W, H);
    // One sheet over the board, its ink painted from the middle out.
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 512;
    const g = canvas.getContext("2d");
    if (g) {
      const reach = (side / 2) * Math.SQRT2;
      const grad = g.createRadialGradient(256, 256, 0, 256, 256, (reach / side) * 512);
      const stop = (t: number, a: number) =>
        grad.addColorStop(Math.min(1, Math.max(0, t / reach)), `rgba(29,27,25,${a})`);
      stop(0, 0);
      stop(tiles - 3, 0);
      stop(tiles, 0.5);
      stop(reach, 0.5);
      g.fillStyle = grad;
      g.fillRect(0, 0, 512, 512);
    }
    const crown = new Mesh(
      new PlaneGeometry(side * S, side * S),
      new MeshBasicMaterial({
        map: new CanvasTexture(canvas),
        transparent: true,
        depthWrite: false,
      }),
    );
    crown.rotation.x = -Math.PI / 2;
    crown.position.y = 0.08;
    crown.renderOrder = 2;
    root.add(crown);
    // The line itself, dashed in the accent, where it lies on the board.
    const dash = new MeshBasicMaterial({ color: P.accentColour, transparent: true, opacity: 0.85 });
    const radius = tiles * S;
    const count = Math.max(8, Math.round((2 * Math.PI * radius) / (S * 0.8)));
    for (let k = 0; k < count; k++) {
      const a = (k / count) * 2 * Math.PI;
      const x = Math.cos(a) * radius;
      const z = Math.sin(a) * radius;
      if (Math.abs(x) > (W * S) / 2 || Math.abs(z) > (H * S) / 2) continue;
      const d = new Mesh(new PlaneGeometry(S * 0.45, 0.22), dash);
      d.rotation.set(-Math.PI / 2, 0, Math.PI / 2 - a);
      d.position.set(x, 0.1, z);
      d.renderOrder = 3;
      root.add(d);
    }
    // Its label: on the line toward the camera, kept on the board.
    const reach = Math.min(radius / Math.SQRT2, (side * S) / 2 - S);
    places.at.set("encre", new Vector3(reach, 0, reach));
    return root;
  }, [inkLine, setup, P]);

  // The captains' sorties told against one's own towers (docs/plan-maree.md T6): the captain's
  // ship on the water, between his tower and the tower he comes for.
  const told = (state.sorties?.list ?? [])
    .filter(
      (x) =>
        !state.sorties?.done[x.id] &&
        state.passages[x.target]?.holder === me &&
        x.at > state.now &&
        x.at - state.now <= (setup.sorties?.announceMs ?? 0),
    )
    .map((x) => `${x.id}>${x.target}`)
    .join("|");
  // biome-ignore lint/correctness/useExhaustiveDependencies: rebuilt when a sortie is told or played.
  const corsairs = useMemo(() => {
    const root = new Group();
    for (const key of told ? told.split("|") : []) {
      const [id = "", target = ""] = key.split(">");
      const x = state.sorties?.list.find((y) => y.id === id);
      const from = setup.passages.find((p) => p.id === x?.from);
      const to = setup.passages.find((p) => p.id === target);
      if (!x || !from || !to) continue;
      const boat = ship(P, { seed: id.length * 7, running: false });
      boat.group.scale.setScalar(THREAD.boat * 1.6);
      // Two thirds of the way, coming.
      const px = wx(from.x) + ((wx(to.x) - wx(from.x)) * 2) / 3;
      const pz = wz(from.y) + ((wz(to.y) - wz(from.y)) * 2) / 3;
      boat.group.position.set(px, 0.05, pz);
      boat.group.rotation.y = Math.atan2(-(wz(to.y) - wz(from.y)), wx(to.x) - wx(from.x));
      boat.group.traverse((o) => {
        const m = o as Mesh;
        if (m.isMesh) m.material = INK_TOWER;
      });
      root.add(boat.group);
      places.at.set(`sortie:${id}`, new Vector3(px, 0, pz));
    }
    return root;
  }, [told, setup, P]);

  // The stones engraved on each island (docs/plan-maree.md T7): a slab with its red top a tide.
  const stones = setup.houses.map((h) => state.houses[h.id]?.stones?.length ?? 0).join(",");
  // biome-ignore lint/correctness/useExhaustiveDependencies: the stones' signature stands for the state.
  const engraved = useMemo(() => {
    const root = new Group();
    stones.split(",").forEach((n, k) => {
      const h = setup.houses[k];
      if (!h) return;
      for (let i = 0; i < Math.min(5, Number(n)); i++) {
        const g = new Group();
        g.position.set(wx(h.x) - 2.5 + i * 0.7, 0, wz(h.y) - 2.6);
        box(g, 0.5, 0.9, 0.22, 0, 0, 0, P.m("wall2"), 0.04);
        box(g, 0.52, 0.14, 0.24, 0, 0.9, 0, P.accent, 0.03);
        root.add(g);
      }
    });
    bake(root);
    return root;
  }, [stones, setup, P]);

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
    // The other sestieri's threads, fainter: one's neighbours are whom one is ahead of or behind.
    const far = new MeshBasicMaterial({
      map: dashes,
      transparent: true,
      opacity: 0.28,
      depthWrite: false,
    });
    const foe = new MeshBasicMaterial({ map: dashes, depthWrite: false });
    const shadow = new MeshStandardMaterial({ color: THREAD.shadow, roughness: 0.8 });
    const sheen = new MeshBasicMaterial({ color: THREAD.sheen, toneMapped: false });
    const seen = new Set<string>();
    /** A lagoon of sestieri is round: its threads curve. */
    const round = setup.houses.some((h) => h.sestiere);
    const home = setup.houses.find((x) => x.id === me)?.sestiere;
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
          // On the round lagoon, a thread follows the water round the Rialto: its distance from
          // the middle and its bearing change together (docs/plan-lagune-ronde.md L5). The others'
          // turn first and go out after, so that two do not lie on one another.
          if (round) {
            const to = new Vector3(wx(x), 0, wz(y));
            const r1 = Math.hypot(last.x, last.z);
            const r2 = Math.hypot(to.x, to.z);
            const a2 = r2 < 0.01 ? Math.atan2(last.z, last.x) : Math.atan2(to.z, to.x);
            const a1 = r1 < 0.01 ? a2 : Math.atan2(last.z, last.x);
            // Near the middle there is no going round: straight there.
            const turn =
              Math.min(r1, r2) < 5 * S ? 0 : Math.atan2(Math.sin(a2 - a1), Math.cos(a2 - a1));
            if (!turn) {
              pts.push(to);
              return;
            }
            const n = Math.max(2, Math.ceil((Math.abs(r2 - r1) + Math.abs(turn) * (r1 + r2)) / S));
            for (let k = 1; k < n; k++) {
              const t = k / n;
              // The further round it goes, the more it cuts across the lagoon: no ring round it.
              const cut = 1 - (Math.abs(turn) / Math.PI) * 0.75 * Math.sin(Math.PI * t);
              const r = (r1 + (r2 - r1) * (own ? t : t * t)) * cut;
              pts.push(new Vector3(Math.cos(a1 + turn * t) * r, 0, Math.sin(a1 + turn * t) * r));
            }
            pts.push(to);
            return;
          }
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
        const route = round ? new CurvePath<Vector3>() : roundedPath(clean);
        if (round && clean.length > 1) route.add(new CatmullRomCurve3(clean, false, "centripetal"));
        const ribbon = new Mesh(
          ribbonGeometry(route, own ? THREAD.width : h.id === rival ? THREAD.rival : THREAD.other),
          own ? accent : h.id === rival ? foe : round && home && h.sestiere !== home ? far : other,
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
    const tall = cam.top - cam.bottom || 70;
    // The board seen from its corner: as wide as its two sides, flattened by the camera's height.
    const wide = ((W + H) * S) / Math.SQRT2;
    const fit = Math.min(span / wide, tall / (wide * Math.sin(CAMERA.elevation)));
    zoomTo.current = whole ? Math.min(zoom, fit / 1.06) : zoom;
    const mineAt = setup.houses.find((h) => h.id === me);
    // One's sestiere: between one's house and the middle of its quarter, so that its towns and
    // its mouth stay in view (docs/plan-lagune-ronde.md L4).
    const quarter = [
      ...setup.houses.filter((h) => mineAt?.sestiere && h.sestiere === mineAt.sestiere),
      ...setup.cities.filter((c) => mineAt?.sestiere && c.sestiere === mineAt.sestiere),
    ];
    const mid = quarter.length
      ? {
          x: quarter.reduce((n, q) => n + q.x, 0) / quarter.length,
          y: quarter.reduce((n, q) => n + q.y, 0) / quarter.length,
        }
      : null;
    aimTo.current = whole
      ? new Vector3(0, 0, 0)
      : mid && mineAt
        ? new Vector3(wx((mid.x + mineAt.x) / 2), 0, wz((mid.y + mineAt.y) / 2))
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
    for (const tick of darks.ticks) tick(t, dt);
    for (const tick of convoy.ticks) tick(t, dt);
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

  // What a rebuild leaves behind is freed, not kept in the GPU (docs/plan-socle.md A6).
  useEffect(() => () => disposeBuilt(web.root), [web.root]);
  useEffect(() => () => disposeBuilt(minis), [minis]);
  useEffect(() => () => disposeBuilt(anchored), [anchored]);
  useEffect(() => () => disposeBuilt(lighthouses), [lighthouses]);
  useEffect(() => () => disposeBuilt(ink), [ink]);
  useEffect(() => () => disposeBuilt(corsairs), [corsairs]);
  useEffect(() => () => disposeBuilt(engraved), [engraved]);
  useEffect(() => () => disposeBuilt(towers.root), [towers.root]);
  useEffect(() => () => disposeBuilt(darks.root), [darks.root]);
  useEffect(() => () => disposeBuilt(convoy.root), [convoy.root]);

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
      <primitive object={anchored} />
      <primitive object={lighthouses} />
      <primitive object={ink} />
      <primitive object={corsairs} />
      <primitive object={engraved} />
      {/* biome-ignore lint/a11y/useKeyWithClickEvents: every place has its label, a button. */}
      <primitive object={places.root} onClick={pick} />
      {/* biome-ignore lint/a11y/useKeyWithClickEvents: every passage has its label, a button. */}
      <primitive object={towers.root} onClick={pick} />
      {/* biome-ignore lint/a11y/useKeyWithClickEvents: every black strait has its label, a button. */}
      <primitive object={darks.root} onClick={pick} />
      {/* biome-ignore lint/a11y/useKeyWithClickEvents: the Muda's straits have their labels. */}
      <primitive object={convoy.root} onClick={pick} />
      <primitive object={ring} />
    </>
  );
}
