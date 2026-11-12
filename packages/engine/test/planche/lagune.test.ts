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

/** The fixture's lagoon: three sestieri of four houses, a few towns of each ring. */
function params(): LagoonParams {
  return {
    sestieri: [
      { id: "nord", name: "Nord" },
      { id: "centre", name: "Centre" },
      { id: "sud", name: "Sud" },
    ],
    housesPerSestiere: 4,
    column: 10,
    houseNames: ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L"],
    plans: [["kiln"], ["press"]],
    soils: [{ pre: 1 }],
    makes: { verre: 10 },
    sestiereTowns: 2,
    towns: {
      sestiere: [
        { name: "Bourg", wants: { verre: want(1_000) } },
        { name: "Hameau", wants: { verre: want(900) } },
      ],
      lagoon: [{ name: "Marché", wants: { verre: want(1_500) } }],
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

// The lagoons of 48 houses (docs/plan-lagunes.md G1): one map, drawn by the engine.
describe("the lagoon's map", () => {
  it("places every house of every sestiere on a tile of its own, in the water", () => {
    const S = plancheLagoon(params());
    expect(S.houses).toHaveLength(12);
    const spots = new Set(S.houses.map((h) => `${h.x},${h.y}`));
    expect(spots.size).toBe(12);
    for (const id of ["nord", "centre", "sud"])
      expect(S.houses.filter((h) => h.sestiere === id)).toHaveLength(4);
    // Nothing is laid on another thing, nor off the board.
    const all = [...S.houses, ...S.cities, ...S.passages].map((p) => `${p.x},${p.y}`);
    expect(new Set(all).size).toBe(all.length);
    for (const p of [...S.houses, ...S.cities, ...S.passages]) {
      expect(p.x).toBeGreaterThanOrEqual(0);
      expect(p.x).toBeLessThan(S.width);
      expect(p.y).toBeGreaterThanOrEqual(0);
      expect(p.y).toBeLessThan(S.height);
    }
  });

  it("gives each sestiere its towns, its mouth, and the same distances as the others", () => {
    const S = plancheLagoon(params());
    for (const id of ["nord", "centre", "sud"]) {
      expect(S.cities.filter((c) => c.sestiere === id)).toHaveLength(2);
      expect(S.passages.filter((p) => p.id === `bouche-${id}`)).toHaveLength(1);
    }
    // The houses of each sestiere stand as far from their towns and their mouth as any other's.
    const far = (id: string) => {
      const hs = S.houses.filter((h) => h.sestiere === id);
      const near = S.cities.filter((c) => c.sestiere === id);
      const mouth = S.passages.find((p) => p.id === `bouche-${id}`);
      const d = (a: { x: number; y: number }, b: { x: number; y: number }) =>
        Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
      const sum = hs.reduce(
        (n, h) => n + near.reduce((m, c) => m + d(h, c), 0) + (mouth ? d(h, mouth) : 0),
        0,
      );
      return sum;
    };
    expect(far("centre")).toBe(far("nord"));
    expect(far("sud")).toBe(far("nord"));
  });

  it("puts the towns in three rings: near ones free, the lagoon's behind a canal, the open sea's behind a strait", () => {
    const S = plancheLagoon(params());
    const ring = (r: string) => S.cities.filter((c) => c.ring === r);
    expect(ring("sestiere").every((c) => c.via.length === 0)).toBe(true);
    expect(ring("lagoon").length).toBeGreaterThan(0);
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
});

// The lagoon's land, for the board's drawing (docs/plan-lagunes.md G5).
describe("the lagoon's land", () => {
  it("bears every town, and no house nor tower; the open sea darkens toward the south", () => {
    const S = plancheLagoon(params());
    const L = plancheLagoonLand(S);
    for (const c of S.cities) expect(L.land(c.x, c.y)).toBe(true);
    for (const p of [...S.houses, ...S.passages]) expect(L.land(p.x, p.y)).toBe(false);
    const h = S.houses[0];
    const far = S.passages.find((p) => p.id.startsWith("detroit-"));
    if (!h || !far) throw new Error("no house");
    expect(L.peril(h.x, h.y)).toBe(0);
    expect(L.peril(far.x, far.y)).toBeGreaterThan(0.5);
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
