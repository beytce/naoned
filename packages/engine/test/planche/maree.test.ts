import { describe, expect, it } from "vitest";
import {
  PASSE_CHAIN,
  PASSE_EMPTY,
  type PlancheSetup,
  type PlancheState,
  plancheAdvance,
  plancheDecret,
  plancheDecretChoose,
  plancheDecretsOffered,
  plancheEncreLine,
  plancheInit,
  plancheNoirBoard,
  planchePrice,
} from "../../src/index.js";

const HOUR = 3_600_000;
const DAY = 24 * HOUR;
const WEEK = 7 * DAY;
// A Monday.
const T0 = Date.parse("2026-11-16T00:00:00Z");

/** A tide of two weeks, the ink, a black strait, the decrees. */
function setup(): PlancheSetup {
  return {
    width: 6,
    height: 10,
    sliceMs: 12 * HOUR,
    goods: { sel: "Sel", verre: "Verre" },
    houses: [
      { id: "ana", name: "Ana", robot: false, x: 2, y: 2, makes: {} },
      { id: "ben", name: "Ben", robot: false, x: 4, y: 2, makes: {} },
    ],
    cities: [
      {
        id: "padoue",
        name: "Padoue",
        x: 1,
        y: 0,
        via: [],
        wants: {
          sel: { price: 100, floorBps: 10_000, cap: 100, regenPerHour: 10 },
          verre: { price: 300, floorBps: 10_000, cap: 100, regenPerHour: 10 },
        },
      },
    ],
    passages: [
      {
        id: "pont",
        name: "Le pont",
        x: 2,
        y: 5,
        holder: "corsair:Ivo",
        tollBps: 1_000,
        board: "petit",
        seals: 2,
      },
    ],
    rank: {
      tideWeeks: 2,
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
      push: { tower: 0, noir: 0, beacon: 0 },
      priceBps: 0,
      lossBps: 0,
    },
    noir: {
      minLevel: 1,
      straits: [
        {
          id: "turc",
          name: "Le détroit du Turc",
          power: "turc",
          captain: "Le Kapudan",
          style: "meute",
          x: 1,
          y: 9,
          board: "grand",
          port: "Constantinople",
        },
      ],
      depth: 3,
      phases: [2],
      triesPerDay: 2,
      cargo: [{ level: 1, n: 10 }],
      priceBps: 15_000,
      relicsPerPlan: 3,
      plans: {},
    },
    decrets: { priceBps: 1_000, tollBps: 500, inkLess: 50, noirLess: 1, chooseMs: 3 * DAY },
    rules: {
      bobbins: 3,
      store: 1_000,
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

/** Ana holds the bridge to the end of the first tide. */
function ended(S: PlancheSetup): PlancheState {
  const s = plancheInit(S, T0);
  s.passages.pont = { holder: "ana", tollBps: 1_000, seals: 1, guard: [3] };
  return plancheAdvance(S, s, T0 + 2 * WEEK);
}

// The tide's end and the decrees (docs/plan-maree.md T3).
describe("the tide's end", () => {
  it("engraves a stone for a tower held to the end, gives the open sea back, ebbs the ink", () => {
    const S = setup();
    const s = ended(S);
    expect(s.rank.tide).toBe(1);
    expect(s.houses.ana?.stones).toEqual([{ tide: 0, passage: "pont" }]);
    expect(s.houses.ben?.stones).toBeUndefined();
    expect(s.passages.pont).toEqual({ holder: "corsair:Ivo", tollBps: 1_000, seals: 2 });
    expect(plancheEncreLine(S, s)).toBe(900);
  });
});

describe("the Doge's decrees", () => {
  it("offers three, of three kinds, drawn from the tide", () => {
    const S = setup();
    const a = plancheDecretsOffered(S, 1);
    expect(a).toHaveLength(3);
    expect(new Set(a.map((d) => d.kind)).size).toBe(3);
    expect(plancheDecretsOffered(S, 1)).toEqual(a);
    const s = ended(S);
    expect(s.decret).toMatchObject({ tide: 1, until: T0 + 2 * WEEK + 3 * DAY });
    expect(s.decret?.doge).toBe(s.rank.laurels?.doge);
  });

  it("lets the Doge alone choose, in its three days; then the first holds", () => {
    const S = setup();
    const s = ended(S);
    const doge = s.decret?.doge ?? "";
    const other = doge === "ana" ? "ben" : "ana";
    const now = T0 + 2 * WEEK + DAY;
    expect(plancheDecret(s, now)).toBeNull();
    expect(() => plancheDecretChoose(s, other, 1, now)).toThrow("planche_not_doge");
    expect(() => plancheDecretChoose(s, doge, 1, now + 3 * DAY)).toThrow("planche_decret_done");
    const t = plancheDecretChoose(s, doge, 2, now);
    expect(plancheDecret(t, now)).toEqual(s.decret?.offered[2]);
    expect(() => plancheDecretChoose(t, doge, 1, now)).toThrow("planche_decret_done");
    // Without a choice, the first, once the three days are past.
    expect(plancheDecret(s, now + 3 * DAY)).toEqual(s.decret?.offered[0]);
  });

  it("changes the rule it names: a town's price, the tolls, the ink, a black strait's guard", () => {
    const S = setup();
    const s = ended(S);
    const now = T0 + 2 * WEEK + HOUR;
    const pick = (kind: string) => {
      const k = s.decret?.offered.findIndex((d) => d.kind === kind) ?? -1;
      if (k < 0) return null;
      return plancheDecretChoose(s, s.decret?.doge ?? "", k, now);
    };
    const prix = pick("prix");
    if (prix) {
      const d = plancheDecret(prix, now);
      if (d?.kind !== "prix") throw new Error("not a price");
      const base = planchePrice(S, s, d.city, d.good);
      expect(planchePrice(S, { ...prix, now }, d.city, d.good)).toBe(Math.floor(base * 1.1));
    }
    const encre = pick("encre");
    if (encre) {
      const t = plancheAdvance(S, encre, T0 + 3 * WEEK);
      expect(plancheEncreLine(S, t)).toBe(850);
    }
    const noir = pick("noir");
    if (noir) {
      const cells = plancheNoirBoard(S, noir, "turc", now, Array(81).fill(PASSE_EMPTY));
      expect(cells.filter((c) => c === PASSE_CHAIN)).toHaveLength(1);
    }
    expect([prix, encre, noir].filter(Boolean).length).toBeGreaterThanOrEqual(2);
  });
});
