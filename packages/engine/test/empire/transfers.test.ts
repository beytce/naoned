import { describe, expect, it } from "vitest";
import { type EmpireSettingsInput, empireHouseAt, empireView } from "../../src/index.js";
import type { EmpireHouse } from "../../src/state.js";
import { testEmpire } from "../fixture.js";
import { HOUR, World, makeContext, openLombardy } from "../helpers.js";

// The deliveries between counters (the map that grows, 31 October 2026): a land vehicle of the
// counter it stands at carries goods to another, in a time that grows with the distance, and
// stays there; a counter's carts deliver only the cities of that counter.
const empire: EmpireSettingsInput = {
  ...testEmpire,
  casa: testEmpire.casa.map((c) => ({ ...c, materials: {}, buildMinutes: 0, costDucats: 0 })),
  start: { capitalDucats: 1_000_000, workshops: [], vehicles: ["cart"] },
  map: { ...testEmpire.map, transferUnitsPerHour: 25 },
  vehicles: {
    cart: { casa: 1, capacity: 30, costDucats: 100, regions: ["veneto"], speedBps: 0 },
    cocca: {
      casa: 1,
      capacity: 100,
      costDucats: 1_000,
      regions: ["veneto", "lombardia"],
      speedBps: 0,
      build: { minutes: 60, materials: {} },
    },
  },
};

function world() {
  const w = new World(makeContext({ empire }));
  w.do({ type: "empireJoin", playerId: "a" });
  for (let i = 1; i < 4; i++) w.do({ type: "empireBuildCasa", playerId: "a" });
  openLombardy(w);
  return w;
}
const house = (w: World) => empireHouseAt(w.ctx, w.state, "a", w.now) as EmpireHouse;
const view = (w: World) => empireView(w.ctx, w.state, "a", w.now);
const cart = (w: World) => house(w).vehicles?.[0]?.id ?? "";
const lombardy = (w: World) => house(w).posts?.find((p) => p.region === "lombardia")?.id ?? "";
const at = (w: World, post: string, good: string) =>
  view(w)?.stores.find((x) => x.post === post)?.goods[good] ?? 0;
const error = (res: { ok: boolean; error?: string }) => (res.ok ? "" : res.error);
const send = (w: World, qty: number, vehicleId = cart(w), to = lombardy(w), good = "salt") =>
  w.try({ type: "empireTransfer", playerId: "a", vehicleId, to, good, qty });

describe("a delivery between two counters", () => {
  it("carries goods by a vehicle of the counter they leave, and arrives after the road", () => {
    const w = world();
    w.give("a", "salt", 50);
    expect(view(w)?.vehicles.mine[0]?.at).toBe("home");
    expect(error(send(w, 20))).toBe("");
    // On the road: out of Venice, not yet in Lombardy; the cart is busy, bound for Lombardy.
    expect(at(w, "home", "salt")).toBe(30);
    expect(at(w, lombardy(w), "salt")).toBe(0);
    expect(view(w)?.vehicles.mine[0]).toMatchObject({ at: lombardy(w) });
    expect(view(w)?.transfers).toHaveLength(1);
    expect(error(send(w, 5))).toBe("building_busy");
    // Lombardy's counter (« 3,0 ») stands about 125 units from Venice: five hours at 25 an hour.
    w.advance(5 * HOUR + 1);
    w.do({ type: "empireRelaunchAll", playerId: "a" });
    expect(at(w, lombardy(w), "salt")).toBe(20);
    expect(view(w)?.transfers).toHaveLength(0);
  });

  it("carries no more than the vehicle holds, nor what the counter lacks", () => {
    const w = world();
    w.give("a", "salt", 50);
    expect(error(send(w, 31))).toBe("invalid_quantity");
    expect(error(send(w, 5, cart(w), lombardy(w), "iron"))).toBe("insufficient_stock");
    expect(error(send(w, 5, cart(w), "nowhere"))).toBe("unknown_target");
    expect(error(send(w, 5, cart(w), "home"))).toBe("unknown_target");
  });

  it("leaves its counter's carts to serve its cities: none left in Venice once the cart is gone", () => {
    const w = world();
    w.give("a", "salt", 40);
    w.give("a", "bread", 10);
    expect(error(w.try({ type: "empireDeliver", playerId: "a", good: "bread", qty: 2 }))).toBe("");
    w.do({
      type: "empireTransfer",
      playerId: "a",
      vehicleId: cart(w),
      to: lombardy(w),
      good: "salt",
      qty: 10,
    });
    expect(error(w.try({ type: "empireDeliver", playerId: "a", good: "bread", qty: 2 }))).toBe(
      "no_liquidity",
    );
  });
});
