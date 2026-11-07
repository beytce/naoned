import { describe, expect, it } from "vitest";
import {
  type EmpireHouse,
  type EmpireSettingsInput,
  type EmpireWorkshop,
  cashAccount,
  empireHouseAt,
  empireView,
  interiorInputsBps,
  parseEmpireSettings,
} from "../../src/index.js";
import { testInterior } from "../fixture.js";
import { HOUR, World, makeContext } from "../helpers.js";
import { ordersEmpire } from "./ordersFixture.js";

// What a well-tended inside pays where the cities' demand bounds the trade (docs/plan-ateliers.md
// lot A8, decision of the owner of 7 November 2026: « A + B »):
// A. fewer inputs for the same lot — its care, its machines mended, its skilled hands;
// B. its better pieces fill the cities' orders in place of plain ones, and are paid more.
// Neither plays in a world without the insides.
const interior = {
  ...testInterior,
  waste: { careSaveBps: 1_500, upkeepSaveBps: 1_000, skillSaveBps: 100, maxSaveBps: 3_000 },
  orderQuality: { fineBps: 12_500, exquisiteBps: 16_000 },
  buildings: {
    farm: testInterior.buildings.test_works as never,
    bakery: testInterior.buildings.test_works as never,
  },
};
const withInterior: EmpireSettingsInput = { ...ordersEmpire, interior };
const s = parseEmpireSettings(withInterior);

function world(empire: EmpireSettingsInput = withInterior) {
  const w = new World(makeContext({ empire }));
  w.do({ type: "empireJoin", playerId: "a" });
  return w;
}
const house = (w: World) => empireHouseAt(w.ctx, w.state, "a", w.now) as EmpireHouse;
const cash = (w: World) => w.state.accounts[cashAccount("a")] ?? 0n;
const stock = (w: World, good: string) => w.state.inventories.a?.[good]?.available ?? 0;
const orders = (w: World, code: string) =>
  empireView(w.ctx, w.state, "a", w.now)?.orders.find((x) => x.city === code)?.orders ?? [];
const settle = (w: World) => w.do({ type: "empireSettle", playerId: "a" });

/** Delivers Padua's first wheat order from what `give` puts in stock; the cash it brought. */
function delivered(w: World, give: Record<string, number>): { gained: bigint; pay: bigint } {
  const o = orders(w, "padova").find((x) => x.good === "wheat");
  if (!o) throw new Error("no wheat order");
  for (const [good, qty] of Object.entries(give)) w.give("a", good, qty);
  const before = cash(w);
  w.do({ type: "empireDeliverCity", playerId: "a", city: "padova", orderIds: [o.id] });
  w.advance(2 * HOUR);
  settle(w);
  return { gained: cash(w) - before, pay: BigInt(o.pay) };
}

