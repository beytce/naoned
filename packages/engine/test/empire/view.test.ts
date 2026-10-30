import { describe, expect, it } from "vitest";
import {
  type EmpireSettingsInput,
  empireView,
  parseEmpireSettings,
  powerOf,
} from "../../src/index.js";
import { testEmpire } from "../fixture.js";
import { DAY, MIN, World, makeContext } from "../helpers.js";

const empire: EmpireSettingsInput = {
  ...testEmpire,
  casa: testEmpire.casa.map((c) => ({ ...c, materials: {} })),
  start: { capitalDucats: 10_000, workshops: [{ type: "farm", recipe: "grow_wheat" }] },
  markets: {
    depthBase: 0,
    depthPerHouse: 0,
    boardPerHouse: 10,
    smallShareBps: 0,
    smallCasa: 20,
    orderPremiumBps: 0,
    taxBps: 0,
  },
  sleepAfterDays: 14,
};
const s = parseEmpireSettings(empire);

function world() {
  const w = new World(makeContext({ empire }));
  for (const id of ["a", "b"]) w.do({ type: "empireJoin", playerId: id });
  return w;
}

const view = (w: World, id = "a") => {
  const v = empireView(w.ctx, w.state, id, w.now);
  if (!v) throw new Error("no view");
  return v;
};

describe("the Power and its band", () => {
  it("count what is built, never the treasury", () => {
    const w = world();
    const p = powerOf(
      {
        casa: 1,
        workshopLevels: [1],
        counterLevels: [],
        moduleLevels: [],
        staffLevels: [],
        vehicles: 0,
      },
      s,
    );
    expect(view(w).power).toBe(p);
    expect(view(w).band).toBe(0);
    w.do({ type: "empireBuildCasa", playerId: "a" });
    w.advance(2 * MIN);
    expect(view(w).power).toBe(p + s.power.casa);
  });
});

describe("the next Casa", () => {
  it("says its cost, its site, what it asks and what it opens", () => {
    const w = world();
    const next = view(w).nextCasa;
    expect(next?.level).toBe(2);
    expect(next?.cost).toBe(10_000n);
    expect(next?.minutes).toBe(2);
    expect(next?.requirementMet).toBe(true);
    w.do({ type: "empireBuildCasa", playerId: "a" });
    w.advance(2 * MIN);
    expect(view(w).nextCasa?.opens).toEqual(["scuola"]);
  });
});

describe("a sleeping house", () => {
  it("falls asleep after fourteen days without an action, and wakes at the next", () => {
    const w = world();
    w.advance(14 * DAY);
    expect(view(w).asleep).toBe(true);
    w.do({ type: "empireRelaunchAll", playerId: "a" });
    expect(view(w).asleep).toBe(false);
  });

  it("leaves the common board of the cities", () => {
    const w = world();
    w.advance(14 * DAY);
    w.do({ type: "empireRelaunchAll", playerId: "a" });
    // b sleeps: the board is sized for one house awake, after the private book of 40.
    w.give("a", "bread", 100);
    w.do({ type: "empireDeliver", playerId: "a", good: "bread", qty: 100 });
    expect(w.state.inventories.a?.bread?.available).toBe(50);
  });
});

describe("the merchant's return", () => {
  it("tells what the queues made and the sites that ended while away", () => {
    const w = world();
    w.do({ type: "empireRelaunchAll", playerId: "a" });
    w.do({ type: "empireBuildCasa", playerId: "a" });
    expect(view(w).away).toBeNull();
    w.advance(2 * DAY);
    const away = view(w).away;
    // A full queue of twelve lots of 20 wheat, and the Casa 2.
    expect(away?.ready).toEqual({ wheat: 240 });
    expect(away?.sitesDone).toBe(1);
    expect(away?.since).toBe(w.now - 2 * DAY);
  });
});
