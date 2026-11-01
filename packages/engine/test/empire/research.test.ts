import { describe, expect, it } from "vitest";
import {
  type EmpireSettingsInput,
  cashAccount,
  empireHouseAt,
  empireQuotes,
  parseEmpireSettings,
  researchCost,
} from "../../src/index.js";
import { testEmpire } from "../fixture.js";
import { HOUR, MIN, World, makeContext } from "../helpers.js";

const empire: EmpireSettingsInput = {
  ...testEmpire,
  // The fixture's Casa 3 opens the first place of research.
  casa: testEmpire.casa.map((c) => ({ ...c, materials: {}, buildMinutes: 0, costDucats: 0 })),
  start: { capitalDucats: 100_000, workshops: [], vehicles: [] },
  modules: [
    ...(testEmpire.modules ?? []),
    { code: "portolan", kind: "trade", effect: "intel", firstLevelBps: 10_000, perLevelBps: 0 },
    { code: "convoy", kind: "trade", effect: "orderBonus", firstLevelBps: 1_000, perLevelBps: 0 },
  ],
  research: { ...testEmpire.research, available: ["hold", "sails", "portolan", "convoy"] },
  vehicles: {
    burchio: {
      casa: 1,
      capacity: 100,
      costDucats: 0,
      regions: ["veneto", "lombardia"],
      speedBps: 0,
    },
  },
};
const s = parseEmpireSettings(empire);

function world(casa = 3) {
  const w = new World(makeContext({ empire }));
  for (const id of ["a", "b"]) {
    w.do({ type: "empireJoin", playerId: id, favour: 50 });
    for (let i = 1; i < casa; i++) w.do({ type: "empireBuildCasa", playerId: id });
  }
  return w;
}
const house = (w: World, id = "a") => {
  const h = empireHouseAt(w.ctx, w.state, id, w.now);
  if (!h) throw new Error("no house");
  return h;
};
const error = (res: { ok: boolean; error?: string }) => (res.ok ? "" : res.error);
const research = (w: World, module: string, id = "a") =>
  w.try({ type: "empireResearch", playerId: id, module });

describe("the Scuola", () => {
  it("opens with the first place of research, one research at a time", () => {
    expect(error(research(world(2), "hold"))).toBe("no_build_slot");
    const w = world();
    const before = w.state.accounts[cashAccount("a")] ?? 0n;
    expect(error(research(w, "hold"))).toBe("");
    expect(before - (w.state.accounts[cashAccount("a")] ?? 0n)).toBe(researchCost(1, s));
    expect(error(research(w, "sails"))).toBe("no_build_slot");
    w.advance(30 * MIN);
    expect(house(w).modules?.hold).toBe(1);
    expect(error(research(w, "sails"))).toBe("");
  });

  it("researches only the modules the world opens, every level for ducats and time", () => {
    const w = world();
    expect(error(research(w, "yield"))).toBe("unknown_building_type");
    for (let level = 1; level <= 3; level++) {
      expect(error(research(w, "hold"))).toBe("");
      w.advance(4 * HOUR);
    }
    expect(house(w).modules?.hold).toBe(3);
    // No plan asked any more (the expeditions gone, 1 November).
    expect(error(research(w, "hold"))).toBe("");
  });
});

describe("the trade modules", () => {
  it("count in the Power", () => {
    const w = world();
    const before = empireHouseAt(w.ctx, w.state, "a", w.now);
    w.do({ type: "empireResearch", playerId: "a", module: "hold" });
    w.advance(HOUR);
    expect(house(w).modules?.hold).toBe(1);
    expect(before?.modules).toBeUndefined();
  });
});
