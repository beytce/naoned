import { describe, expect, it } from "vitest";
import {
  type EmpireSettingsInput,
  cashAccount,
  insurancePremium,
  parseEmpireSettings,
} from "../../src/index.js";
import { testEmpire } from "../fixture.js";
import { HOUR, World, makeContext } from "../helpers.js";

// A burchio to Lombardy, whose risk is set here: certain, or none. An attack takes a quarter.
function settings(risk: number): EmpireSettingsInput {
  return {
    ...testEmpire,
    casa: testEmpire.casa.map((c) => ({ ...c, materials: {}, buildMinutes: 0, costDucats: 0 })),
    start: { capitalDucats: 10_000, workshops: [], vehicles: ["burchio"] },
    regions: (testEmpire.regions ?? []).map((r) =>
      r.code === "lombardia"
        ? { ...r, casa: 1, corsairRiskBps: risk, demands: { ...r.demands, wheat: 400 } }
        : r,
    ),
    vehicles: {
      burchio: {
        casa: 1,
        capacity: 100,
        costDucats: 0,
        regions: ["veneto", "lombardia"],
        speedBps: 0,
      },
    },
    corsairs: { lossShareBps: 2_500, escortHalving: 30, premiumBps: 12_000 },
  };
}
function world(risk: number) {
  const w = new World(makeContext({ empire: settings(risk) }));
  w.do({ type: "empireJoin", playerId: "a" });
  w.give("a", "wheat", 20);
  return w;
}
const vehicle = (w: World) => w.state.empire?.houses.a?.vehicles?.[0]?.id ?? "";
const sail = (w: World, insured = false) =>
  w.do({
    type: "empireVoyage",
    playerId: "a",
    vehicleId: vehicle(w),
    from: "veneto",
    to: "lombardia",
    good: "wheat",
    qty: 20,
    insured,
  });
const cash = (w: World) => w.state.accounts[cashAccount("a")] ?? 0n;

describe("the corsairs", () => {
  it("never attack where the region has no risk, and an insurance there costs nothing", () => {
    const w = world(0);
    const before = cash(w);
    sail(w, true);
    expect(cash(w)).toBe(before);
    expect(w.state.empire?.voyages?.[0]?.insured).toBeUndefined();
    w.advance(12 * HOUR);
    w.do({ type: "empireRelaunchAll", playerId: "a" });
    expect(w.state.empire?.voyages ?? []).toHaveLength(0);
  });

  it("take a quarter of the cargo, never the ship; the insurance pays the units back", () => {
    const plain = world(10_000);
    sail(plain);
    plain.advance(12 * HOUR);
    const res = plain.do({ type: "empireRelaunchAll", playerId: "a" });
    expect(res.effects.events.find((e) => e.type === "empire_corsairs")?.data).toMatchObject({
      lost: 5,
      insured: false,
    });
    expect(plain.state.empire?.houses.a?.vehicles).toHaveLength(1);

    const insured = world(10_000);
    const cost = 20n * 400n;
    const premium = insurancePremium(cost, "lombardia", parseEmpireSettings(settings(10_000)));
    const before = cash(insured);
    sail(insured, true);
    expect(before - cash(insured)).toBeGreaterThanOrEqual(premium);
    insured.advance(12 * HOUR);
    const paid = insured.do({ type: "empireRelaunchAll", playerId: "a" });
    expect(paid.effects.ledger.some((e) => e.reason === "empire_insurance")).toBe(true);
  });
});
