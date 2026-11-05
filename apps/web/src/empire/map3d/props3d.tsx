/**
 * The 3D map's models made in code (decision of the owner, 3 November 2026: more of them, after his
 * references): fields of clay slabs fenced in wood, a mill whose sails turn, barrels, a cart at
 * rest, tufts of grass, pebbles, patches of sand, a mine's mouth, and the towns' monuments (Venice's
 * campanile, Padua's domes). Each is one geometry coloured by its vertices in the night board's
 * palette (props.ts `C`), drawn with the clay material, many at once where they repeat.
 */
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import {
  BoxGeometry,
  BufferAttribute,
  type BufferGeometry,
  ConeGeometry,
  CylinderGeometry,
  DodecahedronGeometry,
  type Group,
  SphereGeometry,
} from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { C } from "../../art/plateau/props.js";
import { clay } from "./kit.js";
import { linear } from "./recolor.js";

/** A geometry painted one colour (its vertices), for the clay material. */
function paint(g: BufferGeometry, hex: string): BufferGeometry {
  const geo = g.index ? g.toNonIndexed() : g;
  const [r, gg, b] = linear(hex);
  const n = geo.getAttribute("position").count;
  const col = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    col[3 * i] = r;
    col[3 * i + 1] = gg;
    col[3 * i + 2] = b;
  }
  geo.setAttribute("color", new BufferAttribute(col, 3));
  if (geo.getAttribute("uv")) geo.deleteAttribute("uv");
  return geo;
}

/** Parts put together: each `[geometry, colour, x, y, z, ry?]`. */
function build(parts: [BufferGeometry, string, number, number, number, number?][]): BufferGeometry {
  return mergeGeometries(
    parts.map(([g, hex, x, y, z, ry]) => {
      const p = paint(g.clone(), hex);
      if (ry) p.rotateY(ry);
      p.translate(x, y, z);
      return p;
    }),
    false,
  ) as BufferGeometry;
}

/** A soft slab (a box with a little bevel, seen as clay): w × h × d, its foot at y = 0. */
const slab = (w: number, h: number, d: number) => {
  const g = new BoxGeometry(w, h, d, 1, 1, 1);
  g.translate(0, h / 2, 0);
  return g;
};

/** A fence: posts and two rails, `len` long along x. */
function fence(len: number): [BufferGeometry, string, number, number, number, number?][] {
  const parts: [BufferGeometry, string, number, number, number, number?][] = [];
  const n = Math.max(2, Math.round(len / 1.6));
  for (let i = 0; i <= n; i++)
    parts.push([slab(0.22, 1.1, 0.22), C.trunk, -len / 2 + (len * i) / n, 0, 0]);
  parts.push([slab(len, 0.14, 0.12), C.wood, 0, 0.45, 0]);
  parts.push([slab(len, 0.14, 0.12), C.wood, 0, 0.85, 0]);
  return parts;
}

/**
 * A gondola moored by a landing, rocking on the lagoon while the board lives (still when less
 * motion is asked).
 */
export function Gondola({
  x,
  z,
  y,
  rot,
  live,
}: { x: number; z: number; y: number; rot: number; live: boolean }) {
  const g = useRef<Group>(null);
  const t0 = useRef(Math.random() * 10);
  useFrame((_, dt) => {
    if (!live || !g.current) return;
    t0.current += Math.min(dt, 0.1);
    const t = t0.current;
    g.current.rotation.x = Math.sin(t * 1.3) * 0.05;
    g.current.rotation.z = Math.sin(t * 0.9) * 0.03;
    g.current.position.y = Math.sin(t * 1.1) * 0.08;
  });
  return (
    <group position={[x, y, z]} rotation-y={-rot}>
      <group ref={g}>
        <mesh geometry={MADE.gondola} material={clay} castShadow />
      </group>
    </group>
  );
}

/** The fondaco's points (its own units): the flag on its tower, the smoke over its chimney. */
export const FONDACO = { flag: [-2.65, 6.85, -1.55], smoke: [2, 6.4, -0.8] } as const;

/** The verdigris of Venice's copper spires (St Mark's campanile). */
const VERDIGRIS = "#7FB8A2";

