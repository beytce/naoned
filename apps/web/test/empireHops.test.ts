import { describe, expect, it } from "vitest";
import {
  bringsTo,
  dockOrders,
  hopSeconds,
  lastPlace,
  nearestPlace,
  placesOf,
  vehiclePose,
  wantedBy,
} from "../src/empire/map/logic.js";
import type { EmpirePayload } from "../src/empire/types.js";

// The hops (after Hades' Star, 1 November 2026): the pure reckonings the map draws with.
type Mine = NonNullable<EmpirePayload["view"]>["vehicles"]["mine"][number];

const cart = (over: Partial<Mine> = {}): Mine =>
  ({
    id: "v1",
    type: "cart",
    busyUntil: 0,
    capacity: 30,
    at: "home",
    loads: [],
    legs: [],
    ...over,
  }) as Mine;

function payload(v: Mine): EmpirePayload {
  return {
    view: {
      moves: { departSeconds: 10, unitsPerSecond: 8, maxStops: 15 },
      map: {
        home: { x: 0, y: 0, level: 1, reach: 50 },
        posts: [{ id: "p1", cell: "1,0", region: "veneto", x: 80, y: 0, level: 1, reach: 40 }],
        cities: [
          { code: "venezia", cell: "0,0", region: "veneto", x: 2, y: 2, size: 3 },
          { code: "padova", cell: "0,1", region: "veneto", x: 0, y: 40, size: 1 },
          { code: "milano", cell: "-5,1", region: "lombardia", x: -300, y: 0, size: 5 },
        ],
        covered: ["venezia", "padova"],
        unlocked: ["0,0"],
      },
      stores: [{ post: "home", region: "veneto", goods: { salt: 8, bread: 50 } }],
      orders: [
        {
          city: "padova",
          region: "veneto",
          size: 1,
          orders: [
            { id: "padova#0", city: "padova", good: "salt", qty: 10, pay: "1000" },
            { id: "padova#1", city: "padova", good: "bread", qty: 4, pay: "200" },
          ],
          cap: 3,
          fillBps: 6666,
          nextAt: 0,
        },
        {
          city: "venezia",
          region: "veneto",
          size: 3,
          orders: [{ id: "venezia#0", city: "venezia", good: "bread", qty: 60, pay: "3000" }],
          cap: 6,
          fillBps: 1666,
          nextAt: 0,
        },
      ],
      vehicles: { shop: [], mine: [v], haulPerDay: 0 },
    },
  } as unknown as EmpirePayload;
}

describe("the places a vehicle may go to", () => {
  it("are the counters, and the cities of the house's sectors or of its reach", () => {
    const p = payload(cart());
    expect(placesOf(p).map((x) => x.place)).toEqual(["home", "p1", "city:venezia", "city:padova"]);
    expect(nearestPlace(p, [1, 38], 10)?.place).toBe("city:padova");
    expect(nearestPlace(p, [40, 20], 10)).toBeNull();
  });

  it("are reached in the engine's seconds: the distance at the speed, a second at the least", () => {
    const p = payload(cart());
    expect(hopSeconds(p, [0, 0], [0, 40])).toBe(5);
    expect(hopSeconds(p, [0, 0], [0, 1])).toBe(1);
  });
});

describe("a vehicle's pose", () => {
  it("stands at its place, waiting to leave, then glides turned to its heading", () => {
    const legs = [{ from: "home", to: "city:padova", departAt: 10_000, arrivesAt: 15_000 }];
    const p = payload(cart({ legs }));
    const v = p.view?.vehicles.mine[0] as Mine;
    const before = vehiclePose(p, v, 5_000);
    expect(before.hop).toBeNull();
    expect(before.place).toBe("home");
    expect(before.leavesAt).toBe(10_000);
    const half = vehiclePose(p, v, 12_500);
    expect(half.hop?.k).toBeCloseTo(0.5);
    expect([half.x, half.y]).toEqual([0, 20]);
    expect(half.angle).toBeCloseTo(Math.PI / 2);
    const after = vehiclePose(p, v, 16_000);
    expect(after.place).toBe("city:padova");
    expect(lastPlace(v)).toBe("city:padova");
  });
});

const aboard = {
  id: "padova#2",
  city: "padova",
  good: "salt",
  qty: 3,
  pay: "300",
  from: "home",
};

describe("what a vehicle would bring to a city", () => {
  it("is the orders of that city aboard, with their pay", () => {
    const p = payload(cart({ loads: [aboard] }));
    const v = p.view?.vehicles.mine[0] as Mine;
    expect(bringsTo(p, v, "padova")).toEqual([{ good: "salt", n: 3, pay: 300n }]);
    expect(bringsTo(p, v, "venezia")).toEqual([]);
  });
});

describe("the cities a vehicle chosen lights up", () => {
  it("are those of the orders aboard, with how many", () => {
    const p = payload(cart({ loads: [aboard, { ...aboard, id: "padova#3" }] }));
    const v = p.view?.vehicles.mine[0] as Mine;
    expect([...wantedBy(p, v)]).toEqual([["padova", 2]]);
    expect([...wantedBy(p, payload(cart()).view?.vehicles.mine[0] as Mine)]).toEqual([]);
  });
});

describe("the orders a docked vehicle may load", () => {
  it("are those of the cities its counter serves, the ready ones first, sorted", () => {
    const p = payload(cart());
    const v = p.view?.vehicles.mine[0] as Mine;
    // 8 salt at the counter: Padua's 10 salt are greyed; 50 bread: Padua's 4, not Venice's 60.
    const dear = dockOrders(p, v, "dear");
    expect(dear.map((o) => [o.id, o.ready])).toEqual([
      ["padova#1", true],
      ["venezia#0", false],
      ["padova#0", false],
    ]);
    expect(dear.find((o) => o.id === "padova#0")?.held).toBe(8);
    expect(dockOrders(p, v, "cheap").map((o) => o.id)).toEqual([
      "padova#1",
      "padova#0",
      "venezia#0",
    ]);
    expect(dockOrders(p, v, "far").map((o) => o.id)).toEqual(["padova#1", "padova#0", "venezia#0"]);
    // On its way, or at a city: nothing to load.
    expect(dockOrders(p, { ...v, at: "city:venezia" })).toEqual([]);
    // Another counter, out of reach of these cities: nothing.
    expect(dockOrders(p, { ...v, at: "p1" })).toEqual([]);
  });
});
