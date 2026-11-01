import { describe, expect, it } from "vitest";
import { cashAccount, empireHouseAt, empireView } from "../../src/index.js";
import type { EmpireHouse, WorldState } from "../../src/state.js";
import { HOUR, World, makeContext } from "../helpers.js";
import { ordersEmpire as empire } from "./ordersFixture.js";

// The vehicles' hops (decision of the owner, 1 November 2026, after Hades' Star): sent to a place
// one stop after another, the first leaving ten seconds later (at once, or taken back, until then);
// leaving a counter it loads what its cities' orders ask; at a city it brings and is paid.
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
const settle = (w: World) => w.do({ type: "empireRelaunchAll", playerId: "a" });
const order = (w: World, code: string) =>
  view(w)?.orders.find((x) => x.city === code)?.orders[0] ?? {
    good: "",
    qty: 0,
    filled: 0,
    unit: 0n,
  };

describe("a hop", () => {
  it("leaves ten seconds after, loaded at its counter, and is paid at the city", () => {
    const w = world();
    const o = order(w, "padova");
    w.give("a", o.good, o.qty + 5);
    const before = cash(w);
    expect(error(move(w, "city:padova"))).toBe("");
    // Loaded at once (still at its counter): what Padua asks, out of Venice's stock.
    expect(cart(w)?.cargo?.[o.good]?.qty).toBe(o.qty);
    expect(stock(w, o.good)).toBe(5);
    const leg = cart(w)?.legs?.[0];
    expect(leg?.departAt).toBe(w.now + 10 * SECOND);
    // Padua stands some 42 units off: about five seconds at eight a second.
    expect(((leg?.arrivesAt ?? 0) - (leg?.departAt ?? 0)) / SECOND).toBeCloseTo(5.2, 0);
    w.advance((leg?.arrivesAt ?? 0) - w.now);
    settle(w);
    expect(cart(w)?.at).toBe("city:padova");
    expect(cart(w)?.legs).toBeUndefined();
    expect(cart(w)?.cargo).toBeUndefined();
    // Its only order brought whole: the wave is closed.
    expect(view(w)?.orders.find((x) => x.city === "padova")?.waves).toBe(0);
    // Paid the unit, the way's premium on top (Padua is 1,75 sectors from Venice's counter).
    expect(cash(w) - before).toBeGreaterThan(o.unit * BigInt(o.qty) - 1n);
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
    // Under way: the hop begun is not taken back, nor left again.
    w.advance(SECOND);
    expect(error(w.try({ type: "empireCancelStop", playerId: "a", vehicleId: id(w) }))).toBe(
      "building_busy",
    );
    expect(error(w.try({ type: "empireDepartNow", playerId: "a", vehicleId: id(w) }))).toBe(
      "building_busy",
    );
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

describe("the cargo", () => {
  it("is loaded by hand only with what the cities order, and unloaded freely", () => {
    const w = world();
    const all = view(w)?.orders.flatMap((c) => c.orders) ?? [];
    const good = all[0]?.good ?? "";
    const asked = all.filter((o) => o.good === good).reduce((n, o) => n + o.qty - o.filled, 0);
    const other = w.ctx.theme.resources
      .map((r) => r.code)
      .find((g) => !all.some((o) => o.good === g));
    w.give("a", good, 100);
    if (other) w.give("a", other, 10);
    const load = (qty: number, g = good, type: "empireLoad" | "empireUnload" = "empireLoad") =>
      w.try({ type, playerId: "a", vehicleId: id(w), good: g, qty });
    // A good no city orders: refused (1 November).
    if (other) expect(error(load(1, other))).toBe("not_ordered");
    // No more than the orders ask, nor than the hold.
    expect(error(load(asked + 1))).toBe("invalid_quantity");
    const n = Math.min(asked, 30, 5);
    expect(error(load(n))).toBe("");
    expect(stock(w, good)).toBe(100 - n);
    expect(error(load(n + 1, good, "empireUnload"))).toBe("insufficient_stock");
    expect(error(load(n, good, "empireUnload"))).toBe("");
    expect(cart(w)?.cargo).toBeUndefined();
    expect(stock(w, good)).toBe(100);
  });

  it("stays aboard at a city that does not ask it, and is not loaded there", () => {
    const w = world();
    const of = (code: string) =>
      view(w)
        ?.orders.find((x) => x.city === code)
        ?.orders.map((o) => o.good) ?? [];
    const good = of("venezia").find((g) => !of("padova").includes(g)) ?? of("venezia")[0] ?? "";
    const asks = of("padova").includes(good);
    w.give("a", good, 10);
    w.do({ type: "empireLoad", playerId: "a", vehicleId: id(w), good, qty: 1 });
    move(w, "city:padova");
    w.advance(HOUR);
    settle(w);
    if (!asks) expect(cart(w)?.cargo?.[good]?.qty).toBe(1);
    expect(
      error(w.try({ type: "empireLoad", playerId: "a", vehicleId: id(w), good, qty: 1 })),
    ).toBe("unknown_target");
  });
});

describe("the rounds of before", () => {
  it("are settled once: the goods still on the road come back to their counter", () => {
    const w = world();
    const salt = view(w)?.orders[0]?.orders[0]?.good ?? "";
    w.give("a", salt, 10);
    // A round of before, its goods taken out of the stock (the ledger of stocks kept whole).
    w.do({ type: "empireLoad", playerId: "a", vehicleId: id(w), good: salt, qty: 10 });
    const state = structuredClone(w.state) as WorldState;
    const h = state.empire?.houses.a as EmpireHouse;
    const v = h.vehicles?.[0];
    if (!v) throw new Error("no cart");
    v.cargo = undefined;
    v.busyUntil = w.now + HOUR;
    h.tours = [
      {
        id: "r1",
        vehicleId: v.id,
        post: "home",
        period: 0,
        leftAt: w.now,
        stops: [{ city: "padova", order: 0, good: salt, qty: 10, at: w.now + HOUR }],
        backAt: w.now + HOUR,
      },
    ];
    h.filled = { period: 0, cities: {} };
    w.state = state;
    settle(w);
    expect(stock(w, salt)).toBe(10);
    expect(house(w).tours).toBeUndefined();
    expect(house(w).filled).toBeUndefined();
    expect(cart(w)?.busyUntil).toBeLessThanOrEqual(w.now);
  });
});
