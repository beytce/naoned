/**
 * The places of the Porta in Porcellana (proposal of 6 November 2026, docs/plan-porta-porcellana.md):
 * the six tiers as stepped plinths (one step more per tier, its number in pips on the top, a closed
 * one veiled under a band of ink), the Porta noire an arch of ink with a red glow inside, the
 * antiquarian's stall under its awning, the chests of relics (porcelain, a gem of the rarity's
 * colour on the lid: the only colours of the lands besides the red).
 */
import { Group, MeshStandardMaterial, Shape } from "three";
import type { Palette } from "../materials.js";
import { archShape, box, cached, cyl, dyn, extrude, put } from "../shapes.js";
import type { Built, ModelOpts } from "./model.js";

/** A tier: `n` steps, its number in pips; closed, veiled and barred in ink. */
export function tier(P: Palette, n: number, open: boolean, o: ModelOpts): Built {
  const g = new Group();
  const tone = open ? "wall" : "wall2";
  let y = 0;
  for (let k = 0; k < n; k++) {
    const w = 4.4 - k * 0.5;
    box(g, w, 0.34, w, 0, y, 0, P.m(k % 2 ? "trim" : tone), 0.06);
    y += 0.34;
  }
  // The top: its number in pips, like a die.
  const top = 4.4 - (n - 1) * 0.5;
  const pip = (x: number, z: number) =>
    cyl(g, 0.16, 0.16, 0.06, x, y, z, open ? P.accent : P.m("open"), 24);
  const d = Math.min(0.7, top / 4);
  const at: Record<number, [number, number][]> = {
    1: [[0, 0]],
    2: [
      [-d, -d],
      [d, d],
    ],
    3: [
      [-d, -d],
      [0, 0],
      [d, d],
    ],
    4: [
      [-d, -d],
      [d, -d],
      [-d, d],
      [d, d],
    ],
    5: [
      [-d, -d],
      [d, -d],
      [0, 0],
      [-d, d],
      [d, d],
    ],
    6: [
      [-d, -d],
      [d, -d],
      [-d, 0],
      [d, 0],
      [-d, d],
      [d, d],
    ],
  };
  for (const [x, z] of at[n] ?? []) pip(x, z);
  if (!open) {
    // The veil: a band of ink round the top step, its padlock.
    box(g, top + 0.06, 0.1, top + 0.06, 0, y - 0.24, 0, P.ink, 0.02);
    box(g, 0.42, 0.36, 0.14, 0, y - 0.3, top / 2 + 0.06, P.ink, 0.04);
    const shackle = put(
      g,
      cached("shackle", () => extrude(archShape(0.3, 0.3), 0.05, 0.01)),
      P.ink,
      0,
      y + 0.02,
      top / 2 + 0.06,
    );
    shackle.scale.set(1, 0.9, 1);
  }
  void o;
  return { group: g, pin: [0, y + 1.1, 0] };
}

/** The Porta noire: an arch of ink, a red glow breathing inside it. */
export function darkGate(P: Palette, o: ModelOpts): Built {
  const g = new Group();
  box(g, 4.6, 0.14, 3.2, 0, 0, 0, P.m("wall2"), 0.05);
  const frame = archShape(3.2, 3.6);
  const hole = archShape(1.9, 2.7);
  frame.holes.push(hole);
  put(
    g,
    cached("darkFrame", () => extrude(frame, 0.9, 0.06)),
    P.ink,
    0,
    0.14,
    -0.2,
  );
  // The glow, set back in the arch.
  const glow = dyn(
    put(
      g,
      cached("darkGlow", () => extrude(archShape(1.9, 2.7), 0.06, 0)),
      P.glow,
      0,
      0.14,
      -0.5,
    ),
  );
  // The keystone and the two steps before it.
  box(g, 0.5, 0.5, 1.0, 0, 3.3, -0.2, P.m("wall"), 0.05);
  box(g, 2.6, 0.12, 0.9, 0, 0.14, 0.75, P.m("wall"), 0.04);
  box(g, 2.2, 0.12, 0.6, 0, 0.26, 0.55, P.m("trim"), 0.04);
  return {
    group: g,
    pin: [0, 4.6, 0],
    tick: (t) => {
      glow.scale.y = 0.94 + Math.sin(t * 1.6) * 0.04 * (o.running ? 1 : 0);
    },
  };
}

const GEM_MATS = new Map<string, MeshStandardMaterial>();
const gemMaterial = (hex: string) => {
  let m = GEM_MATS.get(hex);
  if (!m) {
    m = new MeshStandardMaterial({ color: hex, roughness: 0.35 });
    GEM_MATS.set(hex, m);
  }
  return m;
};

/** A chest of relics: porcelain, banded, a gem of its rarity on the lid. */
export function chest(P: Palette, gem: string, g = new Group(), x = 0, z = 0, s = 1): Group {
  const c = new Group();
  c.position.set(x, 0, z);
  c.scale.setScalar(s);
  g.add(c);
  box(c, 0.9, 0.5, 0.6, 0, 0, 0, P.m("wall"), 0.05);
  box(c, 0.94, 0.22, 0.64, 0, 0.5, 0, P.m("trim"), 0.08);
  for (const bx of [-0.3, 0.3]) box(c, 0.08, 0.74, 0.66, bx, 0, 0, P.m("wood"), 0.02);
  const m = gemMaterial(gem);
  const stone = put(
    c,
    cached("gemGeo", () => extrude(diamond(), 0.08, 0.02)),
    m,
    0,
    0.42,
    0.34,
  );
  stone.scale.setScalar(1.1);
  return c;
}

function diamond(): Shape {
  const s = new Shape();
  s.moveTo(0, 0);
  s.lineTo(0.12, 0.14);
  s.lineTo(0, 0.28);
  s.lineTo(-0.12, 0.14);
  s.lineTo(0, 0);
  return s;
}

/** The antiquarian's stall: a table under a striped awning, his chests round it. */
export function stall(P: Palette, gems: string[]): Built {
  const g = new Group();
  box(g, 5.0, 0.1, 4.2, 0, 0, 0, P.m("trim"), 0.18);
  box(g, 3.0, 0.9, 1.2, 0, 0.1, -0.8, P.m("wood"), 0.05);
  box(g, 3.2, 0.1, 1.4, 0, 1.0, -0.8, P.m("wall"), 0.04);
  for (const x of [-1.5, 1.5]) cyl(g, 0.06, 0.06, 2.4, x, 0.1, -1.6, P.m("wood"), 12);
  for (const x of [-1.5, 1.5]) cyl(g, 0.06, 0.06, 1.9, x, 0.1, 0.1, P.m("wood"), 12);
  // The awning: white and red, four bands, sloping to the front.
  for (let k = 0; k < 6; k++) {
    const band = box(
      g,
      0.56,
      0.05,
      2.1,
      -1.4 + k * 0.56,
      2.15,
      -0.75,
      k % 2 ? P.accentCloth : P.m("trim"),
      0.01,
    );
    band.rotation.x = 0.28;
  }
  gems.forEach((gem, k) => chest(P, gem, g, -1.5 + k * 1.0, 1.0, 0.95));
  return { group: g, pin: [0, 3.4, 0] };
}
