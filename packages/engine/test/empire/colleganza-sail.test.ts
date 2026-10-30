import { describe, expect, it } from "vitest";
import {
  type EmpireSettingsInput,
  cashAccount,
  colleganzaAccount,
  empireHouseAt,
} from "../../src/index.js";
import { testEmpire } from "../fixture.js";
import { HOUR, World, makeContext } from "../helpers.js";

// A burchio of « a » carries Venetia's wheat (400) to Lombardy, which pays `price` for it; « b »
// and « c » invest. The traveller's share: a quarter of the profit.
function world(price: number) {
  const empire: EmpireSettingsInput = {
    ...testEmpire,
    casa: testEmpire.casa.map((c) => ({ ...c, materials: {}, buildMinutes: 0, costDucats: 0 })),
    start: { capitalDucats: 1_000, workshops: [], vehicles: ["burchio"] },
    regions: (testEmpire.regions ?? []).map((r) =>
      r.code === "lombardia" ? { ...r, casa: 1, demands: { wheat: price }, produces: {} } : r,
    ),
    markets: {
      depthBase: 1_000,
      depthPerHouse: 0,
      boardPerHouse: 0,
      smallShareBps: 0,
      smallCasa: 20,
      orderPremiumBps: 0,
      taxBps: 0,
    },
    vehicles: {
      burchio: {
        casa: 1,
        capacity: 100,
        costDucats: 0,
        regions: ["veneto", "lombardia"],
        speedBps: 0,
      },
    },
    colleganza: { travellerShareBps: 2_500 },
  };
  const w = new World(makeContext({ empire }));
  for (const p of ["a", "b", "c"]) w.do({ type: "empireJoin", playerId: p });
  return w;
}
const cash = (w: World, p: string) => w.state.accounts[cashAccount(p)] ?? 0n;
const error = (res: { ok: boolean; error?: string }) => (res.ok ? "" : res.error);
const burchio = (w: World) => w.state.empire?.houses.a?.vehicles?.[0]?.id ?? "";
const open = (w: World) =>
  w.do({
    type: "empireColleganzaOpen",
    playerId: "a",
    vehicleId: burchio(w),
    from: "veneto",
    to: "lombardia",
    good: "wheat",
    qty: 20,
    target: "10000",
  });
const id = (w: World) => w.state.empire?.colleganze?.[0]?.id ?? "";
const stake = (w: World, p: string, amount: number) =>
  w.try({ type: "empireColleganzaStake", playerId: p, id: id(w), amount: String(amount) });

describe("the colleganza at sea", () => {
  it("holds the stakes in escrow, never the traveller's own, never past the capital sought", () => {
    const w = world(1_000);
    open(w);
    expect(error(stake(w, "a", 1_000))).toBe("own_colleganza");
    expect(error(stake(w, "b", 6_000))).toBe("");
    expect(error(stake(w, "c", 6_000))).toBe("over_limit");
    expect(error(stake(w, "c", 4_000))).toBe("");
    expect(w.state.accounts[colleganzaAccount(id(w))]).toBe(10_000n);
    // A stake taken back before the departure.
    const before = cash(w, "c");
    w.do({ type: "empireColleganzaWithdraw", playerId: "c", id: id(w) });
    expect(cash(w, "c") - before).toBe(4_000n);
  });

  it("buys the cargo with the stakes, gives back the rest, and shares the profit at the return", () => {
    const w = world(1_000);
    open(w);
    stake(w, "b", 6_000);
    stake(w, "c", 4_000);
    const [b0, c0] = [cash(w, "b"), cash(w, "c")];
    w.do({ type: "empireColleganzaSail", playerId: "a", id: id(w) });
    const c = w.state.empire?.colleganze?.[0];
    expect(c?.status).toBe("sailing");
    expect(w.state.accounts[colleganzaAccount(c?.id ?? "")] ?? 0n).toBe(0n);
    // 20 wheat bought at 400 used 8 000 of the 10 000: 2 000 back, in proportion.
    expect(c?.capital).toBe(8_000n);
    expect(cash(w, "b") - b0).toBe(1_200n);
    expect(cash(w, "c") - c0).toBe(800n);
    w.advance(12 * HOUR);
    w.do({ type: "empireRelaunchAll", playerId: "a" });
    // Sold 20 000 (less the wages): the investors have their 8 000 back and three quarters of
    // the profit; the record grows.
    expect(cash(w, "b") - b0).toBeGreaterThan(6_000n);
    expect(cash(w, "c") - c0).toBeGreaterThan(4_000n);
    expect(w.state.empire?.colleganze ?? []).toHaveLength(0);
    expect(empireHouseAt(w.ctx, w.state, "a", w.now)?.colleganzaRecord?.voyages).toBe(1);
  });

  it("shares a loss by the stakes, the traveller earning nothing", () => {
    const w = world(200);
    open(w);
    stake(w, "b", 10_000);
    const b0 = cash(w, "b");
    w.do({ type: "empireColleganzaSail", playerId: "a", id: id(w) });
    w.advance(12 * HOUR);
    w.do({ type: "empireRelaunchAll", playerId: "a" });
    const back = cash(w, "b") - b0;
    // 2 000 given back at the departure, then less than the 8 000 used.
    expect(back).toBeGreaterThan(2_000n);
    expect(back).toBeLessThan(10_000n);
  });
});
