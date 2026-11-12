import { describe, expect, it } from "vitest";
import {
  type PlancheSetup,
  plancheInit,
  plancheInvariant,
  plancheOrderTry,
  plancheOrders,
} from "../../src/index.js";

const HOUR = 3_600_000;
const DAY = 24 * HOUR;
const T0 = Date.parse("2026-11-16T00:00:00Z");
const want = (price: number) => ({ price, floorBps: 3_000, cap: 200, regenPerHour: 10 });

/** The fixture's board: two sestieri of two houses, a free town and two behind a tower. */
function setup(): PlancheSetup {
  const house = (id: string, x: number, sestiere: string) => ({
    id,
    name: id,
    robot: false,
    x,
    y: 4,
    makes: { verre: 10 },
    sestiere,
  });
  return {
    width: 12,
    height: 8,
    sliceMs: HOUR,
    goods: { verre: "Verre", sel: "Sel" },
    houses: [
      house("a1", 2, "nord"),
      house("a2", 3, "nord"),
      house("b1", 8, "sud"),
      house("b2", 9, "sud"),
    ],
    cities: [
      { id: "bourg", name: "Bourg", x: 1, y: 1, via: [], wants: { verre: want(1_000) } },
      {
        id: "loin",
        name: "Loin",
        x: 6,
        y: 7,
        via: ["p"],
        wants: { verre: want(2_000), sel: want(900) },
      },
      { id: "far", name: "Far", x: 10, y: 7, via: ["p"], wants: { verre: want(3_000) } },
    ],
    passages: [
      { id: "p", name: "P", x: 6, y: 6, holder: "corsair:X", tollBps: 0, board: "b", seals: 1 },
    ],
    orders: {
      perSestiere: 2,
      hours: [9, 17],
      durationMs: 4 * HOUR,
      priceBps: 20_000,
      units: 30,
      problems: ["q1", "q2", "q3"],
    },
    rules: {
      bobbins: 3,
      store: 200,
      startStock: 100,
      startDucats: 0,
      threadPerHour: 10,
      patinaBpsPerDay: 0,
      patinaMaxBps: 0,
      tollMaxBps: 1_500,
      tollBurnBps: 3_000,
      freeAfterForceMs: DAY,
      rewindMsPerTile: 60_000,
    },
  };
}

// The sealed orders (docs/plan-hex-commerce.md H2): a town behind a tower, twice its price, won by a Passe.
describe("the sealed orders", () => {
  it("draws two a day for each sestiere, behind a tower, the same every time", () => {
    const S = setup();
    const day = Math.floor(T0 / DAY);
    const os = plancheOrders(S, day);
    expect(os).toHaveLength(4);
    expect(os.filter((o) => o.sestiere === "nord")).toHaveLength(2);
    for (const o of os) {
      expect(["loin", "far"]).toContain(o.city);
      expect(o.units).toBe(30);
      expect(["q1", "q2", "q3"]).toContain(o.problem);
      // Twice the town's full price.
      const full = S.cities.find((c) => c.id === o.city)?.wants[o.good]?.price ?? 0;
      expect(o.price).toBe(full * 2);
    }
    expect(os.map((o) => o.from)).toEqual(expect.arrayContaining([T0 + 9 * HOUR, T0 + 17 * HOUR]));
    expect(plancheOrders(S, day)).toEqual(os);
    expect(plancheOrders(S, day + 1)).not.toEqual(os);
  });

  it("is delivered by the first house of its sestiere that wins its Passe: twice the price, every denier counted", () => {
    const S = setup();
    const o = plancheOrders(S, Math.floor(T0 / DAY)).find((x) => x.sestiere === "nord");
    if (!o) throw new Error("no order");
    const at = o.from + HOUR;
    let s = plancheInit(S, T0);
    // Not before it opens, not to another sestiere.
    expect(() => plancheOrderTry(S, s, "a1", o.id, o.from - 1, true)).toThrow(
      "planche_order_closed",
    );
    expect(() => plancheOrderTry(S, s, "b1", o.id, at, true)).toThrow("planche_order_elsewhere");
    s = plancheOrderTry(S, s, "a1", o.id, at, true);
    expect(s.houses.a1?.stock[o.good] ?? 0).toBe(70);
    expect(s.houses.a1?.ducats).toBe(BigInt(o.price * o.units));
    expect(s.houses.a1?.book.sold).toBe(BigInt(o.price * o.units));
    expect(plancheInvariant(s)).toBe(true);
    // Taken: no one else of the sestiere may deliver it.
    expect(() => plancheOrderTry(S, s, "a2", o.id, at, true)).toThrow("planche_order_taken");
    expect(s.orders?.[o.id]?.by).toBe("a1");
  });

  it("gives one try a house: lost, nothing is taken, and it may not play again", () => {
    const S = setup();
    const o = plancheOrders(S, Math.floor(T0 / DAY)).find((x) => x.sestiere === "sud");
    if (!o) throw new Error("no order");
    const at = o.from + HOUR;
    let s = plancheOrderTry(S, plancheInit(S, T0), "b1", o.id, at, false);
    expect(s.houses.b1?.stock.verre).toBe(100);
    expect(() => plancheOrderTry(S, s, "b1", o.id, at, true)).toThrow("planche_order_tried");
    // Another house of the sestiere still may.
    s = plancheOrderTry(S, s, "b2", o.id, at, true);
    expect(s.orders?.[o.id]?.by).toBe("b2");
    // Closed once its hours are over.
    const late = o.to + 1;
    const fresh = plancheInit(S, T0);
    expect(() => plancheOrderTry(S, fresh, "b1", o.id, late, true)).toThrow("planche_order_closed");
  });

  it("refuses a house that has not the goods", () => {
    const S = { ...setup(), rules: { ...setup().rules, startStock: 10 } };
    const o = plancheOrders(S, Math.floor(T0 / DAY))[0];
    if (!o) throw new Error("no order");
    const house = S.houses.find((h) => h.sestiere === o.sestiere)?.id ?? "";
    expect(() => plancheOrderTry(S, plancheInit(S, T0), house, o.id, o.from, true)).toThrow(
      "planche_order_short",
    );
  });
});
