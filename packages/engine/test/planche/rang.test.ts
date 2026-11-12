import { describe, expect, it } from "vitest";
import {
  type PlancheSetup,
  type PlancheState,
  plancheAdvance,
  plancheClaim,
  plancheDuel,
  plancheForced,
  plancheInit,
  plancheInvariant,
  plancheLaurel,
  plancheMayChallenge,
  plancheRepelled,
  plancheStanding,
  plancheThread,
  plancheTrend,
  plancheWeekDuel,
} from "../../src/index.js";

const HOUR = 3_600_000;
const DAY = 24 * HOUR;
const WEEK = 7 * DAY;

/** The fixture's board with a rank: four houses, three towns, two passages. */
function setup(): PlancheSetup {
  const want = (price: number) => ({ price, floorBps: 2_000, cap: 400, regenPerHour: 20 });
  return {
    width: 14,
    height: 10,
    sliceMs: HOUR,
    goods: { verre: "Verre" },
    houses: [
      { id: "ana", name: "Ana", robot: false, x: 5, y: 4, makes: { verre: 30 } },
      { id: "ben", name: "Ben", robot: true, x: 6, y: 5, makes: { verre: 30 } },
      { id: "cid", name: "Cid", robot: true, x: 7, y: 4, makes: { verre: 30 } },
      { id: "dan", name: "Dan", robot: false, x: 6, y: 3, makes: { verre: 30 } },
    ],
    cities: [
      { id: "padoue", name: "Padoue", x: 1, y: 4, via: [], wants: { verre: want(1_000) } },
      { id: "trevise", name: "Trévise", x: 5, y: 0, via: [], wants: { verre: want(1_000) } },
      { id: "raguse", name: "Raguse", x: 12, y: 8, via: ["segna"], wants: { verre: want(1_500) } },
    ],
    passages: [
      {
        id: "segna",
        name: "Segna",
        x: 9,
        y: 6,
        holder: "corsair:ivo",
        tollBps: 0,
        board: "segna",
        seals: 1,
        peril: 3,
      },
      {
        id: "lido",
        name: "Lido",
        x: 4,
        y: 6,
        holder: "corsair:dragut",
        tollBps: 0,
        board: "lido",
        seals: 1,
      },
    ],
    rules: {
      bobbins: 3,
      store: 500,
      startStock: 200,
      startDucats: 0,
      threadPerHour: 10,
      patinaBpsPerDay: 0,
      patinaMaxBps: 0,
      tollMaxBps: 1_500,
      tollBurnBps: 3_000,
      freeAfterForceMs: DAY,
      rewindMsPerTile: 60_000,
    },
    rank: {
      tideWeeks: 2,
      weekMs: WEEK,
      negoceMinMs: DAY,
      coteStart: 1_200,
      coteK: 32,
      repelledHours: 12,
    },
  };
}
const T0 = Date.parse("2026-11-16T00:00:00Z");
const thread = (S: PlancheSetup, s: PlancheState, h: string, c: string) =>
  plancheThread(S, s, h, c, "verre", s.now);
const place = (S: PlancheSetup, s: PlancheState, h: string) =>
  plancheStanding(S, s).find((r) => r.house === h)?.place;

