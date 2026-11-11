import { describe, expect, it } from "vitest";
import {
  PASSE_CHAIN,
  PASSE_EMPTY,
  PASSE_THREAD,
  type PasseSetup,
  type PasseState,
  Rng,
  passeInit,
  passeLegal,
  passePlay,
  passeThink,
} from "../../src/index.js";

function setup(over: Partial<PasseSetup> = {}): PasseSetup {
  return {
    width: 5,
    height: 5,
    cells: new Array(25).fill(PASSE_EMPTY),
    first: 1,
    fire: { thread: 0, chain: 0 },
    cargo: { holds: 3, full: 5, step: 2 },
    ...over,
  };
}
const at = (x: number, y: number, w = 5) => y * w + x;

function duel(a: number, b: number, seed: number): PasseState {
  const rng = new Rng(seed);
  let s = passeInit(setup({ width: 6, height: 6, cells: new Array(36).fill(PASSE_EMPTY) }));
  // two opening pieces at random, so that the games differ
  s = passePlay(s, rng.pick(passeLegal(s)));
  s = passePlay(s, rng.pick(passeLegal(s)));
  while (!s.winner) s = passePlay(s, passeThink(s, { depth: s.turn === 1 ? a : b }));
  return s;
}

// The opponent of the Passe (docs/plan-passe.md P2).
describe("the mind of the Passe", () => {
  it("takes the piece that wins at once, at every strength", () => {
    const cells = new Array(25).fill(PASSE_EMPTY);
    for (let y = 1; y <= 4; y++) cells[at(2, y)] = PASSE_THREAD;
    cells[at(0, 0)] = PASSE_CHAIN;
    const s = passeInit(setup({ cells }));
    for (const depth of [1, 2, 3, 4]) expect(passePlay(s, passeThink(s, { depth })).winner).toBe(1);
  });

  it("bars the only way through when it sees one reply ahead", () => {
    const cells = new Array(25).fill(PASSE_EMPTY);
    for (let y = 1; y <= 4; y++) cells[at(2, y)] = PASSE_THREAD;
    cells[at(3, 0)] = PASSE_CHAIN; // the thread's other way out, by the current, is shut
    const s = passeInit(setup({ cells, first: 2 }));
    for (const depth of [2, 3, 4]) expect(passeThink(s, { depth })).toEqual({ at: at(2, 0) });
  });

  it("is the same for the same board: nothing is drawn", () => {
    const s = passePlay(passeInit(setup()), { at: 12 });
    expect(passeThink(s, { depth: 3 })).toEqual(passeThink(s, { depth: 3 }));
  });

  it("plays a legal piece whatever its manner", () => {
    const s = passePlay(passeInit(setup()), { at: 12 });
    for (const style of ["mur", "rives", "meute"] as const) {
      const m = passeThink(s, { depth: 2, style });
      expect(passeLegal(s)).toContainEqual(m);
    }
  });

  it("uses its special piece only when one is legal", () => {
    const cells = new Array(25).fill(PASSE_EMPTY);
    cells[at(2, 4)] = PASSE_THREAD;
    const s = passeInit(setup({ cells, first: 2, fire: { thread: 1, chain: 1 } }));
    const m = passeThink(s, { depth: 2 });
    expect(passeLegal(s)).toContainEqual(m);
  });

  it("wins more often when it sees further", () => {
    let strong = 0;
    for (let n = 0; n < 12; n++) {
      if (duel(3, 1, n + 1).winner === 1) strong++;
      if (duel(1, 3, n + 101).winner === 2) strong++;
    }
    expect(strong).toBeGreaterThanOrEqual(16);
  });
});
