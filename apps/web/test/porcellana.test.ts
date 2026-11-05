import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Box3, Group, Mesh, Vector3 } from "three";
import { describe, expect, it } from "vitest";
import {
  arrivalEnd,
  easeOutBack,
  pinOut,
  routesDrawn,
  tileDelay,
  tileDrop,
} from "../src/porcellana/arrival.js";
import { bake } from "../src/porcellana/bake.js";
import { createPalette } from "../src/porcellana/materials.js";
import { fondaco } from "../src/porcellana/models/fondaco.js";
import { grove, plot, slab } from "../src/porcellana/models/ground.js";
import { market } from "../src/porcellana/models/market.js";
import { drawnIndices, ribbonGeometry, roundedPath } from "../src/porcellana/ribbon.js";
import { Blush } from "../src/porcellana/selection.js";
import {
  ACCENTS,
  ARRIVAL,
  BOARD,
  CAMERA,
  COL,
  LIGHT,
  RIBBON,
  SELECT,
} from "../src/porcellana/tokens.js";

// Porcellana (docs/plan-porcellana.md): the prototype's values, held; the kit's pieces, checked.
const PROTO = readFileSync(
  join(
    __dirname,
    "..",
    "..",
    "..",
    "docs",
    "direction-artistique-2026-11",
    "porcellana",
    "prototype.html",
  ),
  "utf8",
);

describe("the grammar is the prototype's", () => {
  it("has its palette, its accents", () => {
    for (const hex of Object.values(COL)) expect(PROTO).toContain(hex);
    for (const hex of Object.values(ACCENTS)) expect(PROTO).toContain(hex);
  });

  it("has its board, its light, its camera, its arrival, its selection, its roads", () => {
    expect(PROTO).toContain(`TILE = ${BOARD.tile}, GAP = ${BOARD.gap}`);
    expect(PROTO).toContain(`WY = ${BOARD.waterY}`);
    expect(PROTO.toLowerCase()).toContain(
      `'${LIGHT.hemi.ground.toLowerCase()}', ${LIGHT.hemi.intensity}`,
    );
    expect(PROTO).toContain(`sun.position.set(${LIGHT.sun.offset.join(", ")})`);
    expect(PROTO).toContain(`EL = ${CAMERA.elevation}`);
    expect(PROTO).toContain(`(c + r) * ${ARRIVAL.step}`);
    expect(PROTO).toContain(`/ ${ARRIVAL.duration})`);
    expect(PROTO).toContain(`(1 - k) * ${ARRIVAL.drop}`);
    expect(PROTO).toContain(`BLUSH = ${SELECT.blush}, GLOW = ${SELECT.glow}`);
    expect(PROTO).toContain(`? ${SELECT.lift} : 0`);
    expect(PROTO).toContain(`ribbonGeometry(cv, ${RIBBON.width})`);
    expect(PROTO).toContain(`dt * ${RIBBON.speed}`);
  });
});

describe("the arrival", () => {
  it("drops each tile from below, a little past its place, then on it", () => {
    expect(tileDrop(0, 0.2)).toEqual({ y: ARRIVAL.drop, visible: false });
    const mid = tileDrop(0.2 + ARRIVAL.duration * 0.8, 0.2);
    expect(mid.y).toBeGreaterThan(0); // the overshoot
    expect(tileDrop(5, 0.2).y).toBeCloseTo(0, 9);
    expect(easeOutBack(1)).toBeCloseTo(1, 9);
  });

  it("goes along the diagonal, the water a beat after the land", () => {
    expect(tileDelay(0, 0)).toBe(0);
    expect(tileDelay(2, 3)).toBeCloseTo(5 * ARRIVAL.step);
    expect(tileDelay(1, 1, true) - tileDelay(1, 1)).toBeCloseTo(ARRIVAL.waterLag);
  });

  it("draws the roads after the tiles, then shows the pins", () => {
    expect(routesDrawn(ARRIVAL.routesFrom)).toBe(0);
    expect(routesDrawn(ARRIVAL.routesFrom + ARRIVAL.routesFor)).toBe(1);
    expect(pinOut(ARRIVAL.pinsAfter - 0.01, 0)).toBe(false);
    expect(pinOut(ARRIVAL.pinsAfter, 0)).toBe(true);
    expect(arrivalEnd(10)).toBeGreaterThanOrEqual(ARRIVAL.routesFrom + ARRIVAL.routesFor);
  });
});