// The rank, the laurels and the rival of the week (docs/plan-classement.md, CADRAGE-v4 § 10).
describe("the rank and its laurels", () => {
  it("starts everyone level: the same place, no laurel, a rival for each person", () => {
    const S = setup();
    const s = plancheInit(S, T0);
    expect(plancheStanding(S, s).map((r) => r.place)).toEqual([1, 1, 1, 1]);
    expect(s.rank.humans.sort()).toEqual(["ana", "dan"]);
    expect(s.rank.rivals.ana).toBeDefined();
    expect(s.rank.rivals.ben).toBeUndefined();
    expect(s.rank.laurels).toBeNull();
  });

  it("weighs the Négoce by the hour of bobbin, not by size", () => {
    const S = setup();
    let s = plancheInit(S, T0);
    // Ana stretches two threads to the cheap towns; Ben one to the dear one, past Cid's tower.
    s = thread(S, s, "ana", "padoue");
    s = thread(S, s, "ana", "trevise");
    s = plancheForced(S, s, "cid", "segna", s.now);
    s = thread(S, s, "ben", "raguse");
    s = plancheAdvance(S, s, T0 + 3 * DAY);
    const negoce = plancheLaurel(S, s, "negoce");
    const ana = negoce.find((r) => r.house === "ana");
    const ben = negoce.find((r) => r.house === "ben");
    expect(s.houses.ana?.rank.earned).toBeGreaterThan(s.houses.ben?.rank.earned ?? 0n);
    expect(ben?.score).toBeGreaterThan(ana?.score ?? 0n);
    expect(ben?.place).toBe(1);
    expect(plancheInvariant(s)).toBe(true);
  });

  it("leaves out of the Négoce whoever has not held a day of thread", () => {
    const S = setup();
    let s = thread(S, plancheInit(S, T0), "ana", "padoue");
    s = plancheAdvance(S, s, T0 + 6 * HOUR);
    const ana = plancheLaurel(S, s, "negoce").find((r) => r.house === "ana");
    expect(ana?.ranked).toBe(false);
    expect(ana?.place).toBe(4);
  });

  it("counts the Garde in hours held, by the peril of the tower, and assaults repelled", () => {
    const S = setup();
    let s = plancheForced(S, plancheInit(S, T0), "ana", "segna", T0);
    s = plancheForced(S, s, "dan", "lido", T0);
    s = plancheAdvance(S, s, T0 + 10 * HOUR);
    const garde = plancheLaurel(S, s, "garde");
    expect(garde.find((r) => r.house === "ana")?.score).toBe(30n);
    expect(garde.find((r) => r.house === "dan")?.score).toBe(10n);
    s = plancheRepelled(S, s, "lido");
    s = plancheRepelled(S, s, "lido");
    expect(plancheLaurel(S, s, "garde").find((r) => r.house === "dan")?.score).toBe(34n);
    expect(plancheLaurel(S, s, "garde")[0]?.house).toBe("dan");
  });

  it("moves the cote of the Passe between people only, less each time the same pair meets", () => {
    const S = setup();
    let s = plancheInit(S, T0);
    expect(() => plancheDuel(S, s, "ana", "ben")).toThrow("planche_not_person");
    s = plancheDuel(S, s, "ana", "dan");
    const first = (s.houses.ana?.rank.cote ?? 0) - 1_200;
    expect(first).toBeGreaterThan(0);
    expect(s.houses.dan?.rank.cote).toBe(1_200 - first);
    const before = s.houses.ana?.rank.cote ?? 0;
    s = plancheDuel(S, s, "ana", "dan");
    const second = (s.houses.ana?.rank.cote ?? 0) - before;
    expect(second).toBeGreaterThan(0);
    expect(second).toBeLessThanOrEqual(Math.ceil(first / 2));
    expect(plancheLaurel(S, s, "passe")[0]?.house).toBe("ana");
  });

  it("lets two people challenge each other by the thread once a week (docs/plan-hex-commerce.md H5)", () => {
    const S = setup();
    let s = plancheInit(S, T0);
    expect(plancheMayChallenge(s, "ana", "ben")).toBe("planche_not_person");
    expect(plancheMayChallenge(s, "ana", "ana")).toBe("planche_unknown");
    expect(plancheMayChallenge(s, "ana", "dan")).toBeUndefined();
    s = plancheDuel(S, s, "dan", "ana");
    expect(plancheMayChallenge(s, "ana", "dan")).toBe("planche_defi_week");
    // A new week, a new challenge.
    s = plancheAdvance(S, s, T0 + WEEK + HOUR);
    expect(plancheMayChallenge(s, "dan", "ana")).toBeUndefined();
  });

  it("crowns as Doge the smallest sum of the three places", () => {
    const S = setup();
    let s = plancheForced(S, plancheInit(S, T0), "dan", "lido", T0);
    s = plancheDuel(S, s, "dan", "ana");
    s = thread(S, s, "dan", "padoue");
    s = thread(S, s, "ana", "trevise");
    s = plancheAdvance(S, s, T0 + 2 * DAY);
    const standing = plancheStanding(S, s);
    expect(standing[0]?.house).toBe("dan");
    expect(standing[0]?.place).toBe(1);
    expect(standing[0]?.places.garde).toBe(1);
  });

  it("tells the trend since the day began", () => {
    const S = setup();
    let s = plancheAdvance(S, plancheInit(S, T0), T0 + DAY);
    s = plancheForced(S, s, "cid", "lido", s.now);
    s = plancheAdvance(S, s, T0 + DAY + 3 * HOUR);
    expect(place(S, s, "cid")).toBe(1);
    expect(plancheTrend(S, s, "cid")).toBe(0);
    s = plancheAdvance(S, s, T0 + 2 * DAY);
    // A new day: the mark is today's.
    expect(plancheTrend(S, s, "cid")).toBe(0);
    s = plancheForced(S, s, "ana", "segna", s.now);
    s = plancheAdvance(S, s, T0 + 2 * DAY + 14 * HOUR);
    expect(plancheTrend(S, s, "ana")).toBeGreaterThan(0);
  });
});

