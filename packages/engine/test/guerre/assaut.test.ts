import { describe, expect, it } from "vitest";
import {
  type AssautFleetShip,
  type AssautPort,
  type AssautRules,
  assautInit,
  assautIntents,
  assautPlay,
  assautReplay,
  assautResult,
} from "../../src/index.js";

/** The fixture's rules: a tower fires 3, a battery 1 on every ship, two galleys break a chain. */
const R: AssautRules = {
  manches: 3,
  tower: { fire: 3 },
  battery: { fire: 1 },
  hulls: { tour: 6, batterie: 3 },
  chainBreakers: 2,
  reinforcements: { n: 2, force: 2, hull: 4 },
  ruseManche: { chaine: 2, renforts: 3 },
};
const ship = (
  id: number,
  kind: string,
  force: number,
  hull: number,
  keyword: string,
): AssautFleetShip => ({
  id,
  kind,
  force,
  hull,
  keyword,
});
const galere = (id: number) => ship(id, "galere", 2, 4, "solide");
const brigantin = (id: number) => ship(id, "brigantin", 2, 2, "rapide");
const brulot = (id: number) => ship(id, "brulot", 0, 1, "brule");
const galeasse = (id: number) => ship(id, "galeasse", 4, 3, "bombarde");
const escorte = (id: number) => ship(id, "escorte", 0, 3, "repare");
const port = (p: Partial<AssautPort["passes"]>): AssautPort => ({
  passes: { bouche: { defenses: [] }, nord: { defenses: [] }, sud: { defenses: [] }, ...p },
});

// The assault in three passes and three rounds (docs/plan-guerre.md W1, 01-audit-guerre.md § 4).
describe("the assault", () => {
  it("fights a tower round after round: it fires on the galley first, falls, and breaks a seal", () => {
    let s = assautInit(R, port({ bouche: { defenses: ["tour"] } }), [brigantin(1), galere(2)]);
    expect(assautIntents(R, s).bouche).toEqual([{ kind: "tour", does: "fire", target: "solide" }]);
    s = assautPlay(R, s, { 1: "bouche", 2: "bouche" });
    // The tower hit the galley (4 − 3); both ships hit the tower (6 − 4).
    expect(s.ships[2]?.hull).toBe(1);
    expect(s.passes.bouche?.towers[0]?.hull).toBe(2);
    s = assautPlay(R, s, {});
    expect(s.ships[2]?.sunk).toBe(true);
    expect(s.passes.bouche?.towers).toHaveLength(0);
    s = assautPlay(R, s, {});
    const r = assautResult(R, s);
    // The mouth fell (a ship afloat past it); the other passes were never entered.
    expect(r.seals).toBe(1);
    expect(r.damaged).toEqual([2]);
    expect(r.damageBps).toBe(10_000);
    expect(r.over).toBe(true);
  });

  it("is held by a chain: one galley waits outside; two break it; a fireship burns it", () => {
    const p = port({ nord: { defenses: ["chaine", "tour"] } });
    let one = assautInit(R, p, [galere(1)]);
    one = assautPlay(R, one, { 1: "nord" });
    expect(one.passes.nord?.chain).toBe(true);
    expect(one.passes.nord?.towers[0]?.hull).toBe(6);
    let two = assautPlay(R, assautInit(R, p, [galere(1), galere(2)]), { 1: "nord", 2: "nord" });
    expect(two.passes.nord?.chain).toBe(false);
    // Breaking it took their round: the tower is whole.
    expect(two.passes.nord?.towers[0]?.hull).toBe(6);
    two = assautPlay(R, two, {});
    expect(two.passes.nord?.towers[0]?.hull).toBe(2);
    const fire = assautPlay(R, assautInit(R, p, [brulot(1), galere(2)]), { 1: "nord", 2: "nord" });
    expect(fire.passes.nord?.chain).toBe(false);
    expect(fire.ships[1]?.sunk).toBe(true);
    // The galley went through at once.
    expect(fire.passes.nord?.towers[0]?.hull).toBe(4);
  });

  it("hits every ship of the pass with a battery", () => {
    const s = assautPlay(
      R,
      assautInit(R, port({ sud: { defenses: ["batterie"] } }), [brigantin(1), brigantin(2)]),
      {
        1: "sud",
        2: "sud",
      },
    );
    expect([s.ships[1]?.hull, s.ships[2]?.hull]).toEqual([1, 1]);
    expect(s.passes.sud?.batteries).toHaveLength(0);
  });

  it("doubles a galleass against a tower from the second round, and an escort mends its pass", () => {
    let s = assautInit(R, port({ bouche: { defenses: ["tour"] } }), [galeasse(1), escorte(2)]);
    s = assautPlay(R, s, { 1: "bouche", 2: "bouche" });
    // Round 1: 4 on the tower; the tower hits the first ship (no galley), the escort mends it.
    expect(s.passes.bouche?.towers[0]?.hull).toBe(2);
    expect(s.ships[1]?.hull).toBe(1);
    s = assautPlay(R, s, {});
    expect(s.passes.bouche?.towers).toHaveLength(0);
  });

  it("keeps a ship where it was laid, but a brigantine moves, and a ship held back comes in later", () => {
    let s = assautInit(R, port({}), [galere(1), brigantin(2), galere(3)]);
    s = assautPlay(R, s, { 1: "bouche", 2: "bouche" });
    expect(() => assautPlay(R, s, { 1: "nord" })).toThrow("assaut_fixed");
    s = assautPlay(R, s, { 2: "nord", 3: "sud" });
    expect([s.ships[1]?.at, s.ships[2]?.at, s.ships[3]?.at]).toEqual(["bouche", "nord", "sud"]);
    s = assautPlay(R, s, {});
    expect(assautResult(R, s).seals).toBe(3);
  });
});

