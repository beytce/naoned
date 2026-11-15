import { readFileSync } from "node:fs";
import { join } from "node:path";
import { venice1450Lagune } from "@comptoirs/engine";
import { Group, type Mesh } from "three";
import { describe, expect, it } from "vitest";
import { bake } from "../src/porcellana/bake.js";
import { ileSlide, quay } from "../src/porcellana/celadon/ile.js";
import { RIDERS } from "../src/porcellana/celadon/pieces.js";
import { MODEL_SCALE, WORKSHOPS } from "../src/porcellana/celadon/workshops.js";
import { createPalette } from "../src/porcellana/materials.js";
import { ACCENTS, BOARD, CELADON, COL } from "../src/porcellana/tokens.js";

// The Céladon direction (docs/plan-celadon.md): its matters held to the plan, a model for every
// building of the rules, a tile's weight kept under its budget.
const PLAN = readFileSync(join(__dirname, "..", "..", "..", "docs", "plan-celadon.md"), "utf8");
const P = createPalette();

const triangles = (g: Group) => {
  let n = 0;
  g.traverse((o) => {
    const geo = (o as Mesh).geometry;
    if (geo) n += (geo.index ? geo.index.count : (geo.attributes.position?.count ?? 0)) / 3;
  });
  return n;
};

describe("the grammar is the plan's", () => {
  it("has its four matters, and the accent stays Porcellana's", () => {
    for (const tone of ["porcelain", "blond", "celadon", "slate"] as const)
      expect(PLAN).toContain(CELADON[tone]);
    expect(PLAN).toContain(ACCENTS.rosso);
  });

  it("keeps the one strong colour: no tone as vivid as the accent, but the small fire", () => {
    const chroma = (hex: string) => {
      const n = Number.parseInt(hex.slice(1), 16);
      const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
      return Math.max(...c) - Math.min(...c);
    };
    const accent = chroma(ACCENTS.rosso);
    for (const [tone, hex] of Object.entries(CELADON))
      if (tone !== "fire") expect(chroma(hex), tone).toBeLessThan(accent * 0.7);
  });

  it("leaves the older scenes their palette", () => {
    expect(COL.wall).toBe("#F6F4F0");
  });
});

describe("the buildings of an island", () => {
  const rules = venice1450Lagune.ile;

  it("has a model for every building of the rules, and for the Fondaco", () => {
    expect(rules).toBeDefined();
    for (const type of Object.keys(rules?.workshops ?? {}))
      expect(WORKSHOPS, type).toHaveProperty(type);
    expect(WORKSHOPS).toHaveProperty("fondaco");
  });

  it("has an object for every good that rides a slide", () => {
    for (const w of Object.values(rules?.workshops ?? {}))
      for (const g of Object.keys(w.outputs)) expect(RIDERS, g).toHaveProperty(g);
  });

  it("keeps each one, at each level, under a tile's budget of triangles", () => {
    for (const [type, make] of Object.entries(WORKSHOPS))
      for (const level of [1, 2, 3]) {
        const b = make(P, { level, seed: 1 });
        expect(triangles(b.group), `${type} at level ${level}`).toBeLessThan(30_000);
        expect(b.top).toBeGreaterThan(1);
      }
  });

  it("shows a level: a workshop raised has more on its tile", () => {
    for (const type of ["lumber_camp", "sand_pit", "sawmill", "glassworks", "brickworks", "mill"]) {
      const at = (level: number) =>
        triangles(WORKSHOPS[type]?.(P, { level, seed: 1 }).group ?? new Group());
      expect(at(3), type).toBeGreaterThan(at(1));
    }
  });

  it("leaves a workshop's edges to the slides, and bakes to a handful of meshes", () => {
    const b = WORKSHOPS.glassworks?.(P, { level: 2, seed: 1 });
    expect(b?.group.scale.x).toBe(MODEL_SCALE);
    expect(2.5 * MODEL_SCALE).toBeLessThanOrEqual(BOARD.tile / 2 - 1);
    const g = new Group();
    if (b) g.add(b.group);
    expect(bake(g)).toBeLessThan(24);
  });
});

describe("the quay and the slides", () => {
  it("lays a quay wider than its tiles", () => {
    const q = quay(P, 3, 2);
    expect(triangles(q)).toBeLessThan(60_000);
  });

  it("carries a good from the supplier to the workshop it feeds", () => {
    const s = ileSlide([0, 0], [BOARD.tile, 0], "sand");
    expect(s.riders).toHaveLength(2);
    const r = s.riders[0];
    if (!r) throw new Error("no rider");
    s.place(r, 0);
    const from = r.position.x;
    s.place(r, 1);
    expect(r.position.x).toBeGreaterThan(from);
    // it stays between the two models
    expect(from).toBeGreaterThan(2.5 * MODEL_SCALE);
    expect(r.position.x).toBeLessThan(BOARD.tile - 2.5 * MODEL_SCALE);
  });
});
