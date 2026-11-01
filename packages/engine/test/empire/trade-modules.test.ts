import { describe, expect, it } from "vitest";
import { cashAccount, empireHouseAt, empireView } from "../../src/index.js";
import type { EmpireHouse, WorldState } from "../../src/state.js";
import { HOUR, World, makeContext } from "../helpers.js";
import { ordersEmpire as empire } from "./ordersFixture.js";

// The new trade modules (decision of the owner, 1 November 2026, after Hades' Star): the Livre de
// route loads at a counter on its way what its stops to come ask, a premium on those units; the
// Fouet makes a hop quicker when its cargo goes there; the Estafette leaves at once, its first hop
// shorter. On the fixture, a counter « p1 » put between Venice (0, 0) and Padua (≈ 21, 36).
function world(modules: Record<string, number>, atP1 = 0) {
  const w = new World(makeContext({ empire }));
  w.do({ type: "empireJoin", playerId: "a" });
  const good = order(w).good;
  if (atP1 > 0) w.give("a", good, atP1);
  const state = structuredClone(w.state) as WorldState;
  const h = state.empire?.houses.a as EmpireHouse;
  h.modules = modules;
  for (const v of h.vehicles ?? []) v.fitted = undefined;
  h.posts = [{ id: "p1", cell: "0,0", region: "veneto", x: 0, y: 20, level: 1 }];
  if (atP1 > 0) h.stores = { p1: { [good]: atP1 } };
  w.state = state;
  w.do({ type: "empireRelaunchAll", playerId: "a" });
  return w;
}
const house = (w: World) => empireHouseAt(w.ctx, w.state, "a", w.now) as EmpireHouse;
const cart = (w: World) => house(w).vehicles?.[0];
const id = (w: World) => cart(w)?.id ?? "";
const cash = (w: World) => w.state.accounts[cashAccount("a")] ?? 0n;
const order = (w: World) =>
  empireView(w.ctx, w.state, "a", w.now)?.orders.find((x) => x.city === "padova")?.orders[0] ?? {
    good: "",
    qty: 0,
    filled: 0,
    unit: 0n,
  };
const move = (w: World, to: string) =>
  w.do({ type: "empireMove", playerId: "a", vehicleId: id(w), to });
const leg = (w: World, i = 0) => cart(w)?.legs?.[i];

describe("the Livre de route", () => {
  it("loads at a counter on its way what its stops ask, with its premium", () => {
    const run = (modules: Record<string, number>) => {
      const w = world(modules, 20);
      const o = order(w);
      move(w, "p1");
      move(w, "city:padova");
      // Nothing for Padua in Venice's own stock: it leaves empty.
      expect(cart(w)?.cargo).toBeUndefined();
      const before = cash(w);
      w.advance(HOUR);
      w.do({ type: "empireRelaunchAll", playerId: "a" });
      return { w, o, paid: cash(w) - before };
    };
    const without = run({});
    expect(without.paid).toBe(0n);
    const { w, o, paid } = run({ ledger: 1 });
    expect(house(w).stores?.p1?.[o.good]).toBe(20 - o.qty);
    expect(cart(w)?.at).toBe("city:padova");
    // Paid the unit, the way's premium from p1 and the Livre's 5 % on top.
    expect(paid).toBeGreaterThan((o.unit * BigInt(o.qty) * 105n) / 100n - 1n);
  });
});

describe("the Fouet du charretier", () => {
  it("makes a hop quicker when its cargo goes to that stop", () => {
    const span = (modules: Record<string, number>) => {
      const w = world(modules);
      w.give("a", order(w).good, 50);
      move(w, "city:padova");
      return (leg(w)?.arrivesAt ?? 0) - (leg(w)?.departAt ?? 0);
    };
    const plain = span({});
    expect(span({ whip: 1 })).toBe(Math.max(1_000, Math.round((plain * 10_000) / 11_000)));
  });
});

describe("the Estafette", () => {
  it("leaves at once, its first hop shorter", () => {
    const w = world({ courier: 1 });
    const plainWorld = world({});
    move(plainWorld, "city:padova");
    const plain = (leg(plainWorld)?.arrivesAt ?? 0) - (leg(plainWorld)?.departAt ?? 0);
    move(w, "city:padova");
    expect(leg(w)?.departAt).toBe(w.now);
    expect((leg(w)?.arrivesAt ?? 0) - (leg(w)?.departAt ?? 0)).toBe(Math.round(plain * 0.9));
  });
});
