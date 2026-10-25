import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { territoryLook } from "../src/game/terraShapes.js";
import { fr } from "../src/i18n.js";

/**
 * The colours that carry a meaning, seen with a colour blindness (E3-11 of the experts): each
 * pair of roles stays apart for a deuteranope and a protanope (ΔE 40 at least, Machado 2009 at
 * full severity), or carries a sign besides its colour, named here and checked below.
 */
const ROLES = ["gold", "lagoon", "vermilion", "info"] as const;
type Role = (typeof ROLES)[number];
type RGB = [number, number, number];

const PROTAN = [
  [0.152286, 1.052583, -0.204868],
  [0.114503, 0.786281, 0.099216],
  [-0.003882, -0.048116, 1.051998],
];
const DEUTAN = [
  [0.367322, 0.860646, -0.227968],
  [0.280085, 0.672501, 0.047413],
  [-0.01182, 0.04294, 0.968881],
];

function palettes(): Record<string, Record<string, RGB>> {
  const css = readFileSync(join(__dirname, "..", "src", "index.css"), "utf8");
  const out: Record<string, Record<string, RGB>> = {};
  for (const m of css.matchAll(/\[data-palette="(\w+)"\]\s*\{([^}]*)\}/g)) {
    const vars: Record<string, RGB> = {};
    for (const v of (m[2] ?? "").matchAll(/--([\w-]+):\s*(\d+) (\d+) (\d+);/g))
      vars[v[1] ?? ""] = [Number(v[2]), Number(v[3]), Number(v[4])];
    out[m[1] ?? ""] = vars;
  }
  return out;
}

const linear = (c: number) => {
  const s = c / 255;
  return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
};
const seen = (c: RGB, m: number[][]): RGB => {
  const l = c.map(linear);
  return m.map((row) =>
    Math.min(
      1,
      Math.max(
        0,
        row.reduce((t, k, j) => t + k * (l[j] ?? 0), 0),
      ),
    ),
  ) as RGB;
};
const lab = ([r, g, b]: RGB): RGB => {
  const x = (0.4124 * r + 0.3576 * g + 0.1805 * b) / 0.95047;
  const y = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  const z = (0.0193 * r + 0.1192 * g + 0.9505 * b) / 1.08883;
  const f = (t: number) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  return [116 * f(y) - 16, 500 * (f(x) - f(y)), 200 * (f(y) - f(z))];
};
const deltaE = (a: RGB, b: RGB) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

/** The pairs told apart by a sign besides their colour, and the sign. */
const NON_COLOR_CUE: Partial<Record<`${Role}/${Role}`, string>> = {
  "lagoon/vermilion":
    "gains « + » and losses « − » written; on the Terraferma, allies dashed, enemies a plain rim",
  "gold/vermilion":
    "on the Terraferma, the merchant's own land filled and thick-edged, enemies a thin rim; ranked written « ★ »",
  "gold/lagoon": "on the Terraferma, allies dashed, the merchant's own land plain and thick-edged",
};

describe("the colours of meaning, for a colour-blind eye", () => {
  for (const [name, vars] of Object.entries(palettes())) {
    it(`${name}: every pair of roles apart, or with a sign besides its colour`, () => {
      const lost: string[] = [];
      for (const [k, a] of ROLES.entries()) {
        for (const b of ROLES.slice(k + 1)) {
          const ca = vars[a];
          const cb = vars[b];
          if (!ca || !cb) throw new Error(`${name}: --${a} or --${b} missing`);
          const worst = Math.min(
            deltaE(lab(seen(ca, DEUTAN)), lab(seen(cb, DEUTAN))),
            deltaE(lab(seen(ca, PROTAN)), lab(seen(cb, PROTAN))),
          );
          if (worst < 40 && !NON_COLOR_CUE[`${a}/${b}`])
            lost.push(`${a}/${b}: ${worst.toFixed(0)}`);
        }
      }
      expect(lost).toEqual([]);
    });
  }

  it("draw the signs they rely on", () => {
    const tone = "#888888";
    const me = territoryLook({ focus: "me", tone }, false);
    const ally = territoryLook({ focus: "ally", tone }, false);
    const enemy = territoryLook({ focus: "enemy", tone }, false);
    // Allies dashed; neither the merchant's land nor the enemies'.
    expect(ally.strokeDasharray).toBeDefined();
    expect(me.strokeDasharray).toBeUndefined();
    expect(enemy.strokeDasharray).toBeUndefined();
    // The merchant's own land thicker and filled more than an enemy's.
    expect(me.strokeWidth).toBeGreaterThan(enemy.strokeWidth);
    expect(me.fillOpacity ?? 0).toBeGreaterThan(enemy.fillOpacity ?? 0);
    // The rival's gap written with its sign.
    expect(fr.game.rival.gap(true, "10 d")).toContain("+");
    expect(fr.game.rival.gap(false, "10 d")).toContain("−");
  });
});

describe("the size of the text", () => {
  it("follows the page's root everywhere: no size written in pixels", () => {
    const { readdirSync, statSync } = require("node:fs") as typeof import("node:fs");
    const files: string[] = [];
    const walk = (dir: string) => {
      for (const f of readdirSync(dir)) {
        const p = join(dir, f);
        if (statSync(p).isDirectory()) walk(p);
        else if (/\.(tsx?|css)$/.test(f)) files.push(p);
      }
    };
    walk(join(__dirname, "..", "src"));
    const fixed = files.filter((f) => /text-\[\d+(\.\d+)?px\]/.test(readFileSync(f, "utf8")));
    expect(fixed).toEqual([]);
  });
});