describe("the defender's ruses", () => {
  it("raises a chain at the second round, burns the first ship with a hidden fireship, sends two ships at the third", () => {
    // The chain raised: the pass is shut from round 2.
    let c = assautInit(R, port({ bouche: { defenses: ["tour"], ruse: "chaine" } }), [galere(1)]);
    expect(assautIntents(R, c).bouche).toEqual([{ kind: "tour", does: "fire", target: "solide" }]);
    c = assautPlay(R, c, { 1: "bouche" });
    c = assautPlay(R, c, {});
    expect(c.passes.bouche?.chain).toBe(true);
    expect(c.log.some((e) => e.kind === "ruse" && e.ruse === "chaine")).toBe(true);
    // The hidden fireship: the first ship in is burnt, once.
    let b = assautInit(R, port({ nord: { defenses: [], ruse: "brulot" } }), [galere(1), galere(2)]);
    b = assautPlay(R, b, { 1: "nord", 2: "nord" });
    expect(b.ships[1]?.sunk).toBe(true);
    expect(b.ships[2]?.sunk).toBeFalsy();
    // The reinforcements: two ships at anchor at round 3, firing on the first ship.
    let r = assautInit(R, port({ sud: { defenses: [], ruse: "renforts" } }), [galere(1)]);
    r = assautPlay(R, r, {});
    r = assautPlay(R, r, {});
    r = assautPlay(R, r, { 1: "sud" });
    expect(r.ships[1]?.sunk).toBe(true);
    expect(assautResult(R, r).seals).toBe(0);
  });
});

describe("the replay", () => {
  it("gives the same end from the port, the fleet and the three placements", () => {
    const p = port({ bouche: { defenses: ["tour", "batterie"] }, nord: { defenses: ["chaine"] } });
    const fleet = [galere(1), galere(2), brulot(3), brigantin(4)];
    const moves: Record<number, string>[] = [
      { 1: "bouche", 2: "bouche", 3: "nord" },
      { 4: "nord" },
      {},
    ];
    let s = assautInit(R, p, fleet);
    for (const m of moves) s = assautPlay(R, s, m);
    expect(assautReplay(R, p, fleet, moves)).toEqual(s);
    expect(() => assautReplay(R, p, fleet, [{ 9: "bouche" }, {}, {}])).toThrow("assaut_unknown");
  });
});
