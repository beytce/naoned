/**
 * The horizon (docs/plan-carte-vivante.md, lot 4; decision of the owner, 9 November 2026): the land
 * beyond what the house owns, drawn low and pale round the board — thin plates at the water's
 * level, their land in silhouette (a few firs, furrows, a flock, a pit, dunes), a town as a huddle
 * of plain houses — fading into the porcelain ground the further it lies. Neither a frame nor an
 * edge: the board still floats, one only sees where it might grow. Three draw calls for it all;
 * never touched, never shadowed.
 */
import {
  BoxGeometry,
  Color,
  ConeGeometry,
  Group,
  InstancedMesh,
  Matrix4,
  MeshStandardMaterial,
  Quaternion,
  Vector3,
} from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { seeded } from "../shapes.js";
import { BOARD, COL, ROUGH } from "../tokens.js";
import type { BoardHorizon } from "./scene.js";

/** How the horizon lies: its plates' top and thickness, how far it fades. */
export const HORIZON = { top: -0.42, thick: 0.34, fadeFrom: 0.3, fadeTo: 0.92, rise: 1.1 } as const;

const UP = new Vector3(0, 1, 0);

/** The pieces of a tile's silhouette: cones (firs, roofs) and blocks (houses, furrows, dunes). */
interface Piece {
  cone: boolean;
  x: number;
  z: number;
  /** Its size: across, up, deep. */
  w: number;
  h: number;
  d: number;
  rot: number;
}

/** A horizon tile's silhouette, from its land or its town, in the tile's own coordinates. */
export function silhouette(tile: BoardHorizon): Piece[] {
  const rnd = seeded(tile.seed * 7 + 1);
  const at = (r = 2.1): [number, number] => [(rnd() - 0.5) * 2 * r, (rnd() - 0.5) * 2 * r];
  const out: Piece[] = [];
  if (tile.town) {
    // A town out of reach: its houses plain, its openings filled, a tower from the market town up.
    const n = 2 + tile.town;
    for (let k = 0; k < n; k++) {
      const [x, z] = at(1.6);
      const w = 0.8 + rnd() * 0.5;
      const h = 0.7 + rnd() * 0.7;
      out.push({ cone: false, x, z, w, h, d: w * 0.85, rot: 0 });
      out.push({ cone: true, x, z, w: w * 0.8, h: 0.45, d: w * 0.8, rot: Math.PI / 4 });
    }
    if (tile.town >= 3)
      out.push({ cone: false, x: 0, z: 0, w: 0.6, h: 2.2 + tile.town * 0.25, d: 0.6, rot: 0 });
    return out;
  }
  switch (tile.terrain) {
    case "forest":
      for (let k = 0; k < 6; k++) {
        const [x, z] = at();
        const s = 0.7 + rnd() * 0.5;
        out.push({ cone: true, x, z, w: 0.55 * s, h: 1.5 * s, d: 0.55 * s, rot: 0 });
      }
      break;
    case "fields":
      for (let k = -2; k <= 2; k++)
        out.push({ cone: false, x: k * 0.55, z: 0, w: 0.2, h: 0.07, d: 3.6, rot: 0 });
      break;
    case "pasture":
      out.push({ cone: false, x: 0, z: -2.3, w: 4.4, h: 0.3, d: 0.08, rot: 0 });
      out.push({ cone: false, x: -2.3, z: 0, w: 0.08, h: 0.3, d: 4.4, rot: 0 });
      for (let k = 0; k < 3; k++) {
        const [x, z] = at(1.6);
        out.push({ cone: false, x, z, w: 0.34, h: 0.26, d: 0.24, rot: rnd() * 3 });
      }
      break;
    case "clay":
      out.push({ cone: false, x: 0.6, z: -0.5, w: 2.2, h: 0.08, d: 2.0, rot: 0.3 });
      out.push({ cone: false, x: 0.6, z: -0.5, w: 1.3, h: 0.14, d: 1.2, rot: 0.3 });
      break;
    case "sand":
      for (let k = 0; k < 3; k++) {
        const [x, z] = at(1.7);
        out.push({ cone: false, x, z, w: 1.5, h: 0.2, d: 0.8, rot: rnd() * 3 });
      }
      break;
    default:
      // Plain land: a tree or two, far apart.
      if (tile.seed % 2 === 0) {
        const [x, z] = at();
        out.push({ cone: true, x, z, w: 0.5, h: 1.0, d: 0.5, rot: 0 });
      }
  }
  return out;
}

/** How pale a horizon tile is, 0 (as the board) to 1 (the ground it fades into), by how far it lies. */
export function fadeOf(far: number, reach: number): number {
  const u = Math.min(1, Math.max(0, (far - 1) / Math.max(1, reach - 1)));
  return HORIZON.fadeFrom + (HORIZON.fadeTo - HORIZON.fadeFrom) * u;
}

