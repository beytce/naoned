/**
 * The island of a house in Porcellana (docs/plan-ile.md I4 and I5): its tiles in the kit's grammar,
 * each with the mark of its terrain, the workshops of the kit on them, a scaffold while one is
 * being built, the « + » plots one may buy around. The tiles turn over when one comes in. Pins
 * follow the scene: a workshop's level, or, while one is laid, what each free tile would give it.
 */
import { ILE_FONDACO, type IleState, type IleTerrain } from "@comptoirs/engine";
import { type ThreeEvent, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import { Group, MOUSE, type Object3D, type OrthographicCamera, TOUCH, Vector3 } from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { Stage } from "../Stage.js";
import { palette } from "../TileBoard.js";
import { easeOutBack } from "../arrival.js";
import { bake } from "../bake.js";
import { CATALOGUE } from "../catalogue.js";
import type { Palette } from "../materials.js";
import { rocks } from "../models/decor.js";
import { fondaco } from "../models/fondaco.js";
import { grove, plot, slab } from "../models/ground.js";
import { box, cyl } from "../shapes.js";
import { BOARD, CAMERA } from "../tokens.js";

const S = BOARD.tile + BOARD.gap;
const BY_KEY = new Map(CATALOGUE.map((e) => [e.key, e]));

export const TERRAIN_NAMES: Record<IleTerrain, string> = {
  rive: "Rive",
  argile: "Argile",
  foret: "Forêt",
  pre: "Pré",
  sable: "Sable",
};

/** The mark of a terrain on a free tile: what one would expect to find there, in porcelain. */
function terrainMark(P: Palette, t: IleTerrain, seed: number): Group {
  const g = new Group();
  if (t === "foret") g.add(grove(P, seed, 6, ["fir", "cypress"]).group);
  else if (t === "rive") {
    // the water's edge along the south side, a little pier
    box(g, BOARD.tile, 0.12, 1.5, 0, -0.06, 2.25, P.m("water"), 0.05);
    box(g, 0.5, 0.18, 1.6, 1.6, 0, 1.9, P.m("wood"), 0.03);
  } else if (t === "sable") {
    for (const [x, z, r] of [
      [-1.2, -1, 1.1],
      [1.1, 0.4, 0.9],
      [-0.3, 1.4, 0.7],
    ] as const) {
      const m = cyl(g, r, r * 1.15, 0.22, x, 0, z, P.m("trim"), 24);
      m.scale.y = 1;
    }
  } else if (t === "argile") {
    box(g, 2.2, 0.08, 1.6, -0.6, 0, -0.4, P.m("open"), 0.2);
    g.add(rocks(P, { seed, running: false }).group);
    g.children[g.children.length - 1]?.scale.setScalar(0.45);
  } else {
    // the meadow: furrows of crop
    for (let k = -2; k <= 2; k++) box(g, 4.2, 0.1, 0.32, 0, 0, k * 0.85, P.m("crop"), 0.05);
  }
  return g;
}

/** A site under way: four poles, a beam, crates of accent. */
function scaffold(P: Palette): Group {
  const g = new Group();
  for (const [x, z] of [
    [-1.4, -1.4],
    [1.4, -1.4],
    [-1.4, 1.4],
    [1.4, 1.4],
  ] as const)
    box(g, 0.14, 2.6, 0.14, x, 0, z, P.m("wood"), 0.02);
  box(g, 3.1, 0.14, 0.14, 0, 2.5, -1.4, P.m("wood"), 0.02);
  box(g, 3.1, 0.14, 0.14, 0, 2.5, 1.4, P.m("wood"), 0.02);
  box(g, 0.7, 0.5, 0.7, 0.4, 0, 0.3, P.accent, 0.05);
  return g;
}

export type IlePick = { kind: "tile"; at: string } | { kind: "plot"; at: string };

const parse = (k: string): [number, number] => {
  const [x = "0", y = "0"] = k.split(",");
  return [Number(x), Number(y)];
};
function pickOf(o: Object3D | null): IlePick | null {
  for (let n = o; n; n = n.parent) if (n.userData.pick) return n.userData.pick as IlePick;
  return null;
}

export function IleBoard({
  ile,
  buyable,
  now,
  chosen,
  pins,
  onPick,
  phone,
  plain,
}: {
  ile: IleState;
  buyable: string[];
  now: number;
  chosen: string | null;
  /** The labels that follow the scene, by tile. */
  pins: Map<string, HTMLElement>;
  onPick: (p: IlePick | null) => void;
  phone: boolean;
  plain: boolean;
}) {
  const { camera, gl, size } = useThree();
  const live = useMemo(() => !window.matchMedia?.("(prefers-reduced-motion: reduce)").matches, []);
  const P = palette(false);
  const keys = [...Object.keys(ile.tiles), ...buyable];
  const xs = keys.map((k) => parse(k)[0]);
  const ys = keys.map((k) => parse(k)[1]);
  const cx = (Math.min(...xs) + Math.max(...xs)) / 2;
  const cy = (Math.min(...ys) + Math.max(...ys)) / 2;
  const wx = (x: number) => (x - cx) * S;
  const wz = (y: number) => (y - cy) * S;

  // Each tile is built once for what stands on it; a change on one tile rebuilds that tile only.
  const sign = (k: string) => {
    const t = ile.tiles[k];
    const b = t?.building;
    return t
      ? `${t.terrain}|${b ? `${b.type}:${b.level}:${b.readyAt > now ? 1 : 0}` : ""}`
      : "plot";
  };
  const built = useRef(new Map<string, { group: Group; sign: string; born: number }>());
  const root = useMemo(() => new Group(), []);
  const clock = useRef(0);

  useEffect(() => {
    const map = built.current;
    const want = new Set(keys);
    for (const [k, v] of map)
      if (!want.has(k)) {
        root.remove(v.group);
        map.delete(k);
      }
    keys.forEach((k, n) => {
      const sg = sign(k);
      const had = map.get(k);
      if (had && had.sign === sg) {
        const [x, y] = parse(k);
        had.group.position.set(wx(x), had.group.position.y, wz(y));
        return;
      }
      if (had) root.remove(had.group);
      const [x, y] = parse(k);
      const g = new Group();
      g.position.set(wx(x), 0, wz(y));
      const tile = ile.tiles[k];
      if (!tile) {
        g.userData.pick = { kind: "plot", at: k } satisfies IlePick;
        g.add(slab(P, false));
        const p = plot(P);
        g.add(p.group);
        g.scale.setScalar(0.92);
      } else {
        g.userData.pick = { kind: "tile", at: k } satisfies IlePick;
        g.add(slab(P, false));
        const b = tile.building;
        if (!b) g.add(terrainMark(P, tile.terrain, n * 13 + 5));
        else if (b.type === ILE_FONDACO) g.add(fondaco(P).group);
        else {
          const entry = BY_KEY.get(b.type);
          const model = entry?.make?.(P, { seed: n * 7 + 3, running: true });
          if (model) g.add(model.group);
          if (b.readyAt > now) g.add(scaffold(P));
        }
      }
      bake(g);
      root.add(g);
      // A tile comes in turning over (the way into the island), or drops when bought later.
      map.set(k, {
        group: g,
        sign: sg,
        born: had ? clock.current - 0.6 : clock.current + n * 0.04,
      });
    });
  });

  // The camera: the kit's three quarters, the island in sight above the dock.
  const span = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)) + 1;
  useEffect(() => {
    const cam = camera as OrthographicCamera;
    const aspect = size.width / size.height;
    // The island's width across the screen in three quarters, a margin around it.
    const across = span * S * 1.42 + 4;
    // Set by eye: on a narrow screen the width binds, on a wide one the height.
    const vh = Math.max((across / aspect) * 0.55, across * 0.7);
    cam.left = (-vh * aspect) / 2;
    cam.right = (vh * aspect) / 2;
    cam.top = vh / 2;
    cam.bottom = -vh / 2;
    cam.near = 0.1;
    cam.far = 500;
    cam.updateProjectionMatrix();
  }, [camera, size.width, size.height, span, phone]);

  const controls = useMemo(() => {
    // A little south-east of the middle: the island rises clear of the dock.
    const home = new Vector3(phone ? S * 0.7 : S * 0.3, 0, phone ? S * 0.7 : S * 0.3);
    const { azimuth: az, elevation: el, distance } = CAMERA;
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
    c.minZoom = 0.5;
    c.maxZoom = 3;
    c.minPolarAngle = CAMERA.minPolar;
    c.maxPolarAngle = CAMERA.maxPolar;
    c.mouseButtons = { LEFT: MOUSE.PAN, MIDDLE: MOUSE.DOLLY, RIGHT: MOUSE.ROTATE };
    c.touches = { ONE: TOUCH.PAN, TWO: TOUCH.DOLLY_ROTATE };
    return c;
  }, [camera, gl, phone]);
  useEffect(() => () => controls.dispose(), [controls]);

  const tmp = useMemo(() => new Vector3(), []);
  useFrame((_, rawDt) => {
    const dt = Math.min(0.05, rawDt);
    clock.current += dt;
    const t = clock.current;
    controls.update();
    for (const [k, v] of built.current) {
      // The turn: from its back (π) to its face, with a slight overshoot; the chosen tile lifts.
      const f = live ? Math.min(1, Math.max(0, (t - v.born) / 0.6)) : 1;
      const k2 = f >= 1 ? 1 : easeOutBack(f, 0.9);
      v.group.rotation.x = (1 - k2) * Math.PI;
      // Mid-turn the tile rises; once on its face, the chosen one lifts a little.
      if (f < 1) v.group.position.y = Math.sin(f * Math.PI) * 2.2;
      else v.group.position.y += ((chosen === k ? 0.35 : 0) - v.group.position.y) * 0.15;
    }
    for (const [k, el] of pins) {
      const v = built.current.get(k);
      if (!v) continue;
      tmp.set(v.group.position.x, 3.6, v.group.position.z).project(camera);
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
      <Stage target={controls.target} phone={phone} plain={plain} />
      {/* biome-ignore lint/a11y/useKeyWithClickEvents: every tile has its pin, a button. */}
      <primitive object={root} onClick={pick} />
    </>
  );
}
