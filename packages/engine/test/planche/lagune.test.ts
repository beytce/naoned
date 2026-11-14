import { describe, expect, it } from "vitest";
import {
  type LagoonParams,
  plancheAdvance,
  plancheForced,
  plancheInit,
  plancheInvariant,
  plancheLagoon,
  plancheLagoonLand,
  plancheRobot,
  plancheRouteOpen,
  plancheThread,
} from "../../src/index.js";

const HOUR = 3_600_000;
const T0 = Date.parse("2026-11-16T00:00:00Z");
const want = (price: number) => ({ price, floorBps: 3_000, cap: 200, regenPerHour: 10 });

/**
 * The fixture's lagoon: four sestieri of four houses round a market, the quarter given for the
 * first (the north-west), a town of the lagoon behind its canal on the northern axis.
 */
function params(): LagoonParams {
  return {
    sestieri: [
      { id: "nord", name: "Nord" },
      { id: "est", name: "Est" },
      { id: "sud", name: "Sud" },
      { id: "ouest", name: "Ouest" },
    ],
    housesPerSestiere: 4,
    half: 12,
    quarter: {
      houses: [
        [-5, -2],
        [-2, -5],
        [-7, -4],
        [-4, -7],
      ],
      towns: [
        [-9, -3],
        [-3, -9],
      ],
      mouth: [-8, -8],
      strait: [-10, -10],
      far: [-12, -12],
    },
    axes: [{ at: [0, -9], canal: [0, -6] }, { at: [0, 0] }],
    houseNames: "ABCDEFGHIJKLMNOP".split(""),
    plans: [["kiln"], ["press"]],
    soils: [{ pre: 1 }],
    makes: { verre: 10 },
    sestiereTowns: 2,
    towns: {
      sestiere: [
        { name: "Bourg", wants: { verre: want(1_000) } },
        { name: "Hameau", wants: { verre: want(900) } },
      ],
      lagoon: [
        { name: "Marché", wants: { verre: want(1_500) } },
        { name: "Halle", wants: { verre: want(600) } },
      ],
      large: [{ name: "Loin", wants: { verre: want(4_000) } }],
    },
    passages: { tollBps: 1_000, seals: 2, bouche: "petit", canal: "petit", strait: "grand" },
    detourBps: 5_000,
    base: {
      sliceMs: HOUR,
      goods: { verre: "Verre" },
      rules: {
        bobbins: 3,
        store: 200,
        startStock: 100,
        startDucats: 0,
        threadPerHour: 10,
        patinaBpsPerDay: 0,
        patinaMaxBps: 0,
        tollMaxBps: 1_500,
        tollBurnBps: 3_000,
        freeAfterForceMs: 24 * HOUR,
        rewindMsPerTile: 60_000,
      },
    },
  };
}

const SESTIERI = ["nord", "est", "sud", "ouest"];
type At = { x: number; y: number };
const steps = (a: At, b: At) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);