/** The made models, built once. */
export const MADE = (() => {
  // A field: six slabs of tilled clay on a bed of sand, a fence on two sides.
  const field = build([
    [slab(8.4, 0.25, 6.4), C.land, 0, 0, 0],
    ...[-2.6, 0, 2.6].flatMap((x): [BufferGeometry, string, number, number, number][] => [
      [slab(2.2, 0.55, 2.5), C.brick, x, 0.2, -1.5],
      [slab(2.2, 0.55, 2.5), C.brick, x, 0.2, 1.5],
    ]),
    ...fence(8.6).map(([g, c, x, y, z]): [BufferGeometry, string, number, number, number] => [
      g,
      c,
      x,
      y,
      z - 3.4,
    ]),
    ...fence(6.6).map(
      ([g, c, x, y, z]): [BufferGeometry, string, number, number, number, number] => [
        g,
        c,
        z - 4.3,
        y,
        x,
        Math.PI / 2,
      ],
    ),
  ]);
  const barrel = build([
    [new CylinderGeometry(0.55, 0.55, 1.2, 10).translate(0, 0.6, 0), C.wood, 0, 0, 0],
    [new CylinderGeometry(0.58, 0.58, 0.12, 10).translate(0, 0.35, 0), C.trunk, 0, 0, 0],
    [new CylinderGeometry(0.58, 0.58, 0.12, 10).translate(0, 0.85, 0), C.trunk, 0, 0, 0],
  ]);
  const tuft = build([
    [new ConeGeometry(0.22, 0.9, 5).translate(0, 0.45, 0), C.pine, 0, 0, 0],
    [new ConeGeometry(0.18, 0.7, 5).translate(0, 0.35, 0), C.pine, 0.3, 0, 0.15],
    [new ConeGeometry(0.16, 0.6, 5).translate(0, 0.3, 0), C.pineMuted, -0.25, 0, 0.2],
  ]);
  const pebble = build([[new DodecahedronGeometry(0.45, 0).scale(1, 0.6, 1), C.rock, 0, 0.2, 0]]);
  const sand = build([
    [new CylinderGeometry(2.4, 2.6, 0.12, 9).translate(0, 0.06, 0), C.plot, 0, 0, 0],
  ]);
  // A cart at rest: a box on two wheels, its shafts down.
  const cart = build([
    [slab(2, 0.8, 2.6), C.wood, 0, 0.9, 0],
    [
      new CylinderGeometry(0.75, 0.75, 0.25, 12).rotateZ(Math.PI / 2).translate(0, 0.75, 0),
      C.trunk,
      1.15,
      0,
      0,
    ],
    [
      new CylinderGeometry(0.75, 0.75, 0.25, 12).rotateZ(Math.PI / 2).translate(0, 0.75, 0),
      C.trunk,
      -1.15,
      0,
      0,
    ],
    [slab(0.12, 0.12, 2.6).rotateX(0.35), C.trunk, 0.6, 0.4, 2.2],
    [slab(0.12, 0.12, 2.6).rotateX(0.35), C.trunk, -0.6, 0.4, 2.2],
  ]);
  // A mine's mouth: a frame of beams in a mound of rock, rails out of it, a wagon.
  const mine = build([
    [new DodecahedronGeometry(3, 0).scale(1.2, 0.8, 0.9).translate(0, 1.6, -1.2), C.rock2, 0, 0, 0],
    [slab(2.6, 0.35, 0.35), C.wood, 0, 2.3, 0.6],
    [slab(0.35, 2.3, 0.35), C.wood, -1.15, 0, 0.6],
    [slab(0.35, 2.3, 0.35), C.wood, 1.15, 0, 0.6],
    [slab(1.95, 1.95, 0.2), C.door, 0, 0, 0.45],
    [slab(0.12, 0.08, 4), C.trunk, -0.45, 0, 2.6],
    [slab(0.12, 0.08, 4), C.trunk, 0.45, 0, 2.6],
    [slab(1.2, 0.7, 1.4), C.trunk, 0, 0.25, 3.2],
    [new DodecahedronGeometry(0.45, 0), C.rock, 0, 1.05, 3.2],
  ]);
  // Venice's campanile: a tall square tower of brick-red, a white belfry, its spire of verdigris.
  const campanile = build([
    [slab(1.9, 9, 1.9), C.brick, 0, 0, 0],
    [slab(2.2, 1.8, 2.2), C.wall, 0, 9, 0],
    [slab(2.3, 0.3, 2.3), C.wall, 0, 10.8, 0],
    [new ConeGeometry(1.7, 3.2, 4).rotateY(Math.PI / 4).translate(0, 12.7, 0), VERDIGRIS, 0, 0, 0],
  ]);
  // Padua's basilica: a long hall, and its domes on drums.
  const basilica = build([
    [slab(7, 3, 4), C.wall, 0, 0, 0],
    [slab(7.2, 0.3, 4.2), C.roof, 0, 3, 0],
    ...[-2.2, 0, 2.2].flatMap((x): [BufferGeometry, string, number, number, number][] => [
      [new CylinderGeometry(0.9, 0.9, 0.8, 12).translate(0, 3.7, 0), C.wall, x, 0, 0],
      [
        new SphereGeometry(0.95, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2).translate(0, 4.1, 0),
        C.roof,
        x,
        0,
        0,
      ],
    ]),
    [slab(0.9, 6, 0.9), C.wall, 3.9, 0, 1.6],
    [new ConeGeometry(0.75, 1.6, 4).rotateY(Math.PI / 4).translate(0, 6.8, 0), C.roof, 3.9, 0, 1.6],
  ]);
  // A mill: a tapered white tower on a stone foot, its blue cap; the sails turn apart.
  const mill = build([
    [new CylinderGeometry(1.9, 2.1, 1, 8).translate(0, 0.5, 0), C.rock2, 0, 0, 0],
    [new CylinderGeometry(1.15, 1.8, 5.2, 8).translate(0, 3.6, 0), C.wall, 0, 0, 0],
    [new ConeGeometry(1.5, 2, 8).translate(0, 7.2, 0), C.roof, 0, 0, 0],
    [slab(0.9, 1.4, 0.2), C.door, 0, 1, 1.75],
  ]);
  const sails = build(
    [0, 1, 2, 3].flatMap((i): [BufferGeometry, string, number, number, number][] => {
      const a = (i * Math.PI) / 2;
      const arm = slab(0.18, 4.4, 0.12).translate(0, 0.2, 0).rotateZ(a);
      const sail = slab(1.2, 3.4, 0.06).translate(0.75, 1, 0.05).rotateZ(a);
      return [
        [arm, C.trunk, 0, 0, 0],
        [sail, C.wall, 0, 0, 0],
      ];
    }),
  );
  // The fondaco (audit of 4 November 2026, Blender B3 and A1: the game's first model of its own,
  // after the Fondaco dei Tedeschi): a hall of Istrian stone on its quay, an arcade on the water,
  // a string course, its windows and its central loggia, a cornice crowned with merlons, a low
  // roof of gold (the house's sign), a corner tower and a Venetian funnel chimney. About 6.6 units
  // across, its foot at y = 0; the flag and the smoke are placed by FONDACO's points.
  const fondaco = (() => {
    const W = 6.4;
    const D = 4.2;
    const H = 3.6;
    const base = 0.5;
    const front = D / 2 + 0.06;
    const parts: [BufferGeometry, string, number, number, number, number?][] = [
      // The quay and its steps down to the water.
      [slab(W + 0.8, base, D + 1.2), C.snow, 0, 0, 0.2],
      [slab(2.4, 0.25, 0.6), C.snow, 0, 0, D / 2 + 1],
      // The hall.
      [slab(W, H, D), C.wall, 0, base, 0],
      // The string course and the cornice, in whiter stone.
      [slab(W + 0.2, 0.16, D + 0.2), C.snow, 0, base + 1.75, 0],
      [slab(W + 0.3, 0.22, D + 0.3), C.snow, 0, base + H, 0],
    ];
    // The arcade on the water: five arches, their piers in stone.
    const arches = 5;
    const step = (W - 0.6) / arches;
    for (let i = 0; i < arches; i++) {
      const x = -W / 2 + 0.3 + step * (i + 0.5);
      parts.push([slab(step * 0.62, 1.05, 0.12), C.door, x, base, front]);
      parts.push([
        new CylinderGeometry(step * 0.31, step * 0.31, 0.12, 10, 1, false, 0, Math.PI)
          .rotateX(Math.PI / 2)
          .rotateZ(Math.PI / 2),
        C.door,
        x,
        base + 1.05,
        front,
      ]);
    }
    for (let i = 0; i <= arches; i++)
      parts.push([slab(0.16, 1.55, 0.16), C.snow, -W / 2 + 0.3 + step * i, base, front + 0.02]);
    // The upper floor: its windows, the loggia of three taller ones in the middle.
    for (let i = 0; i < 7; i++) {
      const x = -W / 2 + 0.55 + ((W - 1.1) * i) / 6;
      const loggia = i >= 2 && i <= 4;
      parts.push([
        slab(0.42, loggia ? 1.1 : 0.7, 0.1),
        C.door,
        x,
        base + (loggia ? 2.1 : 2.35),
        front,
      ]);
    }
    // Side windows, two a side.
    for (const side of [-1, 1])
      for (const z of [-0.9, 0.9])
        parts.push([slab(0.1, 0.7, 0.42), C.door, side * (W / 2 + 0.05), base + 2.35, z]);
    // The merlons along the cornice, all round.
    const top = base + H + 0.22;
    for (let x = -W / 2 + 0.25; x <= W / 2 - 0.2; x += 0.72) {
      parts.push([slab(0.34, 0.42, 0.22), C.snow, x, top, D / 2 + 0.05]);
      parts.push([slab(0.34, 0.42, 0.22), C.snow, x, top, -D / 2 - 0.05]);
    }
    for (let z = -D / 2 + 0.5; z <= D / 2 - 0.4; z += 0.72) {
      parts.push([slab(0.22, 0.42, 0.34), C.snow, W / 2 + 0.05, top, z]);
      parts.push([slab(0.22, 0.42, 0.34), C.snow, -W / 2 - 0.05, top, z]);
    }
    // The low roof of gold.
    parts.push([
      new ConeGeometry(3.9, 1.9, 4)
        .rotateY(Math.PI / 4)
        .scale(1, 1, 0.7)
        .translate(0, 0.95, 0),
      C.roofGold,
      0,
      base + H + 0.05,
      0,
    ]);
    // The corner tower at the back, its gold cap.
    parts.push([slab(1.25, H + 2.4, 1.25), C.brick, -W / 2 + 0.55, base, -D / 2 + 0.55]);
    parts.push([slab(1.4, 0.18, 1.4), C.snow, -W / 2 + 0.55, base + H + 2.4, -D / 2 + 0.55]);
    parts.push([
      new ConeGeometry(0.95, 1.2, 4).rotateY(Math.PI / 4).translate(0, 0.6, 0),
      C.roofGold,
      -W / 2 + 0.55,
      base + H + 2.58,
      -D / 2 + 0.55,
    ]);
    // The funnel chimney (camino a canna), on the right of the roof.
    parts.push([
      new CylinderGeometry(0.16, 0.2, 1.5, 8).translate(0, 0.75, 0),
      C.brick,
      2,
      base + H,
      -0.8,
    ]);
    parts.push([
      new CylinderGeometry(0.42, 0.18, 0.55, 8).translate(0, 0.27, 0),
      C.brick,
      2,
      base + H + 1.5,
      -0.8,
    ]);
    return build(parts);
  })();
  // A gondola (audit of 4 November, Blender A4: « des gondoles qui passent »): its long black hull
  // rising at both ends, the silver ferro at the prow, a red cushion, its gondolier standing at
  // the stern with his oar. About 6 units long along x, its waterline at y = 0.
  const gondola = (() => {
    const hull = new SphereGeometry(1, 16, 8).scale(3, 0.42, 0.55);
    const parts: [BufferGeometry, string, number, number, number, number?][] = [
      [hull, C.door, 0, 0.1, 0],
      // Its ends rising out of the water.
      [new ConeGeometry(0.28, 1.3, 6).rotateZ(-Math.PI / 2.6), C.door, 2.9, 0.55, 0],
      [new ConeGeometry(0.26, 1.1, 6).rotateZ(Math.PI / 2.6), C.door, -2.8, 0.5, 0],
      // The ferro, the cushion.
      [slab(0.08, 0.7, 0.32), C.snow, 3.35, 0.55, 0],
      [slab(1.1, 0.22, 0.6), C.brick, 0.4, 0.28, 0],
      // The gondolier: legs, his white body, his face, his gold-banded hat; the oar.
      [slab(0.3, 0.8, 0.3), C.door, -2.1, 0.3, 0],
      [slab(0.38, 0.75, 0.34), C.wall, -2.1, 1.1, 0],
      [new SphereGeometry(0.2, 8, 6).translate(0, 2.05, 0), C.land, -2.1, 0, 0],
      [new CylinderGeometry(0.3, 0.3, 0.06, 10).translate(0, 2.22, 0), C.gold, -2.1, 0, 0],
      [slab(0.07, 3, 0.07).rotateZ(0.5), C.wood, -1.7, -0.6, 0.35],
    ];
    return build(parts);
  })();
  // Venetian houses (audit of 4 November, Blender A5): tall and narrow, in stucco of rose or
  // ochre, a gable of tiles, a funnel chimney, dark windows in rows; one unit across, foot at
  // y = 0, the board scaling them as it did KayKit's. Each also muted, for a town only seen.
  const casa = (body: string, roof: string, tall: boolean) => {
    const w = 0.78;
    const d = 0.62;
    const h = tall ? 1.15 : 0.85;
    const parts: [BufferGeometry, string, number, number, number, number?][] = [
      [slab(w, h, d), body, 0, 0, 0],
      [slab(w + 0.04, 0.05, d + 0.04), C.snow, 0, h * 0.48, 0],
      // The gable of tiles, along its width.
      [
        new CylinderGeometry(0.36, 0.36, w + 0.1, 3).rotateZ(Math.PI / 2).scale(1, 0.75, d / 0.62),
        roof,
        0,
        h + 0.13,
        0,
      ],
      // The funnel chimney.
      [
        new CylinderGeometry(0.035, 0.045, 0.32, 6).translate(0, 0.16, 0),
        roof,
        w * 0.3,
        h + 0.12,
        -0.12,
      ],
      [
        new CylinderGeometry(0.09, 0.04, 0.12, 6).translate(0, 0.06, 0),
        roof,
        w * 0.3,
        h + 0.44,
        -0.12,
      ],
      // Its door and its windows, front and back.
      [slab(0.16, 0.3, 0.02), C.door, 0, 0, d / 2 + 0.01],
    ];
    for (const y of tall ? [0.45, 0.8] : [0.5])
      for (const x of [-0.22, 0.22]) {
        parts.push([slab(0.12, 0.18, 0.02), C.door, x, y, d / 2 + 0.01]);
        parts.push([slab(0.12, 0.18, 0.02), C.door, x, y, -d / 2 - 0.01]);
      }
    return build(parts);
  };
  const ROSE = "#E9AE8C";
  const OCHRE = "#EBCF98";
  const casaA = casa(ROSE, C.brick, true);
  const casaB = casa(OCHRE, C.brick, false);
  const casaAMuted = casa(C.mist, C.roofMuted, true);
  const casaBMuted = casa(C.mistSide, C.roofMuted, false);
  return {
    casaA,
    casaB,
    casaAMuted,
    casaBMuted,
    field,
    barrel,
    tuft,
    pebble,
    sand,
    cart,
    mine,
    campanile,
    basilica,
    mill,
    sails,
    fondaco,
    gondola,
  };
})();

/** A mill whose sails turn (slowly, a turn in eight seconds) while the board lives. */
export function Mill({
  x,
  z,
  rot,
  s,
  live,
}: { x: number; z: number; rot: number; s: number; live: boolean }) {
  const sails = useRef<Group>(null);
  useFrame((_, dt) => {
    if (live && sails.current) sails.current.rotation.z -= Math.min(dt, 0.1) * ((Math.PI * 2) / 8);
  });
  const geo = useMemo(() => MADE.mill, []);
  return (
    <group position={[x, 0, z]} rotation-y={rot} scale={s}>
      <mesh geometry={geo} material={clay} castShadow receiveShadow />
      <group ref={sails} position={[0, 6.4, 1.7]}>
        <mesh geometry={MADE.sails} material={clay} castShadow />
      </group>
    </group>
  );
}
