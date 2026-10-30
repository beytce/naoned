import { describe, expect, it } from "vitest";
import {
  type EmpireSettingsInput,
  cashAccount,
  empireHouseAt,
  mudaAccount,
  mudaDepartureAfter,
  parseEmpireSettings,
} from "../../src/index.js";
import { testEmpire } from "../fixture.js";
import { HOUR, MIN, World, makeContext } from "../helpers.js";

// Three houses with a galea each: places for half of them (2), no reserve; Tuesdays at 18.
const empire: EmpireSettingsInput = {
  ...testEmpire,
  casa: testEmpire.casa.map((c) => ({ ...c, materials: {}, buildMinutes: 0, costDucats: 0 })),
  start: { capitalDucats: 1_000, workshops: [], vehicles: [] },
  regions: (testEmpire.regions ?? []).map((r) =>
    r.code === "lombardia" ? { ...r, casa: 1, demands: { ...r.demands, wheat: 400 } } : r,
  ),
  vehicles: {
    galea: {
      casa: 1,
      capacity: 100,
      costDucats: 0,
      regions: ["veneto", "lombardia"],
      speedBps: 0,
      build: { minutes: 60, materials: {} },
    },
  },
  muda: {
    vehicles: ["galea"],
    departuresPerWeek: 1,
    placesShareBps: 5_000,
    reserveDaysBps: 0,
    departures: [{ day: 1, hour: 18 }],
  },
};
const s = parseEmpireSettings(empire);
const ALL = ["a", "b", "c"] as const;

function world() {
  const w = new World(makeContext({ empire }));
  for (const p of ALL) {
    w.do({ type: "empireJoin", playerId: p });
    w.do({ type: "empireBuildShip", playerId: p, vehicleType: "galea" });
    w.give(p, "wheat", 50);
  }
  w.advance(HOUR);
  return w;
}
const house = (w: World, p: string) => {
  const h = empireHouseAt(w.ctx, w.state, p, w.now);
  if (!h) throw new Error("no house");
  return h;
};
const galea = (w: World, p: string) => house(w, p).vehicles?.[0]?.id ?? "";
const cash = (w: World, p: string) => w.state.accounts[cashAccount(p)] ?? 0n;
const error = (res: { ok: boolean; error?: string }) => (res.ok ? "" : res.error);
const bid = (w: World, p: string, amount: number) =>
  w.try({ type: "empireMudaBid", playerId: p, vehicleId: galea(w, p), amount: String(amount) });
const sail = (w: World, p: string) =>
  w.try({
    type: "empireVoyage",
    playerId: p,
    vehicleId: galea(w, p),
    from: "veneto",
    to: "lombardia",
    good: "wheat",
    qty: 10,
  });

describe("the Muda of the State", () => {
  it("lets a galley sail only with a place won at the incanto", () => {
    const w = world();
    expect(error(sail(w, "a"))).toBe("muda_only");
  });

  it("holds the bids in escrow, sells the places at Vickrey, gives back the rest", () => {
    const w = world();
    const before = Object.fromEntries(ALL.map((p) => [p, cash(w, p)]));
    bid(w, "a", 50_000);
    bid(w, "b", 30_000);
    bid(w, "c", 10_000);
    expect(w.state.accounts[mudaAccount("a")]).toBe(50_000n);
    // A new bid replaces the last.
    bid(w, "a", 40_000);
    expect(w.state.accounts[mudaAccount("a")]).toBe(40_000n);
    const departure = mudaDepartureAfter(w.now, s);
    w.now = departure + 30 * MIN;
    w.do({ type: "empireRelaunchAll", playerId: "c" });
    // Two places: a pays b's bid, b pays c's; c loses and has all back.
    expect((before.a ?? 0n) - cash(w, "a")).toBe(30_000n);
    expect((before.b ?? 0n) - cash(w, "b")).toBe(10_000n);
    expect(cash(w, "c")).toBe(before.c);
    expect(w.state.accounts[mudaAccount("a")] ?? 0n).toBe(0n);
    // The winners sail, at the departure's hour; the loser not.
    expect(error(sail(w, "a"))).toBe("");
    expect(w.state.empire?.voyages?.[0]?.arrivesAt).toBe(departure + 6 * HOUR);
    expect(error(sail(w, "c"))).toBe("muda_only");
    // A place is spent once.
    w.advance(13 * HOUR);
    expect(error(sail(w, "a"))).not.toBe("");
  });
});
