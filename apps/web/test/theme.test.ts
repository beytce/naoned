import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { MAP_TEXT } from "../src/art/palette.js";

/** The variables of each palette, read from index.css as "r g b" triples. */
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

  it("are the blue Lagune, the dark Noyer, the light Parchemin and the Pass's gold", () => {
    expect(Object.keys(all).sort()).toEqual(["lagune", "noyer", "or", "parchemin"]);
  });

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
