import { describe, expect, it } from "vitest";
import {
  PASSE_CHAIN,
  PASSE_CUT,
  PASSE_EMPTY,
  PASSE_REEF,
  PASSE_THREAD,
  type PasseSetup,
  Rng,
  passeCargo,
  passeDistance,
  passeInit,
  passeLegal,
  passeLinks,
  passePlay,
  passeWinningLine,
} from "../../src/index.js";

/** A bare board of the fixture: never Venice's passages. */
function setup(over: Partial<PasseSetup> = {}): PasseSetup {
  return {
    width: 5,
    height: 5,
    cells: new Array(25).fill(PASSE_EMPTY),
    first: 1,
    fire: { thread: 1, chain: 1 },
    cargo: { holds: 3, full: 5, step: 2 },
    ...over,
  };
}
const at = (x: number, y: number, w = 5) => y * w + x;

// La Passe (docs/CADRAGE-v4.md § 9): the thread links south to north, the chain west to east.
describe("the board of the Passe", () => {
  it("starts with the side told, nothing laid, nobody through", () => {
    const s = passeInit(setup({ first: 2 }));
    expect(s.turn).toBe(2);
    expect(s.laid).toEqual([0, 0]);
    expect(s.winner).toBe(0);
  });

  it("refuses a board whose cells do not fill it", () => {
    expect(() => passeInit(setup({ cells: [0, 0, 0] }))).toThrow();
    expect(() => passeInit(setup({ cells: new Array(25).fill(7) }))).toThrow();
  });

  it("counts the empty cells a side still needs to link its banks", () => {
    const s = passeInit(setup());
    expect(passeDistance(s, 1)).toBe(5);
    expect(passeDistance(s, 2)).toBe(5);
  });

  it("links two pieces side by side, and along the current's diagonal only", () => {
    const cells = new Array(25).fill(PASSE_EMPTY);
    // a thread climbing north-east: each barge up one row, right one column
    cells[at(0, 4)] = PASSE_THREAD;
    cells[at(1, 3)] = PASSE_THREAD;
    cells[at(2, 2)] = PASSE_THREAD;
    const s = passeInit(setup({ cells }));
    expect(passeDistance(s, 1)).toBe(2);
    expect(passeLinks(s, 1)).toEqual([
      [at(2, 2), at(1, 3)],
      [at(1, 3), at(0, 4)],
    ]);
    // the other diagonal does not hold: north-west of (2,2) is no neighbour
    const other = new Array(25).fill(PASSE_EMPTY);
    other[at(2, 4)] = PASSE_THREAD;
    other[at(1, 3)] = PASSE_THREAD;
    expect(passeLinks(passeInit(setup({ cells: other })), 1)).toEqual([]);
  });

  it("lets the chain hook onto a reef, and bars the thread with it", () => {
    const cells = new Array(25).fill(PASSE_EMPTY);
    for (let x = 0; x < 5; x++) cells[at(x, 2)] = x === 2 ? PASSE_REEF : PASSE_CHAIN;
    const s = passeInit(setup({ cells }));
    expect(passeDistance(s, 2)).toBe(0);
    expect(passeDistance(s, 1)).toBe(PASSE_CUT);
  });

  it("plays a piece, passes the turn, and names the winner when the banks are linked", () => {
    let s = passeInit(setup());
    for (let y = 4; y >= 1; y--) {
      s = passePlay(s, { at: at(2, y) });
      s = passePlay(s, { at: at(4, y) });
    }
    expect(s.winner).toBe(0);
    s = passePlay(s, { at: at(2, 0) });
    expect(s.winner).toBe(1);
    expect(s.laid).toEqual([5, 4]);
    expect(passeWinningLine(s)).toEqual([at(2, 4), at(2, 3), at(2, 2), at(2, 1), at(2, 0)]);
    expect(passeLegal(s)).toEqual([]);
    expect(() => passePlay(s, { at: at(0, 0) })).toThrow();
  });

  it("refuses a cell that is taken, or off the board", () => {
    const s = passePlay(passeInit(setup()), { at: 12 });
    expect(() => passePlay(s, { at: 12 })).toThrow();
    expect(() => passePlay(s, { at: 99 })).toThrow();
    expect(() => passePlay(s, { at: 1.5 })).toThrow();
  });

  it("never mutates the state it is given", () => {
    const s = passeInit(setup());
    const before = JSON.stringify(s);
    passePlay(s, { at: 7 });
    expect(JSON.stringify(s)).toBe(before);
  });
});

