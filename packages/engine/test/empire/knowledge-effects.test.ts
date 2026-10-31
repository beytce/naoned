import { describe, expect, it } from "vitest";
import {
  type EmpireSettingsInput,
  type WorldState,
  cashAccount,
  empireHouseAt,
  empireQuotes,
  empireView,
} from "../../src/index.js";
import { testEmpire } from "../fixture.js";
import { HOUR, World, makeContext } from "../helpers.js";

const node = (code: string, effects: Record<string, number>) => ({ code, effects });
const empire: EmpireSettingsInput = {
  ...testEmpire,
  casa: testEmpire.casa.map((c) => ({ ...c, materials: {}, costDucats: 0 })),
  // Lombardy is the fixture's, at the Casa 4.
  start: { capitalDucats: 10_000, workshops: [], vehicles: ["mule"] },
  vehicles: { mule: { casa: 1, capacity: 10, costDucats: 0, regions: ["veneto"], speedBps: 0 } },
  localTripsPerDay: 1,
  knowledge: {
    baseCostDucats: 0,
    costGrowthBps: 10_000,
    minutes: [0],
    slotsAt: [1],
    branches: [
      {
        code: "all",
        nodes: [
          node("libro", { book: 5_000 }),
          node("partita", { wagesCut: 10_000 }),
          node("cantiere", { buildTime: 5_000 }),
          node("lettere", { charterCut: 5_000 }),
          node("convoglio", { tripsExtra: 1 }),
          node("portolano", { newsLive: 1 }),
          node("signoria", { carnetExtra: 1 }),
        ],
        capstones: [],
      },
    ],
  },
};

/** A house that knows the given knowledges, through the state (as a fixture). */
function knowing(codes: string[]) {
  const w = new World(makeContext({ empire }));
  w.do({ type: "empireJoin", playerId: "a", favour: 25 });
  const st = w.state.empire;
  const h = st?.houses.a;
  if (!st || !h) throw new Error("no house");
  w.state = {
    ...w.state,
    empire: { ...st, houses: { a: { ...h, knowledge: codes } } },
  } as WorldState;
  return w;
}
const cash = (w: World) => w.state.accounts[cashAccount("a")] ?? 0n;

describe("the knowledge at work", () => {
  it("fills a bigger private book, with more trips, wages saved", () => {
    const w = knowing(["libro", "convoglio", "partita"]);
    w.give("a", "bread", 100);
    const before = cash(w);
    w.do({ type: "empireDeliver", playerId: "a", good: "bread", qty: 100 });
    // A mule of 10, two trips: 20 of a book of 60 (40 and half again).
    expect(w.state.inventories.a?.bread?.available).toBe(80);
    // No wages: all of 20 × 1 200 kept, and the orders' premium of 10 %.
    expect(cash(w) - before).toBe(26_400n);
  });

  it("builds quicker, and puts its counters down for less", () => {
    const plain = knowing(["cantiere"]);
    const w = knowing(["cantiere", "lettere"]);
    for (const x of [plain, w]) x.do({ type: "empireBuildCasa", playerId: "a" });
    expect(empireHouseAt(w.ctx, w.state, "a", w.now)?.builds[0]?.endsAt).toBe(w.now + 60_000);
    const cost = (x: World) =>
      empireView(x.ctx, x.state, "a", x.now)?.regions.find((r) => r.code === "veneto")?.postCost ??
      0n;
    expect(cost(w) < cost(plain)).toBe(true);
  });

  it("brings the news live from everywhere, and a goal more to the Carnet", () => {
    const w = knowing(["portolano", "signoria"]);
    for (let i = 1; i < 4; i++) {
      w.do({ type: "empireBuildCasa", playerId: "a" });
      w.advance(HOUR);
    }
    w.do({ type: "empireRelaunchAll", playerId: "a" });
    const q = empireQuotes(w.ctx, w.state, w.now, "a").find((x) => x.region === "lombardia");
    expect(q?.asOf).toBe(w.now);
    w.advance(7 * 24 * HOUR);
    w.do({ type: "empireRelaunchAll", playerId: "a" });
    expect(empireView(w.ctx, w.state, "a", w.now)?.carnet.objectives).toHaveLength(12);
  });
});
