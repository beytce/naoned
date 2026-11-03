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
  // Venice's campanile: a tall square tower of brick-red, a white belfry, a pointed blue roof.
  const campanile = build([
    [slab(1.9, 9, 1.9), C.brick, 0, 0, 0],
    [slab(2.2, 1.8, 2.2), C.wall, 0, 9, 0],
    [slab(2.3, 0.3, 2.3), C.wall, 0, 10.8, 0],
    [new ConeGeometry(1.7, 3.2, 4).rotateY(Math.PI / 4).translate(0, 12.7, 0), C.roof, 0, 0, 0],
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
  return { field, barrel, tuft, pebble, sand, cart, mine, campanile, basilica, mill, sails };
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
