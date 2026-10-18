import { describe, expect, it } from "vitest";
import {
  TERRA_TONES,
  cellAt,
  hexCenter,
  hexNeighbors,
  labelCell,
  neighbours,
  outline,
  replayed,
  tones,
} from "../src/game/terraShapes.js";

const map = { width: 6, height: 5, origin: [10, 10] as [number, number], size: 5 };
const loops = (d: string) => d.split("M").length - 1;

describe("the Terraferma's shapes", () => {
  it("counts neighbours as the engine does (odd rows shifted right)", () => {
    expect(hexNeighbors(map, 7).sort((a, b) => a - b)).toEqual([1, 2, 6, 8, 13, 14]);
    expect(hexNeighbors(map, 0).sort((a, b) => a - b)).toEqual([1, 6]);
  });

  it("outlines a holder's ground in one rounded loop, an island in another", () => {
    const one = outline(map, [7]);
    expect(loops(one)).toBe(1);
    // Six corners, each rounded by a curve.
    expect(one.split("Q").length - 1).toBe(6);
    // Two cells side by side: one loop of ten edges.
    const two = outline(map, [7, 8]);
    expect(loops(two)).toBe(1);
    expect(two.split("Q").length - 1).toBe(10);
    expect(loops(outline(map, [7, 10]))).toBe(2);
    // A ring around a hole: the hole is a loop of its own.
    expect(loops(outline(map, hexNeighbors(map, 15)))).toBe(2);
  });

  it("never gives two neighbours the same tone", () => {
    // A row of holders, each touching the next.
    const owner = Array.from({ length: 30 }, (_, i) => i % 6);
    const touching = neighbours(map, owner);
    const names = ["a", "b", "c", "d", "e", "f"];
    const t = tones(names, [5, 5, 5, 5, 5, 5], touching);
    for (const [i, around] of touching) for (const j of around) expect(t[i]).not.toBe(t[j]);
    expect(t.every((x) => TERRA_TONES.includes(x))).toBe(true);
  });

  it("finds the land cell under a point", () => {
    const land = Array.from({ length: 30 }, (_, i) => i !== 8);
    const [x, y] = hexCenter(map, 14);
    expect(cellAt(map, land, x + 1, y - 1)).toBe(14);
    const [wx, wy] = hexCenter(map, 8);
    expect(cellAt(map, land, wx, wy)).toBeNull();
    expect(cellAt(map, land, -50, -50)).toBeNull();
  });

  it("replays the changes missed, from the map as it stood before them", () => {
    const owner = [0, 0, 1, 1, -1];
    const missed = [
      { cell: 1, from: -1 },
      { cell: 3, from: 0 },
    ];
    expect(replayed(owner, missed, 0)).toEqual([0, -1, 1, 0, -1]);
    expect(replayed(owner, missed, 1)).toEqual([0, 0, 1, 0, -1]);
    expect(replayed(owner, missed, 2)).toEqual(owner);
  });

  it("writes a holder's troops in the middle of its largest piece, off its markers", () => {
    const big = { width: 9, height: 9, origin: [0, 0] as [number, number], size: 5 };
    // A blob: the cell 40 and the two rings around it; an island far away.
    const ring1 = hexNeighbors(big, 40);
    const ring2 = [...new Set(ring1.flatMap((i) => hexNeighbors(big, i)))];
    const blob = [...new Set([40, ...ring1, ...ring2])];
    expect(labelCell(big, [...blob, 8])).toBe(40);
    // The middle kept for the war counter: the label goes next to it, still inside.
    const off = labelCell(big, blob, new Set([40]));
    expect(ring1).toContain(off);
    expect(labelCell(big, [])).toBeNull();
    expect(labelCell(big, [8], new Set([8]))).toBe(8);
  });
});
