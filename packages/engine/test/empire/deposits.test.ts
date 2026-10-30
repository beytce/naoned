import { describe, expect, it } from "vitest";
import { type EmpireSettingsInput, type WorldState, empireHouseAt } from "../../src/index.js";
import { testEmpire } from "../fixture.js";
import { DAY, HOUR, World, makeContext } from "../helpers.js";

// The fixture's Venetia makes wheat; deposits of 200 to 1 000 units, a team takes 10 an hour.
const empire: EmpireSettingsInput = {
  ...testEmpire,
  casa: testEmpire.casa.map((c) => ({ ...c, materials: {}, buildMinutes: 0, costDucats: 0 })),
  start: { capitalDucats: 100_000, workshops: [], vehicles: [] },
  deposits: {
    spawnBpsPerRegionDay: 10_000,
    minStock: 200,
    maxStock: 1_000,
    teamPerHour: 10,
    housesPerDeposit: 1,
    teamsFromCasa: 5,
    casaPerTeam: 4,
  },
  research: { ...testEmpire.research, available: ["yield"] },
};

function world(casa = 5, houses = ["a"]) {
  const w = new World(makeContext({ empire }));
  for (const id of houses) {
    w.do({ type: "empireJoin", playerId: id });
    for (let i = 1; i < casa; i++) w.do({ type: "empireBuildCasa", playerId: id });
  }
  return w;
}

/** A deposit put in Venetia by the test, through the state (as a fixture). */
function withDeposit(w: World, stock: number): string {
  const empireState = w.state.empire;
  if (!empireState) throw new Error("no empire");
  const deposit = { id: "dx", region: "veneto", good: "wheat", stock, at: w.now, teams: [] };
  w.state = {
    ...w.state,
    empire: { ...empireState, deposits: [...(empireState.deposits ?? []), deposit] },
  } as WorldState;
  return "dx";
}

const stock = (w: World, id: string, good = "wheat") =>
  w.state.inventories[id]?.[good]?.available ?? 0;
const error = (res: { ok: boolean; error?: string }) => (res.ok ? "" : res.error);
const send = (w: World, depositId: string, id = "a") =>
  w.try({ type: "empireTeam", playerId: id, depositId });

describe("the deposits", () => {
  it("appear each day in the regions where houses are, the same for the same world", () => {
    const one = world();
    const two = world();
    for (const w of [one, two]) {
      w.advance(3 * DAY);
      w.do({ type: "empireRelaunchAll", playerId: "a" });
    }
    const found = one.state.empire?.deposits ?? [];
    expect(found.length).toBeGreaterThanOrEqual(3);
    expect(found.every((d) => d.region === "veneto" && d.good === "wheat")).toBe(true);
    expect(found.every((d) => d.stock >= 200 && d.stock <= 1_000)).toBe(true);
    expect(two.state.empire?.deposits).toEqual(found);
  });
});

describe("the teams", () => {
  it("open at the Casa 5, one team, more with the Casa", () => {
    const early = world(4);
    expect(error(send(early, withDeposit(early, 500)))).toBe("requirement_unmet");
    const w = world();
    const id = withDeposit(w, 500);
    expect(error(send(w, id))).toBe("");
    expect(error(send(w, id))).toBe("no_build_slot");
  });

  it("take their rate an hour, into the store", () => {
    const w = world();
    send(w, withDeposit(w, 500));
    w.advance(3 * HOUR);
    w.do({ type: "empireRelaunchAll", playerId: "a" });
    expect(stock(w, "a")).toBe(30);
  });

  it("share a deposit running short, in proportion to their rates, and leave it spent", () => {
    const w = world(5, ["a", "b"]);
    const id = withDeposit(w, 50);
    send(w, id, "a");
    send(w, id, "b");
    w.advance(10 * HOUR);
    w.do({ type: "empireRelaunchAll", playerId: "a" });
    expect(stock(w, "a") + stock(w, "b")).toBe(50);
    expect(stock(w, "a")).toBe(25);
    expect(w.state.empire?.deposits?.some((d) => d.id === id)).toBe(false);
    // The team is free again.
    expect(empireHouseAt(w.ctx, w.state, "a", w.now)?.teams ?? []).toHaveLength(0);
  });

  it("take more with the yield module", () => {
    const w = world();
    w.do({ type: "empireResearch", playerId: "a", module: "yield" });
    w.advance(HOUR);
    send(w, withDeposit(w, 500));
    w.advance(HOUR);
    w.do({ type: "empireRelaunchAll", playerId: "a" });
    // 10 an hour and 15 %: 11.
    expect(stock(w, "a")).toBe(11);
  });
});
