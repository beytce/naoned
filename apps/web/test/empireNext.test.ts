import { describe, expect, it } from "vitest";
import { inTutorial, nextStep } from "../src/empire/next.js";
import type { EmpirePayload, EmpireWorkshop } from "../src/empire/types.js";

const HOUR = 3_600_000;
const NOW = 10 * HOUR;

/** A house as the empire's view sends it: Casa 1, three workshops of the socle, at rest. */
function house(over: {
  workshops?: EmpireWorkshop[];
  stock?: Record<string, number>;
  cash?: string;
  next?: Partial<NonNullable<NonNullable<EmpirePayload["view"]>["nextCasa"]>>;
  builds?: unknown[];
  claimable?: boolean;
  market?: EmpirePayload["market"];
  upgrades?: Record<string, unknown>;
}): EmpirePayload {
  const workshops = over.workshops ?? [
    { id: "clay", type: "clay_pit", recipe: "dig_clay", level: 1, job: null },
    { id: "wood", type: "lumber_camp", recipe: "fell_wood", level: 1, job: null },
    { id: "saw", type: "sawmill", recipe: "saw_planks", level: 1, job: null },
  ];
  return {
    kind: "empire",
    now: NOW,
    joined: true,
    cash: over.cash ?? "50000",
    stock: over.stock ?? {},
    market: over.market ?? [],
    casa: [],
    goods: {},
    catalog: [
      {
        type: "clay_pit",
        name: "Carrière",
        recipes: [{ code: "dig_clay", inputs: {}, outputs: { clay: 8 }, minutes: 30 }],
      },
      {
        type: "lumber_camp",
        name: "Bûcherons",
        recipes: [{ code: "fell_wood", inputs: {}, outputs: { wood: 11 }, minutes: 30 }],
      },
      {
        type: "sawmill",
        name: "Scierie",
        recipes: [
          { code: "saw_planks", inputs: { wood: 10 }, outputs: { planks: 6 }, minutes: 30 },
        ],
      },
      {
        type: "brickworks",
        name: "Briqueterie",
        recipes: [
          {
            code: "fire_bricks",
            inputs: { clay: 10, wood: 2 },
            outputs: { bricks: 6 },
            minutes: 30,
          },
        ],
      },
    ],
    view: {
      house: { casa: 1, workshops, builds: over.builds ?? [], favour: 0, seals: 0 },
      nextCasa: {
        level: 2,
        cost: "5000",
        minutes: 2,
        cutBps: 0,
        materials: { bricks: 5, planks: 5 },
        requirementMet: true,
        requires: { workshops: 0, level: 0 },
        opens: [],
        ...over.next,
      },
      newWorkshop: { level: 1, cost: "4800", minutes: 1, cutBps: 0 },
      buildSlots: 1,
      workshopSlots: 4,
      upgrades: over.upgrades ?? {},
      incomePerDay: "0",
      carnet: {
        week: 1,
        objectives: [
          { kind: "relaunch", target: 3, progress: over.claimable ? 3 : 0, claimed: false },
        ],
        carried: [],
        windUntil: null,
      },
    } as unknown as EmpirePayload["view"],
  };
}
const running = (id: string, type: string, recipe: string, startedAt: number): EmpireWorkshop => ({
  id,
  type,
  recipe,
  level: 1,
  job: { recipe, startedAt, batches: 24, level: 1, batchMs: HOUR / 2 },
});