describe("B. the better pieces fill the orders, and are paid more", () => {
  it("an order filled with fine wheat pays a quarter more, the plain wheat kept", () => {
    const plain = world();
    const qty = orders(plain, "padova").find((x) => x.good === "wheat")?.qty ?? 0;
    const a = delivered(plain, { wheat: qty });
    const fine = world();
    const b = delivered(fine, { "wheat:fine": qty, wheat: qty });
    expect(b.gained).toBe((a.gained * 12_500n) / 10_000n);
    expect(stock(fine, "wheat")).toBe(qty);
    expect(stock(fine, "wheat:fine")).toBe(0);
  });

  it("the exquisite first, then the fine, then the plain: paid by their share", () => {
    const plain = world();
    const qty = orders(plain, "padova").find((x) => x.good === "wheat")?.qty ?? 0;
    const a = delivered(plain, { wheat: qty });
    const w = world();
    const half = Math.floor(qty / 2);
    const r = delivered(w, { "wheat:exquisite": half, wheat: qty });
    // half × 1.6 + (qty − half) × 1.0, over qty.
    expect(r.gained).toBe(
      (a.gained * BigInt(half * 16_000 + (qty - half) * 10_000)) / BigInt(qty * 10_000),
    );
  });

  it("better pieces alone cover an order", () => {
    const plain = world();
    const qty = orders(plain, "padova").find((x) => x.good === "wheat")?.qty ?? 0;
    const a = delivered(plain, { wheat: qty });
    const r = delivered(world(), { "wheat:fine": qty });
    expect(r.gained).toBe((a.gained * 12_500n) / 10_000n);
  });

  it("an order unloaded gives back the very pieces it took", () => {
    const w = world();
    const o = orders(w, "padova").find((x) => x.good === "wheat");
    const cart = house(w).vehicles?.[0];
    if (!o || !cart) throw new Error("no wheat order, no cart");
    w.give("a", "wheat:fine", o.qty);
    w.do({
      type: "empireLoadOrder",
      playerId: "a",
      vehicleId: cart.id,
      city: "padova",
      orderId: o.id,
    });
    expect(house(w).vehicles?.[0]?.loads?.[0]?.fine).toBe(o.qty);
    expect(stock(w, "wheat:fine")).toBe(0);
    w.do({ type: "empireUnloadOrder", playerId: "a", vehicleId: cart.id, orderId: o.id });
    expect(stock(w, "wheat:fine")).toBe(o.qty);
    expect(stock(w, "wheat")).toBe(0);
  });

  it("in a world without the insides, the better pieces stay for the court", () => {
    const w = world(ordersEmpire);
    const qty = orders(w, "padova").find((x) => x.good === "wheat")?.qty ?? 0;
    w.give("a", "wheat:fine", qty);
    const r = w.try({ type: "empireDeliverCity", playerId: "a", city: "padova" });
    expect(r.ok).toBe(false);
    expect(stock(w, "wheat:fine")).toBe(qty);
  });
});

describe("A. a well-tended inside wastes less", () => {
  const ws = (w: World) => house(w).workshops.find((x) => x.type === "bakery") as EmpireWorkshop;

  it("saves nothing worn, careless and unskilled; up to its ceiling tended", () => {
    const w = world();
    const b = structuredClone(ws(w));
    const inside = b.interior;
    if (!inside) throw new Error("no inside");
    for (const st of inside.stations) Object.assign(st, { wear: 10_000, care: 0 });
    expect(interiorInputsBps(b, house(w), s, w.now)).toBe(0);
    // New machines: the upkeep's share.
    for (const st of inside.stations) st.wear = 0;
    expect(interiorInputsBps(b, house(w), s, w.now)).toBe(1_000);
    // Careful: the care's share too.
    for (const st of inside.stations) st.care = 10_000;
    expect(interiorInputsBps(b, house(w), s, w.now)).toBe(2_500);
    // Skilled hands: up to the ceiling.
    for (const hand of inside.hands ?? []) hand.level = 30;
    expect(interiorInputsBps(b, house(w), s, w.now)).toBe(3_000);
  });

  it("a careful bakery takes less flour for the same queue", () => {
    const flourFor = (care: number) => {
      const w = world();
      const id = ws(w).id;
      for (const st of ws(w).interior?.stations ?? [])
        w.do({ type: "empireInteriorCare", playerId: "a", workshopId: id, stationId: st.id, care });
      w.give("a", "flour", 1_000);
      w.do({ type: "empireRelaunch", playerId: "a", workshopId: id });
      const job = ws(w).job;
      return { taken: 1_000 - stock(w, "flour"), lots: job?.batches ?? 0 };
    };
    const quick = flourFor(0);
    const careful = flourFor(10_000);
    expect(careful.taken / careful.lots).toBeLessThan(quick.taken / quick.lots);
  });

  it("is nothing in a world without the settings", () => {
    const plain = parseEmpireSettings({ ...ordersEmpire, interior: testInterior });
    const w = world();
    expect(interiorInputsBps(ws(w), house(w), plain, w.now)).toBe(0);
  });
});