export class Horizon {
  readonly group = new Group();
  private plates: InstancedMesh | null = null;
  private cones: InstancedMesh | null = null;
  private blocks: InstancedMesh | null = null;
  private readonly mat = new MeshStandardMaterial({ color: "#ffffff", roughness: ROUGH.matt });
  private readonly plate = new RoundedBoxGeometry(BOARD.tile, HORIZON.thick, BOARD.tile, 2, 0.1);
  private readonly cone = new ConeGeometry(0.5, 1, 4, 1).translate(0, 0.5, 0);
  private readonly block = new BoxGeometry(1, 1, 1).translate(0, 0.5, 0);
  private sig = "";
  private shownAt: number | null = null;

  private clear(): void {
    for (const m of [this.plates, this.cones, this.blocks]) {
      if (!m) continue;
      this.group.remove(m);
      m.dispose();
    }
    this.plates = this.cones = this.blocks = null;
  }

  /** The horizon's tiles now (`S` scene units a tile, `reach` how far the furthest lies). */
  set(tiles: readonly BoardHorizon[], S: number, reach: number): void {
    const sig = tiles
      .map((t) => `${t.i},${t.j}:${t.far}:${t.terrain ?? ""}:${t.town ?? ""}`)
      .join("|");
    if (sig === this.sig) return;
    this.sig = sig;
    this.clear();
    if (tiles.length === 0) return;
    const pieces = tiles.map((t) => silhouette(t));
    const nCones = pieces.reduce((n, p) => n + p.filter((x) => x.cone).length, 0);
    const nBlocks = pieces.reduce((n, p) => n + p.filter((x) => !x.cone).length, 0);
    const make = (geo: BoxGeometry | ConeGeometry | RoundedBoxGeometry, n: number) => {
      const m = new InstancedMesh(geo, this.mat, Math.max(1, n));
      m.count = n;
      m.castShadow = false;
      m.receiveShadow = false;
      m.frustumCulled = false;
      m.raycast = () => {};
      m.userData.dyn = true;
      this.group.add(m);
      return m;
    };
    this.plates = make(this.plate, tiles.length);
    this.cones = make(this.cone, nCones);
    this.blocks = make(this.block, nBlocks);
    const ground = new Color(COL.ground);
    const leaf = new Color(COL.roof);
    const bg = new Color(COL.bg);
    const m = new Matrix4();
    const q = new Quaternion();
    const p = new Vector3();
    const sc = new Vector3();
    const c = new Color();
    let ci = 0;
    let bi = 0;
    tiles.forEach((t, k) => {
      const fade = fadeOf(t.far, reach);
      const x = t.i * S;
      const z = t.j * S;
      // Thinner the further it lies: its sides show less, it melts into the ground.
      const thick = 1 - fade * 0.55;
      p.set(x, HORIZON.top - (HORIZON.thick * thick) / 2, z);
      q.identity();
      sc.set(1, thick, 1);
      this.plates?.setMatrixAt(k, m.compose(p, q, sc));
      this.plates?.setColorAt(k, c.copy(ground).lerp(bg, fade));
      for (const piece of pieces[k] ?? []) {
        p.set(x + piece.x, HORIZON.top, z + piece.z);
        q.setFromAxisAngle(UP, piece.rot);
        sc.set(piece.w, piece.h * (1 - fade * 0.35), piece.d);
        m.compose(p, q, sc);
        c.copy(leaf).lerp(bg, fade);
        if (piece.cone) {
          this.cones?.setMatrixAt(ci, m);
          this.cones?.setColorAt(ci++, c);
        } else {
          this.blocks?.setMatrixAt(bi, m);
          this.blocks?.setColorAt(bi++, c);
        }
      }
    });
    for (const mesh of [this.plates, this.cones, this.blocks]) {
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    }
  }

  /**
   * A frame: shown once the board has landed (`out`), rising into place; `t` the scene's clock.
   * Without motion (`live` false) it is there at once.
   */
  tick(t: number, out: boolean, live: boolean): void {
    if (!out) {
      this.group.visible = false;
      this.shownAt = null;
      return;
    }
    if (this.shownAt === null) this.shownAt = live ? t : t - HORIZON.rise;
    const u = Math.min(1, (t - this.shownAt) / HORIZON.rise);
    this.group.visible = true;
    this.group.position.y = -(1 - (1 - (1 - u) ** 3)) * 2.4;
  }

  dispose(): void {
    this.clear();
    this.mat.dispose();
    this.plate.dispose();
    this.cone.dispose();
    this.block.dispose();
  }
}
