/**
 * The Terraferma's fronts on the 3D board (lot T3): a ribbon arching from the camp to the front's
 * head, as thick as the men it carries, its chevrons running toward the head, an arrow at its end;
 * the head gliding from cell to cell as the front takes them; four corner marks breathing on the
 * next two cells. The merchant's in red, what threatens it in ink, the others faint.
 */
import {
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  DoubleSide,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  RepeatWrapping,
  SRGBColorSpace,
  Vector3,
} from "three";
import { easeOutCubic } from "../arrival.js";
import { drawChevron } from "../ribbon.js";
import { ROUGH } from "../tokens.js";
import { type FrontTone, arrowStrip, frontWidths } from "./fronts.js";
import { FLOW_MS } from "./glaze.js";

export interface FrontDraw {
  id: string;
  tone: FrontTone;
  troops: number;
  /** The camp it leaves from, the cell its head stands on, the next cells it takes. */
  from: number;
  head: number;
  next: number[];
}

const SAMPLES = 40;
const TONES: Record<FrontTone, { colour: string; opacity: number }> = {
  mine: { colour: "#C23B2E", opacity: 1 },
  threat: { colour: "#2A2725", opacity: 1 },
  other: { colour: "#2A2725", opacity: 0.3 },
};

interface Live {
  mesh: Mesh;
  pos: BufferAttribute;
  uv: BufferAttribute;
  head: number;
  glideFrom: Vector3;
  glide: number;
  at: Vector3;
  marks: Group[];
}

function chevronTexture(colour: string): CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 64;
  const ctx = canvas.getContext("2d");
  if (ctx) drawChevron(ctx, colour);
  const tex = new CanvasTexture(canvas);
  tex.wrapS = RepeatWrapping;
  tex.colorSpace = SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

/** Four L-shaped corner marks round a tile's top (a tile `size` across). */
function cornerMarks(mat: MeshBasicMaterial, size: number): Group {
  const g = new Group();
  const h = size / 2 - 0.35;
  const l = size * 0.24;
  const t = 0.22;
  const bar = new BoxGeometry(1, 0.08, 1);
  for (const [sx, sz] of [
    [-1, -1],
    [1, -1],
    [1, 1],
    [-1, 1],
  ] as const) {
    const a = new Mesh(bar, mat);
    a.scale.set(l, 1, t);
    a.position.set(sx * (h - l / 2), 0.04, sz * h);
    const b = new Mesh(bar, mat);
    b.scale.set(t, 1, l);
    b.position.set(sx * h, 0.04, sz * (h - l / 2));
    g.add(a, b);
  }
  return g;
}

export class FrontLayer {
  readonly group = new Group();
  private live = new Map<string, Live>();
  private mats: Record<FrontTone, MeshStandardMaterial>;
  private markMats: Record<FrontTone, MeshBasicMaterial>;
  private texs: CanvasTexture[] = [];
  private clock = 0;

  constructor(private tile: number) {
    const make = (tone: FrontTone) => {
      const t = TONES[tone];
      const tex = chevronTexture(t.colour);
      this.texs.push(tex);
      return new MeshStandardMaterial({
        map: tex,
        roughness: ROUGH.accent,
        side: DoubleSide,
        transparent: t.opacity < 1,
        opacity: t.opacity,
        depthWrite: t.opacity === 1,
      });
    };
    this.mats = { mine: make("mine"), threat: make("threat"), other: make("other") };
    const mark = (tone: FrontTone) =>
      new MeshBasicMaterial({ color: TONES[tone].colour, transparent: true, toneMapped: false });
    this.markMats = { mine: mark("mine"), threat: mark("threat"), other: mark("other") };
  }

  /** Where a front's head stands now (its count's label goes above it), or null. */
  headOf(id: string): Vector3 | null {
    return this.live.get(id)?.at ?? null;
  }

