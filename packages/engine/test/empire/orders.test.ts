import { describe, expect, it } from "vitest";
import { empireView, ordersOf, parseEmpireSettings } from "../../src/index.js";
import type { EmpireHouse } from "../../src/state.js";
import { HOUR, World, makeContext } from "../helpers.js";
import { ordersEmpire } from "./ordersFixture.js";

// The cities' orders (decision of the owner, 1 November 2026, after Hades' Star's shipments):
// each city a counter serves asks a wave of orders every two hours, one order to five by its size;
// the waves pile up to six, and beyond no new wave comes until something is brought. On the
// fixture: Venice (size 3) at (0, 0), Padua (size 1) at (≈ 21, 36), both within Venice's reach.
const empire = ordersEmpire;
const s = parseEmpireSettings(empire);

function world(capitalDucats = 10_000) {
  const start = { capitalDucats, workshops: [], vehicles: ["cart"] };
  const w = new World(makeContext({ empire: { ...empire, start } }));
  w.do({ type: "empireJoin", playerId: "a" });
  return w;
}
const view = (w: World) => empireView(w.ctx, w.state, "a", w.now);
const city = (w: World, code: string) => view(w)?.orders.find((x) => x.city === code);
const asked = (w: World, code: string) =>
  (city(w, code)?.orders ?? []).reduce((n, o) => n + o.qty - o.filled, 0);

describe("the orders of a city", () => {
  it("are a wave of as many orders as its size, of the goods its region asks", () => {
    const w = world();
    const venice = city(w, "venezia");
    expect(venice?.size).toBe(3);
    expect(venice?.waves).toBe(1);
    const wanted = Object.keys(s.regions.find((r) => r.code === "veneto")?.demands ?? {});
    for (const o of venice?.orders ?? []) {
      expect(wanted).toContain(o.good);
      expect(o.qty).toBeGreaterThan(0);
      expect(o.filled).toBe(0);
    }
    // Three orders of 12 to 23 units each (4 a size, 3 sizes, up to twice less one).
    expect(asked(w, "venezia")).toBeGreaterThanOrEqual(3 * 12);
    w.advance(HOUR);
    expect(city(w, "venezia")?.orders).toEqual(venice?.orders);
  });

  it("pile up a wave every period, up to six, and no more however long the absence", () => {
    const w = world();
    const one = asked(w, "padova");
    const renews = city(w, "padova")?.renewsAt ?? 0;
    w.advance(renews - w.now);
    expect(city(w, "padova")?.waves).toBe(2);
    expect(asked(w, "padova")).toBeGreaterThan(one);
    w.advance(10 * HOUR);
    expect(city(w, "padova")?.waves).toBe(6);
    expect(city(w, "padova")?.fillBps).toBe(10_000);
    const full = asked(w, "padova");
    w.advance(48 * HOUR);
    expect(city(w, "padova")?.waves).toBe(6);
    expect(asked(w, "padova")).toBe(full);
  });

  it("asks nothing of a city no counter of the house serves", () => {
    const h = { casa: 1, workshops: [], builds: [], homeLevel: 1 } as unknown as EmpireHouse;
    const far = parseEmpireSettings({
      ...empire,
      map: { ...empire.map, reach: { base: 10, perLevel: 0 } },
    });
    expect(ordersOf(makeContext({ empire }), h, "a", far, 0).map((x) => x.city)).toEqual([
      "venezia",
    ]);
  });
});

describe("a greater counter", () => {
  it("brings greater waves: its level, as the book of before grew", () => {
    const w = world(1_000_000);
    const before = asked(w, "venezia");
    w.do({ type: "empireUpgradeCounter", playerId: "a", region: "home" });
    w.advance(HOUR / 2);
    const after = asked(w, "venezia");
    const step = s.counters.bookStepBps;
    expect(step).toBeGreaterThan(0);
    expect(after).toBeGreaterThan(before);
    expect(after).toBeLessThanOrEqual(Math.ceil((before * (10_000 + step)) / 10_000));
  });
});