describe("the road's ribbon", () => {
  const curve = roundedPath([new Vector3(0, 0, 0), new Vector3(0, 0, 6), new Vector3(8, 0, 6)]);

  it("rounds its corners, never past half a leg", () => {
    expect(curve.getLength()).toBeLessThan(14);
    expect(curve.getLength()).toBeGreaterThan(12);
  });

  it("is a strip of quads, its u counted in chevron periods", () => {
    const g = ribbonGeometry(curve);
    const n = g.getIndex()?.count ?? 0;
    expect(n % 6).toBe(0);
    const uv = g.getAttribute("uv");
    expect(uv.getX(uv.count - 1)).toBeCloseTo(curve.getLength() / RIBBON.period, 1);
    expect(drawnIndices(n, 0)).toBe(0);
    expect(drawnIndices(n, 1)).toBe(n);
    expect(drawnIndices(n, 0.5) % 6).toBe(0);
  });
});

describe("the models", () => {
  const P = createPalette();
  const all = { fondaco: fondaco(P), market: market(P), plot: plot(P), grove: grove(P, 7) };

  for (const [name, b] of Object.entries(all))
    it(`${name}: stands on its tile, its foot on the ground, nothing broken`, () => {
      const box = new Box3().setFromObject(b.group);
      expect(box.min.y).toBeGreaterThan(-0.05);
      expect(Math.max(-box.min.x, box.max.x, -box.min.z, box.max.z)).toBeLessThanOrEqual(
        BOARD.tile / 2,
      );
      b.group.traverse((o) => {
        if (!(o instanceof Mesh)) return;
        const pos = o.geometry.getAttribute("position");
        for (let i = 0; i < pos.array.length; i++) expect(Number.isFinite(pos.array[i])).toBe(true);
      });
      expect(b.pin[1]).toBeGreaterThan(box.max.y - 3);
    });

  it("the market is San Marco: the campanile stands highest, its ball of accent on top", () => {
    const m = market(createPalette());
    const box = new Box3().setFromObject(m.group);
    expect(box.max.y).toBeGreaterThan(9.5);
    let top = -1;
    let topIsAccent = false;
    const Pm = createPalette();
    m.group.traverse((o) => {
      if (o instanceof Mesh) {
        const y = new Box3().setFromObject(o).max.y;
        if (y > top) {
          top = y;
          topIsAccent =
            o.material === P.accent ||
            o.material === Pm.accent ||
            (o.material as { color?: { getHexString(): string } }).color?.getHexString() ===
              "c23b2e";
        }
      }
    });
    expect(topIsAccent).toBe(true);
  });
});

describe("the bake", () => {
  it("merges a tile's still meshes by material, and leaves what moves apart", () => {
    const P = createPalette();
    const g = new Group();
    g.add(slab(P, false));
    const f = fondaco(P);
    g.add(f.group);
    let before = 0;
    g.traverse((o) => {
      if (o instanceof Mesh) before++;
    });
    const after = bake(g);
    expect(before).toBeGreaterThan(100);
    expect(after).toBeLessThanOrEqual(12); // a dozen draw calls a tile, its flag among them
    let flag = 0;
    g.traverse((o) => {
      if (o.userData.dyn) flag++;
    });
    expect(flag).toBe(1);
  });
});

describe("the blush", () => {
  it("washes what stands on the tile with the accent, never the ground, and gives it back", () => {
    const P = createPalette();
    const g = new Group();
    g.add(slab(P, false));
    g.add(fondaco(P).group);
    bake(g);
    const blush = new Blush(P);
    for (let i = 0; i < 200; i++) blush.update(g);
    expect(blush.k).toBeGreaterThan(0.99);
    let tinted = 0;
    let ground = 0;
    g.traverse((o) => {
      if (!(o instanceof Mesh)) return;
      if (o.material === P.m("ground")) ground++;
      else if (o.userData.baseMat) tinted++;
    });
    expect(ground).toBe(1);
    expect(tinted).toBeGreaterThan(3);
    for (let i = 0; i < 200; i++) blush.update(null);
    let left = 0;
    g.traverse((o) => {
      if (o instanceof Mesh && o.userData.baseMat) left++;
    });
    expect(left).toBe(0);
  });
});
