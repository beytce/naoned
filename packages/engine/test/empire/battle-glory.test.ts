import { describe, expect, it } from "vitest";
import {
  type Command,
  type EmpireSettingsInput,
  carnetWeek,
  hexDistance,
  hexNeighbors,
  isContesaWeek,
  terraWeekStart,
} from "../../src/index.js";
import { testEmpire, testTerraferma } from "../fixture.js";
import { DAY, HOUR, World, makeContext } from "../helpers.js";

// The Battle's Glory (docs/plan-terraferme-porcellana.md § 4 nonies, B5): the first ranked Battle
// of the day brings its rank's Glory, among the merchants, to the week's theatre of each; a little
// (the skirmishes' table, calibrated near 10 % of a regular's week), never at night, never alone.
const empire: EmpireSettingsInput = {
  ...testEmpire,
  start: { capitalDucats: 1_000, workshops: [{ type: "farm", recipe: "grow_wheat" }] },
  terra: {
    entry: { wheat: 5 },
    theatreMax: 4,
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
  },
};
const terraferma = {
  ...testTerraferma,
  live: true,
  openHours: { from: 8, to: 22 },
  start: { ...testTerraferma.start, protectionHours: 0, minDistance: 2, placementHours: 24 },
  skirmish: {
    minutes: 12,
    speed: 60,
    stepMinutes: 30,
    players: 8,
    cellsPerPlayer: 12,
    lobbySeconds: 60,
    troops: 40,
    recruit: { base: 2, perCell: 0, perCity: 1 },
    glory: [45, 30, 20, 10],
    rankedPerDay: 1,
    minHumans: 2,
  },
};
const cmd = (c: Record<string, unknown>) => c as unknown as Command;
const refused = (r: { ok: boolean; error?: string }) => (r.ok ? null : r.error);

function theatre() {
  const w = new World(makeContext({ empire, terraferma }));
  for (const id of ["a", "b", "c"]) {
    w.do({ type: "empireJoin", playerId: id });
    w.give(id, "wheat", 20);
  }
  let week = carnetWeek(w.now) + 1;
  if (isContesaWeek(week)) week++;
  w.now = terraWeekStart(week) + HOUR;
  for (const id of ["a", "b"]) {
    w.do(cmd({ type: "empireTerraJoin", playerId: id }));
    const map = w.state.empire?.terra?.theatres[0]?.map;
    if (!map) throw new Error("no theatre");
    const cell = map.owner.findIndex(
      (o, c) =>
        o === null &&
        map.map.land[c] &&
        hexNeighbors(map.map, c).length >= 4 &&
        map.owner.every((x, j) => x === null || hexDistance(map.map, c, j) >= 3),
    );
    w.do(cmd({ type: "empireTerra", playerId: id, action: { type: "terraPlace", cell } }));
  }
  // Ten in the morning: within the Terraferma's open hours.
  w.now = terraWeekStart(week) + 10 * HOUR;
  return w;
}
const glory = (w: World, id: string) =>
  w.state.empire?.terra?.theatres[0]?.map.players[id]?.glory ?? 0;
const pay = (matchId: string, ranks: [string, number][]) =>
  cmd({
    type: "battleGlory",
    matchId,
    ranks: ranks.map(([playerId, g]) => ({ playerId, glory: g })),
  });

describe("the Battle's Glory to the week", () => {
  it("brings the first ranked Battle of the day's Glory to each one's theatre, once", () => {
    const w = theatre();
    // Its twin, paid nothing at the same instant: the map's own Glory set apart.
    const twin = theatre();
    twin.do(
      pay("m0", [
        ["a", 0],
        ["b", 0],
      ]),
    );
    const a0 = glory(twin, "a");
    const b0 = glory(twin, "b");
    w.do(
      pay("m1", [
        ["a", 45],
        ["b", 30],
      ]),
    );
    expect(glory(w, "a") - a0).toBe(45);
    expect(glory(w, "b") - b0).toBe(30);
    expect(w.state.empire?.terra?.battlePaid?.m1).toEqual({ a: 45, b: 30 });
    // A match is paid once.
    expect(
      refused(
        w.try(
          pay("m1", [
            ["a", 45],
            ["b", 30],
          ]),
        ),
      ),
    ).toBe("already_paid");
    // The second Battle of the day is friendly: nothing more.
    const before = glory(w, "a");
    w.do(
      pay("m2", [
        ["b", 45],
        ["a", 30],
      ]),
    );
    expect(glory(w, "a")).toBe(before);
    expect(w.state.empire?.terra?.battlePaid?.m2).toEqual({});
    // The next day, again.
    w.now += DAY;
    w.do(
      pay("m3", [
        ["a", 45],
        ["b", 30],
      ]),
    );
    expect(w.state.empire?.terra?.battlePaid?.m3).toEqual({ a: 45, b: 30 });
  });

  it("pays nobody out of a theatre, never alone, never at night, never above the table", () => {
    const w = theatre();
    // c plays the Battle but is in no theatre: nothing for it, the others paid.
    w.do(
      pay("m1", [
        ["c", 45],
        ["a", 30],
      ]),
    );
    expect(w.state.empire?.terra?.battlePaid?.m1).toEqual({ a: 30 });
    w.now += DAY;
    expect(refused(w.try(pay("m2", [["a", 45]])))).toBe("too_few_humans");
    expect(
      refused(
        w.try(
          pay("m3", [
            ["a", 46],
            ["b", 30],
          ]),
        ),
      ),
    ).toBe("invalid_quantity");
    // Midnight: closed.
    w.now = Math.floor(w.now / DAY) * DAY + 23 * HOUR;
    expect(
      refused(
        w.try(
          pay("m4", [
            ["a", 45],
            ["b", 30],
          ]),
        ),
      ),
    ).toBe("night");
  });
});
