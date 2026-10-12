import { describe, expect, it } from "vitest";
import {
  EMPTY_SHOWN,
  HONOUR,
  SLOTS,
  alongPath,
  frameBounds,
  pathLength,
  placeWorkshops,
  workerRound,
} from "../src/domain3d/layout.js";

const w = (type: string, id = type) => ({ id, type });

describe("the domain's land", () => {
  it("puts the palace in the place of honour and the rest from the yard out", () => {
    const { placed, empties } = placeWorkshops(
      [w("farm"), w("palazzo"), w("mill"), w("palazzo", "p2")],
      12,
    );
    expect(placed[0]).toEqual({ item: w("palazzo"), at: HONOUR });
    expect(placed.slice(1).map((p) => p.at)).toEqual(SLOTS.slice(0, 3));
    expect(placed.slice(1).map((p) => p.item.id)).toEqual(["p2", "farm", "mill"]);
    expect(empties).toEqual(SLOTS.slice(3, 3 + EMPTY_SHOWN));
  });

  it("shows no empty plot once the merchant may build no more", () => {
    const items = Array.from({ length: 12 }, (_, i) => w("farm", `f${i}`));
    expect(placeWorkshops(items, 12).empties).toEqual([]);
    expect(placeWorkshops(items.slice(0, 11), 12).empties).toHaveLength(1);
  });

  it("frames what is shown with the yard and the gate", () => {
    const b = frameBounds([{ x: 0, y: 6 }]);
    expect(b.minY).toBeLessThanOrEqual(6);
    expect(b.maxY).toBeGreaterThanOrEqual(11.2);
    expect(b.maxX).toBeGreaterThan(9.4);
    expect(frameBounds([{ x: 9, y: 0 }]).minY).toBe(0);
  });

  it("walks a worker's round, there and back, at a steady pace", () => {
    const round = workerRound({ x: 3, y: 6 }, 0);
    expect(round[0]).toEqual(round[round.length - 1]);
    const len = pathLength(round);
    expect(alongPath(round, 0).at).toEqual(round[0]);
    expect(alongPath(round, 0.5).at.x).toBeCloseTo(1.1);
    expect(alongPath(round, 1.25).at).toEqual(alongPath(round, 0.25).at);
    expect(len).toBeGreaterThan(5);
  });
});
