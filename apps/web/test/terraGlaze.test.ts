import { describe, expect, it } from "vitest";
import {
  FLOW_MS,
  type Flow,
  contour,
  flowsBetween,
  glazeFields,
  holderStyle,
} from "../src/porcellana/terra/glaze.js";

// The Terraferma's glaze on Porcellana's board (docs/plan-terraferme-porcellana.md, lot T2): one
// field per holder, thresholded; a cell taken fills from the neighbour the attack comes from.
const grid = { width: 6, height: 4, grid: "square" as const };
const at = (i: number, j: number) => j * grid.width + i;
const S = 5;

/** The value of a holder's field at the middle of a cell. */
const mid = (f: Float32Array, i: number, j: number) =>
  f[(j * S + Math.floor(S / 2)) * (grid.width * S + 1) + i * S + Math.floor(S / 2)] ?? 0;

describe("the glaze's fields", () => {
  it("covers a holder's cells and stays off the others", () => {
    const owner = Array<number>(24).fill(-1);
    owner[at(1, 1)] = 0;
    owner[at(2, 1)] = 0;
    owner[at(4, 2)] = 1;
    const f = glazeFields(grid, owner, [], 0, S);
    const a = f.get(0);
    const b = f.get(1);
    if (!a || !b) throw new Error("no field");
    expect(mid(a, 1, 1)).toBeGreaterThan(0.66);
    expect(mid(a, 2, 1)).toBeGreaterThan(0.66);
    expect(mid(a, 4, 2)).toBeLessThan(0.66);
    expect(mid(b, 4, 2)).toBeGreaterThan(0.66);
    expect(f.has(-1)).toBe(false);
  });

  it("pours a taken cell from the neighbour the attack comes from", () => {
    const owner = Array<number>(24).fill(-1);
    owner[at(1, 1)] = 0;
    owner[at(2, 1)] = 0; // just taken from holder 1
    const flow: Flow = { cell: at(2, 1), from: 1, src: at(1, 1), start: 1_000 };
    const start = glazeFields(grid, owner, [flow], 1_000, S);
    // At the start, the cell is still the loser's and the winner's glaze has not reached it.
    expect(mid(start.get(1) as Float32Array, 2, 1)).toBeGreaterThan(0.66);
    expect(mid(start.get(0) as Float32Array, 2, 1)).toBeLessThan(0.66);
    // Half way, the winner's glaze has run into it.
    const half = glazeFields(grid, owner, [flow], 1_000 + FLOW_MS * 0.6, S);
    expect(mid(half.get(0) as Float32Array, 2, 1)).toBeGreaterThan(0.66);
    // Done, the loser's is gone.
    const done = glazeFields(grid, owner, [flow], 1_000 + FLOW_MS, S);
    expect(mid(done.get(1) ?? new Float32Array(0), 2, 1)).toBeLessThan(0.66);
  });
});

describe("the outlines", () => {
  it("rounds a lone cell into a drop inside its square", () => {
    const owner = Array<number>(24).fill(-1);
    owner[at(2, 2)] = 3;
    const f = glazeFields(grid, owner, [], 0, S).get(3) as Float32Array;
    const { fill, line } = contour(f, grid.width * S + 1, grid.height * S + 1, 1 / S, 0.66);
    expect(fill.length).toBeGreaterThan(0);
    expect(line.length).toBeGreaterThan(8);
    for (const [x, y] of line.flat()) {
      expect(x).toBeGreaterThan(2);
      expect(x).toBeLessThan(3);
      expect(y).toBeGreaterThan(2);
      expect(y).toBeLessThan(3);
    }
  });

  it("leaves a joint of porcelain between two holders side by side", () => {
    const owner = Array<number>(24).fill(-1);
    owner[at(1, 1)] = 0;
    owner[at(2, 1)] = 1;
    const fields = glazeFields(grid, owner, [], 0, S);
    const n = grid.width * S + 1;
    const m = grid.height * S + 1;
    const a = contour(fields.get(0) as Float32Array, n, m, 1 / S, 0.66).line.flat();
    const b = contour(fields.get(1) as Float32Array, n, m, 1 / S, 0.66).line.flat();
    expect(Math.max(...a.map(([x]) => x))).toBeLessThan(2);
    expect(Math.min(...b.map(([x]) => x))).toBeGreaterThan(2);
  });
});

describe("what changed hands between two views", () => {
  it("starts a flow for each cell taken, from a neighbour of the winner's", () => {
    const before = Array<number>(24).fill(-1);
    before[at(1, 1)] = 0;
    before[at(2, 1)] = 1;
    const after = [...before];
    after[at(2, 1)] = 0;
    const flows = flowsBetween(grid, before, after, 5_000);
    expect(flows).toEqual([{ cell: at(2, 1), from: 1, src: at(1, 1), start: 5_000 }]);
  });

  it("lets a cell lost to free land fade in place", () => {
    const before = Array<number>(24).fill(-1);
    before[at(3, 3)] = 2;
    const after = Array<number>(24).fill(-1);
    expect(flowsBetween(grid, before, after, 0)).toEqual([
      { cell: at(3, 3), from: 2, src: -1, start: 0 },
    ]);
  });
});

describe("the colour rule « Encres »", () => {
  it("gives red to the merchant only, ink to the others, lagoon to allies, biscuit to nations", () => {
    const me = holderStyle({ me: true, ally: false, nation: null }, 3);
    const ally = holderStyle({ me: false, ally: true, nation: null }, 4);
    const milan = holderStyle({ me: false, ally: false, nation: "milan" }, 0);
    const other = holderStyle({ me: false, ally: false, nation: null }, 5);
    expect(me.colour).toBe("#C23B2E");
    expect(ally.edge).toBe("#16897A");
    expect(milan.hatch).toBe(true);
    expect(other.colour).toBe("#2A2725");
    expect(other.alpha).toBeLessThan(me.alpha);
  });
});
