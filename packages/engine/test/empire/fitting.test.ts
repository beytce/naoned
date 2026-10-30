import { describe, expect, it } from "vitest";
import { type EmpireSettingsInput, empireHouseAt } from "../../src/index.js";
import { testEmpire } from "../fixture.js";
import { HOUR, World, makeContext } from "../helpers.js";

// The test theme: grow_wheat makes 20 wheat an hour; mill_flour takes 10 wheat for 8 flour in 30 min.
const empire: EmpireSettingsInput = {
  ...testEmpire,
  casa: testEmpire.casa.map((c, i) => ({
    ...c,
    materials: {},
    buildMinutes: 0,
    costDucats: 0,
    // The workshop modules open at the Casa 3 here.
    opens: i === 2 ? ["workshopModules"] : [],
  })),
  workshops: {
    ...testEmpire.workshops,
    baseCostDucats: 0,
    buildMinutes: [0],
    moduleSlotsAt: [1, 3],
  },
  start: {
    capitalDucats: 100_000,
    workshops: [
      { type: "farm", recipe: "grow_wheat" },
      { type: "mill", recipe: "mill_flour" },
    ],
  },
  modules: [
    ...(testEmpire.modules ?? []),
    {
      code: "tools",
      kind: "workshop",
      effect: "workshopYield",
      firstLevelBps: 5_000,
      perLevelBps: 0,
    },
    {
      code: "apprentices",
      kind: "workshop",
      effect: "workshopSpeed",
      firstLevelBps: 10_000,
      perLevelBps: 0,
    },
    { code: "furnace", kind: "workshop", effect: "inputs", firstLevelBps: 5_000, perLevelBps: 0 },
  ],
  research: { ...testEmpire.research, available: ["tools", "apprentices", "furnace"] },
};

function world(casa = 3) {
  const w = new World(makeContext({ empire }));
  w.do({ type: "empireJoin", playerId: "a" });
  for (let i = 1; i < casa; i++) w.do({ type: "empireBuildCasa", playerId: "a" });
  return w;
}
const ws = (w: World, i: number) => empireHouseAt(w.ctx, w.state, "a", w.now)?.workshops[i];
const stock = (w: World, good: string) => w.state.inventories.a?.[good]?.available ?? 0;
const error = (res: { ok: boolean; error?: string }) => (res.ok ? "" : res.error);
const learn = (w: World, module: string) => {
  w.do({ type: "empireResearch", playerId: "a", module });
  w.advance(HOUR);
};
const fit = (w: World, i: number, slot: number, module: string) =>
  w.try({ type: "empireFit", playerId: "a", workshopId: ws(w, i)?.id ?? "", slot, module });

describe("the workshop modules", () => {
  it("are researched from the Casa that opens them", () => {
    const w = world(2);
    expect(error(w.try({ type: "empireResearch", playerId: "a", module: "tools" }))).toBe(
      "requirement_unmet",
    );
  });

  it("are fitted in a workshop's places, more with its level, once each", () => {
    const w = world();
    learn(w, "tools");
    learn(w, "apprentices");
    expect(error(fit(w, 0, 0, "tools"))).toBe("");
    expect(error(fit(w, 0, 1, "apprentices"))).toBe("no_room");
    expect(error(fit(w, 1, 0, "furnace"))).toBe("unknown_building_type");
    w.do({ type: "empireUpgrade", playerId: "a", workshopId: ws(w, 0)?.id ?? "" });
    w.do({ type: "empireUpgrade", playerId: "a", workshopId: ws(w, 0)?.id ?? "" });
    w.advance(HOUR);
    expect(ws(w, 0)?.level).toBe(3);
    expect(error(fit(w, 0, 1, "tools"))).toBe("built");
    expect(error(fit(w, 0, 1, "apprentices"))).toBe("");
    expect(ws(w, 0)?.fitted).toEqual(["tools", "apprentices"]);
  });

  it("make more, quicker, from fewer inputs where they are fitted", () => {
    const w = world();
    learn(w, "tools");
    fit(w, 0, 0, "tools");
    w.do({ type: "empireRelaunch", playerId: "a", workshopId: ws(w, 0)?.id ?? "" });
    w.advance(HOUR);
    w.do({ type: "empireRelaunch", playerId: "a", workshopId: ws(w, 0)?.id ?? "" });
    // 20 and 50 %.
    expect(stock(w, "wheat")).toBe(30);

    const v = world();
    learn(v, "furnace");
    fit(v, 1, 0, "furnace");
    v.give("a", "wheat", 10);
    v.do({ type: "empireRelaunch", playerId: "a", workshopId: ws(v, 1)?.id ?? "" });
    // Half the wheat a lot: two lots of 5.
    expect(ws(v, 1)?.job?.batches).toBe(2);
    expect(stock(v, "wheat")).toBe(0);

    const u = world();
    learn(u, "apprentices");
    fit(u, 0, 0, "apprentices");
    u.do({ type: "empireRelaunch", playerId: "a", workshopId: ws(u, 0)?.id ?? "" });
    // Twice as quick: lots of 30 minutes, 24 in the night queue.
    expect(ws(u, 0)?.job?.batches).toBe(24);
  });
});
