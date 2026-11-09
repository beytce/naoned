import { describe, expect, it } from "vitest";
import { awayFrames, awaySummary, ownersAt } from "../src/porcellana/terra/away.js";

// « Pendant ton absence » (lot T6): the board of before from the last day's changes.
// Four cells: the merchant (0) took cell 1 from free land at 10, lost cell 3 to Contarini (1) at 20.
const v = {
  owner: [0, 0, -1, 1],
  changes: [
    { cell: 1, at: 10, from: -1 },
    { cell: 3, at: 20, from: 0 },
  ],
  me: { returns: [{ at: 15 }, { at: 2 }] },
};

describe("the board as it was", () => {
  it("undoes the changes after a time, the latest first", () => {
    expect(ownersAt(v, 0)).toEqual([0, -1, -1, 0]);
    expect(ownersAt(v, 15)).toEqual([0, 0, -1, 0]);
    expect(ownersAt(v, 30)).toEqual([0, 0, -1, 1]);
  });
  it("replays from the last visit to now, today's board last", () => {
    const frames = awayFrames(v, 0, 40, 4);
    expect(frames).toHaveLength(5);
    expect(frames[0]).toEqual([0, -1, -1, 0]);
    expect(frames.at(-1)).toEqual(v.owner);
    expect(awayFrames(v, 25, 40)).toEqual([]);
  });
  it("tells what the merchant gained and lost, and its fronts come home", () => {
    expect(awaySummary(v, 0, 5)).toEqual({ gained: 1, lost: 1, back: 1 });
  });
});
