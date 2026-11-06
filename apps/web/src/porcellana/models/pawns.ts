/**
 * The pawns of the Porta (proposal of 6 November 2026, docs/plan-porta-porcellana.md): porcelain
 * chess pieces, turned on a lathe — a bevelled foot, a waisted body, a collar, a round head — each
 * told from the others by one sign only, read at a glance from the camera: the kettle hat and the
 * spear of the foot soldier, the crossbow across the chest, the chess knight's horse head, the
 * captain's banner; Rome's legionary under a crested helmet with his scutum, Rome's archer under a
 * hood. The house's pieces are glazed white with a red sash; Rome's are biscuit, their signs in
 * ink. Nothing but turned and extruded volumes, every edge rounded.
 */
import { type BufferGeometry, Group, LatheGeometry, Shape, TorusGeometry, Vector2 } from "three";
import type { Palette } from "../materials.js";
import { ball, box, cached, cyl, dome, extrude, put } from "../shapes.js";
import type { Built } from "./model.js";

export type PawnKind =
  | "soldier"
  | "crossbow"
  | "knight"
  | "captain"
  | "legionary"
  | "archer"
  | "centurion"
  | "worker";

/** Turned once, shared by every pawn. */
function lathe(key: string, pts: [number, number][], seg = 48): BufferGeometry {
  return cached(`lathe:${key}`, () => {
    const g = new LatheGeometry(
      pts.map(([r, y]) => new Vector2(r, y)),
      seg,
    );
    g.computeVertexNormals();
    return g;
  });
}

/** The foot: a bevelled disc, its rim rolled. */
const FOOT: [number, number][] = [
  [0, 0],
  [0.4, 0],
  [0.44, 0.03],
  [0.45, 0.08],
  [0.43, 0.12],
  [0.36, 0.15],
];
/** The body: waisted, its collar under the head. */
const BODY: [number, number][] = [
  ...FOOT,
  [0.31, 0.2],
  [0.24, 0.3],
  [0.2, 0.45],
  [0.18, 0.66],
  [0.17, 0.84],
  [0.25, 0.9],
  [0.26, 0.94],
  [0.17, 0.98],
  [0.12, 1.0],
  [0, 1.0],
];
/** The knight's foot: lower, wider, the horse rises from it. */
const KNIGHT_FOOT: [number, number][] = [
  [0, 0],
  [0.46, 0],
  [0.5, 0.03],
  [0.51, 0.09],
  [0.48, 0.14],
  [0.4, 0.18],
  [0.34, 0.24],
  [0.32, 0.3],
  [0, 0.3],
];

/** The chess knight's horse head, side view (x forward, y up). */
function horseShape(): Shape {
  const s = new Shape();
  s.moveTo(-0.3, 0);
  s.lineTo(0.3, 0);
  s.quadraticCurveTo(0.26, 0.28, 0.14, 0.52);
  s.quadraticCurveTo(0.3, 0.6, 0.44, 0.7);
  s.quadraticCurveTo(0.52, 0.78, 0.44, 0.86);
  s.quadraticCurveTo(0.28, 0.98, 0.12, 1.06);
  s.lineTo(0.06, 1.2);
  s.lineTo(-0.04, 1.08);
  s.quadraticCurveTo(-0.3, 1.0, -0.34, 0.66);
  s.quadraticCurveTo(-0.36, 0.3, -0.3, 0);
  return s;
}

