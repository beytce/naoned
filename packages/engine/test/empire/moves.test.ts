import { describe, expect, it } from "vitest";
import { cashAccount, empireHouseAt, empireView } from "../../src/index.js";
import type { EmpireHouse, WorldState } from "../../src/state.js";
import { HOUR, World, makeContext } from "../helpers.js";
import { ordersEmpire as empire } from "./ordersFixture.js";

// The vehicles and the cities' orders (decision of the owner, 1 November 2026, after Hades'
// Star): docked at a counter, a vehicle is loaded by hand with the orders of the cities the
// counter serves, one place each, out of the counter's stock; sent hop by hop, the first leaving
// ten seconds later; at a city it brings that city's orders, paid, and stays there.
const SECOND = 1_000;

function world() {
  const w = new World(makeContext({ empire }));
  w.do({ type: "empireJoin", playerId: "a" });
  return w;
}
const house = (w: World) => empireHouseAt(w.ctx, w.state, "a", w.now) as EmpireHouse;
const view = (w: World) => empireView(w.ctx, w.state, "a", w.now);
const cart = (w: World) => house(w).vehicles?.[0];
const id = (w: World) => cart(w)?.id ?? "";
const cash = (w: World) => w.state.accounts[cashAccount("a")] ?? 0n;
const stock = (w: World, good: string) => w.state.inventories.a?.[good]?.available ?? 0;
const error = (res: { ok: boolean; error?: string }) => (res.ok ? "" : res.error);
const move = (w: World, to: string, vehicleId = id(w)) =>
  w.try({ type: "empireMove", playerId: "a", vehicleId, to });
const settle = (w: World) => w.do({ type: "empireSettle", playerId: "a" });
const orders = (w: World, code: string) =>
  view(w)?.orders.find((x) => x.city === code)?.orders ?? [];
const load = (w: World, city: string, orderId: string) =>
  w.try({ type: "empireLoadOrder", playerId: "a", vehicleId: id(w), city, orderId });
const unload = (w: World, orderId: string) =>
  w.try({ type: "empireUnloadOrder", playerId: "a", vehicleId: id(w), orderId });

describe("loading an order", () => {
  it("takes its lot out of the counter's stock, and the order out of its city", () => {
    const w = world();
    const o = orders(w, "padova")[0];
    if (!o) throw new Error("no order");
    w.give("a", o.good, o.qty + 5);
    expect(error(load(w, "padova", o.id))).toBe("");
    expect(stock(w, o.good)).toBe(5);
    expect(orders(w, "padova")).toHaveLength(0);
    expect(cart(w)?.loads?.map((x) => x.id)).toEqual([o.id]);
    expect(view(w)?.vehicles.mine[0]?.loads).toHaveLength(1);
    // Taken: no longer there to load.
    expect(error(load(w, "padova", o.id))).toBe("not_ordered");
  });

  it("is refused while the counter lacks its lot", () => {
    const w = world();
    const o = orders(w, "padova")[0];
    w.give("a", o?.good ?? "", (o?.qty ?? 1) - 1);
    expect(error(load(w, "padova", o?.id ?? ""))).toBe("insufficient_stock");
    expect(orders(w, "padova")).toHaveLength(1);
  });

  it("takes a place of the hold each, three on the cart", () => {
    const w = world();
    w.advance(48 * HOUR);
    w.give("a", "wheat", 1_000);
    w.give("a", "bread", 1_000);
    const all = [...orders(w, "venezia"), ...orders(w, "padova")];
    expect(all.length).toBeGreaterThan(3);
    for (const o of all.slice(0, 3)) expect(error(load(w, o.city, o.id))).toBe("");
    const fourth = all[3];
    expect(error(load(w, fourth?.city ?? "", fourth?.id ?? ""))).toBe("no_room");
    expect(view(w)?.vehicles.mine[0]?.capacity).toBe(3);
  });

  it("is only at a counter serving the city, the vehicle docked", () => {
    const w = world();
    const o = orders(w, "padova")[0];
    w.give("a", o?.good ?? "", 100);
    move(w, "city:padova");
    w.advance(HOUR);
    settle(w);
    expect(error(load(w, "padova", o?.id ?? ""))).toBe("unknown_target");
  });
});

describe("unloading an order", () => {
  it("puts its lot back into the stock, and the order back in its city", () => {
    const w = world();
    const o = orders(w, "padova")[0];
    w.give("a", o?.good ?? "", o?.qty ?? 0);
    load(w, "padova", o?.id ?? "");
    expect(error(unload(w, o?.id ?? ""))).toBe("");
    expect(stock(w, o?.good ?? "")).toBe(o?.qty);
    expect(orders(w, "padova").map((x) => x.id)).toEqual([o?.id]);
    expect(cart(w)?.loads).toBeUndefined();
    expect(error(unload(w, o?.id ?? ""))).toBe("not_ordered");
  });
});

