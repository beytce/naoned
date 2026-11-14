/**
 * The island of a house (docs/plan-ile.md I4 and I5, redrawn in the Céladon direction,
 * docs/plan-celadon.md C3): a quay of blond planks on the lagoon, its tiles in the colour of their
 * terrain, the workshops at work on them, a scaffold while one is being built, the plots one may
 * buy pale and dashed, and a slide between two neighbours where one feeds the other. The tiles
 * turn over when one comes in. Pins follow the scene: a workshop's level, or, while one is laid,
 * what each free tile would give it.
 */
import {
  ILE_FONDACO,
  type IleRules,
  type IleState,
  type IleTerrain,
  ileSupplies,
} from "@comptoirs/engine";
import { type ThreeEvent, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import {
  Group,
  MOUSE,
  Mesh,
  MeshStandardMaterial,
  type Object3D,
  type OrthographicCamera,
  PlaneGeometry,
  TOUCH,
  Vector3,
} from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { Stage } from "../Stage.js";
import { palette } from "../TileBoard.js";
import { easeOutBack } from "../arrival.js";
import { bake } from "../bake.js";
import {
  type SlideBuilt,
  ilePlot,
  ileSlab,
  ileSlide,
  quay,
  scaffold,
  terrainMark,
} from "../celadon/ile.js";
import { WORKSHOPS } from "../celadon/workshops.js";
import type { Palette } from "../materials.js";
import { disposeBuilt } from "../shapes.js";
import { BOARD, CAMERA, CELADON, QUAY } from "../tokens.js";

const S = BOARD.tile;

export const TERRAIN_NAMES: Record<IleTerrain, string> = {
  rive: "Rive",
  argile: "Argile",
  foret: "Forêt",
  pre: "Pré",
  sable: "Sable",
};

/** The colour of a terrain, for the legend and the plots' labels. */
export const TERRAIN_TINT: Record<IleTerrain, string> = {
  rive: CELADON.rive,
  argile: CELADON.argile,
  foret: CELADON.foret,
  pre: CELADON.pre,
  sable: CELADON.sable,
};

interface TileBuilt {
  group: Group;
  /** How high its pin stands. */
  top: number;
  /** What turns in it while it works. */
  tick?: (t: number) => void;
}

/** A tile of an island as it stands: its slab, its terrain, what is built on it. */
function buildTile(P: Palette, tile: IleState["tiles"][string], n: number, now: number): TileBuilt {
  const g = new Group();
  const b = tile.building;
  ileSlab(g, b?.type === ILE_FONDACO ? null : tile.terrain);
  if (!b) {
    terrainMark(g, tile.terrain);
    return { group: g, top: 2.2 };
  }
  const make = Object.hasOwn(WORKSHOPS, b.type) ? WORKSHOPS[b.type] : undefined;
  const model = make?.(P, { level: b.level, seed: n * 7 + 3 });
  if (model) g.add(model.group);
  const site = b.readyAt > now;
  if (site) scaffold(g);
  return {
    group: g,
    top: Math.max(site ? 3.6 : 0, (model?.top ?? 2.4) * (model?.group.scale.y ?? 1)) + 0.5,
    ...(model?.tick && !site ? { tick: model.tick } : {}),
  };
}

/** A tile of an island as it stands (also for the assault). */
export function ileTile(
  P: Palette,
  tile: IleState["tiles"][string],
  n: number,
  now: number,
): Group {
  return buildTile(P, tile, n, now).group;
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
  rules,
  stopped,
  buyable,
  ground,
  now,
  chosen,
  pins,
  onPick,
  phone,
  plain,
}: {
  ile: IleState;
  /** The island's rules: which neighbour feeds which (the slides). */
  rules?: IleRules;
  /** A workshop that waits (its store full, its matter lacking): nothing moves in it or toward it. */
  stopped?: (type: string) => boolean;
  buyable: string[];
  /** The terrain of any tile, bought or not. */
  ground: (x: number, y: number) => IleTerrain;
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
  const built = useRef(
    new Map<
      string,
      {
        group: Group;
        sign: string;
        born: number;
        top: number;
        type?: string;
        tick?: (t: number) => void;
        spin?: number;
      }
    >(),
  );
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
      let made: TileBuilt | null = null;
      if (!tile) {
        g.userData.pick = { kind: "plot", at: k } satisfies IlePick;
        ilePlot(g, ground(x, y));
      } else {
        g.userData.pick = { kind: "tile", at: k } satisfies IlePick;
        made = buildTile(P, tile, n, now);
        g.add(made.group);
      }
      bake(g);
      // A plot is a pale plate: it neither casts nor takes a shadow (no grey patches on it).
      if (!tile)
        g.traverse((o) => {
          o.castShadow = false;
          o.receiveShadow = false;
        });
      root.add(g);
      // A tile comes in turning over (the way into the island), or drops when bought later.
      map.set(k, {
        group: g,
        sign: sg,
        born: had ? clock.current - 0.6 : clock.current + n * 0.04,
        top: made?.top ?? 0.6,
        ...(tile?.building ? { type: tile.building.type } : {}),
        ...(made?.tick ? { tick: made.tick } : {}),
      });
    });
  });

  // The quay under the tiles one owns, rebuilt when their span changes: a plot bought widens it.
  const own = Object.keys(ile.tiles).map(parse);
  const ox = [Math.min(...own.map((o) => o[0])), Math.max(...own.map((o) => o[0]))] as const;
  const oz = [Math.min(...own.map((o) => o[1])), Math.max(...own.map((o) => o[1]))] as const;
  const nx = Math.max(...xs) - Math.min(...xs) + 1;
  const nz = Math.max(...ys) - Math.min(...ys) + 1;
  const [qx, qz] = [ox[1] - ox[0] + 1, oz[1] - oz[0] + 1];
  const deck = useMemo(() => {
    const g = quay(P, qx, qz);
    bake(g);
    return g;
  }, [P, qx, qz]);
  useEffect(() => () => disposeBuilt(deck), [deck]);
  deck.position.set(wx((ox[0] + ox[1]) / 2), 0, wz((oz[0] + oz[1]) / 2));
  const water = useMemo(() => {
    const m = new Mesh(
      new PlaneGeometry(900, 900),
      new MeshStandardMaterial({ color: CELADON.water, roughness: 0.38 }),
    );
    m.rotation.x = -Math.PI / 2;
    m.position.y = QUAY.waterY;
    m.receiveShadow = true;
    return m;
  }, []);

  // The slides: one for each pair of neighbours where one feeds the other, both built.
  const links = useMemo(
    () =>
      rules
        ? ileSupplies(rules, ile).filter(
            (l) =>
              (ile.tiles[l.from]?.building?.readyAt ?? Number.POSITIVE_INFINITY) <= now &&
              (ile.tiles[l.to]?.building?.readyAt ?? Number.POSITIVE_INFINITY) <= now,
          )
        : [],
    [rules, ile, now],
  );
  const linkSign = `${links.map((l) => `${l.from}>${l.to}:${l.good}`).join("|")}@${cx},${cy}`;
  // biome-ignore lint/correctness/useExhaustiveDependencies: the sign says all that the slides hang on.
  const slides = useMemo(() => {
    const g = new Group();
    const list: (SlideBuilt & { to: string; clock?: number })[] = [];
    for (const l of links) {
      const [ax, ay] = parse(l.from);
      const [bx2, by] = parse(l.to);
      const sl = ileSlide([wx(ax), wz(ay)], [wx(bx2), wz(by)], l.good);
      bake(sl.group);
      for (const r of sl.riders) bake(r);
      g.add(sl.group);
      list.push({ ...sl, to: ile.tiles[l.to]?.building?.type ?? "" });
    }
    return { group: g, list };
  }, [linkSign]);
  useEffect(() => () => disposeBuilt(slides.group), [slides]);

  // The camera: the kit's three quarters, the island in sight above the dock.
  const span = Math.max(nx, nz) + 0.4;
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
  }, [camera, size.width, size.height, span]);

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
      if (f < 1) v.group.position.y = Math.sin(f * Math.PI) * 3.2;
      else v.group.position.y += ((chosen === k ? 0.35 : 0) - v.group.position.y) * 0.15;
      // What works turns; what waits stands still.
      if (live && v.tick && f >= 1 && !(v.type && stopped?.(v.type))) {
        v.spin = (v.spin ?? 0) + dt;
        v.tick(v.spin);
      }
    }
    // What rides the slides goes from the supplier to the workshop it feeds, unless that one waits.
    slides.list.forEach((sl, n) => {
      if (live && !stopped?.(sl.to)) sl.clock = (sl.clock ?? n * 0.37) + dt * QUAY.slideSpeed;
      sl.riders.forEach((r, i) => sl.place(r, ((sl.clock ?? n * 0.37) + i / sl.riders.length) % 1));
    });
    for (const [k, el] of pins) {
      const v = built.current.get(k);
      if (!v) continue;
      tmp.set(v.group.position.x, v.top, v.group.position.z).project(camera);
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
      <Stage
        target={controls.target}
        phone={phone}
        plain={plain}
        background={CELADON.sky}
        scale={Math.max(1, (span * S) / 44)}
        bare
      />
      <primitive object={water} />
      <primitive object={deck} />
      <primitive object={slides.group} />
      {/* biome-ignore lint/a11y/useKeyWithClickEvents: every tile has its pin, a button. */}
      <primitive object={root} onClick={pick} />
    </>
  );
}
