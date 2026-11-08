/**
 * The stations by their trade (docs/plan-publication.md lot 6, « les intérieurs selon le métier »):
 * what each station of a workshop's inside does, seen at once, instead of the one bench of before.
 * A loom and its beater, a wheel that spins upright, a tailor's table and its cloth, a trough of
 * dough, logs and the axe that falls, a sieve that shakes, a basin of water, furrows of stalks,
 * stacks of bricks, panes of glass, the blower's pipe and its bead of fire, fleeces, a screw press,
 * sacks and bowls. Unturned, its length goes along x; what works moves only while `running`.
 */
import { Group } from "three";
import type { Palette } from "../materials.js";
import { ball, box, crate, cyl, dyn } from "../shapes.js";
import type { ModelOpts } from "./model.js";

export interface TradeDress {
  /** The height of its top: the pin stands above it. */
  top: number;
  tick?: (t: number, dt: number) => void;
}

type Trade =
  | "loom"
  | "spin"
  | "cloth"
  | "dough"
  | "axe"
  | "sieve"
  | "basin"
  | "field"
  | "bricks"
  | "panes"
  | "blow"
  | "wool"
  | "press"
  | "sacks"
  | "rope";

/** The trade of a station's kind, or null for the bench of before. */
export function tradeOf(kind: string): Trade | null {
  if (/^loom_frame$/.test(kind)) return "loom";
  if (/spinning_wheel|rope_wheel/.test(kind)) return "spin";
  if (/sewing|embroidery|cutting_table/.test(kind)) return "cloth";
  if (/kneading/.test(kind)) return "dough";
  if (/felling|limbing/.test(kind)) return "axe";
  if (/sieve|sand_sorting|clay_pick|bolting/.test(kind)) return "sieve";
  if (/salt_pan|retting_pond|wash_tub|fulling/.test(kind)) return "basin";
  if (/furrow|sickle|hemp_cutting|threshing|salt_rake/.test(kind)) return "field";
  if (/brick_mould|stacking|clay_mixer/.test(kind)) return "bricks";
  if (/glass_cutting|polishing|silvering|framing/.test(kind)) return "panes";
  if (/blowing|shaping/.test(kind)) return "blow";
  if (/shearing|wool_sorting|carding/.test(kind)) return "wool";
  if (/pressing/.test(kind)) return "press";
  if (/spice_sorting|grain_sorting|dosing|packing/.test(kind)) return "sacks";
  if (/hackling|rope_laying/.test(kind)) return "rope";
  return null;
}

/** A plain table: its top at 0.9. */
function table(P: Palette, g: Group, L: number, d: number): void {
  box(g, L, 0.9, d, 0, 0, -0.3, P.m("wood"), 0.04);
  box(g, L + 0.1, 0.08, d + 0.1, 0, 0.9, -0.3, P.m("wall2"), 0.03);
}

/**
 * Dresses a station of a known trade on `g` within L (along x) by D (across), or null when its kind
 * has no trade of its own.
 */
