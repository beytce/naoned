import { describe, expect, it } from "vitest";
import { type EmpireSettingsInput, cashAccount, empireHouseAt } from "../../src/index.js";
import { testEmpire } from "../fixture.js";
import { MIN, World, makeContext } from "../helpers.js";

const empire: EmpireSettingsInput = {
  ...testEmpire,
  start: { capitalDucats: 10_000, workshops: [{ type: "farm", recipe: "grow_wheat" }] },
};

function world(over: Partial<EmpireSettingsInput> = {}) {
  return new World(makeContext({ empire: { ...empire, ...over } }));
}

const cash = (w: World, id: string) => w.state.accounts[cashAccount(id)] ?? 0n;
const house = (w: World, id = "a") => {
  const h = empireHouseAt(w.ctx, w.state, id, w.now);
  if (!h) throw new Error(`no house ${id}`);
  return h;
};

describe("a house of the empire", () => {
  it("opens at the Casa 1 with its capital and its first workshops", () => {
    const w = world();
    w.do({ type: "empireJoin", playerId: "a" });
    expect(house(w).casa).toBe(1);
    expect(house(w).workshops.map((x) => [x.type, x.level])).toEqual([["farm", 1]]);
    expect(cash(w, "a")).toBe(1_000_000n);
    expect(w.try({ type: "empireJoin", playerId: "a" }).ok).toBe(false);
  });

  it("is refused in a world of the monthly seasons", () => {
    const w = new World(makeContext());
    const res = w.try({ type: "empireJoin", playerId: "a" });
    expect(res.ok ? "" : res.error).toBe("not_empire_world");
  });
});

describe("the building sites", () => {
  it("raise the Casa when the site ends, and not before", () => {
    const w = world();
    w.do({ type: "empireJoin", playerId: "a" });
    w.do({ type: "empireBuildCasa", playerId: "a" });
    expect(cash(w, "a")).toBe(1_000_000n - 10_000n);
    expect(house(w).casa).toBe(1);
    expect(house(w).builds).toHaveLength(1);
    w.advance(2 * MIN);
    expect(house(w).casa).toBe(2);
    expect(house(w).builds).toHaveLength(0);
  });

  it("take the materials, and refuse a house without them", () => {
    const w = world({ casa: testEmpire.casa.map((c) => ({ ...c, buildMinutes: 0 })) });
    w.do({ type: "empireJoin", playerId: "a" });
    w.do({ type: "empireBuildCasa", playerId: "a" });
    const res = w.try({ type: "empireBuildCasa", playerId: "a" });
    expect(res.ok ? "" : res.error).toBe("insufficient_stock");
    w.give("a", "bricks", 20);
    w.do({ type: "empireBuildCasa", playerId: "a" });
    expect(house(w).casa).toBe(3);
    expect(w.state.inventories.a?.bricks?.available).toBe(0);
  });

  it("run no more at once than the Casa's sites", () => {
    const w = world();
    w.do({ type: "empireJoin", playerId: "a" });
    w.do({ type: "empireBuildCasa", playerId: "a" });
    const res = w.try({
      type: "empireBuildWorkshop",
      playerId: "a",
      workshopType: "clay_pit",
      recipe: "dig_clay",
    });
    expect(res.ok ? "" : res.error).toBe("no_build_slot");
  });

  it("never raise a workshop past the Casa", () => {
    const w = world();
    w.do({ type: "empireJoin", playerId: "a" });
    const id = house(w).workshops[0]?.id ?? "";
    const res = w.try({ type: "empireUpgrade", playerId: "a", workshopId: id });
    expect(res.ok ? "" : res.error).toBe("max_level");
    w.do({ type: "empireBuildCasa", playerId: "a" });
    w.advance(2 * MIN);
    w.do({ type: "empireUpgrade", playerId: "a", workshopId: id });
    expect(cash(w, "a")).toBe(1_000_000n - 10_000n - 650_000n);
    w.advance(5 * MIN);
    expect(house(w).workshops[0]?.level).toBe(2);
  });

  it("build a new workshop at level 1, within the Casa's places", () => {
    const w = world({ casa: testEmpire.casa.map((c) => ({ ...c, workshopSlots: 2 })) });
    w.do({ type: "empireJoin", playerId: "a" });
    w.do({
      type: "empireBuildWorkshop",
      playerId: "a",
      workshopType: "clay_pit",
      recipe: "dig_clay",
    });
    // Every active house owns a level-1 workshop: the knowledge has gone round, half the cost.
    expect(cash(w, "a")).toBe(1_000_000n - 250_000n);
    w.advance(MIN);
    expect(house(w).workshops.map((x) => x.type)).toEqual(["farm", "clay_pit"]);
    const res = w.try({
      type: "empireBuildWorkshop",
      playerId: "a",
      workshopType: "farm",
      recipe: "grow_wheat",
    });
    expect(res.ok ? "" : res.error).toBe("no_room");
  });

  it("refuse a recipe its workshop does not make", () => {
    const w = world();
    w.do({ type: "empireJoin", playerId: "a" });
    const res = w.try({
      type: "empireBuildWorkshop",
      playerId: "a",
      workshopType: "farm",
      recipe: "dig_clay",
    });
    expect(res.ok ? "" : res.error).toBe("unknown_recipe");
  });

  it("ask the empire to follow before a Casa that requires it", () => {
    const casa = testEmpire.casa.map((c, i) => ({
      ...c,
      buildMinutes: 0,
      materials: {},
      requires: i === 2 ? { workshops: 2, level: 2 } : { workshops: 0, level: 0 },
    }));
    const w = world({ casa });
    w.do({ type: "empireJoin", playerId: "a" });
    w.do({ type: "empireBuildCasa", playerId: "a" });
    const res = w.try({ type: "empireBuildCasa", playerId: "a" });
    expect(res.ok ? "" : res.error).toBe("requirement_unmet");
  });

  it("refuse what the house cannot pay", () => {
    const w = world({ start: { capitalDucats: 50, workshops: [] } });
    w.do({ type: "empireJoin", playerId: "a" });
    const res = w.try({ type: "empireBuildCasa", playerId: "a" });
    expect(res.ok ? "" : res.error).toBe("insufficient_funds");
  });
});

describe("the knowledge goes round", () => {
  it("makes a level most active houses own cheaper and quicker", () => {
    const w = world({ casa: testEmpire.casa.map((c) => ({ ...c, materials: {} })) });
    for (const id of ["a", "b", "c", "d"]) w.do({ type: "empireJoin", playerId: id });
    for (const id of ["a", "b", "c"]) w.do({ type: "empireBuildCasa", playerId: id });
    w.advance(2 * MIN);
    // Three houses of four (7 500 bps) own the Casa 2: half the way from 5 000 to 10 000.
    w.do({ type: "empireBuildCasa", playerId: "d" });
    expect(cash(w, "d")).toBe(1_000_000n - 7_500n);
    expect(house(w, "d").builds[0]?.endsAt).toBe(w.now + Math.round(2 * MIN * 0.7));
  });
});
