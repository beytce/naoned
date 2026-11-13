import { describe, expect, it } from "vitest";
import {
  type PlancheSetup,
  type PlancheState,
  plancheAdvance,
  plancheEncreLine,
  plancheEncrePeril,
  plancheEncrePush,
  plancheEncreThreat,
  plancheInInk,
  plancheInit,
  planchePrice,
  plancheThread,
} from "../../src/index.js";

const HOUR = 3_600_000;
const DAY = 24 * HOUR;
const WEEK = 7 * DAY;
// A Monday.
const T0 = Date.parse("2026-11-16T00:00:00Z");

function setup(): PlancheSetup {
  return {
    width: 6,
    height: 10,
    sliceMs: 6 * HOUR,
    goods: { sel: "Sel" },
    houses: [
      { id: "ana", name: "Ana", robot: false, x: 2, y: 2, makes: { sel: 30 } },
      { id: "bot", name: "Bot", robot: true, x: 4, y: 2, makes: { sel: 30 } },
    ],
    cities: [
      {
        id: "pres",
        name: "Près",
        x: 1,
        y: 3,
        via: [],
        wants: { sel: { price: 100, floorBps: 10_000, cap: 10_000, regenPerHour: 1_000 } },
      },
      {
        id: "loin",
        name: "Loin",
        x: 3,
        y: 8,
        via: [],
        wants: { sel: { price: 100, floorBps: 10_000, cap: 10_000, regenPerHour: 1_000 } },
      },
    ],
    passages: [
      {
        id: "pont",
        name: "Le pont",
        x: 2,
        y: 7,
        holder: "corsair:Ivo",
        tollBps: 1_000,
        board: "petit",
        seals: 2,
      },
      {
        id: "bouche",
        name: "La bouche",
        x: 4,
        y: 4,
        holder: "corsair:Dragut",
        tollBps: 1_000,
        board: "petit",
        seals: 2,
      },
    ],
    rank: {
      tideWeeks: 6,
      weekMs: WEEK,
      negoceMinMs: DAY,
      coteStart: 1_200,
      coteK: 32,
      repelledHours: 12,
    },
    encre: {
      start: 9,
      limit: 3,
      rise: 100,
      push: { tower: 40, noir: 50, beacon: 20 },
      priceBps: 2_000,
      lossBps: 3_000,
    },
    rules: {
      bobbins: 3,
      store: 10_000,
      startStock: 0,
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

/** Ana holds the bridge on the far side, near the ink. */
function holding(S: PlancheSetup): PlancheState {
  const s = plancheInit(S, T0);
  s.passages.pont = { holder: "ana", tollBps: 1_000, seals: 2 };
  return s;
}

// The ink tide (docs/plan-maree.md T1).
describe("the ink tide", () => {
  it("rises a row each Monday when nothing pushes it back, and covers the far rows", () => {
    const S = setup();
    let s = plancheInit(S, T0);
    expect(plancheEncreLine(S, s)).toBe(900);
    expect(plancheInInk(S, s, 8)).toBe(false);
    s = plancheAdvance(S, s, T0 + WEEK);
    expect(plancheEncreLine(S, s)).toBe(800);
    expect(plancheInInk(S, s, 8)).toBe(true);
    expect(plancheInInk(S, s, 7)).toBe(false);
    s = plancheAdvance(S, s, T0 + 3 * WEEK);
    expect(plancheEncreLine(S, s)).toBe(600);
    expect(plancheEncrePeril(S, s, 6)).toBe(1);
    expect(plancheEncrePeril(S, s, 4)).toBeCloseTo(1 / 3, 5);
    expect(plancheEncrePeril(S, s, 2)).toBe(0);
  });

  it("is pushed back by the towers people hold and the black straits forced", () => {
    const S = setup();
    let s = holding(S);
    expect(plancheEncrePush(S, s, T0 + WEEK)).toBe(40);
    s = plancheAdvance(S, s, T0 + WEEK);
    expect(plancheEncreLine(S, s)).toBe(840);
    expect(s.encre?.last).toEqual({ rise: 100, push: 40, retaken: [] });
    // Two black straits forced in the week: 100 more, the ink holds and never goes back past its start.
    s.noir = {
      monday: T0 + WEEK,
      forced: {},
      feats: [
        { house: "ana", strait: "turc", at: T0 + WEEK + DAY },
        { house: "ana", strait: "turc", at: T0 + WEEK + 2 * DAY },
      ],
      total: {},
      day: 0,
      tries: {},
    };
    s = plancheAdvance(S, s, T0 + 2 * WEEK);
    expect(plancheEncreLine(S, s)).toBe(880);
    s.noir = {
      ...s.noir,
      monday: T0 + 2 * WEEK,
      feats: Array.from({ length: 6 }, (_, k) => ({
        house: "ana",
        strait: "turc",
        at: T0 + 2 * WEEK + k,
      })),
    };
    s = plancheAdvance(S, s, T0 + 3 * WEEK);
    expect(plancheEncreLine(S, s)).toBe(900);
  });

  it("gives back to its corsair a tower it reaches, told in advance, and tells its holder", () => {
    const S = setup();
    let s = holding(S);
    // Not held any more: nothing pushes. The line comes to 800, then 700: the bridge is reached.
    s = plancheAdvance(S, s, T0 + WEEK);
    expect(plancheEncreThreat(S, s)).toEqual([]);
    s.passages.pont = { holder: "ana", tollBps: 1_000, seals: 1 };
    s = plancheAdvance(S, s, T0 + 2 * WEEK);
    expect(s.passages.pont?.holder).toBe("ana");
    expect(plancheEncreLine(S, s)).toBe(780);
    // Told: next Monday, without more push (the bridge's own 40 counted), the bridge is reached.
    expect(plancheEncreThreat(S, s)).toEqual(["pont"]);
    s = plancheAdvance(S, s, T0 + 4 * WEEK);
    expect(s.passages.pont).toEqual({ holder: "corsair:Ivo", tollBps: 1_000, seals: 2 });
    expect(s.encre?.last?.retaken).toEqual(["pont"]);
  });

  it("makes the towns on it pay more, and the threads to them carry less", () => {
    const S = setup();
    let s = plancheInit(S, T0);
    s = plancheThread(S, s, "ana", "loin", "sel", T0);
    expect(planchePrice(S, s, "loin", "sel")).toBe(100);
    s = plancheAdvance(S, s, T0 + WEEK);
    expect(planchePrice(S, s, "loin", "sel")).toBe(120);
    expect(planchePrice(S, s, "pres", "sel")).toBe(100);
    const before = s.houses.ana?.delivered ?? 0;
    s = plancheAdvance(S, s, T0 + WEEK + DAY);
    // Ten an hour, three in ten lost: seven an hour, for a day.
    expect((s.houses.ana?.delivered ?? 0) - before).toBe(168);
  });

  it("ebbs to where it began when the tide ends", () => {
    const S = setup();
    let s = plancheAdvance(S, plancheInit(S, T0), T0 + 5 * WEEK);
    expect(plancheEncreLine(S, s)).toBe(400);
    s = plancheAdvance(S, s, T0 + 6 * WEEK);
    expect(plancheEncreLine(S, s)).toBe(900);
  });
});
