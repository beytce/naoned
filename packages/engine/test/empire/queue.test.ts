import { describe, expect, it } from "vitest";
import { type EmpireSettingsInput, empireHouseAt } from "../../src/index.js";
import { testEmpire } from "../fixture.js";
import { HOUR, MIN, World, makeContext } from "../helpers.js";

// The test theme: grow_wheat makes 20 wheat an hour; mill_flour takes 10 wheat for 8 flour in 30 min.
const empire: EmpireSettingsInput = {
  ...testEmpire,
  casa: testEmpire.casa.map((c) => ({ ...c, buildMinutes: 0, materials: {} })),
  start: {
    capitalDucats: 100_000,
    workshops: [
      { type: "farm", recipe: "grow_wheat" },
      { type: "mill", recipe: "mill_flour" },
    ],
  },
  queueHours: 12,
};

function world() {
  const w = new World(makeContext({ empire }));
  w.do({ type: "empireJoin", playerId: "a" });
  return w;
}

const stock = (w: World, good: string) => w.state.inventories.a?.[good]?.available ?? 0;
const ws = (w: World, i: number) => empireHouseAt(w.ctx, w.state, "a", w.now)?.workshops[i];
const farm = (w: World) => ws(w, 0)?.id ?? "";
const mill = (w: World) => ws(w, 1)?.id ?? "";

describe("the night queue", () => {
  it("queues twelve hours of lots, and gives what is done at the relaunch", () => {
    const w = world();
    w.do({ type: "empireRelaunch", playerId: "a", workshopId: farm(w) });
    expect(ws(w, 0)?.job?.batches).toBe(12);
    w.advance(3 * HOUR);
    w.do({ type: "empireRelaunch", playerId: "a", workshopId: farm(w) });
    expect(stock(w, "wheat")).toBe(60);
    // Topped up to twelve hours from now again.
    expect(ws(w, 0)?.job?.batches).toBe(12);
  });

  it("never makes more than a full queue, however long the absence", () => {
    const w = world();
    w.do({ type: "empireRelaunch", playerId: "a", workshopId: farm(w) });
    w.advance(30 * HOUR);
    w.do({ type: "empireRelaunch", playerId: "a", workshopId: farm(w) });
    expect(stock(w, "wheat")).toBe(240);
  });

  it("takes the inputs of the lots it queues, no more than the stock allows", () => {
    const w = world();
    w.give("a", "wheat", 25);
    w.do({ type: "empireRelaunch", playerId: "a", workshopId: mill(w) });
    expect(ws(w, 1)?.job?.batches).toBe(2);
    expect(stock(w, "wheat")).toBe(5);
    w.advance(HOUR);
    w.do({ type: "empireRelaunch", playerId: "a", workshopId: mill(w) });
    expect(stock(w, "flour")).toBe(16);
    expect(ws(w, 1)?.job).toBeNull();
  });

  it("makes Y(n) times the lot at the workshop's level", () => {
    const w = world();
    w.do({ type: "empireBuildCasa", playerId: "a" });
    w.do({ type: "empireUpgrade", playerId: "a", workshopId: farm(w) });
    w.advance(5 * MIN);
    w.do({ type: "empireRelaunch", playerId: "a", workshopId: farm(w) });
    w.advance(HOUR);
    w.do({ type: "empireRelaunch", playerId: "a", workshopId: farm(w) });
    // Y(2) = 2 × 1.15 = 2.3 lots of 20.
    expect(stock(w, "wheat")).toBe(46);
  });

  it("relaunches every workshop at once", () => {
    const w = world();
    w.give("a", "wheat", 10);
    w.do({ type: "empireRelaunchAll", playerId: "a" });
    expect(ws(w, 0)?.job?.batches).toBe(12);
    expect(ws(w, 1)?.job?.batches).toBe(1);
  });

  it("takes only a recipe its building makes", () => {
    const w = world();
    w.do({ type: "empireRelaunch", playerId: "a", workshopId: farm(w) });
    const busy = w.try({
      type: "empireRelaunch",
      playerId: "a",
      workshopId: farm(w),
      recipe: "dig_clay",
    });
    expect(busy.ok ? "" : busy.error).toBe("unknown_recipe");
    w.give("a", "wheat", 10);
    w.do({ type: "empireRelaunch", playerId: "a", workshopId: mill(w) });
    const res = w.try({
      type: "empireRelaunch",
      playerId: "a",
      workshopId: mill(w),
      recipe: "mill_flour",
    });
    expect(res.ok).toBe(true);
  });
});