describe("a hop", () => {
  it("leaves ten seconds after; at the city its orders are paid, and it stays", () => {
    const w = world();
    const o = orders(w, "padova")[0];
    const other = orders(w, "venezia")[0];
    if (!o || !other) throw new Error("no order");
    w.give("a", o.good, 100);
    w.give("a", other.good, 100);
    load(w, "padova", o.id);
    load(w, "venezia", other.id);
    const before = cash(w);
    expect(error(move(w, "city:padova"))).toBe("");
    const leg = cart(w)?.legs?.[0];
    expect(leg?.departAt).toBe(w.now + 10 * SECOND);
    // Padua stands some 42 units off: about five seconds at eight a second.
    expect(((leg?.arrivesAt ?? 0) - (leg?.departAt ?? 0)) / SECOND).toBeCloseTo(5.2, 0);
    w.advance((leg?.arrivesAt ?? 0) - w.now);
    settle(w);
    expect(cart(w)?.at).toBe("city:padova");
    expect(cart(w)?.legs).toBeUndefined();
    // Padua's order paid (its pay, less what the house owes on its income); Venice's stays aboard.
    expect(cash(w) - before).toBeGreaterThan((o.pay * 9n) / 10n);
    expect(cash(w) - before).toBeLessThanOrEqual(o.pay);
    expect(cart(w)?.loads?.map((x) => x.id)).toEqual([other.id]);
    // At a city, nothing is unloaded.
    expect(error(unload(w, other.id))).toBe("unknown_target");
  });

  it("leaves at once when asked, and a stop not begun is taken back", () => {
    const w = world();
    move(w, "city:padova");
    move(w, "home");
    expect(cart(w)?.legs).toHaveLength(2);
    w.do({ type: "empireCancelStop", playerId: "a", vehicleId: id(w) });
    expect(cart(w)?.legs).toHaveLength(1);
    w.do({ type: "empireDepartNow", playerId: "a", vehicleId: id(w) });
    expect(cart(w)?.legs?.[0]?.departAt).toBe(w.now);
    // Under way: the hop begun is not taken back, nor left again, nor loaded.
    w.advance(SECOND);
    expect(error(w.try({ type: "empireCancelStop", playerId: "a", vehicleId: id(w) }))).toBe(
      "building_busy",
    );
    expect(error(w.try({ type: "empireDepartNow", playerId: "a", vehicleId: id(w) }))).toBe(
      "building_busy",
    );
    const o = orders(w, "venezia")[0];
    w.give("a", o?.good ?? "", 100);
    expect(error(load(w, "venezia", o?.id ?? ""))).toBe("building_busy");
  });

  it("queues fifteen stops at most, each leaving when the one before arrives", () => {
    const w = world();
    for (let i = 0; i < 15; i++)
      expect(error(move(w, i % 2 === 0 ? "city:padova" : "home"))).toBe("");
    expect(error(move(w, "city:padova"))).toBe("invalid_quantity");
    const legs = cart(w)?.legs ?? [];
    for (let i = 1; i < legs.length; i++) expect(legs[i]?.departAt).toBe(legs[i - 1]?.arrivesAt);
    expect(cart(w)?.busyUntil).toBe(legs.at(-1)?.arrivesAt);
    w.advance(HOUR);
    settle(w);
    expect(cart(w)?.at).toBe("city:padova");
  });

  it("goes only to a place of the house's sectors, and not where it already is", () => {
    const w = world();
    expect(error(move(w, "city:milano"))).toBe("unknown_target");
    expect(error(move(w, "home"))).toBe("unknown_target");
    expect(error(move(w, "nowhere"))).toBe("unknown_target");
  });
});

describe("what was carried before", () => {
  it("goes back once into its counter: the goods in bulk, then the rounds", () => {
    const w = world();
    const o = orders(w, "venezia")[0];
    if (!o) throw new Error("no order");
    w.give("a", o.good, o.qty);
    // Its lot aboard in bulk, as before (taken out of the stock through the movements).
    load(w, "venezia", o.id);
    const state = structuredClone(w.state) as WorldState;
    const h = state.empire?.houses.a as EmpireHouse;
    const v = h.vehicles?.[0];
    if (!v) throw new Error("no cart");
    v.loads = undefined;
    v.cargo = { [o.good]: { qty: o.qty, from: "home" } };
    h.orders = { venezia: { next: 0, seq: 0, list: [], waves: [] } };
    w.state = state;
    settle(w);
    expect(stock(w, o.good)).toBe(o.qty);
    expect(cart(w)?.cargo).toBeUndefined();
    expect(orders(w, "venezia").length).toBeGreaterThan(0);
  });
});
