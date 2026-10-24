import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { TERRA_TONES, cellsByHolder, neighbours, tones } from "../src/game/terraShapes.js";

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

/**
 * The colours the map keeps for a role, in the three themes (index.css): gold for the merchant's
 * land, lagoon for allies, vermilion for enemies, lapis for the cell touched, and the water.
 */
const RESERVED = {
  gold: ["#F4C554", "#E8B24C", "#ECBE50"],
  lagoon: ["#6EE0B8", "#7DB596", "#80B696"],
  vermilion: ["#FF8070", "#EA7658", "#DE684C"],
  lapis: ["#6EC8F5", "#7E9CDB"],
  water: ["#3C8CC8", "#4E6AA8"],
};

describe("the Terraferma's tones", () => {
  it("never come near a colour kept for a role", () => {
    const near = TERRA_TONES.flatMap((t) =>
      Object.entries(RESERVED).flatMap(([role, hexes]) =>
        hexes.filter((h) => deltaE(t, h) < 20).map((h) => `${t} ≈ ${role} ${h}`),
      ),
    );
    expect(near).toEqual([]);
  });

  it("are eight, told apart from each other", () => {
    expect(TERRA_TONES).toHaveLength(8);
    for (let i = 0; i < TERRA_TONES.length; i++)
      for (let j = i + 1; j < TERRA_TONES.length; j++)
        expect(deltaE(TERRA_TONES[i] as string, TERRA_TONES[j] as string)).toBeGreaterThan(15);
  });

  it("never give two neighbours the same, on a Thursday of 40 merchants", () => {
    const { terra } = JSON.parse(
      readFileSync(join(__dirname, "..", "e2e", "fixtures", "terra-midweek.json"), "utf8"),
    );
    const by = cellsByHolder(terra.owner);
    const touching = neighbours(terra.map, terra.owner);
    const names = terra.holders.map((h: { id: string | null }, i: number) => h.id ?? String(i));
    const tone = tones(
      names,
      terra.holders.map((_: unknown, i: number) => by.get(i)?.length ?? 0),
      touching,
    );
    const clashes = [...touching].flatMap(([a, ns]) =>
      [...ns].filter((b) => a < b && tone[a] === tone[b]).map((b) => `${a}/${b}`),
    );
    expect(clashes).toEqual([]);
  });
});
