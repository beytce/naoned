import { describe, expect, it } from "vitest";
import { type EmpireSettingsInput, cashAccount, empireHouseAt } from "../../src/index.js";
import { testEmpire } from "../fixture.js";
import { HOUR, World, makeContext } from "../helpers.js";

// The fixture's Casa goes to 5: the Arte opens at 3, the minor one at 4; the chain's workshops
// pass the Casa's level only at its top, up to 7 here.
const empire: EmpireSettingsInput = {
  ...testEmpire,
  casa: testEmpire.casa.map((c) => ({ ...c, materials: {}, buildMinutes: 0, costDucats: 0 })),
  workshops: { ...testEmpire.workshops, baseCostDucats: 0, buildMinutes: [0] },
  start: {
    capitalDucats: 0,
    workshops: [
      { type: "farm", recipe: "grow_wheat" },
      { type: "mill", recipe: "mill_flour" },
    ],
  },
  arte: {
    fromCasa: 3,
    minorFromCasa: 4,
    chainYieldBps: 1_000,
    minorYieldBps: 500,
    topLevel: 7,
    renounceLevel: 4,
    artes: [
      { code: "fornai", buildings: ["farm", "mill"], effects: {} },
      { code: "banchieri", buildings: [], effects: { taxCut: 100 } },
    ],
  },
};

function world(casa = 3) {
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
const error = (res: { ok: boolean; error?: string }) => (res.ok ? "" : res.error);
const choose = (w: World, arte: string, minor = false) =>
  w.try({ type: "empireChooseArte", playerId: "a", arte, ...(minor ? { minor } : {}) });
const raise = (w: World, i: number, times: number) => {
  for (let k = 0; k < times; k++) {
    const res = w.try({
      type: "empireUpgrade",
      playerId: "a",
      workshopId: house(w).workshops[i]?.id ?? "",
    });
    if (!res.ok) return res.error;
    w.advance(HOUR);
  }
  return "";
};

describe("the Arte", () => {
  it("is chosen from its Casa, among the settings' own", () => {
    expect(error(choose(world(2), "fornai"))).toBe("requirement_unmet");
    expect(error(choose(world(), "nope"))).toBe("unknown_choice");
    const w = world();
    expect(error(choose(w, "fornai"))).toBe("");
    expect(house(w).arte).toBe("fornai");
  });

  it("makes its chain yield more", () => {
    const w = world();
    choose(w, "fornai");
    const farm = house(w).workshops[0]?.id ?? "";
    w.do({ type: "empireRelaunch", playerId: "a", workshopId: farm });
    w.advance(HOUR);
    w.do({ type: "empireRelaunch", playerId: "a", workshopId: farm });
    expect(w.state.inventories.a?.wheat?.available).toBe(22);
  });

  it("lets its chain pass the Casa only at its top, up to its own top level", () => {
    const w = world(5);
    expect(raise(w, 0, 6)).toBe("max_level");
    expect(house(w).workshops[0]?.level).toBe(5);
    choose(w, "fornai");
    expect(raise(w, 0, 3)).toBe("max_level");
    expect(house(w).workshops[0]?.level).toBe(7);
  });

  it("costs a renunciation to change: the old chain falls back", () => {
    const w = world(5);
    choose(w, "fornai");
    raise(w, 0, 6);
    expect(error(choose(w, "banchieri"))).toBe("");
    expect(house(w).workshops[0]?.level).toBe(4);
    expect(house(w).arte).toBe("banchieri");
  });

  it("has a minor one from its Casa, another than the major", () => {
    const w = world(4);
    choose(w, "banchieri");
    expect(error(choose(w, "banchieri", true))).toBe("built");
    expect(error(choose(w, "fornai", true))).toBe("");
    expect(house(w).minorArte).toBe("fornai");
    expect(w.state.accounts[cashAccount("a")]).toBe(0n);
  });
});
