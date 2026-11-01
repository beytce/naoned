import type { EmpireSettingsInput } from "../../src/index.js";
import { testEmpire } from "../fixture.js";

// The cities' orders and the vehicles' hops on the fixture (1 November 2026, after Hades' Star):
// Venice (size 3) at (0, 0), Padua (size 1) at (≈ 21, 36), both within Venice's reach (50).
export const ordersEmpire: EmpireSettingsInput = {
  ...testEmpire,
  casa: testEmpire.casa.map((c) => ({ ...c, materials: {}, buildMinutes: 0, costDucats: 0 })),
  start: { capitalDucats: 10_000, workshops: [], vehicles: ["cart"] },
  map: {
    ...testEmpire.map,
    cities: (testEmpire.map?.cities ?? []).map((c) =>
      c.code === "venezia" ? { ...c, size: 3 } : c,
    ),
    reach: { base: 50, perLevel: 10 },
  },
  vehicles: { cart: { casa: 1, capacity: 30, costDucats: 100, regions: ["veneto"], speedBps: 0 } },
  orders: {
    periodMinutes: 120,
    perSize: [1, 2, 3, 4, 5],
    qtyPerSize: 4,
    premiumBps: 2_000,
    sizeBps: 500,
    distanceBps: 1_000,
    maxWaves: 6,
  },
  moves: { departSeconds: 10, unitsPerSecond: 8, maxStops: 15 },
};
