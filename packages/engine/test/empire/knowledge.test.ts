import { describe, expect, it } from "vitest";
import { type EmpireSettingsInput, cashAccount, empireHouseAt } from "../../src/index.js";
import { testEmpire } from "../fixture.js";
import { HOUR, MIN, World, makeContext } from "../helpers.js";

// One branch of two knowledges and two capstones; one place from the Casa 2, two from the 4.
const knowledge: EmpireSettingsInput["knowledge"] = {
  baseCostDucats: 100,
  costGrowthBps: 20_000,
  minutes: [30, 60, 120],
  slotsAt: [2, 4],
  branches: [
    {
      code: "abaco",
      nodes: [
        { code: "tariffa", effects: { taxCut: 50 } },
        { code: "scritta", effects: { orderBonus: 500 } },
      ],
      capstones: [
        { code: "partita", effects: { wagesCut: 1_500 } },
        { code: "banco", effects: { orderBonus: 1_500 } },
      ],
    },
    {
      code: "arti",
      nodes: [{ code: "mestiere", effects: { workshopYield: 500 } }],
      capstones: [],
    },
  ],
};
const empire: EmpireSettingsInput = {
  ...testEmpire,
  casa: testEmpire.casa.map((c) => ({ ...c, materials: {}, buildMinutes: 0, costDucats: 0 })),
  start: { capitalDucats: 10_000, workshops: [] },
  knowledge,
};

function world(casa = 2) {
  const w = new World(makeContext({ empire }));
  w.do({ type: "empireJoin", playerId: "a" });
  for (let i = 1; i < casa; i++) w.do({ type: "empireBuildCasa", playerId: "a" });
  return w;
}
const house = (w: World) => {
  const h = empireHouseAt(w.ctx, w.state, "a", w.now);
  if (!h) throw new Error("no house");
  return h;
};
const learn = (w: World, code: string) => w.try({ type: "empireLearn", playerId: "a", code });
const error = (res: { ok: boolean; error?: string }) => (res.ok ? "" : res.error);
const cash = (w: World) => w.state.accounts[cashAccount("a")] ?? 0n;

describe("the knowledge", () => {
  it("opens with its first place, and is learnt in its branch's order", () => {
    expect(error(learn(world(1), "tariffa"))).toBe("no_build_slot");
    const w = world();
    expect(error(learn(w, "scritta"))).toBe("requirement_unmet");
    expect(error(learn(w, "nope"))).toBe("unknown_choice");
    const before = cash(w);
    expect(error(learn(w, "tariffa"))).toBe("");
    expect(before - cash(w)).toBe(10_000n);
    expect(error(learn(w, "mestiere"))).toBe("no_build_slot");
    w.advance(30 * MIN);
    expect(house(w).knowledge).toEqual(["tariffa"]);
    expect(error(learn(w, "tariffa"))).toBe("built");
    // The second of a branch costs and lasts more.
    const then = cash(w);
    learn(w, "scritta");
    expect(then - cash(w)).toBe(20_000n);
  });

  it("ends each branch with a choice between two capstones, for good", () => {
    const w = world(4);
    learn(w, "tariffa");
    learn(w, "mestiere");
    w.advance(HOUR);
    expect(error(learn(w, "partita"))).toBe("requirement_unmet");
    learn(w, "scritta");
    w.advance(HOUR);
    expect(error(learn(w, "partita"))).toBe("");
    w.advance(2 * HOUR);
    expect(error(learn(w, "banco"))).toBe("built");
    expect(house(w).knowledge).toContain("partita");
  });
});
