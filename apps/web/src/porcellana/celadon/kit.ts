/**
 * The Céladon kit (docs/plan-celadon.md C0 and C1): the materials of its tones, one each for every
 * scene, and the primitives the older kit lacks. Its pieces are built with the kit's own shapes
 * (shapes.ts), baked the same way (bake.ts).
 */
import {
  BoxGeometry,
  type BufferGeometry,
  Color,
  DataTexture,
  ExtrudeGeometry,
  Group,
  LinearFilter,
  LinearMipmapLinearFilter,
  type Material,
  type Mesh,
  MeshStandardMaterial,
  type Object3D,
  RGBAFormat,
  RepeatWrapping,
  SRGBColorSpace,
  Shape,
  ShapeGeometry,
  SphereGeometry,
  TorusGeometry,
} from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { cached, cyl, put } from "../shapes.js";
import { CELADON, type CeladonTone, ROUGH } from "../tokens.js";

const mats = new Map<string, MeshStandardMaterial>();
/** The material of a tone of the Céladon direction (`pale`: a plot one may buy). */
export function C(tone: CeladonTone, pale = false): MeshStandardMaterial {
  const key = `${tone}${pale ? ":p" : ""}`;
  let m = mats.get(key);
  if (!m) {
    m = new MeshStandardMaterial({
      color: CELADON[tone],
      roughness: tone === "water" ? ROUGH.water : tone === "glass" ? 0.3 : ROUGH.matt,
      transparent: pale,
      opacity: pale ? 0.55 : 1,
    });
    m.name = `celadon:${key}`;
    mats.set(key, m);
  }
  return m;
}
let fire: MeshStandardMaterial | undefined;
/** What glows in a working kiln: small, never the accent. */
export function glowing(): MeshStandardMaterial {
  fire ??= new MeshStandardMaterial({
    color: CELADON.fire,
    emissive: CELADON.fire,
    emissiveIntensity: 0.55,
    roughness: 0.6,
  });
  return fire;
}

export function group(p: Object3D, x = 0, y = 0, z = 0, rotY = 0): Group {
  const g = new Group();
  g.position.set(x, y, z);
  g.rotation.y = rotY;
  p.add(g);
  return g;
}

/**
 * A box, its foot at y, as cheap as its size allows (docs/plan-celadon.md C1, the budget of a
 * tile): a sliver is a plain box, a small part has one bevel segment, the rest two.
 */
export function bx(
  p: Object3D,
  w: number,
  h: number,
  d: number,
  x: number,
  y: number,
  z: number,
  mat: Material,
  r = 0.04,
): Mesh {
  const least = Math.min(w, h, d);
  if (least < 0.09)
    return put(
      p,
      cached(`pb${w}|${h}|${d}`, () => new BoxGeometry(w, h, d)),
      mat,
      x,
      y + h / 2,
      z,
    );
  const rr = Math.max(0.004, Math.min(r, least / 2 - 0.003));
  const seg = least < 0.3 ? 1 : 2;
  return put(
    p,
    cached(`cb${w}|${h}|${d}|${rr}`, () => new RoundedBoxGeometry(w, h, d, seg, rr)),
    mat,
    x,
    y + h / 2,
    z,
  );
}

/** A heap: a ball flattened to `sy`, centred on (x, y, z). */
export function heap(
  p: Object3D,
  r: number,
  x: number,
  y: number,
  z: number,
  mat: Material,
  sy = 0.5,
): Mesh {
  const m = put(
    p,
    cached(`hp${r}`, () => new SphereGeometry(r, 16, 10)),
    mat,
    x,
    y,
    z,
  );
  m.scale.y = sy;
  return m;
}

/** A rod along an axis, centred on (x, y, z). */
export function rod(
  p: Object3D,
  r: number,
  len: number,
  x: number,
  y: number,
  z: number,
  axis: "x" | "y" | "z",
  mat: Material,
  seg = 14,
): Mesh {
  const m = cyl(p, r, r, len, x, y - len / 2, z, mat, seg);
  if (axis === "x") m.rotation.z = Math.PI / 2;
  else if (axis === "z") m.rotation.x = Math.PI / 2;
  return m;
}

