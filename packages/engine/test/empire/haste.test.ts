import { describe, expect, it } from "vitest";
import { type EmpireSettingsInput, empireHouseAt } from "../../src/index.js";
import type { EmpireHouse } from "../../src/state.js";
import { testEmpire } from "../fixture.js";
import { HOUR, World, makeContext } from "../helpers.js";

// The Favour's use (docs/plan-publication.md D2, CADRAGE-v3 § 5.4): a site hastened, its time left
// halved, three times a day at most, each dearer than the last.
const empire: EmpireSettingsInput = {
  ...testEmpire,
  casa: testEmpire.casa.map((c) => ({ ...c, materials: {}, buildMinutes: 600, costDucats: 0 })),
  start: { capitalDucats: 100_000, workshops: [] },
  haste: { favour: [10, 20, 40], cutBps: 5_000 },
};

function world(favour = 100) {
  const w = new World(makeContext({ empire }));
  w.do({ type: "empireJoin", playerId: "a", favour });
  return w;
}
const house = (w: World) => empireHouseAt(w.ctx, w.state, "a", w.now) as EmpireHouse;
const error = (res: { ok: boolean; error?: string }) => (res.ok ? "" : res.error);

describe("a site hastened with Favour", () => {
  it("halves the time left of the site ending soonest, for its price in Favour", () => {
    const w = world();
    w.do({ type: "empireBuildCasa", playerId: "a" });
    const ends = house(w).builds[0]?.endsAt ?? 0;
    w.advance(2 * HOUR);
    const left = ends - w.now;
    w.do({ type: "empireHaste", playerId: "a" });
    expect((house(w).builds[0]?.endsAt ?? 0) - w.now).toBe(Math.ceil(left / 2));
    expect(house(w).favour).toBe(90);
  });

  it("costs more each time, three times a day at most, and again the next day", () => {
    const w = world();
    w.do({ type: "empireBuildCasa", playerId: "a" });
    w.do({ type: "empireHaste", playerId: "a" });
    w.do({ type: "empireHaste", playerId: "a" });
    w.do({ type: "empireHaste", playerId: "a" });
    expect(house(w).favour).toBe(100 - 10 - 20 - 40);
    expect(error(w.try({ type: "empireHaste", playerId: "a" }))).toBe("rush_limit");
  });

  it("refuses without a site, or without the Favour", () => {
    const w = world(5);
    expect(error(w.try({ type: "empireHaste", playerId: "a" }))).toBe("no_work");
    w.do({ type: "empireBuildCasa", playerId: "a" });
    expect(error(w.try({ type: "empireHaste", playerId: "a" }))).toBe("insufficient_favour");
  });
});
