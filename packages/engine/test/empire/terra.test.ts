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

// The empire's Terraferma: theatres of 2 here, an entry of 5 wheat, 3 loaves of the Republic a
// day; the Contesa with rosters of 2.
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
  },
};
const terraferma = {
  ...testTerraferma,
  live: true,
  start: { ...testTerraferma.start, protectionHours: 0, minDistance: 2, placementHours: 24 },
};

const ALL = ["a", "b", "c", "d"] as const;
type Who = (typeof ALL)[number];
const co: Record<Who, string> = { a: "co1", b: "co1", c: "co2", d: "co2" };

/** Four houses joined, each with 20 wheat; the clock at 1 h past a week's Monday of `parity`. */
function world(parity: "odd" | "even" = "odd") {
  const w = new World(makeContext({ empire, terraferma }));
  for (const p of ALL) {
    w.do({ type: "empireJoin", playerId: p, company: { id: co[p], since: w.now } });
    w.give(p, "wheat", 20);
  }
  toWeek(w, parity);
  return w;
}
function toWeek(w: World, parity: "odd" | "even") {
  let week = carnetWeek(w.now) + 1;
  if (isContesaWeek(week) !== (parity === "even")) week++;
  w.now = terraWeekStart(week) + HOUR;
}
const cmd = (c: Record<string, unknown>) => c as unknown as Command;
const join = (w: World, p: Who) => w.try(cmd({ type: "empireTerraJoin", playerId: p }));
const terra = (w: World, p: Who, action: Record<string, unknown>) =>
  w.try(cmd({ type: "empireTerra", playerId: p, action: { ...action, playerId: p } }));
const error = (res: { ok: boolean; error?: string }) => (res.ok ? "" : res.error);
const theatres = () => (w: World) => w.state.empire?.terra?.theatres ?? [];
const th = theatres();
const house = (w: World, p: Who) => w.state.empire?.houses[p];

/** A neutral cell of a map far from everyone. */
function freeCell(w: World, i: number): number {
  const map = th(w)[i]?.map;
  if (!map) throw new Error("no map");
  const k = map.owner.findIndex(
    (o, c) =>
      o === null &&
      map.map.land[c] &&
      hexNeighbors(map.map, c).length === 6 &&
      map.owner.every((x, j) => x === null || hexDistance(map.map, c, j) >= 3),
  );
  if (k < 0) throw new Error("no free cell");
  return k;
}

describe("the empire's Terraferma", () => {
  it("lets a house enter its band's theatre in the placement window, for its entry in goods", () => {
    const w = world();
    expect(error(join(w, "a"))).toBe("");
    expect(w.state.inventories.a?.wheat?.available).toBe(15);
    expect(error(join(w, "a"))).toBe("already_in_theatre");
    join(w, "b");
    // Two a theatre: the third opens another.
    join(w, "c");
    expect(th(w).map((x) => x.members)).toEqual([["a", "b"], ["c"]]);
    w.advance(DAY);
    expect(error(join(w, "d"))).toBe("placement_closed");
  });

  it("plays its commands on its theatre's map, never the decrees", () => {
    const w = world();
    expect(error(terra(w, "a", { type: "terraPlace", cell: 0 }))).toBe("not_in_theatre");
    join(w, "a");
    const cell = freeCell(w, 0);
    expect(error(terra(w, "a", { type: "terraPlace", cell }))).toBe("");
    expect(th(w)[0]?.map.owner[cell]).toBe("a");
    expect(error(terra(w, "a", { type: "terraDecree", code: "x" }))).toBe("terra_off");
  });

  it("feeds the troops with the Republic's bread first, the same for all", () => {
    const w = world();
    join(w, "a");
    terra(w, "a", { type: "terraPlace", cell: freeCell(w, 0) });
    w.advance(6 * HOUR);
    w.do(cmd({ type: "empireRelaunchAll", playerId: "a" }));
    terra(w, "a", { type: "terraRecall", frontId: "none" });
    const r = th(w)[0]?.rations?.a;
    expect(r?.given ?? 0).toBeLessThanOrEqual(3);
    expect(th(w)[0]?.map.players.a?.unfed).toBeUndefined();
  });

  it("closes its theatres when the week turns: Favour, Seals within the week's cap, a grade", () => {
    const w = world();
    join(w, "a");
    terra(w, "a", { type: "terraPlace", cell: freeCell(w, 0) });
    const favour = house(w, "a")?.favour ?? 0;
    w.advance(7 * DAY);
    w.do(cmd({ type: "empireRelaunchAll", playerId: "a" }));
    expect(th(w)).toHaveLength(0);
    expect((house(w, "a")?.favour ?? 0) - favour).toBe(60);
    expect(house(w, "a")?.seals).toBe(2);
    expect(house(w, "a")?.terraBest).toBe("signore");
  });

  it("sets the Contesa's rosters by Thursday, and pairs the companies on its Monday", () => {
    const w = world("odd");
    const roster = (p: Who, members: Who[]) =>
      w.try(cmd({ type: "empireContesaRoster", playerId: p, members }));
    expect(error(roster("a", ["a"]))).toBe("roster_size");
    expect(error(roster("a", ["a", "c"]))).toBe("not_same_company");
    expect(error(roster("a", ["a", "b"]))).toBe("");
    expect(error(roster("c", ["c", "d"]))).toBe("");
    toWeek(w, "even");
    // The Monday's first reading forms the Contesa's theatres.
    w.do(cmd({ type: "empireRelaunchAll", playerId: "c" }));
    expect(error(join(w, "a"))).toBe("contesa_week");
    const [contesa] = th(w);
    expect(contesa?.kind).toBe("contesa");
    expect([...(contesa?.companies ?? [])].sort()).toEqual(["co1", "co2"]);
    expect(contesa?.map.teamMode).toBe(true);
    terra(w, "a", { type: "terraPlace", cell: freeCell(w, 0) });
    expect(contesa && w.state.empire?.terra?.theatres[0]?.map.players.a?.team).toBe("co1");
    w.advance(7 * DAY);
    w.do(cmd({ type: "empireRelaunchAll", playerId: "a" }));
    expect(w.state.empire?.terra?.honours?.co1).toMatchObject({ trophies: 1, lustre: 10 });
    // The member's Seal, and the winners' one more.
    expect(house(w, "a")?.seals).toBe(2);
  });

  it("closes the roster after Thursday", () => {
    const w = world("odd");
    w.advance(4 * DAY);
    expect(
      error(w.try(cmd({ type: "empireContesaRoster", playerId: "a", members: ["a", "b"] }))),
    ).toBe("roster_closed");
  });
});
