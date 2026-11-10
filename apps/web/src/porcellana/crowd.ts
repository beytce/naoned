/**
 * The crowd (docs/plan-carte-vivante.md, lot 1): every figure of a board in two draw calls, the
 * figures (a spindle of porcelain and its round head, as the Porta's pawns) and the crates of accent
 * some carry on their heads. Each walks its way (board/people.ts) at an even pace, keeping to its
 * side of the road, and stands on its tile whatever the tile does (it drops in, it lifts). Nothing
 * here knows the game: who walks where is told by the board.
 */
import {
  BoxGeometry,
  Color,
  Group,
  InstancedMesh,
  LatheGeometry,
  Matrix4,
  MeshStandardMaterial,
  Quaternion,
  SphereGeometry,
  Vector2,
  Vector3,
} from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { Walk } from "./board/people.js";
import type { Palette } from "./materials.js";
import { COL, ROUGH } from "./tokens.js";

/**
 * A figure against the pawn it is drawn as (0.53 high): larger than life, as a meeple on a board,
 * so that the people are read from afar (a tile is six across, a door 0.6 high).
 */
export const FIGURE = { scale: 1.5, crateY: 0.6 } as const;

interface Agent {
  xs: Float32Array;
  zs: Float32Array;
  /** The length walked at each point, the whole at the last. */
  cum: Float32Array;
  len: number;
  mode: "loop" | "ping" | "once";
  /** Scene units a second. */
  speed: number;
  phase: number;
  load: "out" | "always" | "none";
  still: boolean;
  tone: number;
  scale: number;
  lane: number;
  /** A file sent once: when it set off (the crowd's clock), null for those who stay. */
  born: number | null;
}

/** Room kept beyond the crowd's own for those sent once (a harvest's file of porters). */
const SENT_ROOM = 16;

const TONES = [COL.trim, COL.wood, COL.roof].map((c) => new Color(c));
const UP = new Vector3(0, 1, 0);

function figureGeometry() {
  const body = new LatheGeometry(
    [
      [0, 0],
      [0.118, 0],
      [0.124, 0.03],
      [0.088, 0.2],
      [0.072, 0.33],
      [0.03, 0.37],
      [0, 0.37],
    ].map(([x, y]) => new Vector2(x, y)),
    12,
  );
  const head = new SphereGeometry(0.082, 12, 9).translate(0, 0.45, 0);
  const merged = mergeGeometries([body.toNonIndexed(), head.toNonIndexed()], false);
  body.dispose();
  head.dispose();
  return merged.scale(FIGURE.scale, FIGURE.scale, FIGURE.scale);
}

function agentOf(w: Walk, S: number, born: number | null = null): Agent {
  const pts = w.mode === "loop" && !w.still ? [...w.pts, w.pts[0] as [number, number]] : w.pts;
  const n = pts.length;
  const xs = new Float32Array(n);
  const zs = new Float32Array(n);
  const cum = new Float32Array(n);
  for (let k = 0; k < n; k++) {
    const [x, z] = pts[k] as [number, number];
    xs[k] = x * S;
    zs[k] = z * S;
    if (k > 0)
      cum[k] =
        (cum[k - 1] as number) +
        Math.hypot(
          (xs[k] as number) - (xs[k - 1] as number),
          (zs[k] as number) - (zs[k - 1] as number),
        );
  }
  return {
    xs,
    zs,
    cum,
    len: cum[n - 1] ?? 0,
    mode: born === null ? w.mode : "once",
    speed: w.speed * S,
    phase: w.phase,
    load: w.load,
    still: w.still,
    tone: w.tone,
    scale: w.scale,
    lane: w.lane * S,
    born,
  };
}

export class Crowd {
  readonly group = new Group();
  private readonly figures: InstancedMesh;
  private readonly crates: InstancedMesh;
  private agents: Agent[] = [];
  private sent: Agent[] = [];
  private readonly m = new Matrix4();
  private readonly q = new Quaternion();
  private readonly p = new Vector3();
  private readonly s = new Vector3();
  private readonly none = new Matrix4().makeScale(0, 0, 0);

  /** `capacity`: the most figures ever drawn; `shadows`: they cast theirs (a computer). */
  constructor(
    P: Palette,
    private readonly capacity: number,
    shadows: boolean,
  ) {
    const glaze = new MeshStandardMaterial({ color: "#ffffff", roughness: ROUGH.matt });
    this.figures = new InstancedMesh(figureGeometry(), glaze, capacity + SENT_ROOM);
    this.crates = new InstancedMesh(
      new BoxGeometry(0.19, 0.14, 0.16)
        .translate(0, FIGURE.crateY, 0)
        .scale(FIGURE.scale, FIGURE.scale, FIGURE.scale),
      P.accent,
      capacity + SENT_ROOM,
    );
    for (const mesh of [this.figures, this.crates]) {
      mesh.count = 0;
      mesh.frustumCulled = false;
      mesh.castShadow = shadows;
      mesh.receiveShadow = false;
      // Never in the way of a touch: the tile under them is what one picks.
      mesh.raycast = () => {};
      mesh.userData.dyn = true;
      this.group.add(mesh);
    }
  }

