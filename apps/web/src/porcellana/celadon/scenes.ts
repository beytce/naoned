/**
 * The scenes at the head of the places' sheets (docs/plan-celadon.md § 7, S2 and S3): each shows
 * the place's object as the game has it now.
 */
import { Group } from "three";
import { celadonPalette } from "../materials.js";
import { C, bx } from "./kit.js";
import { ship } from "./places.js";
import type { VignetteScene } from "./vignette.js";
import { WORKSHOPS } from "./workshops.js";

/** The Arsenal at its level on its quay, the fleet at anchor before it (five hulls at most). */
export function arsenalScene(level: number, ships: number): VignetteScene {
  const P = celadonPalette();
  const root = new Group();
  bx(root, 6.4, 0.5, 6.4, 0, -0.5, 0, C("stone"), 0.2);
  const a = WORKSHOPS.arsenal?.(P, { level: Math.max(1, level), seed: 1 });
  if (a) root.add(a.group);
  for (let k = 0; k < Math.min(5, ships); k++) {
    const b = ship(P, { seed: k, running: false }).group;
    b.position.set(-3 + k * 2.3, -0.45, 4.6 + (k % 2) * 0.5);
    b.scale.setScalar(0.85);
    root.add(b);
  }
  return { root, target: [0.4, 1.0, 1.4], span: 9.5, water: -0.5 };
}
