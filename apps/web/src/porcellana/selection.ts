/**
 * The selection's blush (docs/plan-porcellana.md § 1, « exactly what I want », the owner): the
 * building chosen, and what stands on its tile, take a faint wash of the accent and a faint glow,
 * fading in and out. Its materials are swapped for clones while it is chosen; the ground, the
 * water and what is already coloured never change.
 */
import { type Color, Mesh, type MeshStandardMaterial, type Object3D } from "three";
import type { Palette } from "./materials.js";
import { SELECT } from "./tokens.js";

const STILL = /^porcellana:(ground|water)/;

export class Blush {
  private clones = new Map<string, MeshStandardMaterial>();
  private bases = new Map<string, Color>();
  private on: Object3D | null = null;
  /** The blush's strength now, 0 to 1. */
  k = 0;

  constructor(private readonly P: Palette) {}

  private tintable(mat: unknown): mat is MeshStandardMaterial {
    const m = mat as MeshStandardMaterial;
    return (
      !!m?.isMeshStandardMaterial &&
      !m.transparent &&
      m !== this.P.accent &&
      m !== this.P.accentCloth &&
      m !== this.P.ink &&
      !STILL.test(m.name)
    );
  }

  private swap(o: Object3D, on: boolean) {
    o.traverse((x) => {
      if (!(x instanceof Mesh)) return;
      if (on && this.tintable(x.material)) {
        const base = x.material as MeshStandardMaterial;
        let c = this.clones.get(base.uuid);
        if (!c) {
          c = base.clone();
          this.clones.set(base.uuid, c);
          this.bases.set(base.uuid, base.color.clone());
        }
        x.userData.baseMat = base;
        x.material = c;
      } else if (!on && x.userData.baseMat) {
        x.material = x.userData.baseMat;
        x.userData.baseMat = undefined;
      }
    });
  }

  /**
   * One frame: `chosen` the tile's group chosen now (or null); returns whether it still moves
   * (the scene asks a frame then).
   */
  update(chosen: Object3D | null, live = true): boolean {
    if (chosen && chosen !== this.on) {
      if (this.on) this.swap(this.on, false);
      this.on = chosen;
      this.swap(chosen, true);
      this.k = 0;
    }
    const want = chosen ? 1 : 0;
    this.k = live ? this.k + (want - this.k) * SELECT.tintEase : want;
    const accent = this.P.accentColour;
    for (const [uuid, c] of this.clones) {
      const base = this.bases.get(uuid);
      if (!base) continue;
      c.color.copy(base).lerp(accent, SELECT.blush * this.k);
      c.emissive.copy(accent).multiplyScalar(SELECT.glow * this.k);
    }
    if (!chosen && this.on && this.k < 0.01) {
      this.swap(this.on, false);
      this.on = null;
      this.k = 0;
    }
    return Math.abs(want - this.k) > 0.005;
  }
}
