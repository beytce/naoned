import { describe, expect, it } from "vitest";
import { type EmpireSettingsInput, cashAccount, empireView } from "../../src/index.js";
import { testEmpire } from "../fixture.js";
import { DAY, HOUR, T0, World, makeContext } from "../helpers.js";

// T0 is Monday 5 January 2026, 00:00 UTC.
const empire: EmpireSettingsInput = {
  ...testEmpire,
  casa: testEmpire.casa.map((c) => ({ ...c, materials: {}, buildMinutes: 0 })),
  start: { capitalDucats: 10_000, workshops: [{ type: "farm", recipe: "grow_wheat" }] },
  carnet: {
    objectives: 11,
    carryOver: 2,
    favourPerObjective: 10,
    sealForFull: 1,
    windAfterDays: 7,
    windDays: 3,
  },
};

function world() {
  const w = new World(makeContext({ empire }));
  w.do({ type: "empireJoin", playerId: "a" });
  return w;
}

const carnet = (w: World) => {
  const v = empireView(w.ctx, w.state, "a", w.now);
  if (!v) throw new Error("no view");
  return v.carnet;
};
const goal = (w: World, kind: string) => carnet(w).objectives.find((o) => o.kind === kind);

describe("the Carnet of the week", () => {
  it("draws eleven objectives a week, the same for the same world, week and house", () => {
    const w = world();
    expect(carnet(w).objectives).toHaveLength(11);
    const again = world();
    expect(carnet(again).objectives).toEqual(carnet(w).objectives);
    w.advance(7 * DAY);
    w.do({ type: "empireRelaunchAll", playerId: "a" });
    expect(carnet(w).week).toBe(carnet(again).week + 1);
  });

  it("moves with what the house does, and pays Favour when claimed", () => {
    const w = world();
    const relaunch = carnet(w).objectives.findIndex((o) => o.kind === "relaunch");
    expect(relaunch).toBeGreaterThanOrEqual(0);
    const target = carnet(w).objectives[relaunch]?.target ?? 0;
    for (let i = 0; i < target; i++) {
      w.advance(HOUR);
      w.do({ type: "empireRelaunchAll", playerId: "a" });
    }
    expect(carnet(w).objectives[relaunch]?.progress).toBe(target);
    const cash = w.state.accounts[cashAccount("a")];
    w.do({ type: "empireClaim", playerId: "a", index: relaunch });
    expect(empireView(w.ctx, w.state, "a", w.now)?.house.favour).toBe(10);
    // Favour is not money.
    expect(w.state.accounts[cashAccount("a")]).toBe(cash);
    const twice = w.try({ type: "empireClaim", playerId: "a", index: relaunch });
    expect(twice.ok ? "" : twice.error).toBe("already_paid");
  });

  it("refuses an objective not met", () => {
    const w = world();
    const casa = carnet(w).objectives.findIndex((o) => o.kind === "casa");
    const res = w.try({ type: "empireClaim", playerId: "a", index: casa < 0 ? 0 : casa });
    expect(res.ok ? "" : res.error).toBe("too_early");
  });

  it("counts a Casa reached", () => {
    const w = world();
    w.do({ type: "empireBuildCasa", playerId: "a" });
    w.do({ type: "empireRelaunchAll", playerId: "a" });
    const casa = goal(w, "casa");
    if (casa) expect(casa.progress).toBe(1);
    expect(goal(w, "sites")?.progress ?? 1).toBeGreaterThanOrEqual(1);
  });

  it("keeps two objectives of last week to catch up", () => {
    const w = world();
    w.advance(7 * DAY);
    w.do({ type: "empireRelaunchAll", playerId: "a" });
    expect(carnet(w).carried).toHaveLength(2);
  });

  it("gives a following wind after a week away: double Favour for three days", () => {
    const w = world();
    w.advance(8 * DAY);
    w.do({ type: "empireRelaunchAll", playerId: "a" });
    expect(carnet(w).windUntil).toBe(w.now + 3 * DAY);
    const relaunch = carnet(w).objectives.findIndex((o) => o.kind === "relaunch");
    const target = carnet(w).objectives[relaunch]?.target ?? 0;
    for (let i = 1; i < target; i++) {
      w.advance(HOUR);
      w.do({ type: "empireRelaunchAll", playerId: "a" });
    }
    w.do({ type: "empireClaim", playerId: "a", index: relaunch });
    expect(empireView(w.ctx, w.state, "a", w.now)?.house.favour).toBe(20);
  });

  it("gives a Seal once the carnet is full", () => {
    const w = world();
    const h = w.state.empire?.houses.a;
    if (!h?.carnet) throw new Error("no carnet");
    // Every objective met: the test forces the progress through the state.
    const done = {
      ...h.carnet,
      objectives: h.carnet.objectives.map((o) => ({ ...o, progress: o.target })),
    };
    w.state = {
      ...w.state,
      empire: { ...w.state.empire, houses: { a: { ...h, carnet: done } } },
    } as typeof w.state;
    for (let i = 0; i < 11; i++) w.do({ type: "empireClaim", playerId: "a", index: i });
    expect(empireView(w.ctx, w.state, "a", w.now)?.house.seals).toBe(1);
    expect(T0).toBeGreaterThan(0);
  });
});