  /**
   * The fronts as they stand: `top` gives the middle of a cell's top, its height included. A front
   * gone is taken away; a head moved glides there.
   */
  update(fronts: FrontDraw[], top: (cell: number) => Vector3, dt: number, live: boolean): void {
    this.clock += dt;
    if (live) for (const tex of this.texs) tex.offset.x -= dt * 0.55;
    const pulse = 0.55 + 0.45 * Math.sin(this.clock * 4) ** 2;
    for (const m of Object.values(this.markMats)) m.opacity = live ? pulse : 0.9;
    const seen = new Set<string>();
    for (const f of fronts) {
      seen.add(f.id);
      let l = this.live.get(f.id);
      if (!l || (l.mesh.material as MeshStandardMaterial) !== this.mats[f.tone]) {
        if (l) this.drop(f.id);
        l = this.make(f);
      }
      if (l.head !== f.head) {
        l.glideFrom.copy(l.at);
        l.head = f.head;
        l.glide = live ? 0 : 1;
      }
      l.glide = Math.min(1, l.glide + (dt * 1000) / FLOW_MS);
      const to = top(f.head);
      l.at.copy(l.glideFrom).lerp(to, easeOutCubic(l.glide));
      if (l.glideFrom.lengthSq() === 0) l.at.copy(to);
      this.shape(l, top(f.from), l.at, f.troops);
      // The next two cells, marked (not for the faint fronts of the others).
      l.marks.forEach((g, k) => {
        const c = f.next[k];
        g.visible = f.tone !== "other" && c !== undefined && c >= 0;
        if (g.visible && c !== undefined) g.position.copy(top(c));
      });
    }
    for (const id of [...this.live.keys()]) if (!seen.has(id)) this.drop(id);
  }

  private make(f: FrontDraw): Live {
    const verts = SAMPLES * 2 + 3;
    const geo = new BufferGeometry();
    const pos = new BufferAttribute(new Float32Array(verts * 3), 3);
    const uv = new BufferAttribute(new Float32Array(verts * 2), 2);
    geo.setAttribute("position", pos);
    geo.setAttribute("uv", uv);
    const idx: number[] = [];
    for (let i = 0; i < SAMPLES - 1; i++) {
      const k = i * 2;
      idx.push(k, k + 2, k + 1, k + 1, k + 2, k + 3);
    }
    idx.push(SAMPLES * 2, SAMPLES * 2 + 2, SAMPLES * 2 + 1);
    geo.setIndex(idx);
    const mesh = new Mesh(geo, this.mats[f.tone]);
    mesh.castShadow = f.tone !== "other";
    mesh.renderOrder = 3;
    mesh.frustumCulled = false;
    mesh.raycast = () => {};
    const marks = [0, 1].map(() => {
      const g = cornerMarks(this.markMats[f.tone], this.tile);
      g.visible = false;
      this.group.add(g);
      return g;
    });
    this.group.add(mesh);
    const l: Live = {
      mesh,
      pos,
      uv,
      head: f.head,
      glideFrom: new Vector3(),
      glide: 1,
      at: new Vector3(),
      marks,
    };
    this.live.set(f.id, l);
    return l;
  }

  /** The ribbon from the camp to the head, arched over the board. */
  private shape(l: Live, from: Vector3, to: Vector3, troops: number): void {
    const a = from.clone().setY(from.y + 2.6);
    const b = to.clone().setY(to.y + 1.1);
    const span = a.distanceTo(b);
    const mid = a
      .clone()
      .add(b)
      .multiplyScalar(0.5)
      .setY(Math.max(a.y, b.y) + 1.5 + span * 0.18);
    const pts: [number, number, number][] = [];
    for (let i = 0; i < SAMPLES; i++) {
      const t = i / (SAMPLES - 1);
      const u = 1 - t;
      pts.push([
        u * u * a.x + 2 * u * t * mid.x + t * t * b.x,
        u * u * a.y + 2 * u * t * mid.y + t * t * b.y,
        u * u * a.z + 2 * u * t * mid.z + t * t * b.z,
      ]);
    }
    const [w0, w1] = frontWidths(troops);
    const s = arrowStrip(pts, w0, w1, Math.max(1.2, w0 * 1.5));
    (l.pos.array as Float32Array).set(s.positions);
    (l.uv.array as Float32Array).set(s.uvs);
    l.pos.needsUpdate = true;
    l.uv.needsUpdate = true;
    l.mesh.geometry.computeVertexNormals();
    l.mesh.geometry.computeBoundingSphere();
  }

  private drop(id: string): void {
    const l = this.live.get(id);
    if (!l) return;
    this.group.remove(l.mesh);
    l.mesh.geometry.dispose();
    for (const g of l.marks) this.group.remove(g);
    this.live.delete(id);
  }

  dispose(): void {
    for (const id of [...this.live.keys()]) this.drop(id);
    for (const t of this.texs) t.dispose();
  }
}