describe("the fireship and the bombard", () => {
  it("lets the thread burn a chain post next to one of its barges, once", () => {
    const cells = new Array(25).fill(PASSE_EMPTY);
    cells[at(2, 3)] = PASSE_THREAD;
    cells[at(2, 2)] = PASSE_CHAIN;
    cells[at(4, 0)] = PASSE_CHAIN;
    const s = passeInit(setup({ cells }));
    const fires = passeLegal(s).filter((m) => m.fire);
    expect(fires).toEqual([{ at: at(2, 2), fire: true }]);
    const t = passePlay(s, { at: at(2, 2), fire: true });
    expect(t.cells[at(2, 2)]).toBe(PASSE_EMPTY);
    expect(t.fire).toEqual([0, 1]);
    expect(t.turn).toBe(2);
    expect(t.laid).toEqual([0, 0]);
    const back = passePlay(t, { at: at(0, 0) });
    expect(passeLegal(back).some((m) => m.fire)).toBe(false);
  });

  it("never burns a reef, nor a post it does not touch", () => {
    const cells = new Array(25).fill(PASSE_EMPTY);
    cells[at(2, 3)] = PASSE_THREAD;
    cells[at(2, 2)] = PASSE_REEF;
    const s = passeInit(setup({ cells }));
    expect(passeLegal(s).some((m) => m.fire)).toBe(false);
    expect(() => passePlay(s, { at: at(2, 2), fire: true })).toThrow();
  });

  it("lets the chain sink a barge that stands alone, never one that holds another", () => {
    const cells = new Array(25).fill(PASSE_EMPTY);
    cells[at(0, 4)] = PASSE_THREAD;
    cells[at(3, 2)] = PASSE_THREAD;
    cells[at(3, 1)] = PASSE_THREAD;
    const s = passeInit(setup({ cells, first: 2 }));
    expect(passeLegal(s).filter((m) => m.fire)).toEqual([{ at: at(0, 4), fire: true }]);
    const t = passePlay(s, { at: at(0, 4), fire: true });
    expect(t.cells[at(0, 4)]).toBe(PASSE_EMPTY);
    expect(t.fire).toEqual([1, 0]);
  });

  it("has no special piece when the setup gives none", () => {
    const cells = new Array(25).fill(PASSE_EMPTY);
    cells[at(2, 3)] = PASSE_THREAD;
    cells[at(2, 2)] = PASSE_CHAIN;
    const s = passeInit(setup({ cells, fire: { thread: 0, chain: 0 } }));
    expect(passeLegal(s).some((m) => m.fire)).toBe(false);
  });
});

describe("a game of the Passe cannot be drawn", () => {
  it("has exactly one side through on any full board", () => {
    const rng = new Rng(20261110);
    for (let n = 0; n < 400; n++) {
      const w = rng.int(3, 8);
      const h = rng.int(3, 8);
      const cells = Array.from({ length: w * h }, () =>
        rng.chance(0.08) ? PASSE_REEF : rng.chance(0.5) ? PASSE_THREAD : PASSE_CHAIN,
      );
      const s = passeInit(setup({ width: w, height: h, cells }));
      const thread = passeDistance(s, 1) === 0;
      const chain = passeDistance(s, 2) === 0;
      expect(thread !== chain).toBe(true);
    }
  });

  it("ends every game played at random, with one winner", () => {
    const rng = new Rng(7);
    for (let n = 0; n < 60; n++) {
      let s = passeInit(setup({ width: 7, height: 7, cells: new Array(49).fill(PASSE_EMPTY) }));
      let guard = 0;
      while (!s.winner) {
        s = passePlay(s, rng.pick(passeLegal(s)));
        expect(++guard).toBeLessThan(120);
      }
      expect([1, 2]).toContain(s.winner);
      expect(passeWinningLine(s).length).toBeGreaterThan(0);
    }
  });
});

describe("the cargo saved", () => {
  it("is whole when the thread passes with few barges, and shrinks with each more", () => {
    const rules = setup();
    const through = (laid: number) => ({
      ...passeInit(rules),
      winner: 1 as const,
      laid: [laid, 0] as [number, number],
    });
    expect(passeCargo(rules, through(5))).toBe(3);
    expect(passeCargo(rules, through(6))).toBe(2);
    expect(passeCargo(rules, through(7))).toBe(2);
    expect(passeCargo(rules, through(8))).toBe(1);
    expect(passeCargo(rules, through(20))).toBe(1);
  });

  it("is nothing when the chain holds", () => {
    const rules = setup();
    expect(passeCargo(rules, { ...passeInit(rules), winner: 2, laid: [9, 9] })).toBe(0);
    expect(passeCargo(rules, passeInit(rules))).toBe(0);
  });
});
