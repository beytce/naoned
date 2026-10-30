import { describe, expect, it } from "vitest";
import {
  type EmpireSettingsInput,
  cashAccount,
  empireHouseAt,
  empireView,
  levelCost,
  parseEmpireSettings,
} from "../../src/index.js";
import { testEmpire } from "../fixture.js";
import { HOUR, MIN, World, makeContext } from "../helpers.js";

// The fixture's Lombardy: Casa 4, a charter of 50 Favour, 6 hours from Venice, 3 workshop places,
// iron made at 900, salt asked at 700, 30 units of private book.
const empire: EmpireSettingsInput = {
  ...testEmpire,
  casa: testEmpire.casa.map((c) => ({ ...c, materials: {}, buildMinutes: 0, costDucats: 0 })),
  start: { capitalDucats: 100_000, workshops: [] },
  counters: { maxLevel: 10, bookStepBps: 5_000, costTimes: 4 },
};
const s = parseEmpireSettings(empire);

function world(casa = 4, favour = 50) {
  const w = new World(makeContext({ empire }));
  w.do({ type: "empireJoin", playerId: "a", favour });
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

describe("a region's charter and counter", () => {
  it("asks the region's Casa and the charter's Favour", () => {
    expect(error(world(3).try({ type: "empireCharter", playerId: "a", region: "lombardia" }))).toBe(
      "requirement_unmet",
    );
    expect(
      error(world(4, 49).try({ type: "empireCharter", playerId: "a", region: "lombardia" })),
    ).toBe("insufficient_favour");
    expect(error(world().try({ type: "empireCharter", playerId: "a", region: "veneto" }))).toBe(
      "unknown_region",
    );
  });

  it("takes the Favour and the ducats, and builds the counter for the way there", () => {
    const w = world();
    const before = cash(w);
    w.do({ type: "empireCharter", playerId: "a", region: "lombardia" });
    expect(house(w).favour).toBe(0);
    expect(cash(w)).toBe(before - levelCost(4, s) * 4n);
    // The opening voyage: six hours from Venice, and an hour to build.
    expect(house(w).builds[0]?.endsAt).toBe(w.now + 7 * HOUR);
    expect(house(w).counters?.lombardia).toBeUndefined();
    w.advance(7 * HOUR);
    expect(house(w).counters?.lombardia).toBe(1);
    expect(error(w.try({ type: "empireCharter", playerId: "a", region: "lombardia" }))).toBe(
      "built",
    );
  });

  it("raises its counter, up to its last level", () => {
    const w = world();
    w.do({ type: "empireCharter", playerId: "a", region: "lombardia" });
    w.advance(7 * HOUR);
    const before = cash(w);
    w.do({ type: "empireUpgradeCounter", playerId: "a", region: "lombardia" });
    expect(cash(w)).toBe(before - levelCost(2, s) * 4n);
    w.advance(30 * MIN);
    expect(house(w).counters?.lombardia).toBe(2);
    expect(error(w.try({ type: "empireUpgradeCounter", playerId: "a", region: "friuli" }))).toBe(
      "unknown_region",
    );
  });
});

describe("the workshops of a region", () => {
  function lombardy() {
    const w = world();
    w.do({ type: "empireCharter", playerId: "a", region: "lombardia" });
    w.advance(7 * HOUR);
    return w;
  }
  const build = (w: World, workshopType: string, recipe: string, region?: string) =>
    w.try({
      type: "empireBuildWorkshop",
      playerId: "a",
      workshopType,
      recipe,
      ...(region ? { region } : {}),
    });

  it("are built only where the house has a counter", () => {
    expect(error(build(world(), "mill", "mill_flour", "lombardia"))).toBe("unknown_region");
    const w = lombardy();
    expect(error(build(w, "mill", "mill_flour", "lombardia"))).toBe("");
    w.advance(HOUR);
    expect(house(w).workshops.at(-1)?.region).toBe("lombardia");
  });

  it("make there only the raw goods the region makes", () => {
    expect(error(build(lombardy(), "farm", "grow_wheat", "lombardia"))).toBe("unknown_recipe");
  });

  it("fill the counter's places, not the Casa's", () => {
    const w = lombardy();
    for (let i = 0; i < 3; i++) {
      expect(error(build(w, "mill", "mill_flour", "lombardia"))).toBe("");
      w.advance(HOUR);
    }
    expect(error(build(w, "mill", "mill_flour", "lombardia"))).toBe("no_room");
    expect(error(build(w, "mill", "mill_flour"))).toBe("");
  });
});

describe("the regions in the view", () => {
  it("say what each region asks: a charter, then the counter's next level", () => {
    const w = world();
    const at = () =>
      empireView(w.ctx, w.state, "a", w.now)?.regions.find((r) => r.code === "lombardia");
    expect(at()?.next).toMatchObject({ charter: true, level: 1, cost: levelCost(4, s) * 4n });
    w.do({ type: "empireCharter", playerId: "a", region: "lombardia" });
    expect(at()?.next).toBeNull();
    expect(at()?.buildingUntil).toBe(w.now + 7 * HOUR);
    w.advance(7 * HOUR);
    expect(at()).toMatchObject({ counter: 1, next: { charter: false, level: 2 } });
  });
});
