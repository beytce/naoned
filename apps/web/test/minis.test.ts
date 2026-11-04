import { Color } from "three";
import { describe, expect, it } from "vitest";
import { tint } from "../src/empire/map3d/minis.js";
import { ROLES, roleOf } from "../src/empire/map3d/roster.js";

const hsl = (rgb: [number, number, number]) => {
  const o = { h: 0, s: 0, l: 0 };
  new Color(...rgb).getHSL(o);
  return o;
};

describe("the figurines' colours (docs/plan-porta-3d.md)", () => {
  const blue: [number, number, number] = [0.1, 0.25, 0.7];
  const skin: [number, number, number] = [0.9, 0.55, 0.38];
  const metal: [number, number, number] = [0.35, 0.37, 0.38];

  it("keeps skin and metal, turns the coloured cloth to its side's accent", () => {
    expect(tint(skin, "rome")).toEqual(skin);
    expect(tint(metal, "rome")).toEqual(metal);
    // Rome: cinnabar; the house: lapis.
    expect(hsl(tint(blue, "rome")).h).toBeLessThan(0.05);
    expect(hsl(tint(blue, "house")).h).toBeCloseTo(0.6, 1);
    // Its lightness kept.
    expect(hsl(tint(blue, "rome")).l).toBeCloseTo(hsl(blue).l, 2);
  });

  it("casts each unit of the battle: Rome's by its kind, the house's by its model", () => {
    expect(roleOf({ side: "rome", kind: "gonfalonier" })).toBe(ROLES.gonfalonier);
    expect(roleOf({ side: "player", model: "carro_grande" })?.crew).toHaveLength(2);
    expect(roleOf({ side: "player", model: "unknown" })).toBe(ROLES.cavaliere);
    for (const r of Object.values(ROLES)) expect(r.height).toBeGreaterThan(0);
  });
});
