import { describe, expect, it } from "vitest";
import { type EmpireSettingsInput, cashAccount, empireHouseAt } from "../../src/index.js";
import { testEmpire } from "../fixture.js";
import { DAY, HOUR, World, makeContext } from "../helpers.js";

// Wheat at 400 in Venetia; the master makes half the lots better, a quarter of those exquisite.
const empire: EmpireSettingsInput = {
  ...testEmpire,
  casa: testEmpire.casa.map((c) => ({ ...c, materials: {}, buildMinutes: 0, costDucats: 0 })),
  start: { capitalDucats: 0, workshops: [{ type: "farm", recipe: "grow_wheat" }] },
  modules: [
    ...(testEmpire.modules ?? []),
    { code: "master", kind: "workshop", effect: "quality", firstLevelBps: 5_000, perLevelBps: 0 },
  ],
  research: { ...testEmpire.research, baseCostDucats: 0, available: ["master"] },
  qualities: { fineBps: 15_000, exquisiteBps: 30_000, exquisiteShareBps: 2_500, courtPerCasa: 5 },
};

function world() {
  const w = new World(makeContext({ empire }));
  w.do({ type: "empireJoin", playerId: "a" });
  for (let i = 1; i < 3; i++) w.do({ type: "empireBuildCasa", playerId: "a" });
  w.do({ type: "empireResearch", playerId: "a", module: "master" });
  w.advance(HOUR);
  const id = empireHouseAt(w.ctx, w.state, "a", w.now)?.workshops[0]?.id ?? "";
  w.do({ type: "empireFit", playerId: "a", workshopId: id, slot: 0, module: "master" });
  w.do({ type: "empireRelaunch", playerId: "a", workshopId: id });
  w.advance(HOUR);
  w.do({ type: "empireRelaunch", playerId: "a", workshopId: id });
  return w;
}
const stock = (w: World, good: string) => w.state.inventories.a?.[good]?.available ?? 0;
const cash = (w: World) => w.state.accounts[cashAccount("a")] ?? 0n;
const error = (res: { ok: boolean; error?: string }) => (res.ok ? "" : res.error);

describe("the qualities", () => {
  it("make a share of the lots fine or exquisite, by the workshop's quality", () => {
    const w = world();
    expect(stock(w, "wheat")).toBe(10);
    expect(stock(w, "wheat:fine")).toBe(8);
    expect(stock(w, "wheat:exquisite")).toBe(2);
  });

  it("sell only to the court of Venice, dearer, within its book of the day", () => {
    const w = world();
    const before = cash(w);
    w.do({ type: "empireCourt", playerId: "a", good: "wheat:exquisite", qty: 2 });
    // Twice 400 × 3, less the wages.
    expect(cash(w) - before > 2_000n && cash(w) - before <= 2_400n).toBe(true);
    expect(error(w.try({ type: "empireSell", playerId: "a", good: "wheat:fine", qty: 1 }))).toBe(
      "unknown_resource",
    );
    // The court takes 5 a level of the Casa a day: 15, of which 2 already.
    w.give("a", "wheat:fine", 20);
    w.do({ type: "empireCourt", playerId: "a", good: "wheat:fine", qty: 28 });
    expect(stock(w, "wheat:fine")).toBe(28 - 13);
    expect(error(w.try({ type: "empireCourt", playerId: "a", good: "wheat:fine", qty: 1 }))).toBe(
      "no_liquidity",
    );
    w.advance(DAY);
    expect(error(w.try({ type: "empireCourt", playerId: "a", good: "wheat:fine", qty: 1 }))).toBe(
      "",
    );
    expect(error(w.try({ type: "empireCourt", playerId: "a", good: "wheat", qty: 1 }))).toBe(
      "unknown_resource",
    );
  });
});