describe("the next step", () => {
  it("first takes what is ready", () => {
    const p = house({ workshops: [running("clay", "clay_pit", "dig_clay", NOW - HOUR)] });
    expect(nextStep(p, NOW)).toMatchObject({ kind: "collect", lots: 2 });
  });

  it("relaunches a workshop at rest whose inputs are there", () => {
    expect(nextStep(house({}), NOW)).toMatchObject({ kind: "relaunch" });
  });

  it("builds the Casa when all is there", () => {
    const p = house({
      workshops: [running("clay", "clay_pit", "dig_clay", NOW)],
      stock: { bricks: 5, planks: 5 },
    });
    expect(nextStep(p, NOW)).toMatchObject({ kind: "casa", level: 2 });
  });

  it("names the workshop the Casa lacks: the brickworks of the Casa 2", () => {
    const p = house({
      workshops: [
        running("clay", "clay_pit", "dig_clay", NOW),
        running("wood", "lumber_camp", "fell_wood", NOW),
        running("saw", "sawmill", "saw_planks", NOW),
      ],
    });
    expect(nextStep(p, NOW)).toMatchObject({
      kind: "build",
      good: "bricks",
      type: "brickworks",
      recipe: "fire_bricks",
    });
  });

  it("raises the lowest workshop when the Casa asks levels", () => {
    const p = house({
      workshops: [running("clay", "clay_pit", "dig_clay", NOW)],
      stock: { bricks: 5, planks: 5 },
      next: { requirementMet: false, requires: { workshops: 1, level: 2 } },
      upgrades: { clay: { level: 2, cost: "1000", minutes: 5, cutBps: 0 } },
    });
    expect(nextStep(p, NOW)).toMatchObject({ kind: "upgrade", workshopId: "clay", level: 2 });
  });

  it("sells what piles up when ducats are short, the cities' orders first", () => {
    const p = house({
      workshops: [running("clay", "clay_pit", "dig_clay", NOW)],
      stock: { bricks: 5, planks: 5, clay: 40 },
      cash: "100",
      market: [
        {
          region: "veneto",
          good: "clay",
          ref: "300",
          price: "300",
          asked: true,
          depthLeft: 50,
          boardLeft: 10,
          asOf: NOW,
        },
      ],
    });
    expect(nextStep(p, NOW)).toMatchObject({ kind: "sell", good: "clay", deliver: true });
  });

  it("claims an objective met", () => {
    const p = house({
      workshops: [running("clay", "clay_pit", "dig_clay", NOW)],
      claimable: true,
      stock: { bricks: 1 },
      cash: "100",
    });
    expect(nextStep(p, NOW)).toMatchObject({ kind: "claim", index: 0 });
  });

  it("else waits, and says until when", () => {
    const p = house({
      workshops: [running("clay", "clay_pit", "dig_clay", NOW - 10)],
      stock: { bricks: 1 },
      cash: "100",
    });
    const step = nextStep(p, NOW);
    expect(step.kind).toBe("wait");
    expect(step.kind === "wait" && step.at).toBe(NOW - 10 + HOUR / 2);
  });
});

describe("Lorenzo's tutorial (31 October 2026)", () => {
  it("guides until the Casa 2, then withdraws behind the « ? »", () => {
    const at = (casa: number) => ({ view: { house: { casa } } }) as unknown as EmpirePayload;
    expect(inTutorial(at(1))).toBe(true);
    expect(inTutorial(at(2))).toBe(false);
    expect(inTutorial(at(9))).toBe(false);
  });
});

describe("Lorenzo and the cities' orders (after the map's audit, 3 November 2026)", () => {
  const withOrders = (stock: Record<string, number>) => {
    const p = house({ workshops: [running("clay", "clay_pit", "dig_clay", NOW)], stock });
    const view = p.view as unknown as Record<string, unknown>;
    view.stores = [{ post: "home", region: "veneto", goods: stock }];
    view.orders = [
      {
        city: "padova",
        region: "veneto",
        size: 3,
        cap: 2,
        fillBps: 5_000,
        nextAt: null,
        posts: ["home"],
        orders: [{ id: "o1", city: "padova", good: "clay", qty: 40, pay: "60000" }],
      },
    ];
    view.vehicles = {
      mine: [{ id: "m", type: "mule", busyUntil: 0, capacity: 2, at: "home", loads: [], legs: [] }],
    };
    return p;
  };

  it("proposes a delivery the stock covers, which « Livrer » makes", () => {
    expect(nextStep(withOrders({ clay: 52 }), NOW)).toMatchObject({
      kind: "deliver",
      city: "padova",
      good: "clay",
      qty: 40,
      have: 52,
      action: { type: "empireDeliverCity", city: "padova", orderIds: ["o1"] },
    });
  });

  it("proposes none the stock does not cover", () => {
    expect(nextStep(withOrders({ clay: 10 }), NOW).kind).not.toBe("deliver");
  });
});

