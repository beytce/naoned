import { describe, expect, it } from "vitest";
import { type EmpireSettingsInput, cashAccount, empireHouseAt } from "../../src/index.js";
import { testEmpire } from "../fixture.js";
import { HOUR, World, makeContext } from "../helpers.js";

// A master gives 1 % of yield a level (×1,5 if rare); every 2 levels a choice of two paths.
const empire: EmpireSettingsInput = {
  ...testEmpire,
  casa: testEmpire.casa.map((c) => ({ ...c, materials: {}, buildMinutes: 0, costDucats: 0 })),
  start: { capitalDucats: 1_000, workshops: [{ type: "farm", recipe: "grow_wheat" }] },
  staff: {
    hireCostDucats: 100,
    hireGrowthBps: 20_000,
    slotsBase: 1,
    casaPerSlot: 4,
    xpPerLevel: 10,
    maxLevel: 30,
    tierEvery: 2,
    rarityBps: { common: 10_000, rare: 15_000, illustrious: 20_000 },
    roles: {
      master: {
        place: "workshop",
        perLevel: { workshopYield: 100 },
        paths: [{ quality: 500 }, { workshopYield: 300 }],
      },
      captain: {
        place: "vehicle",
        perLevel: { speed: 100 },
        paths: [{ speed: 500 }, { capacity: 500 }],
      },
    },
  },
};

function world(casa = 1) {
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
const cash = (w: World) => w.state.accounts[cashAccount("a")] ?? 0n;
const error = (res: { ok: boolean; error?: string }) => (res.ok ? "" : res.error);
const hire = (w: World, role: string) => w.try({ type: "empireHire", playerId: "a", role });
const farm = (w: World) => house(w).workshops[0]?.id ?? "";

describe("the staff", () => {
  it("is hired for ducats, dearer each time, within the Casa's places", () => {
    const w = world();
    const before = cash(w);
    expect(error(hire(w, "master"))).toBe("");
    expect(before - cash(w)).toBe(10_000n);
    expect(house(w).staff?.[0]).toMatchObject({ role: "master", rarity: "common", level: 1 });
    expect(error(hire(w, "captain"))).toBe("no_room");
    const v = world(4);
    hire(v, "master");
    const then = cash(v);
    expect(error(hire(v, "captain"))).toBe("");
    expect(then - cash(v)).toBe(20_000n);
    expect(error(hire(v, "admiral"))).toBe("unknown_choice");
  });

  it("works where it is placed: a master in a workshop, its yield", () => {
    const w = world();
    hire(w, "master");
    const id = house(w).staff?.[0]?.id ?? "";
    expect(error(w.try({ type: "empirePlace", playerId: "a", staffId: id, at: "nowhere" }))).toBe(
      "unknown_target",
    );
    w.do({ type: "empirePlace", playerId: "a", staffId: id, at: farm(w) });
    w.do({ type: "empireRelaunch", playerId: "a", workshopId: farm(w) });
    w.advance(HOUR);
    w.do({ type: "empireRelaunch", playerId: "a", workshopId: farm(w) });
    // 20 wheat and 1 %: floor(20,2).
    expect(w.state.inventories.a?.wheat?.available).toBe(20);
  });

  it("grows with the lots of its workshop, and chooses a path at each tier, for good", () => {
    const w = world();
    hire(w, "master");
    const id = house(w).staff?.[0]?.id ?? "";
    w.do({ type: "empirePlace", playerId: "a", staffId: id, at: farm(w) });
    w.do({ type: "empireRelaunch", playerId: "a", workshopId: farm(w) });
    w.advance(12 * HOUR);
    w.do({ type: "empireRelaunch", playerId: "a", workshopId: farm(w) });
    // Twelve lots: 12 experience, a level of 10.
    expect(house(w).staff?.[0]?.level).toBe(2);
    expect(error(w.try({ type: "empireSkill", playerId: "a", staffId: id, path: 2 }))).toBe(
      "unknown_choice",
    );
    expect(error(w.try({ type: "empireSkill", playerId: "a", staffId: id, path: 1 }))).toBe("");
    expect(house(w).staff?.[0]?.skills).toEqual([1]);
    expect(error(w.try({ type: "empireSkill", playerId: "a", staffId: id, path: 0 }))).toBe(
      "too_early",
    );
  });
});