describe("the rival of the week", () => {
  it("names a person above before the computer's houses, from the first day", () => {
    const S = setup();
    const s = plancheInit(S, T0);
    // All level, in the order of their names: Ben and Cid stand between Ana and Dan.
    expect(s.rank.rivals.ana).toBe("dan");
    expect(s.rank.rivals.dan).toBe("ana");
  });

  it("never names the same rival two weeks in a row", () => {
    const S = setup();
    let s = plancheAdvance(S, plancheInit(S, T0), T0 + WEEK);
    expect(s.rank.rivals.ana).toBe("ben");
    expect(s.rank.rivals.dan).toBe("cid");
    s = plancheAdvance(S, s, T0 + 2 * WEEK);
    expect(s.rank.rivals.ana).toBe("dan");
  });

  it("names the one just above who leads, the first the one just under", () => {
    const S = setup();
    let s = plancheForced(S, plancheInit(S, T0), "dan", "segna", T0);
    s = plancheForced(S, s, "ben", "lido", T0);
    s = plancheAdvance(S, s, T0 + WEEK);
    expect(plancheStanding(S, s)[0]?.house).toBe("dan");
    // Dan's rival was Ana: now the one under him is Ben, of the computer.
    expect(s.rank.rivals.dan).toBe("ben");
    s = plancheAdvance(S, s, T0 + 2 * WEEK);
    expect(s.rank.rivals.ana).toBe("dan");
  });

  it("settles the week on the towns both serve: the winner hangs the other's flag", () => {
    const S = setup();
    let s = plancheInit(S, T0);
    expect(s.rank.rivals.ana).toBe("dan");
    // Both serve Padoue, Ana a day longer; her Trévise does not count.
    s = thread(S, s, "ana", "padoue");
    s = thread(S, s, "ana", "trevise");
    s = plancheAdvance(S, s, T0 + DAY);
    s = thread(S, s, "dan", "padoue");
    s = plancheAdvance(S, s, T0 + WEEK - HOUR);
    const ana = s.houses.ana?.rank.week.padoue ?? 0n;
    const dan = s.houses.dan?.rank.week.padoue ?? 0n;
    expect(ana).toBeGreaterThan(dan);
    expect(dan).toBeGreaterThan(0n);
    // What the screen tells: the towns both serve, and each one's sales there.
    expect(plancheWeekDuel(s, "ana", "dan")).toEqual({ shared: ["padoue"], a: ana, b: dan });
    s = plancheAdvance(S, s, T0 + WEEK);
    expect(s.rank.flags.ana).toEqual(["dan"]);
    expect(s.rank.flags.dan ?? []).toEqual([]);
    expect(s.houses.ana?.rank.week).toEqual({});
  });

  it("counts its weeks from the start it is given, a Monday at midnight", () => {
    const S = setup();
    let s = plancheInit(S, T0 + 6 * HOUR, T0);
    expect(s.rank.tideStart).toBe(T0);
    s = plancheAdvance(S, s, T0 + WEEK - HOUR);
    expect(s.rank.week).toBe(0);
    s = plancheAdvance(S, s, T0 + WEEK);
    expect(s.rank.week).toBe(1);
  });

  it("counts a house a person takes as a person from then on", () => {
    const S = setup();
    let s = plancheClaim(S, plancheInit(S, T0), "cid");
    expect(s.rank.humans).toContain("cid");
    // Its rival at once: a person, the nearest above it (all level, in the order of names).
    expect(s.rank.rivals.cid).toBe("ana");
    s = plancheAdvance(S, s, T0 + WEEK);
    expect(s.rank.rivals.cid).toBeDefined();
    expect(() => plancheClaim(S, s, "nobody")).toThrow("planche_unknown");
  });
});

