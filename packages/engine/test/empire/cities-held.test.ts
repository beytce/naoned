import { describe, expect, it } from "vitest";
import {
  type Command,
  type EmpireSettingsInput,
  carnetWeek,
  empireView,
  hexDistance,
  hexNeighbors,
  isContesaWeek,
  terraWeekStart,
} from "../../src/index.js";
import { testEmpire, testTerraferma } from "../fixture.js";
import { DAY, HOUR, World, makeContext } from "../helpers.js";

// The cities held (docs/plan-terraferme-porcellana.md § 4 octies, link ⑤): whoever holds a city of
// the board at the week's close plants its banner on it on the map of commerce the next week, and
// takes a letter of the Signoria: Favour for each city, a few at most.
const empire: EmpireSettingsInput = {
  ...testEmpire,
  start: { capitalDucats: 1_000, workshops: [{ type: "farm", recipe: "grow_wheat" }] },
  terra: {
    entry: { wheat: 5 },
    theatreMax: 2,
    rationBread: 3,
    favour: { signore: 60, podium: 30, top10: 15, quarter: 8, participant: 4 },
    seals: { signore: 2, podium: 1 },
    sealsPerWeek: 2,
    contesa: {
      rosterSizes: [2],
      deadlineDay: 3,
      maxCompanies: 4,
      sealsPerMember: 1,
      winnerSeals: 1,
      aloneBps: 5_000,
      lustre: 10,
    },
    cities: { favour: 5, max: 2 },
  },
};
const terraferma = {
  ...testTerraferma,
  live: true,
  start: { ...testTerraferma.start, protectionHours: 0, minDistance: 2, placementHours: 24 },
};
const cmd = (c: Record<string, unknown>) => c as unknown as Command;

function playing(cities: number) {
  const w = new World(makeContext({ empire, terraferma }));
  w.do({ type: "empireJoin", playerId: "a" });
  w.give("a", "wheat", 20);
  let week = carnetWeek(w.now) + 1;
  if (isContesaWeek(week)) week++;
  w.now = terraWeekStart(week) + HOUR;
  w.do(cmd({ type: "empireTerraJoin", playerId: "a" }));
  const map = w.state.empire?.terra?.theatres[0]?.map;
  if (!map) throw new Error("no theatre");
  const cell = map.owner.findIndex(
    (o, c) =>
      o === null &&
      map.map.land[c] &&
      hexNeighbors(map.map, c).length === 6 &&
      map.owner.every((x, j) => x === null || hexDistance(map.map, c, j) >= 3),
  );
  w.do(cmd({ type: "empireTerra", playerId: "a", action: { type: "terraPlace", cell } }));
  // The house holds some of the board's cities (on a copy: the world's state is frozen).
  const state = structuredClone(w.state);
  const m = state.empire?.terra?.theatres[0]?.map;
  if (!m) throw new Error("no map");
  const codes: string[] = [];
  m.map.cityCode.forEach((code, i) => {
    if (code && codes.length < cities) {
      m.owner[i] = "a";
      codes.push(code);
    }
  });
  w.state = state;
  return { w, codes, week };
}

describe("the cities held at the week's close", () => {
  it("plant the house's banner on them the next week, and bring a letter of the Signoria", () => {
    const { w, codes } = playing(1);
    const favour = w.state.empire?.houses.a?.favour ?? 0;
    w.advance(7 * DAY);
    w.do(cmd({ type: "empireRelaunchAll", playerId: "a" }));
    const h = w.state.empire?.houses.a;
    expect(h?.terraCities?.codes).toEqual(codes);
    const gained = (h?.favour ?? 0) - favour;
    // Its tier's Favour, and 5 for its city.
    expect(gained % 5).toBe(0);
    expect(empireView(w.ctx, w.state, "a", w.now)?.terraCities).toEqual(codes);
  });

  it("brings Favour for a few cities at most", () => {
    const one = playing(1);
    const many = playing(4);
    for (const x of [one, many]) {
      x.w.advance(7 * DAY);
      x.w.do(cmd({ type: "empireRelaunchAll", playerId: "a" }));
    }
    const f = (x: typeof one) => x.w.state.empire?.houses.a?.favour ?? 0;
    expect(f(many) - f(one)).toBeLessThanOrEqual(5);
  });

  it("fly a week, then come down", () => {
    const { w } = playing(1);
    w.advance(7 * DAY);
    w.do(cmd({ type: "empireRelaunchAll", playerId: "a" }));
    w.advance(8 * DAY);
    w.do(cmd({ type: "empireRelaunchAll", playerId: "a" }));
    expect(empireView(w.ctx, w.state, "a", w.now)?.terraCities).toEqual([]);
  });
});
