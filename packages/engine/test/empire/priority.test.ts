import { describe, expect, it } from "vitest";
import { type EmpireSettingsInput, empireHouseAt } from "../../src/index.js";
import { testEmpire } from "../fixture.js";
import { World, makeContext } from "../helpers.js";

// The inputs' priorities (docs/plan-publication.md lot 4, P0-07): two mills on the same wheat; the
// one set high is served first, after a first lot for each.
const empire: EmpireSettingsInput = {
  ...testEmpire,
  casa: testEmpire.casa.map((c) => ({ ...c, buildMinutes: 0, materials: {} })),
  start: {
    capitalDucats: 100_000,
    workshops: [
      { type: "mill", recipe: "mill_flour" },
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
const ws = (w: World, i: number) => empireHouseAt(w.ctx, w.state, "a", w.now)?.workshops[i];
const lots = (w: World, i: number) => ws(w, i)?.job?.batches ?? 0;
const error = (res: { ok: boolean; error?: string }) => (res.ok ? "" : res.error);

describe("a workshop's priority on the inputs", () => {
  it("serves the high one first, after a first lot for each", () => {
    const w = world();
    w.give("a", "wheat", 30);
    const second = ws(w, 1)?.id ?? "";
    w.do({ type: "empireSetPriority", playerId: "a", workshopId: second, priority: "high" });
    w.do({ type: "empireRelaunchAll", playerId: "a" });
    expect(lots(w, 1)).toBe(2);
    expect(lots(w, 0)).toBe(1);
  });

  it("serves in the plain order without one", () => {
    const w = world();
    w.give("a", "wheat", 30);
    w.do({ type: "empireRelaunchAll", playerId: "a" });
    expect(lots(w, 0)).toBe(2);
    expect(lots(w, 1)).toBe(1);
  });

  it("refuses a priority it does not know, and a workshop that is not the house's", () => {
    const w = world();
    const first = ws(w, 0)?.id ?? "";
    expect(
      error(
        w.try({
          type: "empireSetPriority",
          playerId: "a",
          workshopId: first,
          priority: "urgent" as "high",
        }),
      ),
    ).toBe("invalid_input");
    expect(
      error(w.try({ type: "empireSetPriority", playerId: "a", workshopId: "x", priority: "low" })),
    ).toBe("unknown_building");
  });
});
