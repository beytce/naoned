import { describe, expect, it } from "vitest";
import {
  type PlancheSetup,
  type PlancheState,
  plancheAdvance,
  plancheInit,
  plancheInvariant,
  plancheMudaForce,
  plancheMudaHold,
  plancheMudaLoaded,
  plancheMudaPassed,
  plancheMudaPhase,
  plancheThread,
  plancheUnthread,
} from "../../src/index.js";

const HOUR = 3_600_000;
const DAY = 24 * HOUR;
// A Monday, midnight (UTC).
const T0 = Date.parse("2026-11-16T00:00:00Z");
const WED = T0 + 2 * DAY;
const SAT = T0 + 5 * DAY;
const SUN = T0 + 6 * DAY;

function setup(): PlancheSetup {
  return {
    width: 8,
    height: 8,
    sliceMs: HOUR,
    goods: { sel: "Sel", verre: "Verre" },
    houses: [
      { id: "ana", name: "Ana", robot: false, x: 2, y: 2, makes: {} },
      { id: "ben", name: "Ben", robot: false, x: 4, y: 2, makes: {} },
      { id: "rob", name: "Rob", robot: true, x: 6, y: 2, makes: {} },
    ],
    cities: [
      {
        id: "mole",
        name: "Le môle",
        x: 4,
        y: 5,
        via: [],
        ring: "muda",
        wants: {
          sel: { price: 100, floorBps: 10_000, cap: 1, regenPerHour: 0 },
          verre: { price: 300, floorBps: 10_000, cap: 1, regenPerHour: 0 },
        },
      },
      {
        id: "padoue",
        name: "Padoue",
        x: 1,
        y: 0,
        via: [],
        wants: { sel: { price: 100, floorBps: 5_000, cap: 1_000, regenPerHour: 10 } },
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
      robotDaily: 20,
      straits: [
        { id: "zara", name: "Zara", board: "zara", x: 3, y: 7 },
        { id: "curzola", name: "Curzola", board: "curzola", x: 4, y: 7 },
        { id: "otrante", name: "Otrante", board: "otrante", x: 5, y: 7 },
      ],
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

/** The board on Monday, every house's store full of salt and some glass. */
function stocked(S: PlancheSetup): PlancheState {
  const s = plancheInit(S, T0);
  for (const h of Object.values(s.houses)) h.stock = { sel: 200, verre: 50 };
  return s;
}

// The Muda (docs/plan-muda.md N2).
describe("the Muda", () => {
  it("loads from Wednesday to Friday, sails on Saturday's hours, comes back on Sunday morning", () => {
    const S = setup();
    expect(plancheMudaPhase(S, T0 + 10 * HOUR)).toBe("before");
    expect(plancheMudaPhase(S, WED)).toBe("loading");
    expect(plancheMudaPhase(S, WED + 2 * DAY + 23 * HOUR)).toBe("loading");
    expect(plancheMudaPhase(S, SAT + 7 * HOUR)).toBe("waiting");
    expect(plancheMudaPhase(S, SAT + 8 * HOUR)).toBe("sailing");
    expect(plancheMudaPhase(S, SAT + 20 * HOUR)).toBe("waiting");
    expect(plancheMudaPhase(S, SUN + 8 * HOUR)).toBe("back");
    expect(plancheMudaHold(S)).toBe(120);
  });

  it("pours a thread to the pier into the hold while it loads, its day's cap at most, selling nothing", () => {
    const S = setup();
    let s = plancheThread(S, stocked(S), "ana", "mole", "sel", T0);
    // On Monday, the thread waits.
    s = plancheAdvance(S, s, T0 + 5 * HOUR);
    expect(s.houses.ana?.stock.sel).toBe(200);
    s = plancheAdvance(S, s, WED + 2 * HOUR);
    expect(s.muda?.units.ana).toBe(20);
    expect(s.houses.ana?.stock.sel).toBe(180);
    expect(s.houses.ana?.ducats).toBe(1_000n);
    expect(s.houses.ana?.book.sold).toBe(0n);
    // Thirty a day at most.
    s = plancheAdvance(S, s, WED + 10 * HOUR);
    expect(s.muda?.units.ana).toBe(30);
    expect(s.muda?.worth.ana).toBe(3_000n);
    s = plancheAdvance(S, s, WED + DAY + 10 * HOUR);
    expect(s.muda?.units.ana).toBe(60);
  });

  it("has the houses of the computer load their part once each loading day, up to the hold", () => {
    const S = setup();
    let s = plancheAdvance(S, stocked(S), WED + 2 * HOUR);
    expect(s.muda?.units.rob).toBe(20);
    expect(s.muda?.units.ana).toBeUndefined();
    s = plancheAdvance(S, s, WED + 20 * HOUR);
    expect(s.muda?.units.rob).toBe(20);
    s = plancheAdvance(S, s, WED + 2 * DAY + 2 * HOUR);
    expect(s.muda?.units.rob).toBe(60);
    // The hold full, nothing more goes in, and nothing is lost.
    for (const who of ["ana", "ben"]) s = plancheThread(S, s, who, "mole", "verre", s.now);
    s = plancheAdvance(S, s, WED + 2 * DAY + 20 * HOUR);
    expect(plancheMudaLoaded(s, s.now)).toBe(120);
    const stock = (s.houses.ana?.stock.verre ?? 0) + (s.houses.ben?.stock.verre ?? 0);
    expect(stock + (s.muda?.units.ana ?? 0) + (s.muda?.units.ben ?? 0)).toBe(100);
  });

  /** The convoy loaded by Ana (thirty units of salt) and the computer, at Saturday's sailing. */
  function sailing(S: PlancheSetup): PlancheState {
    let s = plancheThread(S, stocked(S), "ana", "mole", "sel", T0);
    s = plancheAdvance(S, s, WED + 10 * HOUR);
    s = plancheUnthread(S, s, "ana", "mole", "sel", s.now);
    s = plancheAdvance(S, s, SAT + 9 * HOUR);
    return s;
  }

  it("passes its straits one after the other, each by the first house that wins it", () => {
    const S = setup();
    expect(() => plancheMudaForce(S, stocked(S), "ana", "zara", true, SAT + 9 * HOUR)).toThrow(
      "planche_muda_empty",
    );
    let s = sailing(S);
    expect(() => plancheMudaForce(S, s, "ana", "zara", true, SAT + 21 * HOUR)).toThrow(
      "planche_muda_closed",
    );
    expect(() => plancheMudaForce(S, s, "ana", "curzola", true, s.now)).toThrow(
      "planche_muda_ahead",
    );
    s = plancheMudaForce(S, s, "ana", "zara", false, s.now);
    expect(() => plancheMudaForce(S, s, "ana", "zara", true, s.now)).toThrow("planche_muda_tried");
    s = plancheMudaForce(S, s, "ben", "zara", true, s.now);
    expect(s.muda?.straits.zara).toMatchObject({ by: "ben", tried: ["ana", "ben"] });
    expect(() => plancheMudaForce(S, s, "ana", "zara", true, s.now)).toThrow("planche_muda_passed");
    s = plancheMudaForce(S, s, "ana", "curzola", true, s.now);
    expect(plancheMudaPassed(S, s, s.now)).toBe(2);
    // Prestige: a strait played, and one won.
    expect(s.houses.ana?.maison).toBeUndefined();
  });

  it("pays on Sunday what each loaded, and half again for each strait passed, never less", () => {
    const S = setup();
    let s = sailing(S);
    const ana = s.houses.ana?.ducats ?? 0n;
    const rob = s.houses.rob?.ducats ?? 0n;
    s = plancheMudaForce(S, s, "ben", "zara", true, s.now);
    s = plancheMudaForce(S, s, "ana", "curzola", true, s.now);
    s = plancheAdvance(S, s, SUN + 9 * HOUR);
    // Ana: thirty of salt at 100, two straits passed: × 2.
    expect(s.houses.ana?.ducats).toBe(ana + 6_000n);
    expect(s.muda?.paid?.ana).toBe(6_000n);
    // The computer's sixty of salt.
    expect(s.houses.rob?.ducats).toBe(rob + 12_000n);
    expect(plancheInvariant(s)).toBe(true);
    // Paid once.
    const after = s.houses.ana?.ducats;
    s = plancheAdvance(S, s, SUN + 15 * HOUR);
    expect(s.houses.ana?.ducats).toBe(after);
    // The next week starts afresh, and remembers the last.
    s = plancheAdvance(S, s, WED + 7 * DAY + HOUR);
    expect(s.muda?.monday).toBe(T0 + 7 * DAY);
    expect(s.muda?.last).toMatchObject({ monday: T0, units: 90, passed: 2 });
  });

  it("gives back what was loaded when no strait is passed", () => {
    const S = setup();
    let s = sailing(S);
    const ana = s.houses.ana?.ducats ?? 0n;
    s = plancheAdvance(S, s, SUN + 9 * HOUR);
    expect(s.houses.ana?.ducats).toBe(ana + 3_000n);
  });
});
