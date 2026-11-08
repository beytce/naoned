/**
 * The Terraferma on Porcellana's board (docs/plan-terraferme-porcellana.md, lot T2): the tiles of
 * the week's map in instances, each as high as who holds it (the merchant's a step higher), the
 * glaze laid on their tops from one painted sheet, a wave lifting each cell as it changes hands,
 * the mountains and hills in relief, the towns and the camps standing on their cells; the same
 * light, camera and gestures as the Carte. A cell touched is told to `onCell`.
 */
import { type ThreeEvent, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import {
  BoxGeometry,
  CanvasTexture,
  Color,
  ConeGeometry,
  CylinderGeometry,
  Group,
  InstancedBufferAttribute,
  InstancedMesh,
  MOUSE,
  Matrix4,
  Mesh,
  MeshStandardMaterial,
  type OrthographicCamera,
  PlaneGeometry,
  SRGBColorSpace,
  SphereGeometry,
  TOUCH,
  Vector3,
} from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import type { PlaceCardHandle } from "../PlaceCard.js";
import { Stage } from "../Stage.js";
import { palette } from "../TileBoard.js";
import { easeOutCubic } from "../arrival.js";
import { FLIP_SLOW, flipNow, flipZoom } from "../flip.js";
import type { Built } from "../models/model.js";
import { TERRA_MODELS, flagCloth, warCamp } from "../models/terra.js";
import { town } from "../models/towns.js";
import { BOARD, CAMERA, COL, FLIP, ROUGH, SELECT } from "../tokens.js";
import { type BuildingPic, shotsBetween } from "./buildings.js";
import { type FrontDraw, FrontLayer } from "./frontLayer.js";
import { frontHead, frontTone } from "./fronts.js";
import { FLOW_MS, type Flow, flowsBetween } from "./glaze.js";
import { type TerraPicture, flowRegion, paintGlaze } from "./paint.js";

/** The sheet's pixels a cell. */
const PPC = 32;
const PITCH = BOARD.tile + BOARD.gap;
/** Heights of a tile: free land, another's, the merchant's (docs/plan-terraferme-porcellana.md § 1). */
const HEIGHT = { free: BOARD.thick, held: BOARD.thick + 0.35, mine: BOARD.thick + 0.8 };
const RELIEF = { h: 0.3, M: 0.5 } as Record<string, number>;
const WAVE = 2.2;
/** A bombard's ball in the air, then its puff of porcelain dust. */
const SHOT_MS = 1100;
const PUFF_MS = 900;
const backOut = (p: number) => {
  const c = 1.7;
  const q = p - 1;
  return 1 + (c + 1) * q ** 3 + c * q ** 2;
};

export interface TerraIntro {
  start: number;
  px0: number;
}

export interface TerraSceneProps {
  pic: TerraPicture & {
    /** Which holder is the merchant (-1: none). */
    me: number;
    cities: { cell: number; code: string }[];
    /** Each holder's camp (its capital), the holder, and the colour of its flag. */
    camps: { cell: number; holder: number; flag: string }[];
    /** The buildings on the land: the fort, the borough, the port, the bombard, the walls. */
    buildings: BuildingPic[];
    /** The fronts marching: whose, how many men, the merchant's or a threat, what they take next. */
    fronts: {
      id: string;
      owner: number;
      troops: number;
      mine: boolean;
      threat: boolean;
      aim: number;
      next: number[];
    }[];
  };
  chosen: number | null;
  onCell: (cell: number | null) => void;
  /** The HTML labels (towns, camps), positioned each frame on their cell, by their key. */
  labels: Map<string, HTMLElement>;
  /** A cell to centre on at the start (the merchant's camp). */
  home?: number | null;
  /**
   * The way in (porcellana/flip.ts): when it started (`flipNow`), and a map tile's width on the
   * screen then (0: unknown). The board follows the map's draw-back on the camp, a cell as wide as
   * the map's tile, then goes out to the whole map and down to the camp.
   */
  intro?: TerraIntro;
  phone?: boolean;
  /** Cells lit by the dock: a bombard's targets, a front's aim (lot T5). */
  marked?: number[];
  /** The place card, set beside the chosen cell at each frame (lot T5). */
  card?: { current: PlaceCardHandle | null };
}

const PHONE = () => window.innerWidth < 640;

export function TerraBoard({
  pic,
  chosen,
  onCell,
  labels,
  home,
  intro,
  phone,
  marked,
  card,
}: TerraSceneProps) {
  const lit = useMemo(() => new Set(marked ?? []), [marked]);
  const { camera, gl, size } = useThree();
  const live = useMemo(() => !window.matchMedia?.("(prefers-reduced-motion: reduce)").matches, []);
  const P = palette();
  const W = pic.width;
  const H = pic.height;
  const wx = (i: number) => (i - (W - 1) / 2) * PITCH;
  const wz = (j: number) => (j - (H - 1) / 2) * PITCH;

  // The sheet of glaze, painted whole once, then where cells change hands.
  const sheet = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = W * PPC;
    canvas.height = H * PPC;
    const ctx = canvas.getContext("2d");
    const tex = new CanvasTexture(canvas);
    tex.colorSpace = SRGBColorSpace;
    tex.anisotropy = 8;
    return { canvas, ctx, tex };
  }, [W, H]);

  // The land cells, their instances; the water in one piece, lower.
  // biome-ignore lint/correctness/useExhaustiveDependencies: built once for the map's shape.
  const board = useMemo(() => {
    const land: number[] = [];
    const water: number[] = [];
    for (let c = 0; c < W * H; c++) (pic.terrain[c] === "w" ? water : land).push(c);
    const root = new Group();
    const body = new RoundedBoxGeometry(BOARD.tile, 1, BOARD.tile, 2, BOARD.radius);
    body.translate(0, 0.5, 0);
    const bodyMat = new MeshStandardMaterial({ color: "#ffffff", roughness: ROUGH.matt });
    const bodies = new InstancedMesh(body, bodyMat, land.length);
    bodies.castShadow = true;
    bodies.receiveShadow = true;
    // The tops: a plane a tile, its piece of the sheet chosen by the cell it stands on.
    const topGeo = new PlaneGeometry(
      BOARD.tile - BOARD.radius * 1.2,
      BOARD.tile - BOARD.radius * 1.2,
    );
    topGeo.rotateX(-Math.PI / 2);
    const cellAttr = new Float32Array(land.length * 2);
    land.forEach((c, k) => {
      cellAttr[k * 2] = c % W;
      cellAttr[k * 2 + 1] = Math.floor(c / W);
    });
    topGeo.setAttribute("aCell", new InstancedBufferAttribute(cellAttr, 2));
    const inset = (1 - (BOARD.tile - BOARD.radius * 1.2) / PITCH) / 2;
    const topMat = new MeshStandardMaterial({ map: sheet.tex, roughness: ROUGH.matt });
    topMat.onBeforeCompile = (shader) => {
      shader.uniforms.uGrid = { value: [W, H] };
      shader.uniforms.uInset = { value: inset };
      shader.vertexShader = `attribute vec2 aCell;\nuniform vec2 uGrid;\nuniform float uInset;\n${shader.vertexShader.replace(
        "#include <uv_vertex>",
        `#include <uv_vertex>
  vMapUv = vec2(
    (aCell.x + uInset + uv.x * (1.0 - 2.0 * uInset)) / uGrid.x,
    1.0 - (aCell.y + uInset + (1.0 - uv.y) * (1.0 - 2.0 * uInset)) / uGrid.y);`,
      )}`;
    };
    const tops = new InstancedMesh(topGeo, topMat, land.length);
    tops.receiveShadow = true;
    const sea = new InstancedMesh(
      new BoxGeometry(PITCH, 0.5, PITCH),
      new MeshStandardMaterial({ color: COL.water, roughness: ROUGH.water }),
      Math.max(1, water.length),
    );
    sea.receiveShadow = true;
    const m = new Matrix4();
    water.forEach((c, k) => {
      m.makeTranslation(wx(c % W), BOARD.waterY - 0.25, wz(Math.floor(c / W)));
      sea.setMatrixAt(k, m);
    });
    sea.count = water.length;
    // Relief: a pyramid on each mountain, a mound on each hill, unless a town or a camp stands there.
    const taken = new Set([...pic.cities.map((x) => x.cell), ...pic.camps.map((x) => x.cell)]);
    const mounts = land.filter((c) => pic.terrain[c] === "M" && !taken.has(c));
    const hills = land.filter((c) => pic.terrain[c] === "h" && !taken.has(c));
    const pyramid = new ConeGeometry(2.4, 3.2, 4, 1);
    pyramid.rotateY(Math.PI / 4);
    pyramid.translate(0, 1.6, 0);
    const mountMesh = new InstancedMesh(pyramid, P.m("wall", true), Math.max(1, mounts.length));
    mountMesh.castShadow = true;
    mountMesh.count = mounts.length;
    const mound = new SphereGeometry(1.3, 18, 8, 0, Math.PI * 2, 0, Math.PI / 2);
    mound.scale(1, 0.75, 1);
    const hillMesh = new InstancedMesh(mound, P.m("roof"), Math.max(1, hills.length));
    hillMesh.castShadow = true;
    hillMesh.count = hills.length;
    // Only the tiles (and what stands on them) answer a touch.
    for (const mesh of [sea, mountMesh, hillMesh]) mesh.raycast = () => {};
    root.add(bodies, tops, sea, mountMesh, hillMesh);
    // The towns and the camps, each on its cell.
    const standing = new Map<number, Group>();
    for (const [k, c] of pic.cities.entries()) {
      const t = town(P, { seed: c.cell * 7 + k, running: false, size: 2 });
      t.group.scale.setScalar(0.92);
      standing.set(c.cell, t.group);
      root.add(t.group);
    }
    // The camps: the war camp of each holder, its flag at its colour (lot T4).
    const waving: Built[] = [];
    for (const camp of pic.camps) {
      if (standing.has(camp.cell)) continue;
      const built = warCamp(P, flagCloth(camp.flag));
      built.group.traverse((o) => {
        o.castShadow = true;
      });
      waving.push(built);
      standing.set(camp.cell, built.group);
      root.add(built.group);
    }
    const fronts = new FrontLayer(BOARD.tile);
    root.add(fronts.group);
    return {
      root,
      land,
      bodies,
      tops,
      mountMesh,
      hillMesh,
      mounts,
      hills,
      standing,
      fronts,
      waving,
    };
  }, [W, H, sheet]);

  /** The turn of a port toward its water (the model faces +z). */
  const waterSide = (c: number) => {
    const i = c % W;
    const j = Math.floor(c / W);
    if (j + 1 < H && pic.terrain[c + W] === "w") return 0;
    if (i + 1 < W && pic.terrain[c + 1] === "w") return Math.PI / 2;
    if (i > 0 && pic.terrain[c - 1] === "w") return -Math.PI / 2;
    return Math.PI;
  };

  // The fronts to draw: each from its holder's camp to its head.
  const draws = useMemo<FrontDraw[]>(
    () =>
      pic.fronts.map((f) => {
        const camp = pic.camps.find((c) => c.holder === f.owner)?.cell ?? f.aim;
        return {
          id: f.id,
          tone: frontTone(f),
          troops: f.troops,
          from: camp,
          head: frontHead(pic, pic.owner, f, camp),
          next: f.next.slice(0, 2),
        };
      }),
    [pic],
  );
  useEffect(() => () => board.fronts.dispose(), [board]);

  // What changed hands since the last picture: the flows to pour, the sheet to paint again.
  const state = useRef({
    owner: [...pic.owner],
    flows: [] as Flow[],
    /** The flows whose last frame is painted: a slow frame never leaves a cell half poured. */
    settled: new Set<Flow>(),
    painted: false,
    /** The buildings standing (or rising, or razed and sinking), by their cell and kind. */
    builds: new Map<string, { built: Built; cell: number; born: number; dying: number | null }>(),
    /** The bombards' balls in the air: from, to, when. */
    shots: [] as { from: number; to: number; start: number; ball: Mesh; puff: Mesh[] }[],
    first: true,
    t: 0,
    lift: new Float32Array(W * H),
  });
  // biome-ignore lint/correctness/useExhaustiveDependencies: run for each new picture; the palette and the board are the scene's own.
  useEffect(() => {
    const s = state.current;
    const now = performance.now();
    if (!s.painted && sheet.ctx) {
      paintGlaze(sheet.ctx, pic, [], now, PPC);
      sheet.tex.needsUpdate = true;
      s.painted = true;
    }
    const fresh = flowsBetween(pic, s.owner, pic.owner, now);
    // A bombard's shot: the ball flies first, the cells it hits lose their glaze when it lands.
    const hit = new Map<number, number>();
    if (live && !s.first)
      for (const shot of shotsBetween(pic, s.owner, pic.owner, pic.buildings)) {
        const to = shot.cells[0] as number;
        const ball = new Mesh(new SphereGeometry(0.55, 16, 12), P.ink);
        ball.castShadow = true;
        const puff = [0, 1, 2, 3, 4, 5].map(
          () =>
            new Mesh(
              new SphereGeometry(1, 12, 8),
              new MeshStandardMaterial({
                color: COL.trim,
                roughness: ROUGH.matt,
                transparent: true,
              }),
            ),
        );
        for (const m of [ball, ...puff]) {
          m.visible = false;
          board.root.add(m);
        }
        s.shots.push({ from: shot.from, to, start: now, ball, puff });
        for (const c of shot.cells) hit.set(c, now + SHOT_MS);
      }
    if (fresh.length) {
      // A few at a time, one after the other, as the fronts take them.
      fresh.forEach((f, k) => {
        f.start = hit.get(f.cell) ?? now + (live ? Math.min(k, 24) * 90 : -FLOW_MS);
      });
      s.flows = [...s.flows.filter((f) => !s.settled.has(f)), ...fresh];
      s.settled.clear();
    }
    s.owner = [...pic.owner];
    // The buildings: a new one rises into place, one gone (razed with its cell) sinks away.
    const flagOfHolder = new Map(pic.camps.map((c) => [c.holder, c.flag]));
    const want = new Set<string>();
    for (const b of pic.buildings) {
      const key = `${b.cell}:${b.kind}`;
      want.add(key);
      const had = s.builds.get(key);
      if (had) {
        had.dying = null;
        continue;
      }
      const built = TERRA_MODELS[b.kind](P, flagCloth(flagOfHolder.get(b.owner) ?? COL.ink));
      built.group.traverse((o) => {
        o.castShadow = true;
      });
      if (b.kind === "porto") built.group.rotation.y = waterSide(b.cell);
      board.root.add(built.group);
      s.builds.set(key, { built, cell: b.cell, born: s.first || !live ? -1e9 : now, dying: null });
    }
    for (const [key, b] of s.builds)
      if (!want.has(key) && b.dying === null) b.dying = live ? now : -1e9;
    s.first = false;
    if (sheet.ctx && fresh.length && !live) {
      paintGlaze(sheet.ctx, pic, [], now, PPC);
      sheet.tex.needsUpdate = true;
    }
  }, [pic, sheet, live]);

  useEffect(() => {
    const cam = camera as OrthographicCamera;
    const aspect = size.width / size.height;
    const vh = Math.max((H * PITCH) / 1.05, (W * PITCH * 0.8) / aspect);
    cam.left = (-vh * aspect) / 2;
    cam.right = (vh * aspect) / 2;
    cam.top = vh / 2;
    cam.bottom = -vh / 2;
    cam.near = 0.1;
    cam.far = 2000;
    cam.updateProjectionMatrix();
  }, [camera, size.width, size.height, W, H]);

  const target = useMemo(() => new Vector3(), []);
  const controls = useMemo(() => {
    const { azimuth: az, elevation: el } = CAMERA;
    const d = Math.max(W, H) * PITCH * 1.4;
    camera.position.set(
      Math.sin(az) * Math.cos(el) * d,
      Math.sin(el) * d,
      Math.cos(az) * Math.cos(el) * d,
    );
    camera.lookAt(0, 0, 0);
    const c = new OrbitControls(camera, gl.domElement);
    c.enableDamping = true;
    c.dampingFactor = CAMERA.damping;
    c.screenSpacePanning = false;
    c.minZoom = 0.8;
    c.maxZoom = 6;
    c.minPolarAngle = CAMERA.minPolar;
    c.maxPolarAngle = CAMERA.maxPolar;
    c.mouseButtons = { LEFT: MOUSE.PAN, MIDDLE: MOUSE.DOLLY, RIGHT: MOUSE.ROTATE };
    c.touches = { ONE: TOUCH.PAN, TWO: TOUCH.DOLLY_ROTATE };
    return c;
  }, [camera, gl, W, H]);
  useEffect(() => () => controls.dispose(), [controls]);

  // The camera glides to the merchant's camp at the start, and to the cell chosen.
  const fly = useRef({
    from: new Vector3(),
    to: new Vector3(),
    z0: 1,
    z1: 1,
    t: 1,
    last: "",
    span: SELECT.fly as number,
    /** The way in, while the board follows the map's draw-back. */
    intro: null as TerraIntro | null,
    /** A flight to take once this one lands (the way in: out to the whole map, then the camp). */
    next: null as { to: Vector3; z1: number; span: number } | null,
  });
  const m = useMemo(() => new Matrix4(), []);
  const colour = useMemo(() => new Color(), []);
  const porcelain = useMemo(() => new Color(COL.wall), []);
  const tmp = useMemo(() => new Vector3(), []);
  const tints = useMemo(() => new Map<string, Color>(), []);
  const tintOf = (hex: string) => {
    let c = tints.get(hex);
    if (!c) {
      c = new Color(hex);
      tints.set(hex, c);
    }
    return c;
  };
  const heightOf = (h: number, c: number) =>
    (h < 0 ? HEIGHT.free : h === pic.me ? HEIGHT.mine : HEIGHT.held) +
    (RELIEF[pic.terrain[c] ?? "p"] ?? 0);

  useFrame((_, rawDt) => {
    const dt = Math.min(0.05, rawDt);
    const s = state.current;
    s.t += dt;
    const now = performance.now();
    const cam = camera as OrthographicCamera;
    const f = fly.current;
    const want = `${chosen ?? ""}|${home ?? ""}|${size.width}x${size.height}`;
    if (want !== f.last) {
      const first = f.last === "";
      f.last = want;
      f.from.copy(controls.target);
      const at = chosen ?? home ?? null;
      if (at !== null) f.to.set(wx(at % W), 0, wz(Math.floor(at / W)));
      else f.to.set(0, 0, 0);
      f.z0 = cam.zoom;
      f.z1 =
        chosen !== null
          ? (phone ?? PHONE())
            ? 2.6
            : 2.2
          : home != null
            ? (phone ?? PHONE())
              ? 2.4
              : 1.6
            : 1;
      f.t = live && !first ? 0 : 1;
      f.span = SELECT.fly as number;
      f.intro = null;
      f.next = null;
      // The way in: the board starts where the map's draw-back is, on the camp.
      if (first && live && intro) {
        f.intro = intro;
        f.t = 1;
      }
      if (f.t === 1 && !f.intro) {
        camera.position.add(f.to.clone().sub(controls.target));
        controls.target.copy(f.to);
        cam.zoom = f.z1;
        cam.updateProjectionMatrix();
      }
    }
    if (f.intro) {
      const t = flipNow() - f.intro.start;
      const unit = size.height / (cam.top - cam.bottom);
      if (t < FLIP.zoomFrom + FLIP.zoomFor && f.intro.px0 > 0 && home != null) {
        // As the map draws back over the Campo: the camp under it, a cell as wide as a tile.
        tmp.set(wx(home % W), 0, wz(Math.floor(home / W)));
        camera.position.add(tmp.clone().sub(controls.target));
        controls.target.copy(tmp);
        cam.zoom = Math.max(0.05, (f.intro.px0 * flipZoom(t)) / (PITCH * unit));
        cam.updateProjectionMatrix();
      } else {
        // Then out to the whole map, and down to the merchant's lands.
        const z1 = f.z1;
        const to = f.to.clone();
        f.intro = null;
        f.from.copy(controls.target);
        f.to.set(0, 0, 0);
        f.z0 = cam.zoom;
        f.z1 = 1;
        f.t = 0;
        f.span = FLIP.reveal * FLIP_SLOW;
        f.next = { to, z1, span: FLIP.settle * FLIP_SLOW };
      }
    } else if (f.t < 1) {
      f.t = Math.min(1, f.t + dt / f.span);
      const k = easeOutCubic(f.t);
      const next = f.from.clone().lerp(f.to, k);
      camera.position.add(next.clone().sub(controls.target));
      controls.target.copy(next);
      cam.zoom = f.z0 + (f.z1 - f.z0) * k;
      cam.updateProjectionMatrix();
      if (f.t >= 1 && f.next) {
        f.from.copy(f.to);
        f.to.copy(f.next.to);
        f.z0 = f.z1;
        f.z1 = f.next.z1;
        f.span = f.next.span;
        f.t = 0;
        f.next = null;
      }
    }
    controls.update();
    target.copy(controls.target);

    // The glaze where it pours.
    const pending = s.flows.filter((fl) => !s.settled.has(fl));
    const region = flowRegion(pic, pending, now, Number.POSITIVE_INFINITY);
    if (region && sheet.ctx) {
      paintGlaze(sheet.ctx, pic, s.flows, now, PPC, region);
      sheet.tex.needsUpdate = true;
    }
    for (const fl of pending) if (now >= fl.start + FLOW_MS) s.settled.add(fl);
    const pouring = new Map<number, Flow>();
    for (const fl of s.flows)
      if (now >= fl.start - FLOW_MS && now < fl.start + FLOW_MS) pouring.set(fl.cell, fl);

    // Each tile: its height (who holds it, the wave as it changes hands, the lift when chosen).
    const { land, bodies, tops } = board;
    const ripple = new Float32Array(W * H);
    for (const fl of pouring.values()) {
      const p = (now - fl.start) / FLOW_MS;
      if (p < 0 || p > 1) continue;
      const w = 0.35 * Math.sin(Math.PI * Math.min(1, Math.max(0, (p - 0.15) / 0.85)));
      for (const n of [fl.cell - 1, fl.cell + 1, fl.cell - W, fl.cell + W])
        if (n >= 0 && n < W * H) ripple[n] = (ripple[n] ?? 0) + w;
    }
    const heights = new Float32Array(W * H);
    land.forEach((c, k) => {
      const holder = pic.owner[c] ?? -1;
      const fl = pouring.get(c);
      let h = heightOf(holder, c);
      let tint = holder;
      if (fl) {
        const p = Math.min(1, Math.max(0, (now - fl.start) / FLOW_MS));
        const e = easeOutCubic(p);
        h =
          heightOf(fl.from, c) +
          (h - heightOf(fl.from, c)) * e +
          WAVE * Math.sin(Math.PI * p) * (1 - p * 0.3);
        if (p < 0.5) tint = fl.from;
      }
      h += ripple[c] ?? 0;
      const want = c === chosen ? SELECT.lift * 2 : 0;
      s.lift[c] = (s.lift[c] ?? 0) + (want - (s.lift[c] ?? 0)) * (live ? SELECT.liftEase : 1);
      const y = s.lift[c] ?? 0;
      heights[c] = h + y;
      const x = wx(c % W);
      const z = wz(Math.floor(c / W));
      m.makeScale(1, h, 1).setPosition(x, y, z);
      bodies.setMatrixAt(k, m);
      m.makeTranslation(x, h + y + 0.01, z);
      tops.setMatrixAt(k, m);
      // The sides take a little of the holder's glaze.
      const st = tint >= 0 ? pic.styles[tint] : undefined;
      colour.copy(porcelain);
      if (st) colour.lerp(tintOf(st.colour), Math.min(0.7, st.alpha * 1.05));
      if (c === chosen) colour.lerp(tintOf("#C23B2E"), SELECT.blush);
      else if (lit.has(c)) colour.lerp(tintOf("#C23B2E"), 0.18 + 0.12 * Math.sin(s.t * 4) ** 2);
      bodies.setColorAt(k, colour);
    });
    bodies.instanceMatrix.needsUpdate = true;
    if (bodies.instanceColor) bodies.instanceColor.needsUpdate = true;
    tops.instanceMatrix.needsUpdate = true;
    // The relief gives way to what is built on it.
    const built = new Set(
      [...s.builds.values()].filter((b) => b.dying === null).map((b) => b.cell),
    );
    board.mounts.forEach((c, k) => {
      if (built.has(c)) m.makeScale(0, 0, 0);
      else m.makeTranslation(wx(c % W), heights[c] ?? 0, wz(Math.floor(c / W)));
      board.mountMesh.setMatrixAt(k, m);
    });
    board.mountMesh.instanceMatrix.needsUpdate = true;
    board.hills.forEach((c, k) => {
      if (built.has(c)) m.makeScale(0, 0, 0);
      else m.makeTranslation(wx(c % W) + 0.4, heights[c] ?? 0, wz(Math.floor(c / W)) + 0.3);
      board.hillMesh.setMatrixAt(k, m);
    });
    // The buildings rise into place, sink when razed; their flags wave.
    for (const [key, b] of s.builds) {
      const h = heights[b.cell] ?? HEIGHT.free;
      const g = b.built.group;
      let y = h;
      let k = 1;
      if (b.dying !== null) {
        const p = (now - b.dying) / 1400;
        if (p >= 1) {
          board.root.remove(g);
          s.builds.delete(key);
          continue;
        }
        y = h - easeOutCubic(p) * 4;
        k = 1 - 0.4 * p;
      } else {
        const p = Math.min(1, Math.max(0, (now - b.born) / 700));
        y = h - (1 - backOut(p)) * 5;
      }
      g.position.set(wx(b.cell % W), y, wz(Math.floor(b.cell / W)));
      g.scale.setScalar(k);
      if (live) b.built.tick?.(s.t, dt);
    }
    if (live) for (const w of board.waving) w.tick?.(s.t, dt);
    // The bombards' balls: an arc from the gun to the cell, then a puff of dust.
    s.shots = s.shots.filter((sh) => {
      const p = (now - sh.start) / SHOT_MS;
      const a = new Vector3(
        wx(sh.from % W),
        (heights[sh.from] ?? HEIGHT.free) + 2.2,
        wz(Math.floor(sh.from / W)),
      );
      const b = new Vector3(
        wx(sh.to % W),
        (heights[sh.to] ?? HEIGHT.free) + 0.6,
        wz(Math.floor(sh.to / W)),
      );
      if (p < 1) {
        sh.ball.visible = p >= 0;
        const q = Math.max(0, p);
        sh.ball.position.lerpVectors(a, b, q);
        sh.ball.position.y += Math.sin(Math.PI * q) * (6 + a.distanceTo(b) * 0.35);
        return true;
      }
      sh.ball.visible = false;
      const f = (now - sh.start - SHOT_MS) / PUFF_MS;
      if (f >= 1) {
        for (const o of [sh.ball, ...sh.puff]) board.root.remove(o);
        return false;
      }
      sh.puff.forEach((o, i) => {
        const ang = (i / sh.puff.length) * Math.PI * 2;
        o.visible = true;
        o.position.set(
          b.x + Math.cos(ang) * (0.6 + f * 2.2),
          b.y + 0.5 + f * 1.6 + (i % 2) * 0.4,
          b.z + Math.sin(ang) * (0.6 + f * 2.2),
        );
        o.scale.setScalar(0.9 + f * 0.6);
        (o.material as MeshStandardMaterial).opacity = 1 - f;
      });
      return true;
    });
    board.hillMesh.instanceMatrix.needsUpdate = true;
    for (const [c, g] of board.standing)
      g.position.set(wx(c % W), heights[c] ?? 0, wz(Math.floor(c / W)));
    // A camp stands while its holder keeps its cell; taken, it is gone.
    for (const camp of pic.camps) {
      const g = board.standing.get(camp.cell);
      if (g && !pic.cities.some((x) => x.cell === camp.cell))
        g.visible = pic.owner[camp.cell] === camp.holder;
    }

    // The labels follow their cells.
    // The fronts: their ribbons from the camps to the heads, the next cells marked.
    board.fronts.update(
      draws,
      (c) => new Vector3(wx(c % W), heights[c] ?? HEIGHT.free, wz(Math.floor(c / W))),
      dt,
      live,
    );
    for (const [key, el] of labels) {
      if (key.startsWith("front:")) {
        const at = board.fronts.headOf(key.split(":")[2] ?? "");
        if (!at) continue;
        tmp.set(at.x, at.y + 4.6, at.z).project(camera);
        el.style.transform = `translate(${((tmp.x * 0.5 + 0.5) * size.width).toFixed(1)}px,${((-tmp.y * 0.5 + 0.5) * size.height).toFixed(1)}px)`;
        el.dataset.out = "true";
        continue;
      }
      const c = Number(key.split(":")[1]);
      if (!Number.isFinite(c)) continue;
      tmp.set(wx(c % W), (heights[c] ?? 0) + 3.2, wz(Math.floor(c / W))).project(camera);
      const x = (tmp.x * 0.5 + 0.5) * size.width;
      const y = (-tmp.y * 0.5 + 0.5) * size.height;
      el.style.transform = `translate(${x.toFixed(1)}px,${y.toFixed(1)}px)`;
      el.dataset.out = String(cam.zoom > 1.3 || key.startsWith("camp:"));
    }
    // The card beside the chosen cell.
    if (chosen !== null && card?.current) {
      tmp
        .set(wx(chosen % W), (heights[chosen] ?? 0) + 1.5, wz(Math.floor(chosen / W)))
        .project(camera);
      card.current.place(
        (tmp.x * 0.5 + 0.5) * size.width,
        (-tmp.y * 0.5 + 0.5) * size.height,
        size.width,
        size.height,
      );
    }
  });

  const cellOf = (e: ThreeEvent<MouseEvent>) => {
    if (e.instanceId !== undefined && (e.object === board.bodies || e.object === board.tops))
      return board.land[e.instanceId] ?? null;
    for (let o: typeof e.object | null = e.object; o; o = o.parent)
      for (const [c, g] of board.standing) if (g === o) return c;
    return null;
  };
  return (
    <>
      <Stage
        target={target}
        phone={phone ?? PHONE()}
        scale={Math.max(1, (Math.max(W, H) * PITCH) / 90)}
      />
      {/* biome-ignore lint/a11y/useKeyWithClickEvents: the board is reached by touch; its places by their labels. */}
      <primitive
        object={board.root}
        onClick={(e: ThreeEvent<MouseEvent>) => {
          if (e.delta > 6) return;
          e.stopPropagation();
          const c = cellOf(e);
          onCell(c === chosen ? null : c);
        }}
        onPointerMove={(e: ThreeEvent<PointerEvent>) => {
          gl.domElement.classList.toggle("pc-hot", e.instanceId !== undefined);
        }}
        onPointerOut={() => gl.domElement.classList.remove("pc-hot")}
      />
    </>
  );
}