describe("the end of a tide", () => {
  it("proclaims the laurels and the Doge, then starts every rank again from nothing", () => {
    const S = setup();
    let s = plancheForced(S, plancheInit(S, T0), "dan", "segna", T0);
    s = plancheDuel(S, s, "ana", "dan");
    s = thread(S, s, "ben", "padoue");
    s = plancheAdvance(S, s, T0 + 2 * WEEK);
    expect(s.rank.tide).toBe(1);
    expect(s.rank.laurels?.garde).toBe("dan");
    expect(s.rank.laurels?.passe).toBe("ana");
    expect(s.rank.laurels?.negoce).toBe("ben");
    expect(s.rank.laurels?.doge).toBeDefined();
    expect(s.houses.ana?.rank.cote).toBe(1_200);
    expect(s.houses.dan?.rank.guardMs).toBe(0);
    expect(s.houses.ben?.rank.earned).toBe(0n);
    // What does not move: the purse, the threads, the tower.
    expect(s.houses.ben?.ducats).toBeGreaterThan(0n);
    expect(s.houses.ben?.threads).toHaveLength(1);
    expect(s.passages.segna?.holder).toBe("dan");
    expect(plancheInvariant(s)).toBe(true);
  });
});

// The rank in a lagoon of sestieri (docs/plan-lagunes.md G2): one's place among one's neighbours.
describe("the rank by sestiere", () => {
  /** The fixture's board in two sestieri: Ana and Ben in the north, Cid and Dan in the south. */
  const split = (): PlancheSetup => {
    const S = setup();
    return {
      ...S,
      houses: S.houses.map((h) => ({
        ...h,
        sestiere: h.id === "ana" || h.id === "ben" ? "nord" : "sud",
      })),
    };
  };

  it("names a rival among one's own sestiere only", () => {
    const S = split();
    const s = plancheInit(S, T0);
    // Ana and Dan are people, but not neighbours: each has the computer's house of their sestiere.
    expect(s.rank.rivals.ana).toBe("ben");
    expect(s.rank.rivals.dan).toBe("cid");
  });

  it("ranks a sestiere apart, and the lagoon whole for the Doge", () => {
    const S = split();
    let s = plancheForced(S, plancheInit(S, T0), "dan", "segna", T0);
    s = plancheForced(S, s, "ben", "lido", T0);
    s = plancheAdvance(S, s, T0 + DAY);
    const nord = plancheStanding(S, s, "nord");
    expect(nord.map((r) => r.house)).toEqual(["ben", "ana"]);
    expect(nord.map((r) => r.place)).toEqual([1, 2]);
    const sud = plancheStanding(S, s, "sud");
    expect(sud[0]?.house).toBe("dan");
    // The lagoon's Doge: the perilous tower of Dan weighs more than Ben's.
    expect(plancheStanding(S, s)[0]?.house).toBe("dan");
    expect(plancheStanding(S, s)).toHaveLength(4);
  });

  it("tells the trend of one's place in one's sestiere", () => {
    const S = split();
    let s = plancheAdvance(S, plancheInit(S, T0), T0 + DAY);
    s = plancheForced(S, s, "ana", "lido", s.now);
    s = plancheAdvance(S, s, T0 + DAY + 5 * HOUR);
    // Ana was level with Ben this morning (1st); she still is 1st, now alone.
    expect(plancheTrend(S, s, "ana")).toBe(0);
    expect(plancheTrend(S, s, "ben")).toBe(-1);
  });
});