// The round lagoon (docs/plan-lagune-ronde.md L1): one quarter, turned for each sestiere.
describe("the lagoon's map", () => {
  it("is a square round its middle, every house on a tile of its own, in the water", () => {
    const S = plancheLagoon(params());
    expect(S.width).toBe(25);
    expect(S.height).toBe(25);
    expect(S.houses).toHaveLength(16);
    for (const id of SESTIERI) expect(S.houses.filter((h) => h.sestiere === id)).toHaveLength(4);
    // Nothing is laid on another thing, nor off the board.
    const all = [...S.houses, ...S.cities, ...S.passages].map((p) => `${p.x},${p.y}`);
    expect(new Set(all).size).toBe(all.length);
    for (const p of [...S.houses, ...S.cities, ...S.passages]) {
      expect(p.x).toBeGreaterThanOrEqual(0);
      expect(p.x).toBeLessThan(S.width);
      expect(p.y).toBeGreaterThanOrEqual(0);
      expect(p.y).toBeLessThan(S.height);
    }
    // A tile of water at least between two islands.
    for (const a of S.houses)
      for (const b of S.houses)
        if (a !== b)
          expect(Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y))).toBeGreaterThanOrEqual(2);
  });

  it("turns the quarter a quarter turn for each sestiere, the first as it is given", () => {
    const S = plancheLagoon(params());
    const at = (id: string) => S.houses.find((h) => h.id === id);
    expect(at("nord-1")).toMatchObject({ x: 7, y: 10 });
    expect(at("est-1")).toMatchObject({ x: 14, y: 7 });
    expect(at("sud-1")).toMatchObject({ x: 17, y: 14 });
    expect(at("ouest-1")).toMatchObject({ x: 10, y: 17 });
    expect(S.passages.find((p) => p.id === "bouche-est")).toMatchObject({ x: 20, y: 4 });
    expect(S.cities.find((c) => c.id === "loin-3")).toMatchObject({ x: 24, y: 24 });
  });

  it("gives each sestiere its towns, its mouth, and exactly the same distances as the others", () => {
    const S = plancheLagoon(params());
    const middle = { x: 12, y: 12 };
    // Every distance that matters from every house: its towns, its passages, its far town, the middle.
    const far = (id: string, k: number) => {
      const hs = S.houses.filter((h) => h.sestiere === id);
      const near = S.cities.filter((c) => c.sestiere === id);
      const mouth = S.passages.find((p) => p.id === `bouche-${id}`);
      const strait = S.passages.find((p) => p.id === `detroit-${id}`);
      const town = S.cities.filter((c) => c.ring === "large")[k];
      if (!mouth || !strait || !town) throw new Error(`no way out of ${id}`);
      expect(near).toHaveLength(2);
      expect(town.via).toEqual([mouth.id, strait.id]);
      return hs
        .map((h) => [...near, mouth, strait, town, middle].map((p) => steps(h, p)).join(","))
        .sort();
    };
    const first = far("nord", 0);
    SESTIERI.forEach((id, k) => expect(far(id, k)).toEqual(first));
  });

  it("lays the lagoon's towns on its axes, in turn, each behind its canal if it has one", () => {
    const S = plancheLagoon(params());
    const market = S.cities.find((c) => c.id === "marche");
    expect(market).toMatchObject({ x: 12, y: 3, ring: "lagoon", via: ["canal-1"] });
    expect(S.passages.find((p) => p.id === "canal-1")).toMatchObject({ x: 12, y: 6 });
    expect(S.cities.find((c) => c.id === "halle")).toMatchObject({ x: 12, y: 12, via: [] });
  });

  it("puts the towns in three rings: near ones free, the lagoon's behind a canal, the open sea's behind a strait", () => {
    const S = plancheLagoon(params());
    const ring = (r: string) => S.cities.filter((c) => c.ring === r);
    expect(ring("sestiere").every((c) => c.via.length === 0)).toBe(true);
    expect(ring("lagoon").length).toBeGreaterThan(0);
    expect(ring("large")).toHaveLength(4);
    expect(ring("large").every((c) => c.via.some((id) => id.startsWith("detroit-")))).toBe(true);
    // Every passage a town names exists.
    const ids = new Set(S.passages.map((p) => p.id));
    for (const c of S.cities) for (const v of c.via) expect(ids.has(v)).toBe(true);
  });

  it("reaches every town without a duel, by a detour", () => {
    const S = plancheLagoon(params());
    expect(S.cities.every((c) => c.via.length === 0 || (c.detourBps ?? 0) > 0)).toBe(true);
  });

  it("is the same map every time it is drawn", () => {
    expect(JSON.stringify(plancheLagoon(params()))).toBe(JSON.stringify(plancheLagoon(params())));
  });

  it("refuses a quarter that does not fit: too many sestieri, too few tiles, a tile off the board", () => {
    const five = params();
    five.sestieri.push({ id: "cinq", name: "Cinq" });
    expect(() => plancheLagoon(five)).toThrow("lagoon_sestieri");
    const few = params();
    few.quarter.houses.pop();
    expect(() => plancheLagoon(few)).toThrow("lagoon_quarter");
    const off = params();
    off.quarter.far = [-13, -12];
    expect(() => plancheLagoon(off)).toThrow("lagoon_off_board");
  });

  it("keeps a board's state: what was played on another drawing of the same places reads on this one", () => {
    const S = plancheLagoon(params());
    // The same houses, towns and passages, laid elsewhere (the columns of before).
    const old = {
      ...S,
      width: 60,
      houses: S.houses.map((h, k) => ({ ...h, x: k * 3, y: 6 })),
      cities: S.cities.map((c, k) => ({ ...c, x: k * 3, y: 1 })),
      passages: S.passages.map((p, k) => ({ ...p, x: k * 3, y: 17 })),
    };
    const h = S.houses[0]?.id ?? "";
    const town = S.cities.find((c) => c.sestiere === "nord")?.id ?? "";
    const before = plancheThread(old, plancheInit(old, T0), h, town, "verre", T0);
    const after = plancheAdvance(S, before, T0 + 5 * HOUR);
    expect(after.houses[h]?.delivered).toBe(50);
    expect(plancheInvariant(after)).toBe(true);
    expect(after).toEqual(plancheAdvance(old, before, T0 + 5 * HOUR));
  });
});

