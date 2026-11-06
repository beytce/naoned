/**
 * The stations of every workshop's inside (docs/plan-ateliers.md § 7.2, lot A5), drawn by what
 * they are: an oven or a kiln (a vault and its glowing mouth), a wheel or a millstone (a disc that
 * turns), a shed or a rack (boards stacked under a roof), an inspection (a desk and its red lens),
 * else a workbench whose tool goes to and fro. The sawmill's four keep their own models. A station
 * fills its footprint (turned), its hands at its front; what works moves only while `running`.
 */
import { Group } from "three";
import type { Palette } from "../materials.js";
import { box, crate, cyl, dome, dyn } from "../shapes.js";
import { BOARD } from "../tokens.js";
import { crewAt, debarker, dryer, neckRing, planer, sawBench } from "./interior.js";
import { kilnGlow, smoke } from "./life.js";
import type { Built, ModelOpts } from "./model.js";

const S = BOARD.tile + BOARD.gap;

export interface StationLook {
  kind: string;
  /** Its footprint on the flagstones, turned: width (x) and depth (z). */
  w: number;
  h: number;
  /** Quarter turns from +x: where its work goes. */
  rot: 0 | 1 | 2 | 3;
  /** Its hands at work. */
  crew: number;
  /** It holds the rest back: the red ring. */
  neck: boolean;
  /** Its site is under way: drawn pale, without its hands. */
  building: boolean;
}

type Family = "oven" | "wheel" | "shed" | "inspection" | "bench";

/** What a kind of station looks like, from its name. */
export function familyOf(kind: string): Family {
  if (/oven|kiln|furnace/.test(kind)) return "oven";
  if (/wheel|millstone|mortar|dredge/.test(kind)) return "wheel";
  if (/shed|rack|yard|arch|floor/.test(kind)) return "shed";
  if (/inspection/.test(kind)) return "inspection";
  return "bench";
}

/**
 * A station on its first flagstone (its top-left): the model centred on its footprint, turned so
 * that its work goes the way it does.
 */
export function stationModel(P: Palette, o: ModelOpts, look: StationLook): Built {
  const root = new Group();
  const cx = ((look.w - 1) * S) / 2;
  const cz = ((look.h - 1) * S) / 2;
  const holder = new Group();
  holder.position.set(cx, 0, cz);
  root.add(holder);
  const crew = look.building ? 0 : look.crew;
  const own = ownModel(P, o, look.kind, crew, look.neck);
  const b = own ?? generic(P, o, look, crew);
  // The specific models face +x along their bench already; the turn is the station's.
  b.group.rotation.y = (-look.rot * Math.PI) / 2;
  holder.add(b.group);
  const span = Math.max(look.w, look.h);
  const ring = look.neck && !own ? neckRing(P, holder, span > 1 ? 1.55 : 1) : null;
  if (look.building) {
    // A site: scaffolding of wood round a pale block.
    for (const [x, z] of [
      [-2, -2],
      [2, -2],
      [-2, 2],
      [2, 2],
    ] as const)
      box(holder, 0.14, 3.2, 0.14, x, 0, z, P.m("wood"), 0.02);
    box(holder, 4.3, 0.12, 0.14, 0, 3.0, -2, P.m("wood"), 0.02);
    box(holder, 4.3, 0.12, 0.14, 0, 3.0, 2, P.m("wood"), 0.02);
  }
  return {
    group: root,
    pin: [cx, b.pin[1], cz],
    tick: (t, dt) => {
      b.tick?.(t, dt);
      ring?.(t);
    },
  };
}

/** The sawmill's own four (the laboratory's), at their own scale. */
function ownModel(
  P: Palette,
  o: ModelOpts,
  kind: string,
  crew: number,
  neck: boolean,
): Built | null {
  if (kind === "barking") return debarker(P, o, {}, crew);
  if (kind === "saw_bench") return sawBench(P, o, neck, crew);
  if (kind === "drying_shed") return dryer(P, o);
  if (kind === "planing") return planer(P, o, crew);
  return null;
}

