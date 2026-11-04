import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { MAP_TEXT } from "../src/art/palette.js";

/** The variables of each palette, read from index.css as "r g b" triples. */
/** Each palette's glass: how much of its own colour it keeps (--glass-a, --glass-thick-a). */
function glassOf(): Record<string, Record<string, number>> {
  const css = readFileSync(join(__dirname, "..", "src", "index.css"), "utf8");
  const out: Record<string, Record<string, number>> = {};
  for (const m of css.matchAll(/\[data-palette="(\w+)"\]\s*\{([^}]*)\}/g)) {
    const vars: Record<string, number> = {};
    for (const v of (m[2] ?? "").matchAll(/--(glass[\w-]*):\s*([\d.]+);/g))
      vars[v[1] ?? ""] = Number(v[2]);
    out[m[1] ?? ""] = vars;
  }
  return out;
}

function palettes(): Record<string, Record<string, [number, number, number]>> {
  const css = readFileSync(join(__dirname, "..", "src", "index.css"), "utf8");
  const out: Record<string, Record<string, [number, number, number]>> = {};
  for (const m of css.matchAll(/\[data-palette="(\w+)"\]\s*\{([^}]*)\}/g)) {
    const vars: Record<string, [number, number, number]> = {};
    for (const v of (m[2] ?? "").matchAll(/--([\w-]+):\s*(\d+) (\d+) (\d+);/g))
      vars[v[1] ?? ""] = [Number(v[2]), Number(v[3]), Number(v[4])];
    out[m[1] ?? ""] = vars;
  }
  return out;
}

const luminance = ([r, g, b]: [number, number, number]) => {
  const lin = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
};

const contrast = (a: [number, number, number], b: [number, number, number]) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
};

describe("the palettes", () => {
  const all = palettes();

  it("are the pastel Jour, the blue Lagune, the dark Noyer, the light Parchemin and the Pass's gold", () => {
    expect(Object.keys(all).sort()).toEqual(["jour", "lagune", "noyer", "or", "parchemin"]);
  });

  // The gold button's face (a palette may light it apart from the gold of the amounts): its
  // words read on it.
  for (const [name, vars] of Object.entries(all)) {
    it(`${name}: the gold button's words read on its face`, () => {
      const face = vars.face ?? vars.gold;
      const ink = vars["face-ink"] ?? vars.ink;
      if (!face || !ink) throw new Error(`${name}: no face or ink`);
      expect(contrast(ink, face)).toBeGreaterThanOrEqual(4.5);
    });
  }

  // WCAG AA for text (4.5:1): every colour that writes text, on every surface it sits on.
  for (const [name, vars] of Object.entries(all)) {
    it(`${name}: text colours read on every surface`, () => {
      const low: string[] = [];
      for (const text of ["cream", "cream-dim", "muted", "gold", "lagoon", "info", "vermilion"]) {
        for (const surface of ["night", "night-2", "night-3"]) {
          const t = vars[text];
          const s = vars[surface];
          if (!t || !s) throw new Error(`${name}: --${text} or --${surface} missing`);
          const ratio = contrast(t, s);
          if (ratio < 4.5) low.push(`${text} on ${surface}: ${ratio.toFixed(2)}`);
        }
      }
      expect(low).toEqual([]);
    });

    // WCAG 1.4.11 (3:1): the outline of a button, a field or a card that can be touched.
    it(`${name}: what can be touched is outlined at 3:1 on every surface`, () => {
      const low: string[] = [];
      for (const surface of ["night", "night-2", "night-3"]) {
        const e = vars.edge;
        const s = vars[surface];
        if (!e || !s) throw new Error(`${name}: --edge or --${surface} missing`);
        const ratio = contrast(e, s);
        if (ratio < 3) low.push(`edge on ${surface}: ${ratio.toFixed(2)}`);
      }
      expect(low).toEqual([]);
    });

    // The map's dots (refonte UX): a place that waits reads at 3:1 on the map's night.
    it(`${name}: the dots of the map's calls read on the night`, () => {
      const low: string[] = [];
      for (const call of ["lagoon", "info", "rumour"]) {
        const c = vars[call];
        const s = vars.night;
        if (!c || !s) throw new Error(`${name}: --${call} or --night missing`);
        const ratio = contrast(c, s);
        if (ratio < 3) low.push(`${call} on night: ${ratio.toFixed(2)}`);
      }
      expect(low).toEqual([]);
    });
  }
});

describe("the map's writing", () => {
  const rgb = (hex: string): [number, number, number] => [
    Number.parseInt(hex.slice(1, 3), 16),
    Number.parseInt(hex.slice(3, 5), 16),
    Number.parseInt(hex.slice(5, 7), 16),
  ];
  it("reads on its halo (AA) and never writes a figure bigger than a name", () => {
    expect(contrast(rgb(MAP_TEXT.ink), rgb(MAP_TEXT.halo))).toBeGreaterThanOrEqual(4.5);
    expect(MAP_TEXT.troops).toBeLessThanOrEqual(MAP_TEXT.merchant);
    expect(MAP_TEXT.mine).toBeLessThanOrEqual(MAP_TEXT.city);
  });
});

// The glass over the map (Liquid Glass, 4 November 2026): blurred, the map behind melts into an
// average of its colours; the worst case is the glass over the map's darkest and lightest colours.
// The text on it still reads at 4.5:1 (the night palettes take the glass of Lagune, their root).
describe("the glass over the map", () => {
  const all = palettes();
  const glass = glassOf();
  const map: [number, number, number][] = [
    [95, 175, 126], // pines
    [199, 154, 110], // the tiles' earth
    [255, 255, 255], // snow, walls
    [207, 228, 230], // the sky
  ];
  const mix = (
    a: [number, number, number],
    b: [number, number, number],
    k: number,
  ): [number, number, number] =>
    [0, 1, 2].map((i) => (a[i] ?? 0) * k + (b[i] ?? 0) * (1 - k)) as never;
  for (const [name, vars] of Object.entries(all)) {
    const g = { ...glass.lagune, ...glass[name] };
    for (const [layer, surface, alpha, texts] of [
      ["glass", "night-3", g["glass-a"], ["cream"]],
      ["glass-thick", "night-2", g["glass-thick-a"], ["cream", "cream-dim", "gold"]],
    ] as const) {
      it(`${name}: text reads on its ${layer}`, () => {
        const s = vars[surface];
        if (!s || alpha === undefined) throw new Error(`${name}: no ${surface} or alpha`);
        const low: string[] = [];
        for (const behind of map)
          for (const text of texts) {
            const t = vars[text];
            if (!t) throw new Error(`${name}: no ${text}`);
            const r = contrast(t, mix(s, behind, alpha));
            if (r < 4.5) low.push(`${text} over ${behind.join(",")}: ${r.toFixed(2)}`);
          }
        expect(low).toEqual([]);
      });
    }
  }
});
