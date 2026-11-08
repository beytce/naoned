import { describe, expect, it } from "vitest";
import { shotsBetween } from "../src/porcellana/terra/buildings.js";

// A bombard's shot (lot T4): cells of one holder turned back to free land at once, within reach of
// another's bombard, are its shot; the board draws the ball from the bombard to them.
const grid = { width: 8, height: 4, grid: "square" as const };
const at = (i: number, j: number) => j * grid.width + i;

describe("the shots of the bombards, read from what changed hands", () => {
  const before = Array<number>(32).fill(-1);
  for (const c of [at(5, 1), at(6, 1), at(5, 2)]) before[c] = 1;
  before[at(1, 1)] = 0;
  const bombard = { cell: at(1, 1), kind: "bombarda" as const, owner: 0 };

  it("finds the bombard of another within reach of cells turned free together", () => {
    const after = [...before];
    for (const c of [at(5, 1), at(6, 1)]) after[c] = -1;
    expect(shotsBetween(grid, before, after, [bombard])).toEqual([
      { from: at(1, 1), cells: [at(5, 1), at(6, 1)] },
    ]);
  });

  it("is no shot when the cells were taken by someone, or when no bombard reaches them", () => {
    const taken = [...before];
    taken[at(5, 1)] = 0;
    expect(shotsBetween(grid, before, taken, [bombard])).toEqual([]);
    const far = [...before];
    far[at(5, 1)] = -1;
    expect(shotsBetween(grid, before, far, [{ ...bombard, cell: at(0, 3) }], 3)).toEqual([]);
  });

  it("never fires a holder's own bombard at itself", () => {
    const after = [...before];
    after[at(5, 2)] = -1;
    expect(shotsBetween(grid, before, after, [{ ...bombard, owner: 1 }])).toEqual([]);
  });
});
