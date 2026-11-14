import { describe, expect, it } from "vitest";
import { passeForcedWin, passeInit, passeKeys, venice1450Passe } from "../../src/index.js";

// The problems of the day, generated (docs/plan-duels.md B5): a year, each with one key alone.
describe("the problems of the day", () => {
  const jour = venice1450Passe.jour;
  const rules = { ...venice1450Passe.rules, fire: { thread: 0, chain: 0 } };
  const open = (p: (typeof jour)[number]) =>
    passeInit({ ...rules, width: p.width, height: p.height, cells: p.cells, first: 1 });

  it("are a year, in two, three and four pieces, all different", () => {
    expect(jour.length).toBeGreaterThanOrEqual(365);
    for (const m of [2, 3, 4]) expect(jour.some((p) => p.moves === m)).toBe(true);
    expect(new Set(jour.map((p) => `${p.width}:${p.cells.join("")}`)).size).toBe(jour.length);
    expect(new Set(jour.map((p) => p.id)).size).toBe(jour.length);
  });

  it("each have their key alone, and no shorter way (a sample of a month)", () => {
    // The whole year is checked by the generator; a month of it here, the four-piece ones aside.
    const sample = jour.filter((p, i) => p.moves < 4 && i % 12 === 0);
    expect(sample.length).toBeGreaterThan(20);
    for (const p of sample) {
      const s = open(p);
      expect(s.winner, p.id).toBe(0);
      expect(passeForcedWin(s, p.moves - 1), p.id).toBeNull();
      expect(passeKeys(s, p.moves), p.id).toEqual([p.key]);
    }
  });
});
