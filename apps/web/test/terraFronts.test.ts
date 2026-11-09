import { describe, expect, it } from "vitest";
import { arrowStrip, frontHead, frontTone, frontWidths } from "../src/porcellana/terra/fronts.js";

// The Terraferma's fronts on Porcellana's board (docs/plan-terraferme-porcellana.md, lot T3): a
// ribbon from the camp to the front's head, as thick as the men it carries, an arrow at its end.
const grid = { width: 6, height: 4, grid: "square" as const };
const at = (i: number, j: number) => j * grid.width + i;

describe("the head of a front", () => {
  it("is the holder's cell that touches the next cell to take, the one nearest its camp", () => {
    const owner = Array<number>(24).fill(-1);
    for (const c of [at(0, 1), at(1, 1), at(2, 1), at(2, 2)]) owner[c] = 0;
    // The next cell, (3, 1), touches (2, 1); (2, 2) does not.
    expect(frontHead(grid, owner, { owner: 0, next: [at(3, 1)], aim: at(5, 1) }, at(0, 1))).toBe(
      at(2, 1),
    );
  });

  it("falls back on the aim's neighbour, then on the camp", () => {
    const owner = Array<number>(24).fill(-1);
    owner[at(1, 1)] = 0;
    expect(frontHead(grid, owner, { owner: 0, next: [], aim: at(2, 1) }, at(1, 1))).toBe(at(1, 1));
    expect(frontHead(grid, owner, { owner: 0, next: [], aim: at(5, 3) }, at(1, 1))).toBe(at(1, 1));
  });
});

describe("the ribbon of a front", () => {
  it("is thicker with more men, thinner at its head, never nothing", () => {
    const [few0, few1] = frontWidths(10);
    const [many0, many1] = frontWidths(200);
    expect(many0).toBeGreaterThan(few0);
    expect(few1).toBeLessThan(few0);
    expect(few1).toBeGreaterThan(0);
    // A horde does not cover the board.
    expect(frontWidths(5_000)[0]).toBe(frontWidths(400)[0]);
  });

  it("tapers along its points and ends in an arrow", () => {
    const pts: [number, number, number][] = [
      [0, 0, 0],
      [5, 0, 0],
      [10, 0, 0],
    ];
    const s = arrowStrip(pts, 2, 1, 1.25);
    // Two vertices a point, then three for the arrow.
    expect(s.positions.length).toBe((pts.length * 2 + 3) * 3);
    expect(s.uvs.length).toBe((pts.length * 2 + 3) * 2);
    // Half the width each side at the start, half the end width at the end.
    expect(Math.abs((s.positions[2] as number) - (s.positions[5] as number))).toBeCloseTo(2);
    const last = (pts.length - 1) * 6;
    expect(
      Math.abs((s.positions[last + 2] as number) - (s.positions[last + 5] as number)),
    ).toBeCloseTo(1);
    // The arrow's tip lies ahead of the last point.
    const tip = (pts.length * 2 + 2) * 3;
    expect(s.positions[tip] as number).toBeGreaterThan(10);
    // u runs in chevron periods along the way.
    expect(s.uvs[(pts.length - 1) * 4] as number).toBeCloseTo(10 / 1.25);
    expect(s.indices.length % 3).toBe(0);
  });
});

describe("the tone of a front", () => {
  it("is red for the merchant's, ink for what threatens it, faint for the others", () => {
    expect(frontTone({ mine: true, threat: false })).toBe("mine");
    expect(frontTone({ mine: false, threat: true })).toBe("threat");
    expect(frontTone({ mine: false, threat: false })).toBe("other");
  });
});
