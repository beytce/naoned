import { describe, expect, it } from "vitest";
import { type EmpireSettingsInput, cashAccount, empireHouseAt } from "../../src/index.js";
import type { EmpireHouse, WorldState } from "../../src/state.js";
import { testEmpire } from "../fixture.js";
import { World, makeContext } from "../helpers.js";

// The sea, the deposits and the expeditions gone (decision of the owner, 1 November 2026): what a
// house had engaged in them comes back once, nothing built is lost.
const empire: EmpireSettingsInput = {
  ...testEmpire,
  casa: testEmpire.casa.map((c) => ({ ...c, materials: {}, buildMinutes: 0, costDucats: 0 })),
  start: { capitalDucats: 1_000, workshops: [] },
};

const ducats = (n: number) => BigInt(n) * 100n;
const cash = (w: World, id: string) => w.state.accounts[cashAccount(id)] ?? 0n;

describe("a world of before, taken up once the sea is gone", () => {
  it("gives back the cargoes, the stakes, the bids, the ships and the sea's modules", () => {
    const w = new World(makeContext({ empire }));
    w.do({ type: "empireJoin", playerId: "a" });
    w.do({ type: "empireJoin", playerId: "b" });
    const before = { a: cash(w, "a"), b: cash(w, "b") };
    // A world of before, as its state was kept: a ship and its voyage, a stake, a bid, a team.
    const s = structuredClone(w.state) as WorldState;
    const empireState = s.empire;
    if (!empireState) throw new Error("no empire");
    const a = empireState.houses.a as EmpireHouse;
    a.vehicles = [{ id: "v9", type: "cocca", busyUntil: 0 }];
    a.builds = [
      {
        kind: "ship",
        level: 1,
        vehicleType: "galea",
        vehicleId: "v10",
        startedAt: 0,
        endsAt: 9e15,
      },
    ];
    a.arsenal = "0,0";
    a.modules = { portolan: 2, hold: 1 };
    a.teams = ["d1"];
    empireState.voyages = [
      {
        id: "y1",
        house: "a",
        vehicleId: "v9",
        good: "salt",
        qty: 7,
        from: "veneto",
        to: "lombardia",
        arrivesAt: 9e15,
        cost: 0n,
      },
    ];
    empireState.colleganze = [
      {
        id: "c1",
        traveller: "a",
        vehicleId: "v9",
        from: "veneto",
        to: "lombardia",
        good: "salt",
        qty: 7,
        target: ducats(50),
        stakes: [{ house: "b", amount: ducats(30) }],
        status: "open",
      },
    ];
    // The stake and the bid left b's purse for their escrow, as the journal had it.
    const moved: [string, bigint][] = [
      ["colleganza:c1", ducats(30)],
      ["muda:b", ducats(20)],
      [cashAccount("b"), -ducats(50)],
    ];
    for (const [acc, n] of moved) {
      s.accounts[acc] = (s.accounts[acc] ?? 0n) + n;
      w.totals.accounts.set(acc, (w.totals.accounts.get(acc) ?? 0n) + n);
    }
    w.state = s;
    // The first command after the change.
    w.do({ type: "empireRelaunchAll", playerId: "a" });
    const h = empireHouseAt(w.ctx, w.state, "a", w.now) as EmpireHouse;
    expect(h.vehicles ?? []).toEqual([]);
    expect(h.builds.some((b) => b.kind === "ship")).toBe(false);
    expect(h.modules).toEqual({ hold: 1 });
    expect(h.teams).toBeUndefined();
    expect(w.state.inventories.a?.salt?.available).toBe(7);
    expect(w.state.empire?.voyages).toBeUndefined();
    expect(w.state.empire?.colleganze).toBeUndefined();
    // a: the cocca (3 500), the galea's site (9 000), the Arsenal (3 000), the sails' research.
    expect(cash(w, "a") - before.a > ducats(3_500 + 9_000 + 3_000)).toBe(true);
    // b: its stake and its bid, back in its purse.
    expect(cash(w, "b")).toBe(before.b);
    expect(w.state.accounts["colleganza:c1"] ?? 0n).toBe(0n);
    expect(w.state.accounts["muda:b"] ?? 0n).toBe(0n);
  });
});
