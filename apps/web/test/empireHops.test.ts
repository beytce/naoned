import { describe, expect, it } from "vitest";
import {
  bringsTo,
  hopSeconds,
  lastPlace,
  loadable,
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
    cargo: {},
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
            { good: "salt", qty: 12, filled: 2, unit: "100" },
            { good: "bread", qty: 4, filled: 0, unit: "50" },
          ],
          waves: 2,
          fillBps: 3333,
          renewsAt: 0,
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

describe("what a vehicle would bring to a city", () => {
  it("is its cargo and, at its counter, what the counter holds, against the orders left", () => {
    const p = payload(cart({ cargo: { salt: { qty: 3, from: "home" } } }));
    const v = p.view?.vehicles.mine[0] as Mine;
    // Salt: 10 asked, 3 aboard and 8 at the counter, so 10; bread: 4 asked, 50 held, so 4.
    expect(bringsTo(p, v, "padova")).toEqual([
      { good: "salt", n: 10, pay: 1_000n },
      { good: "bread", n: 4, pay: 200n },
    ]);
    // On the way, only what it carries.
    const away = { ...v, at: "city:venezia" };
    expect(bringsTo(p, away, "padova")).toEqual([{ good: "salt", n: 3, pay: 300n }]);
  });
});

describe("the cities a vehicle chosen lights up", () => {
  it("are those it would bring something to, with how much", () => {
    const p = payload(cart());
    const v = p.view?.vehicles.mine[0] as Mine;
    // At its counter: 8 salt and 50 bread there, Padua asks 10 salt and 4 bread.
    expect([...wantedBy(p, v)]).toEqual([["padova", 12]]);
    expect([...wantedBy(p, { ...v, at: "city:venezia" })]).toEqual([]);
  });

  it("load by hand only what the orders still ask, less what it carries", () => {
    const p = payload(cart({ cargo: { salt: { qty: 3, from: "home" } } }));
    const v = p.view?.vehicles.mine[0] as Mine;
    expect(loadable(p, v, "salt")).toEqual({ left: 7, cities: ["padova"] });
    expect(loadable(p, v, "iron")).toEqual({ left: 0, cities: [] });
  });
});
