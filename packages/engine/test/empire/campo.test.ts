import { describe, expect, it } from "vitest";
import {
  CAMPO,
  type Command,
  type EmpireSettingsInput,
  carnetWeek,
  cashAccount,
  empireHouseAt,
  hexDistance,
  hexNeighbors,
  isContesaWeek,
  terraWeekStart,
} from "../../src/index.js";
import type { EmpireHouse } from "../../src/state.js";
import { testEmpire, testTerraferma } from "../fixture.js";
import { DAY, HOUR, World, makeContext } from "../helpers.js";
import { ordersEmpire } from "./ordersFixture.js";

// The supply by road (docs/plan-terraferme-porcellana.md § 4 sexies, the owner's decisions of 8
// November 2026): the Campo asks each morning what the war will eat beyond the Republic's ration;
// what is brought there fills its store; the war takes the ration first, then the store, then
// Venice's stock at half again (the Signoria's carriage).
const empire: EmpireSettingsInput = {
  ...testEmpire,
  start: { capitalDucats: 1_000, workshops: [{ type: "farm", recipe: "grow_wheat" }] },
  terra: {
    entry: { wheat: 5 },
    theatreMax: 2,
    rationBread: 1,
    favour: { signore: 60, podium: 30, top10: 15, quarter: 8, participant: 4 },
    seals: { signore: 2, podium: 1 },
    sealsPerWeek: 2,
    contesa: {
      rosterSizes: [2],
      deadlineDay: 3,
      maxCompanies: 4,
      sealsPerMember: 1,
      winnerSeals: 1,
      aloneBps: 5_000,
      lustre: 10,
    },
    supply: { venetianBps: 15_000 },
  },
};
const terraferma = {
  ...testTerraferma,
  live: true,
  start: { ...testTerraferma.start, protectionHours: 0, minDistance: 2, placementHours: 24 },
  // A loaf a troop and a day: the war eats well beyond the ration of 1.
  supply: { breadPerTroopDay: 10_000, raiseBread: 4, buildingMaterials: { rocca: { bricks: 10 } } },
};
const cmd = (c: Record<string, unknown>) => c as unknown as Command;
const error = (res: { ok: boolean; error?: string }) => (res.ok ? "" : res.error);

function terraWorld() {
  const w = new World(makeContext({ empire, terraferma }));
  w.do({ type: "empireJoin", playerId: "a" });
  w.give("a", "wheat", 20);
  let week = carnetWeek(w.now) + 1;
  if (isContesaWeek(week)) week++;
  w.now = terraWeekStart(week) + HOUR;
  w.do(cmd({ type: "empireTerraJoin", playerId: "a" }));
  const map = w.state.empire?.terra?.theatres[0]?.map;
  if (!map) throw new Error("no theatre");
  const cell = map.owner.findIndex(
    (o, c) =>
      o === null &&
      map.map.land[c] &&
      hexNeighbors(map.map, c).length === 6 &&
      map.owner.every((x, j) => x === null || hexDistance(map.map, c, j) >= 3),
  );
  w.do(cmd({ type: "empireTerra", playerId: "a", action: { type: "terraPlace", cell } }));
  return w;
}
const house = (w: World) => w.state.empire?.houses.a as EmpireHouse;
/** The house changed for the test (the world's state is frozen): on a copy. */
function edit(w: World, f: (h: EmpireHouse) => void) {
  const state = structuredClone(w.state);
  const h = state.empire?.houses.a;
  if (!h) throw new Error("no house");
  f(h);
  w.state = state;
}
const bread = (w: World) => w.state.inventories.a?.bread?.available ?? 0;
const terra = (w: World, action: Record<string, unknown>) =>
  w.try(cmd({ type: "empireTerra", playerId: "a", action: { ...action, playerId: "a" } }));

