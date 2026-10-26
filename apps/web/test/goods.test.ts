import { venice1450 } from "@comptoirs/engine/src/themes/venice1450.js";
import { describe, expect, it } from "vitest";
import { CHAIN_COLOUR, GLYPH_CODES, goodsColour, goodsTier } from "../src/art/goods.js";

/** CIE L*a*b* of a #RRGGBB colour (D65). */
function lab(hex: string): [number, number, number] {
  const lin = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  const [r, g, b] = [1, 3, 5].map((i) => lin(Number.parseInt(hex.slice(i, i + 2), 16) / 255)) as [
    number,
    number,
    number,
  ];
  const x = (r * 0.4124 + g * 0.3576 + b * 0.1805) / 0.95047;
  const y = r * 0.2126 + g * 0.7152 + b * 0.0722;
  const z = (r * 0.0193 + g * 0.1192 + b * 0.9505) / 1.08883;
  const f = (t: number) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  return [116 * f(y) - 16, 500 * (f(x) - f(y)), 200 * (f(y) - f(z))];
}
const deltaE = (a: string, b: string) => {
  const [p, q] = [lab(a), lab(b)];
  return Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]);
};
const luminance = (hex: string) => {
  const lin = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  const [r, g, b] = [1, 3, 5].map((i) => lin(Number.parseInt(hex.slice(i, i + 2), 16) / 255)) as [
    number,
    number,
    number,
  ];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contrast = (a: string, b: string) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
};

/** The colours kept for a role, in the three themes (index.css), as in terraTones.test.ts. */
const RESERVED = {
  gold: ["#F4C554", "#E8B24C", "#ECBE50"],
  lagoon: ["#6EE0B8", "#7DB596", "#80B696"],
  vermilion: ["#FF8070", "#EA7658", "#DE684C"],
  lapis: ["#6EC8F5", "#7E9CDB"],
  water: ["#3C8CC8", "#4E6AA8"],
};

describe("the goods' code", () => {
  const hues = [...new Set(Object.values(CHAIN_COLOUR))];

  it("gives every good of the theme a chain colour, a tier and a pictogram", () => {
    for (const r of venice1450.resources) {
      expect(CHAIN_COLOUR[r.chain], r.code).toBeDefined();
      expect(goodsTier(r.code)).toBe(r.tier);
      expect(GLYPH_CODES, r.code).toContain(r.code);
    }
  });

  it("keeps each chain's hue away from a colour kept for a role", () => {
    const near = hues.flatMap((h) =>
      Object.entries(RESERVED).flatMap(([role, hexes]) =>
        hexes.filter((x) => deltaE(h, x) < 25).map((x) => `${h} ~ ${role} ${x}`),
      ),
    );
    expect(near).toEqual([]);
  });

  it("keeps the chains' hues apart from one another", () => {
    const near: string[] = [];
    for (const [i, a] of hues.entries())
      for (const b of hues.slice(i + 1)) if (deltaE(a, b) < 25) near.push(`${a} ~ ${b}`);
    expect(near).toEqual([]);
  });

  // A mark is a graphic, never text: WCAG's 3:1 for what is not text (1.4.11).
  it("stands out on the night of the dark themes", () => {
    for (const night of ["#16263E", "#1D304D", "#243A5C", "#1E1611", "#2A1F18"])
      for (const h of hues) expect(contrast(h, night), `${h} on ${night}`).toBeGreaterThan(3);
  });

  it("never gilds wheat: gold is for money", () => {
    expect(goodsColour("wheat")).not.toBe("#F4C554");
    expect(deltaE(goodsColour("wheat"), "#F4C554")).toBeGreaterThan(25);
  });
});