  /** How many figures are on the board now. */
  get size(): number {
    return this.agents.length + this.sent.length;
  }

  /** The people of the board now (their ways in tiles, `S` scene units a tile). */
  set(walks: readonly Walk[], S: number): void {
    this.agents = walks.slice(0, this.capacity).map((w) => agentOf(w, S));
    this.agents.forEach((a, k) => this.figures.setColorAt(k, TONES[a.tone] ?? (TONES[0] as Color)));
    if (this.figures.instanceColor) this.figures.instanceColor.needsUpdate = true;
  }

  /**
   * A file sent once along a way, each with its crate (the harvest carried to the Fondaco): `count`
   * figures a step apart, gone at the end.
   */
  send(pts: [number, number][], count: number, S: number, now: number): void {
    for (let k = 0; k < count && this.sent.length < SENT_ROOM; k++)
      this.sent.push(
        agentOf(
          {
            why: "porter",
            pts,
            mode: "ping",
            speed: 0.085,
            phase: 0,
            load: "always",
            still: false,
            tone: (k % 3) as 0 | 1 | 2,
            scale: 1,
            lane: 0.035,
          },
          S,
          now + k * 0.55,
        ),
      );
  }

  /**
   * A frame: `t` the crowd's clock in seconds (it stands still when nothing may move), `heightAt`
   * the height of the tile « i,j » (null: no tile there yet, its people unseen), `S` a tile's size.
   */
  tick(t: number, S: number, heightAt: (i: number, j: number) => number | null): void {
    this.sent = this.sent.filter((a) => a.born !== null && (t - a.born) * a.speed < a.len);
    const all = this.sent.length ? [...this.agents, ...this.sent] : this.agents;
    const n = Math.min(all.length, this.capacity + SENT_ROOM);
    for (let k = 0; k < n; k++) {
      const a = all[k] as Agent;
      // Where along its way, and which way it faces.
      let d = 0;
      let dir = 1;
      if (a.born !== null) d = (t - a.born) * a.speed;
      else if (a.still || a.len <= 0) d = 0;
      else {
        // An even pace, a little quicker, a little slower: no two walk in step.
        const walked =
          a.phase * a.len * (a.mode === "ping" ? 2 : 1) +
          (t + Math.sin(t * 0.33 + a.phase * 40) * 0.7) * a.speed;
        if (a.mode === "loop") d = walked % a.len;
        else {
          const dd = walked % (2 * a.len);
          if (dd > a.len) {
            d = 2 * a.len - dd;
            dir = -1;
          } else d = dd;
        }
      }
      if (d < 0) {
        this.figures.setMatrixAt(k, this.none);
        this.crates.setMatrixAt(k, this.none);
        continue;
      }
      let seg = 1;
      while (seg < a.cum.length - 1 && (a.cum[seg] as number) < d) seg++;
      const x0 = a.xs[seg - 1] as number;
      const z0 = a.zs[seg - 1] as number;
      const dx = (a.xs[seg] as number) - x0;
      const dz = (a.zs[seg] as number) - z0;
      const span = (a.cum[seg] as number) - (a.cum[seg - 1] as number);
      const u = span > 0 ? Math.min(1, Math.max(0, (d - (a.cum[seg - 1] as number)) / span)) : 0;
      const hl = Math.hypot(dx, dz) || 1;
      const hx = (dx / hl) * dir;
      const hz = (dz / hl) * dir;
      const x = x0 + dx * u + hz * a.lane;
      const z = z0 + dz * u - hx * a.lane;
      const ground = heightAt(Math.round(x / S), Math.round(z / S));
      if (ground === null) {
        this.figures.setMatrixAt(k, this.none);
        this.crates.setMatrixAt(k, this.none);
        continue;
      }
      const step = a.still ? 0 : Math.abs(Math.sin(t * 9 + a.phase * 50)) * 0.035 * a.scale;
      this.p.set(x, ground + 0.02 + step, z);
      this.q.setFromAxisAngle(UP, Math.atan2(hx, hz));
      // Sitting by the crates: lower, as one who waits.
      this.s.set(a.scale, a.still ? a.scale * 0.72 : a.scale, a.scale);
      this.m.compose(this.p, this.q, this.s);
      this.figures.setMatrixAt(k, this.m);
      const carries = a.load === "always" || (a.load === "out" && dir > 0);
      this.crates.setMatrixAt(k, carries ? this.m : this.none);
      if (a.born !== null) this.figures.setColorAt(k, TONES[a.tone] ?? (TONES[0] as Color));
    }
    this.figures.count = n;
    this.crates.count = n;
    this.figures.instanceMatrix.needsUpdate = true;
    this.crates.instanceMatrix.needsUpdate = true;
    if (this.sent.length && this.figures.instanceColor)
      this.figures.instanceColor.needsUpdate = true;
  }

  dispose(): void {
    this.figures.geometry.dispose();
    (this.figures.material as MeshStandardMaterial).dispose();
    this.crates.geometry.dispose();
    this.figures.dispose();
    this.crates.dispose();
  }
}
