/**
 * The assault in Porcellana (docs/plan-guerre.md, the owner's request of 12 November 2026: « que
 * l'assaut soit en 3D »): the island attacked to the north, its real tiles and buildings; three
 * passes of water down to the south, each with the defenses its master laid at its mouth (towers,
 * batteries, the chain across, the boats of the reinforcements); the assailant's ships waiting to
 * the south, then in file in their pass. The round is seen: the ships sail in, the defenses fire,
 * the ships hit, sink, the towers fall to pieces, the seal of a fallen pass rises in red.
 */
import type { AssautEvent, AssautState, IleState } from "@comptoirs/engine";
import { type ThreeEvent, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import {
  Group,
  MOUSE,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  type Object3D,
  type OrthographicCamera,
  PlaneGeometry,
  SphereGeometry,
  TOUCH,
  Vector3,
} from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { Stage } from "../Stage.js";
import { palette } from "../TileBoard.js";
import { bake } from "../bake.js";
import { ileTile } from "../ile/IleBoard.js";
import { bombarda, flagCloth, rocca } from "../models/terra.js";
import { type Vehicle, ship } from "../models/vehicles.js";
import { box, cyl } from "../shapes.js";
import { BOARD, CAMERA, COL } from "../tokens.js";

const S = BOARD.tile + BOARD.gap;
/** The passes, west to east; their water lanes run from the island's mouth down to the south. */
const LANE_X: Record<string, number> = { nord: -11, bouche: 0, sud: 11 };
const laneX = (pass: string) => LANE_X[pass] ?? 0;
/** Where the passes open (the defenses), where the ships of a pass wait, where the reserve waits. */
const MOUTH_Z = -4;
const FILE_Z = 2;
const RESERVE_Z = 23;
/** The cards of the passes, south of the files. */
const CARD_Z = 15.5;
const ISLE_Z = -17;

const parse = (k: string): [number, number] => {
  const [x = "0", y = "0"] = k.split(",");
  return [Number(x), Number(y)];
};

interface Effect {
  kind: "flash" | "fire" | "debris" | "ruse";
  at: Vector3;
  start: number;
}

export function AssautBoard({
  state,
  ile,
  now,
  events,
  pending,
  chosen,
  pins,
  onLane,
  phone,
  plain,
}: {
  state: AssautState;
  /** The island attacked, as it stands. */
  ile: IleState;
  now: number;
  /** The last round's events, told in the scene. */
  events: AssautEvent[];
  /** The placements of this round, not yet played. */
  pending: Record<number, string>;
  chosen: number | null;
  /** The cards of the passes, which follow the scene. */
  pins: Map<string, HTMLElement>;
  onLane: (pass: string) => void;
  phone: boolean;
  plain: boolean;
}) {
  const { camera, gl, size } = useThree();
  const P = palette(false);
  const live = useMemo(() => !window.matchMedia?.("(prefers-reduced-motion: reduce)").matches, []);
  const red = `#${P.accentColour.getHexString()}`;

  // The water, the quays between the passes, the island attacked: built once for the island.
  const sign = Object.entries(ile.tiles)
    .map(([k, t]) => `${k}:${t.building?.type ?? ""}:${t.building?.level ?? 0}`)
    .join("|");
  // biome-ignore lint/correctness/useExhaustiveDependencies: the island's signature stands for it.
  const ground = useMemo(() => {
    const root = new Group();
    const water = new Mesh(
      new PlaneGeometry(140, 120),
      new MeshStandardMaterial({ color: COL.water, roughness: 0.38 }),
    );
    water.rotation.x = -Math.PI / 2;
    water.position.set(0, -0.32, 0);
    water.receiveShadow = true;
    root.add(water);
    // The passes, a deeper water; the stone quays between them, from the island to the reserve.
    const deep = new MeshStandardMaterial({ color: "#B7C3C7", roughness: 0.4 });
    for (const x of Object.values(LANE_X)) {
      const lane = new Mesh(new PlaneGeometry(6.4, 30), deep);
      lane.rotation.x = -Math.PI / 2;
      lane.position.set(x, -0.3, MOUTH_Z + 13);
      root.add(lane);
    }
    for (const x of [-16.5, -5.5, 5.5, 16.5])
      box(root, 2.2, 0.7, 22, x, -0.32, MOUTH_Z + 9, P.m("wall2"), 0.15);
    // The island: its tiles, north.
    const keys = Object.keys(ile.tiles);
    const xs = keys.map((k) => parse(k)[0]);
    const ys = keys.map((k) => parse(k)[1]);
    const cx = (Math.min(...xs) + Math.max(...xs)) / 2;
    const cy = (Math.min(...ys) + Math.max(...ys)) / 2;
    keys.forEach((k, n) => {
      const tile = ile.tiles[k];
      if (!tile) return;
      const [x, y] = parse(k);
      const g = ileTile(P, tile, n, now);
      g.position.set((x - cx) * S, 0, ISLE_Z + (y - cy) * S);
      root.add(g);
    });
    // The quay of the port along the island's south.
    box(root, 38, 0.6, 2.4, 0, -0.3, MOUTH_Z - 3.2, P.m("wall"), 0.2);
    bake(root);
    return root;
  }, [sign, P]);

  // The defenses of each pass, rebuilt when one changes (a hull, a fall, a chain broken).
  const defSign = Object.entries(state.passes)
    .map(
      ([id, p]) =>
        `${id}:${p.towers.map((t) => t.hull).join(",")}/${p.batteries.map((t) => t.hull).join(",")}/${p.chain ? 1 : 0}/${p.anchor.length}/${p.fallen ? 1 : 0}`,
    )
    .join("|");
  // biome-ignore lint/correctness/useExhaustiveDependencies: the defenses' signature stands for them.
  const defenses = useMemo(() => {
    const root = new Group();
    const cloth = flagCloth(COL.ink);
    for (const [id, p] of Object.entries(state.passes)) {
      const x = laneX(id);
      const bar = (g: Group, hull: number, max: number, at: [number, number, number]) => {
        const w = 2.2;
        box(g, w, 0.18, 0.3, at[0], at[1], at[2], P.m("wall2"), 0.05);
        box(
          g,
          (w * Math.max(0, hull)) / Math.max(1, max),
          0.22,
          0.34,
          at[0] - (w - (w * Math.max(0, hull)) / Math.max(1, max)) / 2,
          at[1],
          at[2],
          P.m("ink"),
          0.05,
        );
      };
      p.towers.forEach((t, k) => {
        const g = new Group();
        const side = k % 2 === 0 ? -1 : 1;
        g.position.set(x + side * 3.9, 0, MOUTH_Z - 0.6 - Math.floor(k / 2) * 2.6);
        const m = rocca(P, cloth);
        m.group.scale.setScalar(0.62);
        g.add(m.group);
        bar(g, t.hull, t.max, [0, 4.8, 0]);
        root.add(g);
      });
      p.batteries.forEach((t, k) => {
        const g = new Group();
        const side = k % 2 === 0 ? 1 : -1;
        g.position.set(x + side * 3.9, 0, MOUTH_Z + 2.2 + k * 2.4);
        const m = bombarda(P, cloth);
        m.group.scale.setScalar(0.6);
        g.add(m.group);
        bar(g, t.hull, t.max, [0, 2.6, 0]);
        root.add(g);
      });
      if (p.chain) {
        // Two posts and the chain across the pass.
        for (const s of [-1, 1])
          cyl(root, 0.32, 0.38, 1.6, x + s * 3.1, 0, MOUTH_Z + 1, P.m("ink"), 12);
        for (let k = -6; k <= 6; k++) {
          const link = new Mesh(new SphereGeometry(0.2, 8, 6), P.m("ink"));
          link.position.set(
            x + k * 0.48,
            0.55 + Math.cos((k / 6) * Math.PI) * 0.12 - 0.2,
            MOUTH_Z + 1,
          );
          link.scale.set(1.3, 0.8, 0.8);
          root.add(link);
        }
      }
      p.anchor.forEach((_, k) => {
        const b = ship(P, { seed: 30 + k, running: false });
        b.group.scale.setScalar(1.25);
        b.group.rotation.y = -Math.PI / 2;
        b.group.position.set(x + (k % 2 ? 1.3 : -1.3), 0, MOUTH_Z - 0.8);
        b.group.traverse((o) => {
          if ((o as Mesh).isMesh) (o as Mesh).material = P.m("ink");
        });
        root.add(b.group);
      });
      if (p.fallen) {
        // The seal of the fallen pass, broken, in red, on its post.
        const g = new Group();
        g.position.set(x, 0, MOUTH_Z + 0.5);
        cyl(g, 0.14, 0.14, 3.2, 0, 0, 0, P.m("wood"), 8);
        const seal = new Mesh(
          new SphereGeometry(0.9, 18, 12),
          new MeshStandardMaterial({ color: red, roughness: 0.6 }),
        );
        seal.scale.set(1, 1, 0.35);
        seal.position.set(0, 3.6, 0);
        seal.userData.seal = true;
        g.add(seal);
        root.add(g);
      }
      // The lane, to be touched: a ship chosen goes there.
      const pick = new Mesh(new PlaneGeometry(6.4, 22), new MeshBasicMaterial({ visible: false }));
      pick.rotation.x = -Math.PI / 2;
      pick.position.set(x, 0.05, MOUTH_Z + 10);
      pick.userData.lane = id;
      root.add(pick);
    }
    return root;
  }, [defSign, P]);

  // The ships: each kept from round to round, sailing toward where it should be.
  const ships = useRef(new Map<number, { v: Vehicle; target: Vector3; sunkAt: number | null }>());
  const fleet = useMemo(() => new Group(), []);
  const ids = Object.keys(state.ships).map(Number);
  useEffect(() => {
    for (const id of ids)
      if (!ships.current.has(id)) {
        const v = ship(P, { seed: id, running: true });
        v.group.scale.setScalar(1.45);
        v.group.rotation.y = Math.PI / 2;
        const target = new Vector3();
        v.group.position.set(0, 0, RESERVE_Z + 6);
        fleet.add(v.group);
        ships.current.set(id, { v, target, sunkAt: null });
      }
  });
  // Where each ship should be: held back to the south, in file in its pass, or gone down.
  const files: Record<string, number[]> = {};
  const reserve: number[] = [];
  for (const id of ids) {
    const x = state.ships[id];
    if (!x) continue;
    const at = pending[id] ?? x.at;
    if (!at) reserve.push(id);
    else {
      const list = files[at] ?? [];
      list.push(id);
      files[at] = list;
    }
  }
  for (const [pass, list] of Object.entries(files))
    list.forEach((id, k) => {
      const s = ships.current.get(id);
      s?.target.set(
        laneX(pass) + (k % 2 ? 1.2 : -1.2),
        0,
        FILE_Z + Math.floor(k / 2) * 2.8 + (k % 2) * 1.2,
      );
    });
  reserve.forEach((id, k) => {
    const s = ships.current.get(id);
    s?.target.set((k - (reserve.length - 1) / 2) * 4.2, 0, RESERVE_Z);
  });

  // The round's events, told in the scene one after the other.
  const effects = useRef<Effect[]>([]);
  const clock = useRef(0);
  const fx = useMemo(() => new Group(), []);
  useEffect(() => {
    const t0 = clock.current;
    effects.current = events
      .map((e, k): Effect | null => {
        const x = laneX(e.pass);
        const start = t0 + (live ? k * 0.22 : 0);
        if (e.kind === "fire")
          return {
            kind: "flash",
            at: new Vector3(x + (e.from === "tour" ? -3.9 : 3.9), 3, MOUTH_Z),
            start,
          };
        if (e.kind === "hit")
          return { kind: "flash", at: new Vector3(x, 1.5, MOUTH_Z + 1.5), start };
        if (e.kind === "burn") return { kind: "fire", at: new Vector3(x, 1, MOUTH_Z + 1), start };
        if (e.kind === "down")
          return { kind: "debris", at: new Vector3(x - 3.9, 2, MOUTH_Z - 0.6), start };
        if (e.kind === "ruse") return { kind: "ruse", at: new Vector3(x, 2, MOUTH_Z), start };
        return null;
      })
      .filter((e): e is Effect => !!e);
    for (const e of events)
      if (e.kind === "sunk") {
        const s = ships.current.get(e.ship);
        if (s) s.sunkAt = t0;
      }
  }, [events, live]);
  const flash = useMemo(() => new SphereGeometry(0.6, 14, 10), []);
  const mats = useMemo(
    () => ({
      flash: new MeshBasicMaterial({ color: "#FFE2A8", transparent: true }),
      fire: new MeshBasicMaterial({ color: "#E8743B", transparent: true }),
      debris: new MeshStandardMaterial({ color: COL.wall, transparent: true }),
      ruse: new MeshBasicMaterial({ color: "#6B3A5E", transparent: true }),
    }),
    [],
  );

  // The camera: from the south, three quarters, the three passes and the island in sight.
  useEffect(() => {
    const cam = camera as OrthographicCamera;
    const aspect = size.width / size.height;
    // A phone sees the three passes whole, the island a little smaller.
    const across = phone ? 52 : 46;
    const vh = Math.max((across / aspect) * 0.62, 38);
    cam.left = (-vh * aspect) / 2;
    cam.right = (vh * aspect) / 2;
    cam.top = vh / 2;
    cam.bottom = -vh / 2;
    cam.near = 0.1;
    cam.far = 600;
    cam.updateProjectionMatrix();
  }, [camera, size.width, size.height, phone]);
  const controls = useMemo(() => {
    const home = new Vector3(0, 0, 3);
    const el = CAMERA.elevation;
    const distance = CAMERA.distance;
    camera.position.set(0, Math.sin(el) * distance, home.z + Math.cos(el) * distance);
    camera.lookAt(home);
    const c = new OrbitControls(camera, gl.domElement);
    c.target.copy(home);
    c.enableDamping = true;
    c.dampingFactor = CAMERA.damping;
    c.screenSpacePanning = false;
    c.minZoom = 0.7;
    c.maxZoom = 2.5;
    c.enableRotate = false;
    c.mouseButtons = { LEFT: MOUSE.PAN, MIDDLE: MOUSE.DOLLY, RIGHT: MOUSE.ROTATE };
    c.touches = { ONE: TOUCH.PAN, TWO: TOUCH.DOLLY_PAN };
    return c;
  }, [camera, gl]);
  useEffect(() => () => controls.dispose(), [controls]);

  const tmp = useMemo(() => new Vector3(), []);
  useFrame((_, raw) => {
    const dt = Math.min(0.05, raw);
    clock.current += dt;
    const t = clock.current;
    controls.update();
    // The ships sail to their place; the chosen one rocks; the sunk ones go down, grey.
    for (const [id, s] of ships.current) {
      const g = s.v.group;
      if (s.sunkAt !== null || state.ships[id]?.sunk) {
        const f = Math.min(1, (t - (s.sunkAt ?? t - 2)) / 1.6);
        g.position.y = -1.6 * f;
        g.rotation.z = 0.5 * f;
        continue;
      }
      const k = live ? Math.min(1, dt * 2.2) : 1;
      g.position.lerp(s.target, k);
      g.position.y = chosen === id ? 0.5 + Math.sin(t * 4) * 0.15 : 0;
      if (live) s.v.tick(t);
    }
    // The effects of the round.
    fx.clear();
    for (const e of effects.current) {
      const age = t - e.start;
      if (age < 0 || age > 0.9) continue;
      const f = age / 0.9;
      if (e.kind === "debris") {
        for (let k = 0; k < 4; k++) {
          const m = new Mesh(flash, mats.debris);
          m.scale.setScalar(0.5);
          m.position.set(e.at.x + (k - 1.5) * 0.8, e.at.y + 2 - f * f * 5, e.at.z + (k % 2) * 0.6);
          fx.add(m);
        }
        continue;
      }
      const m = new Mesh(flash, mats[e.kind]);
      m.position.copy(e.at);
      m.scale.setScalar(0.6 + f * 1.8);
      (m.material as MeshBasicMaterial).opacity = 1 - f;
      fx.add(m);
    }
    // The broken seals turn.
    defenses.traverse((o) => {
      if (o.userData.seal) o.rotation.y = t * 1.4;
    });
    // The cards of the passes follow their lane's mouth.
    for (const [pass, el] of pins) {
      tmp.set(laneX(pass), 0, CARD_Z).project(camera);
      const x = (tmp.x * 0.5 + 0.5) * size.width;
      const y = (-tmp.y * 0.5 + 0.5) * size.height;
      el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) translate(-50%, -50%)`;
    }
  });

  const pick = (e: ThreeEvent<MouseEvent>) => {
    if (e.delta > 8) return;
    for (let n: Object3D | null = e.object; n; n = n.parent)
      if (n.userData.lane) {
        e.stopPropagation();
        onLane(n.userData.lane as string);
        return;
      }
  };

  return (
    <>
      <Stage target={controls.target} phone={phone} plain={plain} />
      <primitive object={ground} />
      {/* biome-ignore lint/a11y/useKeyWithClickEvents: every pass has its card, a button. */}
      <primitive object={defenses} onClick={pick} />
      <primitive object={fleet} />
      <primitive object={fx} />
    </>
  );
}