export function tradeDress(
  P: Palette,
  g: Group,
  kind: string,
  L: number,
  D: number,
  o: ModelOpts,
): TradeDress | null {
  const trade = tradeOf(kind);
  if (!trade) return null;
  const d = Math.min(D, 1.4);
  switch (trade) {
    case "loom": {
      // Two uprights, the warp in accent between them, the beater going to and fro.
      for (const x of [-L / 2 + 0.2, L / 2 - 0.2]) box(g, 0.16, 2.0, 0.16, x, 0, -0.3, P.m("wood"));
      box(g, L - 0.2, 0.14, 0.16, 0, 2.0, -0.3, P.m("wood"));
      box(g, L - 0.6, 0.05, 1.0, 0, 1.0, -0.3, P.accent, 0.01);
      const beater = dyn(new Group());
      beater.position.set(0, 1.05, -0.3);
      g.add(beater);
      box(beater, L - 0.6, 0.6, 0.08, 0, 0, 0, P.m("wood"), 0.02);
      return {
        top: 2.2,
        tick: (t) => {
          beater.position.z = -0.3 + (o.running ? Math.sin(t * 3) * 0.35 : 0);
        },
      };
    }
    case "spin": {
      // A wheel upright on its stand, turning; a bobbin of accent at its side.
      box(g, 1.6, 0.5, 0.6, 0, 0, -0.3, P.m("wood"));
      const wheel = dyn(new Group());
      wheel.position.set(0, 1.3, -0.3);
      g.add(wheel);
      const rim = cyl(wheel, 0.75, 0.75, 0.08, 0, -0.04, 0, P.m("wood"), 32);
      rim.rotation.x = Math.PI / 2;
      box(wheel, 1.4, 0.06, 0.06, 0, -0.03, 0, P.m("wood"), 0.01);
      box(wheel, 0.06, 1.4, 0.06, 0, -0.7, 0, P.m("wood"), 0.01);
      box(g, 0.1, 0.9, 0.1, 0, 0.5, -0.3, P.m("wood"));
      cyl(g, 0.16, 0.16, 0.4, 0.95, 0.5, -0.3, P.accent, 16);
      return {
        top: 2.1,
        tick: (_t, dt) => {
          if (o.running) wheel.rotation.z += dt * 3;
        },
      };
    }
    case "cloth": {
      // A table, a length of cloth in accent, the shears going along it.
      table(P, g, L, d);
      box(g, L * 0.6, 0.03, d * 0.7, -L * 0.1, 0.98, -0.3, P.accent, 0.01);
      const shears = dyn(new Group());
      shears.position.set(0, 1.02, -0.3);
      g.add(shears);
      box(shears, 0.5, 0.05, 0.12, 0, 0, 0, P.m("metal"), 0.01);
      return {
        top: 2.0,
        tick: (t) => {
          shears.position.x = o.running ? Math.sin(t * 1.6) * (L * 0.3) : 0;
        },
      };
    }
    case "dough": {
      // A long trough, its loaves rising in a row.
      box(g, L, 0.8, d, 0, 0, -0.3, P.m("wood"), 0.05);
      box(g, L - 0.3, 0.06, d - 0.3, 0, 0.8, -0.3, P.m("crop"), 0.02);
      const loaves = new Group();
      g.add(loaves);
      for (let i = 0; i < Math.max(2, Math.floor(L / 0.8)); i++)
        ball(loaves, 0.24, -L / 2 + 0.5 + i * 0.75, 0.9, -0.3, P.m("crop"), 16).scale.y = 0.6;
      return {
        top: 1.9,
        tick: (t) => {
          loaves.scale.y = o.running ? 1 + Math.sin(t * 0.8) * 0.12 : 1;
        },
      };
    }
    case "axe": {
      // Logs in a pile, a block, the axe that rises and falls.
      for (let i = 0; i < 3; i++) {
        const log = cyl(
          g,
          0.28,
          0.28,
          L * 0.7,
          -0.2,
          0.28 + (i === 2 ? 0.48 : 0),
          -0.6 + (i === 2 ? 0.3 : i * 0.6),
          P.m("wood"),
          16,
        );
        log.rotation.z = Math.PI / 2;
      }
      cyl(g, 0.4, 0.42, 0.6, L / 2 - 0.5, 0, 0.6, P.m("wood"), 20);
      const axe = dyn(new Group());
      axe.position.set(L / 2 - 0.5, 0.6, 0.6);
      g.add(axe);
      box(axe, 0.06, 0.06, 1.0, 0, 0.3, -0.5, P.m("wood"), 0.01);
      box(axe, 0.06, 0.3, 0.2, 0, 0.2, -1.0, P.accent, 0.01);
      return {
        top: 1.8,
        tick: (t) => {
          axe.rotation.x = o.running ? -Math.abs(Math.sin(t * 2.4)) * 1.2 : 0;
        },
      };
    }
    case "sieve": {
      // A heap, the sieve on its frame shaking over a tub.
      ball(g, 0.6, -L / 2 + 0.7, 0, -0.3, P.m("soil"), 20).scale.y = 0.7;
      cyl(g, 0.55, 0.5, 0.5, L / 2 - 0.8, 0, -0.3, P.m("wood"), 24);
      const sieve = dyn(new Group());
      sieve.position.set(L / 2 - 0.8, 1.0, -0.3);
      g.add(sieve);
      cyl(sieve, 0.6, 0.6, 0.12, 0, 0, 0, P.m("wood"), 28);
      cyl(sieve, 0.5, 0.5, 0.02, 0, 0.1, 0, P.m("metal"), 28);
      return {
        top: 1.8,
        tick: (t) => {
          sieve.position.x = L / 2 - 0.8 + (o.running ? Math.sin(t * 9) * 0.06 : 0);
        },
      };
    }
    case "basin": {
      // A stone basin of water, a paddle of accent stirring it.
      box(g, L, 0.5, Math.min(D, 2.4), 0, 0, -0.1, P.m("wall2"), 0.05);
      box(g, L - 0.3, 0.04, Math.min(D, 2.4) - 0.3, 0, 0.48, -0.1, P.m("water"), 0.02).castShadow =
        false;
      const paddle = dyn(new Group());
      paddle.position.set(0, 0.5, -0.1);
      g.add(paddle);
      const pole = box(paddle, 0.06, 1.3, 0.06, 0, 0, 0, P.m("wood"), 0.01);
      pole.rotation.z = 0.4;
      box(paddle, 0.3, 0.1, 0.2, -0.25, 0.05, 0, P.accent, 0.01);
      return {
        top: 1.6,
        tick: (t) => {
          paddle.rotation.y = o.running ? t * 0.9 : 0;
        },
      };
    }
    case "field": {
      // Soil in furrows, stalks that sway while the hands work, a sheaf of accent.
      box(g, L, 0.12, Math.min(D, 2.6), 0, 0, -0.1, P.m("soil"), 0.04);
      const stalks = new Group();
      g.add(stalks);
      const rows = 3;
      for (let r = 0; r < rows; r++)
        for (let i = 0; i < Math.max(3, Math.floor(L / 0.45)); i++)
          cyl(
            stalks,
            0.03,
            0.04,
            0.8,
            -L / 2 + 0.3 + i * 0.45,
            0.12,
            -0.8 + r * 0.6,
            P.m("leaf"),
            6,
          );
      cyl(g, 0.18, 0.12, 0.7, L / 2 - 0.3, 0.12, 0.7, P.accent, 10);
      return {
        top: 1.4,
        tick: (t) => {
          stalks.rotation.z = o.running ? Math.sin(t * 1.1) * 0.02 : 0;
        },
      };
    }
    case "bricks": {
      // The mould on its table, stacks of bricks beside, one of accent drying on top.
      table(P, g, L * 0.5, d);
      box(g, 0.8, 0.2, 0.5, -L * 0.1, 0.98, -0.3, P.m("wood"), 0.02);
      const stack = new Group();
      g.add(stack);
      for (let y = 0; y < 4; y++)
        for (let i = 0; i < 3; i++)
          box(
            stack,
            0.5,
            0.2,
            0.25,
            L / 2 - 1.2 + i * 0.55,
            y * 0.22,
            0.2 + (y % 2) * 0.1,
            y === 3 && i === 1 ? P.accent : P.m("wall2"),
            0.02,
          );
      return { top: 1.8 };
    }
    case "panes": {
      // Panes of glass on their easel, catching the light, one bordered in accent.
      table(P, g, L, d);
      for (let i = 0; i < 3; i++) {
        const pane = box(
          g,
          0.7,
          0.9,
          0.04,
          -L / 2 + 0.7 + i * 0.85,
          0.98,
          -0.5,
          i === 1 ? P.accent : P.m("water"),
          0.01,
        );
        pane.rotation.x = -0.25;
      }
      return { top: 2.1 };
    }
    case "blow": {
      // The blower's bench, its pipe and a bead of fire at the end, glowing while it works.
      table(P, g, L * 0.6, d);
      const pipe = dyn(new Group());
      pipe.position.set(0, 1.4, -0.3);
      g.add(pipe);
      const rod = cyl(pipe, 0.04, 0.04, 1.6, 0, -0.8, 0, P.m("metal"), 8);
      rod.rotation.z = Math.PI / 2;
      const bead = ball(pipe, 0.22, 0.85, 0, 0, P.glow, 16);
      return {
        top: 2.2,
        tick: (t) => {
          pipe.rotation.x = o.running ? t * 2 : 0;
          bead.visible = o.running;
        },
      };
    }
    case "wool": {
      // Fleeces, round and soft, heaped on a low table.
      box(g, L, 0.5, d, 0, 0, -0.3, P.m("wood"), 0.04);
      const fleece = new Group();
      g.add(fleece);
      for (let i = 0; i < Math.max(3, Math.floor(L / 0.6)); i++)
        ball(
          fleece,
          0.32,
          -L / 2 + 0.4 + i * 0.6,
          0.62,
          -0.3 + ((i % 2) - 0.5) * 0.3,
          P.m("trim"),
          14,
        );
      ball(g, 0.3, L / 2 - 0.4, 0.3, 0.5, P.accent, 14);
      return {
        top: 1.6,
        tick: (t) => {
          fleece.position.y = o.running ? Math.abs(Math.sin(t * 2)) * 0.06 : 0;
        },
      };
    }
    case "press": {
      // A screw press: two posts, a beam, the screw and its plate going down and up.
      box(g, 1.8, 0.6, 1.2, 0, 0, -0.3, P.m("wood"), 0.04);
      for (const x of [-0.8, 0.8]) box(g, 0.18, 2.2, 0.18, x, 0, -0.3, P.m("wood"));
      box(g, 1.9, 0.22, 0.3, 0, 2.2, -0.3, P.m("wood"));
      const screw = dyn(new Group());
      screw.position.set(0, 1.2, -0.3);
      g.add(screw);
      cyl(screw, 0.07, 0.07, 1.0, 0, 0, 0, P.m("metal"), 10);
      box(screw, 1.0, 0.12, 0.8, 0, -0.1, 0, P.m("wood"), 0.02);
      box(screw, 0.9, 0.05, 0.05, 0, 0.8, 0, P.accent, 0.01);
      return {
        top: 2.6,
        tick: (t) => {
          screw.position.y = 1.0 + (o.running ? Math.abs(Math.sin(t * 1.2)) * 0.25 : 0.25);
          screw.rotation.y = o.running ? t * 1.2 : 0;
        },
      };
    }
    case "sacks": {
      // A table of bowls, the scale's arm swinging, sacks waiting at its side.
      table(P, g, L * 0.7, d);
      for (let i = 0; i < 3; i++)
        cyl(
          g,
          0.2,
          0.14,
          0.14,
          -L * 0.25 + i * 0.4,
          0.98,
          -0.3,
          i === 1 ? P.accent : P.m("trim"),
          16,
        );
      const arm = dyn(new Group());
      arm.position.set(L * 0.2, 1.6, -0.3);
      g.add(arm);
      box(arm, 0.8, 0.04, 0.04, 0, 0, 0, P.m("metal"), 0.01);
      box(g, 0.05, 0.62, 0.05, L * 0.2, 0.98, -0.3, P.m("metal"), 0.01);
      for (let i = 0; i < 2; i++) crate(g, L / 2 - 0.35, 0, 0.5 - i * 0.6, P.m("crop"), 0.5, 0.25);
      return {
        top: 2.0,
        tick: (t) => {
          arm.rotation.z = o.running ? Math.sin(t * 1.4) * 0.15 : 0;
        },
      };
    }
    case "rope": {
      // A long rope of accent on its trestles, the hackle's teeth at one end.
      for (const x of [-L / 2 + 0.3, 0, L / 2 - 0.3])
        box(g, 0.1, 0.8, 0.4, x, 0, -0.3, P.m("wood"), 0.02);
      const rope = dyn(new Group());
      rope.position.set(0, 0.85, -0.3);
      g.add(rope);
      const strand = cyl(rope, 0.06, 0.06, L - 0.2, 0, -(L - 0.2) / 2, 0, P.accent, 10);
      strand.rotation.z = Math.PI / 2;
      box(g, 0.5, 0.3, 0.5, -L / 2 + 0.3, 0.8, 0.5, P.m("metal"), 0.02);
      return {
        top: 1.6,
        tick: (_t, dt) => {
          if (o.running) rope.rotation.x += dt * 4;
        },
      };
    }
  }
}