describe("the war's goods: the ration, the Campo's store, then Venice at half again", () => {
  it("takes the cap's bread from the Campo's store first", () => {
    const w = terraWorld();
    w.give("a", "bread", 10);
    edit(w, (h) => {
      h.campo = { stock: { bread: 6 }, day: -1, week: -1 };
    });
    expect(error(terra(w, { type: "terraRaise" }))).toBe("");
    expect(house(w).campo?.stock.bread).toBe(2);
    expect(bread(w)).toBe(10);
  });

  it("takes what the store lacks from Venice, half again", () => {
    const w = terraWorld();
    w.give("a", "bread", 10);
    edit(w, (h) => {
      h.campo = { stock: { bread: 2 }, day: -1, week: -1 };
    });
    expect(error(terra(w, { type: "terraRaise" }))).toBe("");
    // 4 loaves: 2 from the store, 2 from Venice at half again: 3.
    expect(house(w).campo?.stock.bread ?? 0).toBe(0);
    expect(bread(w)).toBe(7);
  });

  it("refuses when the store and Venice together cannot pay, and takes nothing", () => {
    const w = terraWorld();
    w.give("a", "bread", 2);
    edit(w, (h) => {
      h.campo = { stock: { bread: 1 }, day: -1, week: -1 };
    });
    expect(error(terra(w, { type: "terraRaise" }))).toBe("insufficient_stock");
    expect(house(w).campo?.stock.bread).toBe(1);
    expect(bread(w)).toBe(2);
  });

  it("feeds the troops from the store before Venice", () => {
    const w = terraWorld();
    w.give("a", "bread", 100);
    edit(w, (h) => {
      h.campo = { stock: { bread: 30 }, day: -1, week: -1 };
    });
    // Past noon the troops have eaten well beyond the ration; a command plays the theatre (the
    // cap's 4 loaves, from the store too).
    w.advance(12 * HOUR);
    expect(error(terra(w, { type: "terraRaise" }))).toBe("");
    const left = house(w).campo?.stock.bread ?? 0;
    expect(left).toBeLessThan(26);
    // Venice only once the store was empty.
    if (bread(w) < 100) expect(left).toBe(0);
  });
});

describe("the Campo's orders, each morning", () => {
  it("asks the day's need beyond the ration, for nothing, once the house is in a theatre", () => {
    const w = terraWorld();
    edit(w, (h) => {
      h.camp = "0,0";
    });
    w.advance(DAY);
    w.do(cmd({ type: "empireSettle", playerId: "a" }));
    const list = house(w).orders?.[CAMPO]?.list ?? [];
    expect(list.length).toBeGreaterThan(0);
    expect(list.every((o) => o.city === CAMPO && o.pay === 0n)).toBe(true);
    expect(list.some((o) => o.good === "bread" && o.qty > 0)).toBe(true);
  });

  it("asks less what the store already holds", () => {
    const w = terraWorld();
    edit(w, (h) => {
      h.camp = "0,0";
    });
    w.advance(DAY);
    w.do(cmd({ type: "empireSettle", playerId: "a" }));
    const asked = house(w).orders?.[CAMPO]?.list.find((o) => o.good === "bread")?.qty ?? 0;
    const w2 = terraWorld();
    edit(w2, (h) => {
      h.camp = "0,0";
    });
    edit(w2, (h) => {
      h.campo = { stock: { bread: 2 }, day: -1, week: -1 };
    });
    w2.advance(DAY);
    w2.do(cmd({ type: "empireSettle", playerId: "a" }));
    const less = house(w2).orders?.[CAMPO]?.list.find((o) => o.good === "bread")?.qty ?? 0;
    expect(less).toBe(Math.max(0, asked - 2));
  });

  it("asks nothing outside a theatre", () => {
    const w = new World(makeContext({ empire, terraferma }));
    w.do({ type: "empireJoin", playerId: "a" });
    edit(w, (h) => {
      h.camp = "0,0";
    });
    w.advance(DAY);
    w.do(cmd({ type: "empireSettle", playerId: "a" }));
    expect(house(w).orders?.[CAMPO]?.list ?? []).toHaveLength(0);
  });
});

describe("delivering to the Campo", () => {
  const roads: EmpireSettingsInput = {
    ...ordersEmpire,
    terra: { ...(empire.terra as object), supply: { venetianBps: 15_000 } } as never,
    moves: { ...ordersEmpire.moves, returnHome: true },
  };
  it("brings its orders into the store, paid nothing", () => {
    const w = new World(makeContext({ empire: roads }));
    w.do({ type: "empireJoin", playerId: "a" });
    const cell = (empireHouseAt(w.ctx, w.state, "a", w.now) as EmpireHouse).home?.cell ?? "0,0";
    edit(w, (h) => {
      h.camp = cell;
      h.orders = {
        ...(h.orders ?? {}),
        [CAMPO]: {
          next: w.now,
          seq: 1,
          list: [{ id: "campo#test:bread", city: CAMPO, good: "bread", qty: 5, pay: 0n }],
        },
      };
    });
    w.give("a", "bread", 5);
    const cash = w.state.accounts[cashAccount("a")] ?? 0n;
    expect(error(w.try({ type: "empireDeliverCity", playerId: "a", city: CAMPO }))).toBe("");
    w.advance(HOUR);
    w.do(cmd({ type: "empireSettle", playerId: "a" }));
    expect(house(w).campo?.stock.bread).toBe(5);
    expect(house(w).orders?.[CAMPO]?.list ?? []).toHaveLength(0);
    expect(w.state.accounts[cashAccount("a")] ?? 0n).toBe(cash);
  });
});
