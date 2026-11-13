import { describe, expect, it } from "vitest";
import {
  type PlancheSetup,
  type PlancheState,
  plancheAdvance,
  plancheGazette,
  plancheInit,
  plancheMudaForce,
  plancheThread,
  plancheUnthread,
} from "../../src/index.js";

const HOUR = 3_600_000;
const DAY = 24 * HOUR;
const T0 = Date.parse("2026-11-16T00:00:00Z");
const SAT = T0 + 5 * DAY;
const SUN = T0 + 6 * DAY;

function setup(): PlancheSetup {
  return {
    width: 8,
    height: 8,
    sliceMs: HOUR,
    goods: { sel: "Sel" },
    houses: [
      { id: "ana", name: "Ca' Ana", robot: false, x: 2, y: 2, makes: {} },
      { id: "ben", name: "Ca' Ben", robot: false, x: 4, y: 2, makes: {} },
    ],
    cities: [
      {
        id: "mole",
        name: "Le môle",
        x: 4,
        y: 5,
        via: [],
        ring: "muda",
        wants: { sel: { price: 100, floorBps: 10_000, cap: 1, regenPerHour: 0 } },
      },
    ],
    passages: [],
    muda: {
      pier: "mole",
      loadDays: [2, 3, 4],
      sailDay: 5,
      sailHours: [8, 20],
      returnDay: 6,
      returnHour: 8,
      holdPerHouse: 40,
      dailyCap: 30,
      robotDaily: 0,
      straits: [{ id: "zara", name: "Le large de Zara", board: "zara", x: 3, y: 7 }],
      depth: 3,
      stepBps: 5_000,
      prestige: { contributor: 30, minUnits: 10, volunteer: 5, winner: 20 },
    },
    rules: {
      bobbins: 3,
      store: 500,
      startStock: 0,
      startDucats: 1_000,
      threadPerHour: 10,
      patinaBpsPerDay: 0,
      patinaMaxBps: 0,
      tollMaxBps: 1_500,
      tollBurnBps: 3_000,
      freeAfterForceMs: 24 * HOUR,
      rewindMsPerTile: 60_000,
    },
  };
}

// The Gazette of Sunday (docs/plan-muda.md N4).
describe("the Gazette", () => {
  it("says a calm week when nothing happened", () => {
    const S = setup();
    const g = plancheGazette(S, plancheInit(S, T0), SUN + 9 * HOUR, {}, null);
    expect(g.monday).toBe(T0);
    expect(g.headline).toEqual({ kind: "calme" });
    expect(g.muda).toBeNull();
    expect(g.noir).toEqual([]);
  });

  it("tells the Muda, who loaded most and who let the convoy through, under the players' names", () => {
    const S = setup();
    let s: PlancheState = plancheInit(S, T0);
    for (const h of Object.values(s.houses)) h.stock = { sel: 100 };
    s = plancheThread(S, s, "ana", "mole", "sel", T0);
    s = plancheThread(S, s, "ben", "mole", "sel", T0);
    s = plancheAdvance(S, s, T0 + 2 * DAY + HOUR);
    s = plancheUnthread(S, s, "ben", "mole", "sel", s.now);
    s = plancheAdvance(S, s, T0 + 2 * DAY + 5 * HOUR);
    s = plancheUnthread(S, s, "ana", "mole", "sel", s.now);
    s = plancheAdvance(S, s, SAT + 9 * HOUR);
    s = plancheMudaForce(S, s, "ben", "zara", true, s.now);
    s = plancheAdvance(S, s, SUN + 9 * HOUR);
    const g = plancheGazette(S, s, s.now, { ana: "Ana la Rouge" }, null);
    expect(g.headline).toEqual({ kind: "muda", passed: 1, units: 40 });
    expect(g.muda).toMatchObject({
      units: 40,
      hold: 80,
      passed: 1,
      straits: [{ id: "zara", name: "Le large de Zara", by: "Ca' Ben" }],
      top: [
        { name: "Ana la Rouge", units: 30 },
        { name: "Ca' Ben", units: 10 },
      ],
    });
  });

  it("puts the War first when the convoy did not pass, and keeps its finest assault", () => {
    const S = setup();
    const war = {
      seals: 7,
      top: [{ name: "Ca' Ana", seals: 4 }],
      best: { id: 3, by: "Ca' Ana", target: "Ca' Zane", seals: 3 },
    };
    const g = plancheGazette(S, plancheInit(S, T0), SUN + 9 * HOUR, {}, war);
    expect(g.headline).toEqual({ kind: "guerre", name: "Ca' Ana", seals: 4 });
    expect(g.guerre?.best?.id).toBe(3);
  });
});
