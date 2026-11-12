import { describe, expect, it } from "vitest";
import { guerreForm, guerreJoin, guerrePrestige, guerreScore } from "../../src/index.js";

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

describe("a house come during the week", () => {
  it("takes the place of a computer's house of its band, or opens a war of its own", () => {
    const robots = Array.from({ length: 30 }, (_, k) => ({
      key: `r${k}`,
      power: 1_000 - k * 30,
      person: false,
    }));
    const first = { key: "p0", power: 900, person: true };
    const { wars } = guerreForm([first, ...robots], 6);
    const late = { key: "p1", power: 880, person: true };
    const joined = guerreJoin(wars, late, [first, ...robots, late], 6, new Set());
    expect(joined.flatMap((w) => [...w.a, ...w.b]).filter((k) => k === "p1")).toHaveLength(1);
    expect(joined).toHaveLength(wars.length);
    // A house already struck stays: the newcomer takes a slot no one has fought over.
    const all = new Set(wars.flatMap((w) => [...w.a, ...w.b]).filter((k) => k.startsWith("r")));
    const busy = guerreJoin(wars, late, [first, ...robots, late], 6, all);
    expect(busy).toHaveLength(wars.length + 1);
    expect(busy.at(-1)?.a).toContain("p1");
    // Already at war: nothing changes.
    expect(guerreJoin(joined, late, [first, ...robots, late], 6, new Set())).toEqual(joined);
  });
});

describe("the company's War", () => {
  it("puts a company's members in its own flotillas, never mixed with strangers", () => {
    const company = Array.from({ length: 8 }, (_, k) => ({
      key: `c${k}`,
      power: 500 + k,
      person: true,
      group: "tana",
    }));
    const solo = Array.from({ length: 4 }, (_, k) => ({
      key: `s${k}`,
      power: 505 + k,
      person: true,
    }));
    const robots = Array.from({ length: 60 }, (_, k) => ({
      key: `r${k}`,
      power: 300 + k * 10,
      person: false,
    }));
    const { wars } = guerreForm([...company, ...solo, ...robots], 6);
    const sides = wars.flatMap((w) => [w.a, w.b]);
    // Eight members: two flotillas of the company (six and two), each filled by the computer.
    const withCompany = sides.filter((s) => s.some((k) => k.startsWith("c")));
    expect(withCompany).toHaveLength(2);
    for (const s of withCompany) expect(s.some((k) => k.startsWith("s"))).toBe(false);
    expect(withCompany.flat().filter((k) => k.startsWith("c"))).toHaveLength(8);
    // The solo players have their own flotilla.
    expect(sides.filter((s) => s.some((k) => k.startsWith("s")))).toHaveLength(1);
  });

  it("seats a company's latecomer in its company's flotilla", () => {
    const company = Array.from({ length: 2 }, (_, k) => ({
      key: `c${k}`,
      power: 500,
      person: true,
      group: "tana",
    }));
    const solo = [{ key: "s0", power: 500, person: true }];
    const robots = Array.from({ length: 40 }, (_, k) => ({
      key: `r${k}`,
      power: 450 + k * 5,
      person: false,
    }));
    const all = [...company, ...solo, ...robots];
    const { wars } = guerreForm(all, 6);
    const late = { key: "c9", power: 500, person: true, group: "tana" };
    const joined = guerreJoin(wars, late, [...all, late], 6, new Set());
    const side = joined.flatMap((w) => [w.a, w.b]).find((s) => s.includes("c9"));
    expect(side).toEqual(expect.arrayContaining(["c0", "c1", "c9"]));
  });
});