// The welcome of a new house (docs/plan-premiers-pas.md lot 2): Lorenzo leads it, a gesture at a
// time, to its first order, before anything else.
describe("the welcome's steps", () => {
  type Welcome = NonNullable<NonNullable<EmpirePayload["view"]>["house"]["welcome"]>;
  function newHouse(
    welcome: Welcome,
    over: Parameters<typeof house>[0] & { orders?: unknown[]; vehicles?: unknown[] } = {},
  ): EmpirePayload {
    const p = house({ workshops: [], ...over });
    const view = p.view as NonNullable<EmpirePayload["view"]>;
    return {
      ...p,
      view: {
        ...view,
        house: { ...view.house, welcome },
        welcome: { workshop: { type: "lumber_camp", recipe: "fell_wood" } },
        orders: over.orders ?? [],
        vehicles: { models: [], mine: over.vehicles ?? [] },
      } as unknown as EmpirePayload["view"],
    };
  }
  const order = { id: "padova#welcome", city: "padova", good: "wood", qty: 11, pay: "10000" };
  const camp = (job: EmpireWorkshop["job"]): EmpireWorkshop => ({
    id: "w1",
    type: "lumber_camp",
    recipe: "fell_wood",
    level: 1,
    job,
  });

  it("asks the first workshop on a free tile", () => {
    expect(nextStep(newHouse({}), NOW)).toMatchObject({
      kind: "welcome",
      phase: "build",
      type: "lumber_camp",
      recipe: "fell_wood",
      good: "wood",
    });
  });

  it("asks to launch it once built", () => {
    const p = newHouse({ built: true }, { workshops: [camp(null)] });
    expect(nextStep(p, NOW)).toMatchObject({
      phase: "launch",
      action: { type: "empireRelaunch", workshopId: "w1" },
    });
  });

  it("shows the lot under way, the order of welcome already there", () => {
    const job = {
      recipe: "fell_wood",
      startedAt: NOW - 10_000,
      batches: 1,
      level: 1,
      batchMs: 30_000,
    };
    const p = newHouse(
      { built: true, batch: true, order: order.id },
      { workshops: [camp(job)], orders: [{ city: "padova", orders: [order] }] },
    );
    expect(nextStep(p, NOW)).toMatchObject({
      phase: "making",
      city: "padova",
      from: NOW - 10_000,
      at: NOW + 20_000,
    });
  });

  it("asks to collect, then to deliver the order of welcome", () => {
    const done = {
      recipe: "fell_wood",
      startedAt: NOW - 40_000,
      batches: 1,
      level: 1,
      batchMs: 30_000,
    };
    const ready = newHouse(
      { built: true, batch: true, order: order.id },
      { workshops: [camp(done)], orders: [{ city: "padova", orders: [order] }] },
    );
    expect(nextStep(ready, NOW)).toMatchObject({ phase: "collect" });
    const stocked = newHouse(
      { built: true, batch: true, order: order.id },
      {
        workshops: [camp(null)],
        stock: { wood: 11 },
        orders: [{ city: "padova", orders: [order] }],
      },
    );
    expect(nextStep(stocked, NOW)).toMatchObject({
      phase: "deliver",
      city: "padova",
      qty: 11,
      pay: 10_000n,
      action: { type: "empireDeliverCity", city: "padova", orderIds: [order.id] },
    });
  });

  it("follows the vehicle on its way, then gives the game back once paid", () => {
    const mule = {
      id: "v1",
      at: "home",
      loads: [{ ...order, from: "home" }],
      legs: [{ from: "home", to: "city:padova", departAt: NOW - 5_000, arrivesAt: NOW + 40_000 }],
    };
    const p = newHouse(
      { built: true, batch: true, order: order.id, trip: true },
      { workshops: [camp(null)], vehicles: [mule] },
    );
    expect(nextStep(p, NOW)).toMatchObject({ phase: "onWay", city: "padova", at: NOW + 40_000 });
    const paid = newHouse(
      { built: true, batch: true, order: order.id, trip: true, done: true },
      { workshops: [camp(null)] },
    );
    expect(nextStep(paid, NOW).kind).not.toBe("welcome");
  });
});
