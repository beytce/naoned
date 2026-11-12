import { describe, expect, it } from "vitest";
import {
  PASSE_CHAIN,
  PASSE_REEF,
  type PlancheSetup,
  plancheForced,
  plancheGuard,
  plancheGuardBoard,
  plancheInit,
} from "../../src/index.js";

const HOUR = 3_600_000;
const DAY = 24 * HOUR;
const T0 = Date.parse("2026-11-16T06:00:00Z");
/** The Passe board of the fixture's towers: 3 × 3, a reef in its middle. */
const BOARD = [0, 0, 0, 0, PASSE_REEF, 0, 0, 0, 0];

/** The fixture's board: two houses, a canal (two links) and a strait (three). */
function setup(): PlancheSetup {
  const house = (id: string) => ({ id, name: id, robot: false, x: 2, y: 2, makes: {} });
  const tower = (id: string, guard: number) => ({
    id,
    name: id,
    x: 5,
    y: 5,
    holder: "corsair:X",
    tollBps: 0,
    board: "b",
    seals: 1,
    guard,
  });
  return {
    width: 8,
    height: 8,
    sliceMs: HOUR,
    goods: {},
    houses: [house("ana"), house("ben")],
    cities: [],
    passages: [tower("canal", 2), tower("detroit", 3)],
    rules: {
      bobbins: 3,
      store: 100,
      startStock: 0,
      startDucats: 0,
      threadPerHour: 10,
      patinaBpsPerDay: 0,
      patinaMaxBps: 0,
      tollMaxBps: 1_500,
      tollBurnBps: 3_000,
      freeAfterForceMs: DAY,
      rewindMsPerTile: 60_000,
    },
  };
}

// The prepared guard (docs/plan-hex-commerce.md H4): links laid in advance on the tower's board.
describe("the prepared guard", () => {
  const held = () => {
    const S = setup();
    let s = plancheInit(S, T0);
    s = plancheForced(S, s, "ana", "canal", T0);
    s = plancheForced(S, s, "ana", "detroit", T0);
    return { S, s };
  };

  it("lets the holder lay two links, three on a strait, on empty cells of its board", () => {
    const { S, s } = held();
    const g = plancheGuard(S, s, "ana", "canal", [0, 8], T0, BOARD);
    expect(g.passages.canal?.guard).toEqual([0, 8]);
    expect(plancheGuardBoard(BOARD, g.passages.canal?.guard)).toEqual([
      PASSE_CHAIN,
      0,
      0,
      0,
      PASSE_REEF,
      0,
      0,
      0,
      PASSE_CHAIN,
    ]);
    expect(() => plancheGuard(S, s, "ana", "canal", [0, 1, 2], T0, BOARD)).toThrow(
      "planche_guard_many",
    );
    expect(
      plancheGuard(S, s, "ana", "detroit", [0, 1, 2], T0, BOARD).passages.detroit?.guard,
    ).toHaveLength(3);
    // Not on a reef, not off the board, not twice the same cell.
    for (const bad of [[4], [9], [1, 1]])
      expect(() => plancheGuard(S, s, "ana", "canal", bad, T0, BOARD)).toThrow(
        "planche_guard_cell",
      );
    // Only its holder.
    expect(() => plancheGuard(S, s, "ben", "canal", [0], T0, BOARD)).toThrow("planche_not_holder");
  });

  it("is changed once a day, and lost with the tower", () => {
    const { S, s } = held();
    let g = plancheGuard(S, s, "ana", "canal", [0, 8], T0, BOARD);
    expect(() => plancheGuard(S, g, "ana", "canal", [2, 6], T0 + HOUR, BOARD)).toThrow(
      "planche_guard_today",
    );
    g = plancheGuard(S, g, "ana", "canal", [2, 6], T0 + DAY, BOARD);
    expect(g.passages.canal?.guard).toEqual([2, 6]);
    // Ben takes the tower: Ana's guard goes with it.
    g = plancheForced(S, g, "ben", "canal", T0 + DAY);
    expect(g.passages.canal?.holder).toBe("ben");
    expect(g.passages.canal?.guard).toBeUndefined();
    expect(plancheGuard(S, g, "ben", "canal", [0], T0 + DAY, BOARD).passages.canal?.guard).toEqual([
      0,
    ]);
  });
});