/** A station of any other kind, by its family, filling its footprint. */
function generic(P: Palette, o: ModelOpts, look: StationLook, crew: number): Built {
  const g = new Group();
  // Unturned, its length goes along x: the turned footprint's width or depth.
  const along = look.rot % 2 ? look.h : look.w;
  const across = look.rot % 2 ? look.w : look.h;
  const L = along * S - 1.6;
  const D = across * S - 2.2;
  const fam = familyOf(look.kind);
  let tick: Built["tick"];
  let top = 2.4;
  if (fam === "oven") {
    box(g, L, 0.5, Math.min(D, 3.2), 0, 0, -0.3, P.m("wall2"), 0.05);
    const vault = dome(g, Math.min(L, 3.2) / 2, 0, 0.5, -0.3, P.m("wall"), 1.1);
    void vault;
    const mouth = box(g, 0.9, 0.7, 0.2, 0, 0.6, Math.min(D, 3.2) / 2 - 0.25, P.m("open"), 0.04);
    const glow = kilnGlow(P, g, mouth, 0, 1.0, Math.min(D, 3.2) / 2 + 0.3, o);
    const puffs = smoke(g, 0.6, 2.6, -0.8, o, 5);
    box(g, 0.5, 1.4, 0.5, 0.6, 1.4, -0.8, P.m("wall2"), 0.04);
    top = 3.4;
    tick = (t) => {
      glow(t);
      puffs(t);
    };
  } else if (fam === "wheel") {
    box(g, L, 0.4, Math.min(D, 3), 0, 0, 0, P.m("wood"), 0.04);
    const disc = dyn(new Group());
    disc.position.set(0, 0.4, 0);
    g.add(disc);
    cyl(disc, Math.min(L, 3) / 2 - 0.2, Math.min(L, 3) / 2 - 0.2, 0.45, 0, 0, 0, P.m("wall2"), 48);
    box(disc, 0.18, 0.12, Math.min(L, 3) - 0.6, 0, 0.45, 0, P.accent, 0.02);
    top = 2.2;
    tick = (_t, dt) => {
      if (o.running) disc.rotation.y += dt * 1.2;
    };
  } else if (fam === "shed") {
    for (const z of [-D / 4, D / 4])
      for (let i = 0; i < 5; i++)
        box(g, L - 0.6, 0.08, D / 2 - 0.3, 0, i * 0.24, z, P.m("wood"), 0.015);
    for (const [x, z] of [
      [-L / 2, -D / 2],
      [L / 2, -D / 2],
      [-L / 2, D / 2],
      [L / 2, D / 2],
    ] as const)
      box(g, 0.14, 2.2, 0.14, x, 0, z, P.m("wood"), 0.03);
    box(g, L + 0.4, 0.14, D + 0.4, 0, 2.2, 0, P.m("roof"), 0.04);
    top = 3.0;
  } else if (fam === "inspection") {
    box(g, 1.8, 0.9, 1.0, 0, 0, -0.3, P.m("wood"), 0.04);
    cyl(g, 0.05, 0.05, 0.6, 0.4, 0.9, -0.3, P.m("metal"), 10);
    const lens = cyl(g, 0.22, 0.22, 0.05, 0.4, 1.5, -0.3, P.accent, 24);
    lens.rotation.x = Math.PI / 2;
    top = 2.4;
  } else {
    box(g, L, 0.9, Math.min(D, 1.2), 0, 0, -0.3, P.m("wood"), 0.04);
    box(g, L + 0.1, 0.08, Math.min(D, 1.2) + 0.1, 0, 0.9, -0.3, P.m("wall2"), 0.03);
    const tool = dyn(new Group());
    tool.position.set(0, 1.0, -0.3);
    g.add(tool);
    box(tool, 0.5, 0.2, 0.3, 0, 0, 0, P.m("metal"), 0.03);
    crate(g, L / 2 - 0.3, 0, 0.9, P.m("trim"), 0.45, 0.3);
    tick = (t) => {
      tool.position.x = o.running ? Math.sin(t * 2.2) * (L / 2 - 0.5) : 0;
    };
  }
  if (crew > 0) crewAt(P, g, Math.min(crew, 3), 0, Math.min(D, 3.2) / 2 + 0.9, Math.PI);
  return { group: g, pin: [0, top + 0.9, 0], ...(tick ? { tick } : {}) };
}

/** By a door inside the hall: the goods waiting to come in, or gone out, stacked. */
export function doorPile(P: Palette, side: "in" | "out"): Group {
  const g = new Group();
  if (side === "in") {
    for (const [x, y] of [
      [0, 0],
      [0.5, 0],
      [0.25, 0.42],
    ] as const)
      crate(g, x - 0.25, y, 0, P.m("trim"), 0.45, 0.2);
  } else {
    crate(g, 0, 0, 0, P.accent, 0.5, 0.4);
    crate(g, 0, 0.5, 0, P.m("trim"), 0.42, 0.1);
  }
  return g;
}
