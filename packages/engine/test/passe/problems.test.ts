import { describe, expect, it } from "vitest";
import {
  PASSE_CHAIN,
  PASSE_EMPTY,
  PASSE_THREAD,
  type PasseSetup,
  passeForcedWin,
  passeInit,
  passeKeys,
  passeLegal,
  passePlay,
  venice1450Passe,
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

// « Le fil passe en N coups » (docs/CADRAGE-v4.md § 9.9, docs/plan-passe.md P3).
describe("a forced win of the Passe", () => {
  it("finds the piece that wins at once", () => {
    const cells = new Array(25).fill(PASSE_EMPTY);
    for (let y = 1; y <= 4; y++) cells[at(2, y)] = PASSE_THREAD;
    cells[at(3, 0)] = PASSE_CHAIN;
    const s = passeInit(setup({ cells }));
    expect(passeForcedWin(s, 1)).toEqual({ at: at(2, 0) });
    expect(passeKeys(s, 1)).toEqual([{ at: at(2, 0) }]);
  });

  it("finds the double threat: two ways through, the chain bars only one", () => {
    const cells = new Array(25).fill(PASSE_EMPTY);
    for (let y = 2; y <= 4; y++) cells[at(2, y)] = PASSE_THREAD;
    const s = passeInit(setup({ cells }));
    expect(passeForcedWin(s, 1)).toBeNull();
    const key = passeForcedWin(s, 2);
    expect(key).not.toBeNull();
    // whatever the chain answers, the thread is through on its next piece
    const t = passePlay(s, key as { at: number });
    for (let i = 0; i < 25; i++) {
      if (t.cells[i] !== PASSE_EMPTY) continue;
      const u = passePlay(t, { at: i });
      expect(passeForcedWin(u, 1)).not.toBeNull();
    }
  });

  it("finds none where the chain can always bar", () => {
    const s = passeInit(setup());
    expect(passeForcedWin(s, 2)).toBeNull();
  });

  it("counts the chain's bombard among its answers", () => {
    const cells = new Array(25).fill(PASSE_EMPTY);
    cells[at(1, 4)] = PASSE_THREAD;
    cells[at(1, 3)] = PASSE_THREAD;
    cells[at(2, 0)] = PASSE_THREAD; // a barge alone on the north bank
    // (1,2) threatens twice, but both ways lean on the lone barge: the bombard sinks it
    const bare = passeInit(setup({ cells }));
    expect(passeKeys(bare, 2)).toContainEqual({ at: at(1, 2) });
    const armed = passeInit(setup({ cells, fire: { thread: 0, chain: 1 } }));
    const keys = passeKeys(armed, 2);
    expect(keys).not.toContainEqual({ at: at(1, 2) });
    // joining the lone barge first still wins: the bombard has nothing left to sink
    expect(keys).toContainEqual({ at: at(2, 1) });
  });
});

describe("the problems of Venice", () => {
  const { problems } = venice1450Passe;
  // a problem is played without the pieces of character
  const rules = { ...venice1450Passe.rules, fire: { thread: 0, chain: 0 } };

  it("are twenty, in two and in three pieces", () => {
    expect(problems.length).toBe(20);
    expect(problems.some((p) => p.moves === 2)).toBe(true);
    expect(problems.some((p) => p.moves === 3)).toBe(true);
  });

  it("each have a key that wins in the pieces told, and no shorter way", () => {
    for (const p of problems) {
      const s = passeInit({ ...rules, width: p.width, height: p.height, cells: p.cells, first: 1 });
      expect(s.winner).toBe(0);
      expect(passeForcedWin(s, p.moves - 1), p.id).toBeNull();
      const t = passePlay(s, p.key);
      // after the key, whatever the chain answers, the thread wins in the pieces left
      for (const reply of passeLegal(t)) {
        const u = passePlay(t, reply);
        expect(u.winner, p.id).not.toBe(2);
        expect(passeForcedWin(u, p.moves - 1), `${p.id} after ${reply.at}`).not.toBeNull();
      }
    }
  });

  it("each in two pieces have that key alone", () => {
    for (const p of problems.filter((q) => q.moves === 2)) {
      const s = passeInit({ ...rules, width: p.width, height: p.height, cells: p.cells, first: 1 });
      expect(passeKeys(s, 2), p.id).toEqual([p.key]);
    }
  });

  it("have boards that open with nobody through", () => {
    for (const b of Object.values(venice1450Passe.boards)) {
      const s = passeInit({ ...venice1450Passe.rules, ...b });
      expect(s.winner).toBe(0);
    }
  });
});