/** A ring, lying flat (`y`) or standing across an axis. */
export function ring(
  p: Object3D,
  R: number,
  r: number,
  x: number,
  y: number,
  z: number,
  mat: Material,
  axis: "x" | "y" | "z" = "y",
): Mesh {
  const m = put(
    p,
    cached(`to${R}|${r}`, () => new TorusGeometry(R, r, 8, 36)),
    mat,
    x,
    y,
    z,
  );
  if (axis === "y") m.rotation.x = Math.PI / 2;
  else if (axis === "x") m.rotation.y = Math.PI / 2;
  return m;
}

export function roundRect(w: number, d: number, r: number): Shape {
  const s = new Shape();
  const x = -w / 2;
  const y = -d / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y);
  s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + d - r);
  s.quadraticCurveTo(x + w, y + d, x + w - r, y + d);
  s.lineTo(x + r, y + d);
  s.quadraticCurveTo(x, y + d, x, y + d - r);
  s.lineTo(x, y + r);
  s.quadraticCurveTo(x, y, x + r, y);
  return s;
}

/** A thick plate with round corners, its foot at y. Its geometry is its own (dispose it). */
export function plate(
  p: Object3D,
  w: number,
  d: number,
  r: number,
  h: number,
  y: number,
  mat: Material,
  bevel = 0.12,
): Mesh {
  const g: BufferGeometry = new ExtrudeGeometry(roundRect(w - bevel * 2, d - bevel * 2, r), {
    depth: h - bevel * 2,
    bevelEnabled: true,
    bevelSize: bevel,
    bevelThickness: bevel,
    bevelSegments: 3,
    curveSegments: 12,
  });
  g.rotateX(-Math.PI / 2);
  return put(p, g, mat, 0, y + bevel, 0);
}

let planks: MeshStandardMaterial | undefined;
/** The deck's planks: two blonds and a thin joint, drawn once (no canvas: it is built in tests too). */
function plankMaterial(): MeshStandardMaterial {
  if (planks) return planks;
  const W = 64;
  const H = 128;
  const a = new Color(CELADON.blond);
  const b = new Color(CELADON.blond).lerp(new Color(CELADON.blond2), 0.35);
  const line = new Color(CELADON.blond2).multiplyScalar(0.92);
  const data = new Uint8Array(W * H * 4);
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const left = x < W / 2;
      const joint = x % (W / 2) === 0 || (left ? y === 44 : y === 100);
      // the texture holds sRGB values: the colours are read back in that space
      const c = joint ? line : left ? a : b;
      const i = (y * W + x) * 4;
      const hex = c.getHex(SRGBColorSpace);
      data[i] = (hex >> 16) & 255;
      data[i + 1] = (hex >> 8) & 255;
      data[i + 2] = hex & 255;
      data[i + 3] = 255;
    }
  const t = new DataTexture(data, W, H, RGBAFormat);
  t.wrapS = t.wrapT = RepeatWrapping;
  t.colorSpace = SRGBColorSpace;
  t.repeat.set(1 / 2.2, 1 / 9);
  t.magFilter = LinearFilter;
  t.minFilter = LinearMipmapLinearFilter;
  t.generateMipmaps = true;
  t.anisotropy = 4;
  t.needsUpdate = true;
  planks = new MeshStandardMaterial({ map: t, roughness: ROUGH.matt });
  planks.name = "celadon:planks";
  return planks;
}

/** A flat planked top with round corners, at y: it takes shadows and casts none. */
export function planked(p: Object3D, w: number, d: number, r: number, y: number): Mesh {
  const g = new ShapeGeometry(roundRect(w, d, r), 12);
  g.rotateX(-Math.PI / 2);
  const m = put(p, g, plankMaterial(), 0, y, 0);
  m.castShadow = false;
  return m;
}