// The lagoon's land, for the board's drawing (docs/plan-lagune-ronde.md L1).
describe("the lagoon's land", () => {
  it("bears every town, and no house nor tower; the same land for each sestiere", () => {
    const S = plancheLagoon(params());
    const L = plancheLagoonLand(S);
    for (const c of S.cities) expect(L.land(c.x, c.y)).toBe(true);
    for (const p of [...S.houses, ...S.passages]) expect(L.land(p.x, p.y)).toBe(false);
    // A shore under each sestiere's towns: land beside them, the middle's water open.
    expect(L.land(4, 9)).toBe(true);
    expect(L.land(9, 9)).toBe(false);
    // Turned a quarter turn, the land is the same (off the axes, where the lagoon's towns lie).
    for (let y = 0; y < S.height; y++)
      for (let x = 0; x < S.width; x++)
        if (Math.abs(x - 12) > 2 && Math.abs(y - 12) > 2)
          expect(L.land(24 - y, x)).toBe(L.land(x, y));
  });

  it("is white in the lagoon and darkens away from the middle, the same all round", () => {
    const S = plancheLagoon(params());
    const L = plancheLagoonLand(S);
    const h = S.houses[0];
    const strait = S.passages.find((p) => p.id.startsWith("detroit-"));
    if (!h || !strait) throw new Error("no house");
    expect(L.peril(h.x, h.y)).toBe(0);
    expect(L.peril(12, 12)).toBe(0);
    expect(L.peril(strait.x, strait.y)).toBeGreaterThan(0.5);
    expect(L.peril(0, 0)).toBe(1);
    expect(L.peril(24, 0)).toBe(L.peril(0, 0));
    expect(L.peril(12, 0)).toBe(L.peril(0, 12));
  });
});

// The detour (docs/audit-progression-2026-11-11/00-audit.md § 7.1): a way round, without a duel.
describe("the detour", () => {
  it("reaches a town behind a shut passage, carrying less, and paying no toll", () => {
    const S = plancheLagoon(params());
    const far = S.cities.find((c) => c.ring === "large");
    const near = S.cities.find((c) => c.ring === "sestiere");
    if (!far || !near) throw new Error("no towns");
    let s = plancheInit(S, T0);
    const h = S.houses[0]?.id ?? "";
    expect(plancheRouteOpen(S, s, h, far.id, T0)).toBe(false);
    expect(() => plancheThread(S, s, h, far.id, "verre", T0)).toThrow("planche_route_shut");
    s = plancheThread(S, s, h, far.id, "verre", T0, { detour: true });
    expect(s.houses[h]?.threads[0]?.detour).toBe(true);
    s = plancheAdvance(S, s, T0 + 10 * HOUR);
    // Half of what a thread carries an hour (10), for ten hours.
    expect(s.houses[h]?.delivered).toBe(50);
    expect(s.houses[h]?.book.tollPaid).toBe(0n);
    expect(plancheInvariant(s)).toBe(true);
    // A town with no passage has no detour to take.
    expect(() =>
      plancheThread(S, plancheInit(S, T0), h, near.id, "verre", T0, { detour: true }),
    ).toThrow("planche_no_detour");
  });

  it("is taken by a house of the computer told to, when it brings more than the open towns", () => {
    const S = plancheLagoon(params());
    const far = S.cities.find((c) => c.ring === "large");
    const h = S.houses[0]?.id ?? "";
    const s0 = plancheInit(S, T0);
    const never = plancheRobot(S, s0, h, T0);
    expect(never.houses[h]?.threads.some((t) => t.to === far?.id)).toBe(false);
    const round = plancheRobot(S, s0, h, T0, 2_500, { detour: true });
    const t = round.houses[h]?.threads.find((x) => x.to === far?.id);
    expect(t?.detour).toBe(true);
    // Its passages opened (forced, their seals all broken), the detour is given up for the route.
    let s = round;
    for (const p of far?.via ?? [])
      for (let k = 0; k < 2; k++) s = plancheForced(S, s, S.houses[1]?.id ?? "", p, T0);
    s = plancheRobot(S, s, h, T0 + HOUR, 2_500, { detour: true });
    expect(s.houses[h]?.threads.some((x) => x.to === far?.id && x.detour)).toBe(false);
  });
});
