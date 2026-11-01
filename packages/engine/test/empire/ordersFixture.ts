import type { EmpireSettingsInput } from "../../src/index.js";
import { testEmpire } from "../fixture.js";

// The cities' orders and the vehicles' hops on the fixture (1 November 2026, after Hades' Star):
// Venice (size 3) at (0, 0), Padua (size 1) at (≈ 21, 36), both within Venice's reach (50). The
// house starts with a farm (wheat, 4 ducats in Venetia) and a bakery (bread, 12 ducats): lots of
// 10 wheat and 3 bread for 40 ducats.
export const ordersEmpire: EmpireSettingsInput = {
  ...testEmpire,
  casa: testEmpire.casa.map((c) => ({ ...c, materials: {}, buildMinutes: 0, costDucats: 0 })),
  start: {
    capitalDucats: 10_000,
    workshops: [
      { type: "farm", recipe: "grow_wheat" },
      { type: "bakery", recipe: "bake_bread" },
    ],
    vehicles: ["cart"],
  },
  map: {
    ...testEmpire.map,
    cities: (testEmpire.map?.cities ?? []).map((c) =>
      c.code === "venezia" ? { ...c, size: 3 } : c,
    ),
    reach: { base: 50, perLevel: 10 },
  },
  vehicles: {
    cart: { casa: 1, capacity: 30, places: 3, costDucats: 100, regions: ["veneto"], speedBps: 0 },
  },
  orders: {
    cap: [2, 3, 4, 5, 6],
    everyMinutes: [120, 100, 60, 50, 40],
    lotDucats: 40,
    lots: {},
    premiumBps: 2_000,
  },
  moves: { departSeconds: 10, unitsPerSecond: 8, maxStops: 15 },
};
