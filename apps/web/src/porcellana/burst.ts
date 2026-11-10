/**
 * The moments (docs/plan-carte-vivante.md, lot 2): what flies up when something of the game has
 * just happened — the dust of a tile that lands (bought), petals of accent over what has just grown
 * (a level, a workshop built), coins over a town that has just paid. One draw call for all of it;
 * nothing flies without its reason, nothing at all in « moins d'animations » (no one calls it then).
 */
import {
  Color,
  Group,
  IcosahedronGeometry,
  InstancedMesh,
  Matrix4,
  MeshStandardMaterial,
  Quaternion,
  Vector3,
} from "three";
import type { Palette } from "./materials.js";
import { ACCENTS, COL } from "./tokens.js";

type Kind = "dust" | "petal" | "coin";

interface Part {
  kind: Kind;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  /** The ground it falls back on. */
  floor: number;
  born: number;
  life: number;
  size: number;
  spin: number;
}

const GRAVITY = 7.5;
const AXIS = new Vector3(0.6, 0.3, 0.74).normalize();

/** How many pieces a moment throws: few, it is a wink, not a firework. */
export const BURST = { dust: 16, petals: 28, coins: 9, capacity: 160 } as const;

export class Burst {
  readonly group = new Group();
  private readonly mesh: InstancedMesh;
  private parts: Part[] = [];
  private readonly colours: Record<Kind, Color>;
  private readonly m = new Matrix4();
  private readonly q = new Quaternion();
  private readonly p = new Vector3();
  private readonly s = new Vector3();
  /** A small random of its own, so that two moments differ without anything else depending on it. */
  private seed = 7;

  constructor(P: Palette) {
    this.colours = {
      dust: new Color(COL.soil),
      petal: P.accentColour.clone(),
      // The ducats are coins of gold, an object, never a colour of the interface (D2).
      coin: new Color(ACCENTS.oro),
    };
    this.mesh = new InstancedMesh(
      new IcosahedronGeometry(0.5, 1),
      new MeshStandardMaterial({ color: "#ffffff", roughness: 0.7 }),
      BURST.capacity,
    );
    this.mesh.count = 0;
    this.mesh.frustumCulled = false;
    this.mesh.castShadow = false;
    this.mesh.raycast = () => {};
    this.mesh.userData.dyn = true;
    this.group.add(this.mesh);
  }

  private rnd(): number {
    this.seed = (Math.imul(this.seed, 1664525) + 1013904223) | 0;
    return (this.seed >>> 0) / 4294967296;
  }

  private add(part: Part): void {
    if (this.parts.length >= BURST.capacity) this.parts.shift();
    this.parts.push(part);
  }

  /** A ring of dust rolling out from under a tile that lands. */
  dust(x: number, y: number, z: number, now: number, radius = 3.1): void {
    for (let k = 0; k < BURST.dust; k++) {
      const a = (k / BURST.dust) * Math.PI * 2 + this.rnd() * 0.3;
      const out = 1.5 + this.rnd() * 0.9;
      this.add({
        kind: "dust",
        x: x + Math.cos(a) * radius,
        y: y + 0.1,
        z: z + Math.sin(a) * radius,
        vx: Math.cos(a) * out,
        vy: 0.5 + this.rnd() * 0.5,
        vz: Math.sin(a) * out,
        floor: y - 4,
        born: now,
        life: 0.7 + this.rnd() * 0.3,
        size: 0.34 + this.rnd() * 0.22,
        spin: this.rnd() * 6,
      });
    }
  }

  /** Petals of accent thrown up over what has just grown, falling back on its tile. */
  petals(x: number, y: number, z: number, now: number): void {
    for (let k = 0; k < BURST.petals; k++) {
      const a = this.rnd() * Math.PI * 2;
      const out = 0.5 + this.rnd() * 1.6;
      this.add({
        kind: "petal",
        x: x + Math.cos(a) * 0.6,
        y: y + 1.6 + this.rnd() * 1.2,
        z: z + Math.sin(a) * 0.6,
        vx: Math.cos(a) * out,
        vy: 3.2 + this.rnd() * 2.6,
        vz: Math.sin(a) * out,
        floor: y + 0.04,
        born: now + this.rnd() * 0.25,
        life: 2.1 + this.rnd() * 0.7,
        size: 0.16 + this.rnd() * 0.08,
        spin: 4 + this.rnd() * 9,
      });
    }
  }

  /** Coins jumping over a town that has just paid. */
  coins(x: number, y: number, z: number, now: number): void {
    for (let k = 0; k < BURST.coins; k++) {
      const a = this.rnd() * Math.PI * 2;
      this.add({
        kind: "coin",
        x: x + Math.cos(a) * 0.5,
        y: y + 1.2,
        z: z + Math.sin(a) * 0.5,
        vx: Math.cos(a) * 0.7,
        vy: 4.2 + this.rnd() * 1.6,
        vz: Math.sin(a) * 0.7,
        floor: y + 0.05,
        born: now + k * 0.07,
        life: 1.5,
        size: 0.2,
        spin: 10 + this.rnd() * 6,
      });
    }
  }

  /** Whether anything still flies. */
  get busy(): boolean {
    return this.parts.length > 0;
  }

  tick(now: number): void {
    if (this.parts.length === 0) {
      if (this.mesh.count !== 0) this.mesh.count = 0;
      return;
    }
    this.parts = this.parts.filter((p) => now - p.born < p.life);
    let n = 0;
    for (const part of this.parts) {
      const t = now - part.born;
      if (t < 0) continue;
      const u = t / part.life;
      const g = part.kind === "dust" ? 1.2 : GRAVITY;
      // Dust slows as it rolls; the rest flies and falls.
      const drag = part.kind === "dust" ? 1 - u * 0.5 : 1;
      const y = Math.max(part.floor, part.y + part.vy * t - 0.5 * g * t * t);
      this.p.set(part.x + part.vx * t * drag, y, part.z + part.vz * t * drag);
      const landed = y <= part.floor + 1e-3;
      this.q.setFromAxisAngle(AXIS, landed ? part.spin : part.spin * t + part.spin);
      // Out of nothing, then away: a puff swells and thins, a petal and a coin shrink at the end.
      const fade = u > 0.75 ? (1 - u) / 0.25 : 1;
      const k = part.kind === "dust" ? (0.5 + u) * (1 - u) * 1.6 : fade;
      const flat = part.kind === "dust" ? 0.7 : part.kind === "petal" ? 0.12 : 0.16;
      this.s.set(
        part.size * k,
        part.size * k * flat,
        part.size * k * (part.kind === "petal" ? 0.7 : 1),
      );
      this.m.compose(this.p, this.q, this.s);
      this.mesh.setMatrixAt(n, this.m);
      this.mesh.setColorAt(n, this.colours[part.kind]);
      n++;
    }
    this.mesh.count = n;
    this.mesh.instanceMatrix.needsUpdate = true;
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
  }

  dispose(): void {
    this.mesh.geometry.dispose();
    (this.mesh.material as MeshStandardMaterial).dispose();
    this.mesh.dispose();
  }
}
