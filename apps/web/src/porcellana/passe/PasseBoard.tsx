/**
 * The board of the Passe in Porcellana (docs/plan-passe.md P5): the kit's square tiles falling into
 * place, the four banks with their rails (accent for the thread's, ink for the chain's), a groove on
 * each free cell along the current, the barges and the posts dropping where they are laid, the
 * ribbon and the chain drawing themselves between the pieces that hold together.
 */
import {
  PASSE_CHAIN,
  PASSE_EMPTY,
  PASSE_REEF,
  PASSE_THREAD,
  type PasseState,
  passeLinks,
  passeWinningLine,
} from "@comptoirs/engine";
import { type ThreeEvent, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import {
  CircleGeometry,
  Group,
  MOUSE,
  Mesh,
  MeshBasicMaterial,
  type Object3D,
  type OrthographicCamera,
  RingGeometry,
  TOUCH,
  Vector3,
} from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { Stage } from "../Stage.js";
import { palette } from "../TileBoard.js";
import { easeOutBack, tileDelay, tileDrop } from "../arrival.js";
import { rocks } from "../models/decor.js";
import { slab } from "../models/ground.js";
import { bank, barge, chainLink, post, threadLink } from "../models/passe.js";
import { box } from "../shapes.js";
import { BOARD, CAMERA, COL } from "../tokens.js";

const S = BOARD.tile + BOARD.gap;

export interface PasseMarks {
  /** The cell of the last piece laid or burnt, ringed in ink. */
  last: number;
  /** The cells a special piece may strike now, ringed in accent. */
  aim: number[];
  /** A cell pointed at (a problem's key), ringed in accent and breathing. */
  hint: number;
  /**
   * The threat on the board (docs/audit-visuel-2026-11-11): each side's shortest way to its banks,
   * dots of accent for the thread and of ink for the chain, and the cell both need, ringed.
   */
  ways?: { thread: number[]; chain: number[]; decide: number };
}

interface Piece {
  kind: number;
  group: Group;
  born: number;
}

function cellOf(o: Object3D | null): number {
  for (let n = o; n; n = n.parent) if (typeof n.userData.cell === "number") return n.userData.cell;
  return -1;
}

export function PasseBoard({
  state,
  marks,
  onCell,
  phone,
  plain,
}: {
  state: PasseState;
  marks: PasseMarks;
  onCell: (i: number) => void;
  phone: boolean;
  plain: boolean;
}) {
  const { camera, gl, size } = useThree();
  const live = useMemo(() => !window.matchMedia?.("(prefers-reduced-motion: reduce)").matches, []);
  const P = palette(false);
  const { width: W, height: H } = state;
  const wx = (x: number) => (x - (W - 1) / 2) * S;
  const wz = (y: number) => (y - (H - 1) / 2) * S;
  const centre = (i: number) => new Vector3(wx(i % W), 0, wz(Math.floor(i / W)));
  // On a phone the board is seen from higher: its cells are taller under the thumb.
  const tilt = phone ? 0.92 : CAMERA.elevation;
  const reefs = state.cells.map((v) => (v === PASSE_REEF ? "#" : ".")).join("");

  // The board itself: built once for a size and its reefs.
  // biome-ignore lint/correctness/useExhaustiveDependencies: the reefs' signature stands for the cells.
  const board = useMemo(() => {
    const root = new Group();
    const tiles: { group: Group; groove: Group; delay: number }[] = [];
    for (let y = 0; y < H; y++)
      for (let x = 0; x < W; x++) {
        const i = y * W + x;
        const g = new Group();
        g.position.set(wx(x), 0, wz(y));
        g.userData.cell = i;
        g.add(slab(P, false));
        // The current: an arrow from south-west to north-east, where two pieces also hold.
        const groove = new Group();
        g.add(groove);
        groove.rotation.y = Math.PI / 4;
        box(groove, 2.6, 0.06, 0.24, 0, 0, 0, P.m("open"), 0.03).castShadow = false;
        for (const side of [-1, 1]) {
          const head = box(groove, 0.9, 0.06, 0.24, 0.98, 0, side * 0.3, P.m("open"), 0.03);
          head.rotation.y = side * 0.75;
          head.castShadow = false;
        }
        if (reefs[i] === "#") {
          const r = rocks(P, { seed: i + 3, running: false });
          g.add(r.group);
          groove.visible = false;
        }
        root.add(g);
        tiles.push({ group: g, groove, delay: tileDelay(x, y) });
      }
    // The banks: the thread's to the south and the north, the chain's to the west and the east.
    const off = (n: number) => (n * S) / 2 + 1.55;
    const south = bank(P, W * S - BOARD.gap, P.accent);
    south.position.set(0, 0, off(H));
    const north = bank(P, W * S - BOARD.gap, P.accent);
    north.position.set(0, 0, -off(H));
    const west = bank(P, H * S - BOARD.gap, P.ink);
    west.position.set(-off(W), 0, 0);
    west.rotation.y = Math.PI / 2;
    const east = bank(P, H * S - BOARD.gap, P.ink);
    east.position.set(off(W), 0, 0);
    east.rotation.y = Math.PI / 2;
    const banks = [south, north, west, east];
    for (const b of banks) root.add(b);
    const links = new Group();
    root.add(links);
    const ring = (colour: string, inner: number, outer: number) => {
      const m = new Mesh(
        new RingGeometry(inner, outer, 56),
        new MeshBasicMaterial({ color: colour, transparent: true, opacity: 0, toneMapped: false }),
      );
      m.rotation.x = -Math.PI / 2;
      m.renderOrder = 2;
      root.add(m);
      return m;
    };
    const accent = `#${P.accentColour.getHexString()}`;
    const dot = (colour: string) => {
      const m = new Mesh(
        new CircleGeometry(1.15, 28),
        new MeshBasicMaterial({ color: colour, transparent: true, opacity: 0, toneMapped: false }),
      );
      m.rotation.x = -Math.PI / 2;
      m.renderOrder = 2;
      root.add(m);
      return m;
    };
    return {
      root,
      tiles,
      banks,
      links,
      last: ring(COL.ink, 2.45, 2.62),
      hover: ring(accent, 2.3, 2.5),
      hint: ring(accent, 2.2, 2.55),
      aims: Array.from({ length: 8 }, () => ring(accent, 2.3, 2.55)),
      decide: ring(COL.ink, 2.05, 2.4),
      dots: {
        thread: Array.from({ length: W * H }, () => dot(accent)),
        chain: Array.from({ length: W * H }, () => dot(COL.ink)),
      },
    };
  }, [P, W, H, reefs]);

  const pieces = useRef(new Map<number, Piece>());
  const clock = useRef({ t: live ? 0 : 10 });
  const hover = useRef(-1);

  // The pieces follow the state: a barge or a post drops where one was laid, a burnt one goes.
  // biome-ignore lint/correctness/useExhaustiveDependencies: the board's change clears the pieces.
  useEffect(() => {
    const map = pieces.current;
    for (const [i, p] of map) {
      if (p.group.parent !== board.tiles[i]?.group) map.delete(i);
    }
    state.cells.forEach((v, i) => {
      const want = v === PASSE_THREAD || v === PASSE_CHAIN ? v : 0;
      const have = map.get(i);
      if (have && have.kind !== want) {
        have.group.removeFromParent();
        map.delete(i);
      }
      if (want && !map.has(i)) {
        const group = want === PASSE_THREAD ? barge(P) : post(P);
        board.tiles[i]?.group.add(group);
        map.set(i, { kind: want, group, born: clock.current.t });
      }
      const tile = board.tiles[i];
      if (tile) tile.groove.visible = v === PASSE_EMPTY;
    });
    // What holds together: the ribbon between barges, the chain between posts and reefs, and to the banks.
    board.links.clear();
    const edge = (n: number) => (n * S) / 2 + 0.6;
    for (const [a, b] of passeLinks(state, 1)) board.links.add(threadLink(P, centre(a), centre(b)));
    for (const [a, b] of passeLinks(state, 2)) board.links.add(chainLink(P, centre(a), centre(b)));
    state.cells.forEach((v, i) => {
      const x = i % W;
      const y = Math.floor(i / W);
      const c = centre(i);
      if (v === PASSE_THREAD && (y === 0 || y === H - 1))
        board.links.add(threadLink(P, c, new Vector3(c.x, 0, y === 0 ? -edge(H) : edge(H))));
      if ((v === PASSE_CHAIN || v === PASSE_REEF) && (x === 0 || x === W - 1))
        board.links.add(chainLink(P, c, new Vector3(x === 0 ? -edge(W) : edge(W), 0, c.z)));
    });
  }, [state, board]);

  // The camera: the kit's three quarters, wide enough for the board and its banks, the board above the dock.
  useEffect(() => {
    const cam = camera as OrthographicCamera;
    const aspect = size.width / size.height;
    const across = ((W + H) * S) / Math.SQRT2 + 7;
    const vh = Math.max(across / aspect, across * Math.sin(tilt) + 30);
    cam.left = (-vh * aspect) / 2;
    cam.right = (vh * aspect) / 2;
    cam.top = vh / 2;
    cam.bottom = -vh / 2;
    cam.near = 0.1;
    cam.far = 500;
    cam.updateProjectionMatrix();
  }, [camera, size.width, size.height, W, H, tilt]);

  const controls = useMemo(() => {
    // What is aimed at stands a little south-east of the middle: the board rises clear of the dock.
    const d = phone ? S * 1.5 : S * 0.6;
    const home = new Vector3(d, 0, d);
    const { azimuth: az, distance } = CAMERA;
    const el = tilt;
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
    c.minZoom = 0.6;
    c.maxZoom = 2.5;
    c.minPolarAngle = CAMERA.minPolar;
    c.maxPolarAngle = CAMERA.maxPolar;
    c.mouseButtons = { LEFT: MOUSE.PAN, MIDDLE: MOUSE.DOLLY, RIGHT: MOUSE.ROTATE };
    c.touches = { ONE: TOUCH.PAN, TWO: TOUCH.DOLLY_ROTATE };
    return c;
  }, [camera, gl, phone, tilt]);
  useEffect(() => () => controls.dispose(), [controls]);

  const line = useMemo(() => new Set(passeWinningLine(state)), [state]);

  useFrame((_, rawDt) => {
    const dt = Math.min(0.05, rawDt);
    const c = clock.current;
    c.t += dt;
    controls.update();
    for (const [i, t] of board.tiles.entries()) {
      const drop = tileDrop(c.t, t.delay);
      const won = line.has(i) ? 0.28 + (live ? Math.sin(c.t * 4 + i) * 0.12 : 0) : 0;
      t.group.position.y = drop.y + won;
      t.group.visible = drop.visible;
    }
    const landed = c.t > 1.1;
    for (const b of board.banks) b.visible = landed;
    board.links.visible = landed;
    for (const p of pieces.current.values()) {
      const k = live ? easeOutBack((c.t - p.born) / 0.42) : 1;
      p.group.position.y = (1 - k) * 5;
      p.group.scale.setScalar(Math.max(0.001, 0.55 + 0.45 * k));
    }
    const put = (m: Mesh, i: number, want: number, lift = 0.05) => {
      const mat = m.material as MeshBasicMaterial;
      if (i >= 0) {
        const at = centre(i);
        m.position.set(at.x, lift, at.z);
      }
      mat.opacity += ((i >= 0 ? want : 0) - mat.opacity) * 0.2;
      m.visible = mat.opacity > 0.01;
    };
    put(board.last, state.cells[marks.last] ? marks.last : -1, 0.55, 0.045);
    const h = hover.current;
    put(board.hover, h >= 0 && state.cells[h] === PASSE_EMPTY && !state.winner ? h : -1, 0.8);
    put(board.hint, marks.hint, 0.55 + (live ? Math.sin(c.t * 5) * 0.35 : 0.3), 0.06);
    board.aims.forEach((m, k) => put(m, marks.aim[k] ?? -1, 0.9, 2.4));
    const w = marks.ways;
    board.dots.thread.forEach((m, k) => put(m, w?.thread[k] ?? -1, 0.7, 0.07));
    board.dots.chain.forEach((m, k) => put(m, w?.chain[k] ?? -1, 0.6, 0.08));
    put(board.decide, w && w.decide >= 0 ? w.decide : -1, 0.85, 0.09);
  });

  const pick = (e: ThreeEvent<MouseEvent>) => {
    // A drag of the board is not a piece laid.
    if (e.delta > 8) return;
    const i = cellOf(e.object);
    if (i < 0) return;
    e.stopPropagation();
    onCell(i);
  };
  const over = (e: ThreeEvent<PointerEvent>) => {
    hover.current = e.pointerType === "mouse" ? cellOf(e.object) : -1;
  };

  return (
    <>
      <Stage target={controls.target} phone={phone} plain={plain} />
      {/* biome-ignore lint/a11y/useKeyWithClickEvents: the keyboard reaches each cell by its button (the hidden grid). */}
      <primitive
        object={board.root}
        onClick={pick}
        onPointerMove={over}
        onPointerOut={() => {
          hover.current = -1;
        }}
      />
    </>
  );
}