/** A piece: its group and the height of its head (for a pin or a halo over it). */
export function pawn(P: Palette, kind: PawnKind, side?: "house" | "rome"): Built {
  const rome = side
    ? side === "rome"
    : kind === "legionary" || kind === "archer" || kind === "centurion";
  const g = new Group();
  const glaze = P.m(rome ? "wall2" : "trim");
  const sign = rome ? P.ink : P.accent;
  if (kind === "knight") {
    put(g, lathe("kfoot", KNIGHT_FOOT), glaze);
    const head = put(
      g,
      cached("horse", () => extrude(horseShape(), 0.3, 0.05)),
      glaze,
      0,
      0.28,
      0,
    );
    head.rotation.y = -Math.PI / 2;
    // The mane, a red crest down the neck.
    const mane = new Shape();
    mane.moveTo(-0.36, 0.62);
    mane.quadraticCurveTo(-0.34, 1.0, -0.02, 1.12);
    mane.lineTo(-0.06, 1.0);
    mane.quadraticCurveTo(-0.26, 0.92, -0.28, 0.62);
    const m = put(
      g,
      cached("mane", () => extrude(mane, 0.4, 0.02)),
      sign,
      0,
      0.28,
      0,
    );
    m.rotation.y = -Math.PI / 2;
    // The eye, a dot of ink each side.
    for (const s of [-1, 1]) ball(g, 0.035, s * 0.19, 1.16, 0.18, P.ink, 12);
    return { group: g, pin: [0, 1.9, 0] };
  }
  put(g, lathe("body", BODY), glaze);
  ball(g, 0.17, 0, 1.15, 0, glaze, 32);
  if (!rome) {
    // The sash of Venice, across the waist.
    const sash = put(
      g,
      cached("sash", () => new TorusGeometry(0.2, 0.035, 12, 40)),
      sign,
      0,
      0.62,
      0,
    );
    sash.rotation.x = Math.PI / 2 - 0.35;
  }
  if (kind === "soldier" || kind === "captain") {
    // The kettle hat: a brim and a crown, in metal.
    cyl(g, 0.27, 0.27, 0.025, 0, 1.24, 0, P.m("metal"), 40);
    dome(g, 0.16, 0, 1.25, 0, P.m("metal"));
  }
  if (kind === "worker") {
    // A workshop's hand (docs/plan-ateliers.md § 7.2): a soft cap of wood, its brim forward.
    dome(g, 0.175, 0, 1.2, 0, P.m("wood"), 0.75);
    box(g, 0.2, 0.025, 0.14, 0, 1.2, 0.15, P.m("wood"), 0.01);
  }
  if (kind === "soldier") {
    // The spear held upright at the side.
    cyl(g, 0.022, 0.022, 1.55, 0.3, 0.18, 0.04, P.m("wood"), 10);
    const tip = put(
      g,
      cached("tip", () => extrude(leaf(), 0.03, 0.01)),
      P.m("metal"),
      0.3,
      1.73,
      0.04,
    );
    tip.rotation.y = Math.PI / 4;
  }
  if (kind === "crossbow" || kind === "archer") {
    if (kind === "crossbow") {
      cyl(g, 0.17, 0.17, 0.06, 0, 1.26, 0, P.m("metal"), 32);
      dome(g, 0.15, 0, 1.3, 0, P.m("metal"), 0.7);
    } else {
      // Rome's archer: a hood of ink.
      dome(g, 0.19, 0, 1.15, -0.01, P.ink, 1.1);
    }
    // The bow across the chest.
    const bow = new Group();
    bow.position.set(0, 0.72, 0.24);
    bow.rotation.z = 0.5;
    g.add(bow);
    box(bow, 0.06, 0.06, 0.42, 0, -0.03, 0.06, P.m("wood"), 0.015);
    const arc = put(
      bow,
      cached("bow", () => new TorusGeometry(0.26, 0.025, 8, 28, Math.PI * 0.8)),
      kind === "archer" ? P.ink : P.m("metal"),
      0,
      0,
      0.18,
    );
    arc.rotation.z = Math.PI * 0.1;
  }
  if (kind === "captain") {
    cyl(g, 0.02, 0.02, 1.9, -0.3, 0.18, -0.05, P.m("wood"), 10);
    box(g, 0.44, 0.3, 0.025, -0.07, 1.68, -0.05, sign, 0.01);
    ball(g, 0.04, -0.3, 2.1, -0.05, P.m("metal"), 12);
  }
  if (kind === "legionary" || kind === "centurion") {
    // The galea: a dome of ink and its crest.
    dome(g, 0.18, 0, 1.2, 0, P.ink, 0.9);
    const crest = put(
      g,
      cached("crest", () => new TorusGeometry(0.15, 0.045, 10, 24, Math.PI)),
      kind === "centurion" ? P.accent : P.ink,
      0,
      1.3,
      0,
    );
    if (kind === "centurion") crest.rotation.y = Math.PI / 2;
    // The scutum, curved, on the left arm.
    const shield = new Group();
    shield.position.set(-0.24, 0.32, 0.12);
    shield.rotation.y = -0.6;
    g.add(shield);
    box(shield, 0.06, 0.62, 0.42, 0, 0, 0, P.m("wall"), 0.03);
    box(shield, 0.03, 0.5, 0.06, 0.035, 0.06, 0, P.ink, 0.01);
    ball(shield, 0.05, 0.05, 0.31, 0, P.ink, 12);
    // The short sword at the right.
    box(g, 0.04, 0.36, 0.06, 0.24, 0.42, 0.05, P.m("metal"), 0.01);
  }
  return { group: g, pin: [0, kind === "captain" ? 2.4 : 1.9, 0] };
}

/** A spear's leaf blade. */
function leaf(): Shape {
  const s = new Shape();
  s.moveTo(0, 0);
  s.quadraticCurveTo(0.07, 0.08, 0, 0.22);
  s.quadraticCurveTo(-0.07, 0.08, 0, 0);
  return s;
}

/** A group of pawns standing on a tile, in a loose wedge, facing `face` (radians). */
export function squad(P: Palette, kinds: PawnKind[], scale = 1.35, face = 0, spread = 1.05): Built {
  const g = new Group();
  const n = kinds.length;
  kinds.forEach((k, i) => {
    const row = Math.floor(Math.sqrt(i));
    const inRow = i - row * row;
    const across = 2 * row + 1;
    const x = (inRow - (across - 1) / 2) * spread;
    const z = row * spread * 0.9 - ((Math.floor(Math.sqrt(n - 1)) * spread * 0.9) / 2) * 1;
    const piece = pawn(P, k).group;
    piece.scale.setScalar(scale);
    piece.position.set(x, 0, -z);
    g.add(piece);
  });
  g.rotation.y = face;
  return { group: g, pin: [0, 2.6 * scale, 0] };
}
