import { describe, expect, it } from "vitest";
import { guerreForm, guerrePrestige, guerreScore } from "../../src/index.js";

const P = { seal: 20, damage: 7, repelled: 10, repelledCap: 40, victory: 60 };

// The week of the War (docs/plan-guerre.md W4).
describe("the flotillas", () => {
  it("groups six houses of a band of Power, fills with the computer's, and pairs neighbours", () => {
    const people = [900, 880, 860, 500, 480, 470, 460, 100].map((power, k) => ({
      key: `p${k}`,
      power,
      person: true,
    }));
    const robots = Array.from({ length: 40 }, (_, k) => ({
      key: `r${k}`,
      power: 1_000 - k * 25,
      person: false,
    }));
    const { wars } = guerreForm([...people, ...robots], 6);
    // Every person is at war, on one side, against a flotilla of the same band.
    const sides = wars.flatMap((w) => [w.a, w.b]);
    for (const p of people) expect(sides.filter((s) => s.includes(p.key))).toHaveLength(1);
    for (const w of wars) {
      expect(w.a).toHaveLength(6);
      expect(w.b).toHaveLength(6);
      // At least one person in each war: the computer does not fight itself.
      expect([...w.a, ...w.b].some((k) => k.startsWith("p"))).toBe(true);
    }
    const powerOf = new Map([...people, ...robots].map((h) => [h.key, h.power]));
    const mean = (ks: string[]) => ks.reduce((n, k) => n + (powerOf.get(k) ?? 0), 0) / ks.length;
    for (const w of wars) expect(Math.abs(mean(w.a) - mean(w.b))).toBeLessThan(200);
  });
});

describe("the score", () => {
  it("counts on each port only the best assault, and sums a flotilla's ports", () => {
    const war = { a: ["a1", "a2"], b: ["b1", "b2"] };
    const s = guerreScore(war, [
      { by: "a1", target: "b1", seals: 1, damageBps: 4_000 },
      { by: "a2", target: "b1", seals: 3, damageBps: 10_000 },
      { by: "a1", target: "b1", seals: 2, damageBps: 8_000 },
      { by: "a2", target: "b2", seals: 1, damageBps: 3_000 },
      { by: "b1", target: "a1", seals: 2, damageBps: 6_000 },
    ]);
    expect(s.a).toBe(4);
    expect(s.b).toBe(2);
    expect(s.best).toMatchObject({ b1: 3, b2: 1, a1: 2 });
    expect(s.winner).toBe("a");
  });
});

describe("the Prestige of the week", () => {
  it("pays the seals, the damage, the defence that held and the victory, by the owner's scale", () => {
    const war = { a: ["a1", "a2"], b: ["b1", "b2"] };
    const assaults = [
      { by: "a1", target: "b1", seals: 2, damageBps: 8_000 },
      { by: "a1", target: "b2", seals: 0, damageBps: 2_000 },
      { by: "a2", target: "b1", seals: 0, damageBps: 0 },
      ...Array.from({ length: 6 }, () => ({ by: "b1", target: "a2", seals: 0, damageBps: 1_000 })),
    ];
    const p = guerrePrestige(P, war, assaults);
    // a1: 2 seals (40) + a damaging assault (7) + the victory (60).
    expect(p.a1).toBe(107);
    // a2: six assaults repelled, capped at 40, and the victory.
    expect(p.a2).toBe(100);
    // b1: six damaging assaults (42) and a2's assault repelled (10); b2 repelled a1's (10).
    expect(p.b1).toBe(52);
    expect(p.b2).toBe(10);
  });
});
