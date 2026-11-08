import { describe, expect, it } from "vitest";
import type { TerraView } from "../src/game/types.js";
import { cellCard, focusOf, frontPlan } from "../src/porcellana/terra/play.js";

// The Terraferma's interface on Porcellana's board (lot T5): what a touched cell offers, what a
// front would do, and who stays in focus.
const W = 5;
const at = (i: number, j: number) => j * W + i;

function view(over: Partial<TerraView> = {}): TerraView {
  // Me (0) holds the west, Contarini (1) the east, an ally (2) the north-east corner, Milan (3)
  // one cell far south; the rest is free; a column of water at i = 4, j = 3.
  const owner = Array<number>(20).fill(-1);
  for (const c of [at(0, 1), at(1, 1), at(0, 2), at(1, 2)]) owner[c] = 0;
  for (const c of [at(3, 1), at(3, 2)]) owner[c] = 1;
  owner[at(4, 0)] = 2;
  owner[at(0, 3)] = 3;
  const terrain = "ppppp" + "ppphp" + "ppppp" + "ppppw";
  const holder = (h: Partial<TerraView["holders"][number]>) => ({
    id: "x",
    pseudo: null,
    crest: null,
    bot: false,
    me: false,
    ally: false,
    milan: false,
    nation: null,
    capital: null,
    troops: 0,
    cells: 0,
    ...h,
  });
  return {
    map: { width: W, height: 4, origin: [0, 0], size: 1, grid: "square", terrain, cities: [] },
    holders: [
      holder({ id: "me", me: true, capital: at(0, 1), troops: 80, cells: 4 }),
      holder({ id: "c", pseudo: "Contarini", capital: at(3, 1), troops: 60, cells: 2 }),
      holder({ id: "a", pseudo: "Morosini", ally: true, capital: at(4, 0), troops: 30, cells: 1 }),
      holder({ id: "milan", milan: true, nation: "milan", troops: 200, cells: 1 }),
    ],
    owner,
    fronts: [],
    costs: { [at(2, 1)]: 4, [at(2, 2)]: 4, [at(1, 0)]: 4 },
    buildings: [{ cell: at(1, 2), kind: "bombarda", owner: 0 }],
    me: {
      troops: 80,
      cap: 120,
      cells: 4,
      bombard: { cells: [at(3, 1)], shots: 1 },
    },
    rules: { frontsMax: 3, minShareBps: 1_000 },
    ...over,
  } as unknown as TerraView;
}

describe("what a touched cell offers", () => {
  const v = view();
  it("opens the merchant's lands on its camp, a building site on its own land", () => {
    expect(cellCard(v, at(0, 1)).dock).toBe("lands");
    expect(cellCard(v, at(0, 2)).dock).toBe("build");
  });
  it("aims a bombard that has a shot, else builds", () => {
    expect(cellCard(v, at(1, 2)).dock).toBe("aim");
    const spent = view({
      me: { ...view().me, bombard: { cells: [], shots: 0 } } as TerraView["me"],
    });
    expect(cellCard(spent, at(1, 2)).dock).toBe("build");
  });
  it("launches a front at a cell along the border, with its cost", () => {
    const c = cellCard(v, at(2, 1));
    expect(c.kind).toBe("border");
    expect(c.dock).toBe("front");
    expect(c.cost).toBe(4);
  });
  it("shows a rival or an ally far off, and says free land is too far", () => {
    expect(cellCard(v, at(3, 2))).toMatchObject({ kind: "theirs", dock: "holder", holder: 1 });
    expect(cellCard(v, at(4, 0))).toMatchObject({ kind: "ally", dock: "holder" });
    expect(cellCard(v, at(4, 1))).toMatchObject({ kind: "far", dock: null });
    expect(cellCard(v, at(4, 3))).toMatchObject({ kind: "water", dock: null });
  });
  it("tells the defence of a rival's cell", () => {
    expect(cellCard(v, at(3, 2)).defense).toBe(30);
  });
});

describe("a front's plan", () => {
  it("sends a share of the troops and tells what stays home", () => {
    const p = frontPlan(view(), at(2, 1), 5_000);
    expect(p.sent).toBe(40);
    expect(p.cells).toBe(10);
    expect(p.defenseBefore).toBe(20);
    expect(p.defenseAfter).toBe(10);
    expect(p.ok).toBe(true);
  });
  it("never promises more cells than the rival holds, and tells who comes back", () => {
    const v = view({ costs: { [at(3, 2)]: 5 } });
    const p = frontPlan(v, at(3, 2), 10_000);
    expect(p.sent).toBe(80);
    // 80 troops would pay 16 cells at the first one's price, but Contarini holds 2.
    expect(p.cells).toBe(2);
    expect(p.back).toBe(70);
  });
  it("tells how long the march lasts, slower on free land", () => {
    const rules = { frontsMax: 3, minShareBps: 1_000, cellMinutes: 30, neutralMinutes: 90 };
    const free = frontPlan(view({ rules } as Partial<TerraView>), at(2, 1), 5_000);
    expect(free.hours).toBe(15);
    const rival = frontPlan(
      view({ rules, costs: { [at(3, 2)]: 5 } } as Partial<TerraView>),
      at(3, 2),
      10_000,
    );
    expect(rival.hours).toBe(1);
  });
  it("warns that a first attack on a merchant gives up the camp's safety, and of a bare home", () => {
    const rules = { frontsMax: 3, minShareBps: 1_000, peacefulSafe: true };
    const v = view({ rules, costs: { [at(3, 2)]: 5 } } as Partial<TerraView>);
    expect(frontPlan(v, at(3, 2), 5_000).losesSafety).toBe(true);
    expect(frontPlan(v, at(2, 1), 5_000).losesSafety).toBe(false);
    expect(frontPlan(v, at(3, 2), 10_000).bare).toBe(true);
    expect(frontPlan(v, at(3, 2), 5_000).bare).toBe(false);
  });
  it("is refused when too weak or when the fronts are all out", () => {
    expect(frontPlan(view(), at(2, 1), 400).ok).toBe(false);
    const busy = view({
      fronts: [0, 1, 2].map(
        (k) => ({ id: `f${k}`, owner: 0, mine: true }) as TerraView["fronts"][number],
      ),
    });
    expect(frontPlan(busy, at(2, 1), 5_000).ok).toBe(false);
  });
});

describe("the focus on the merchant", () => {
  it("keeps itself, its allies and its direct neighbours, not the far ones", () => {
    const f = focusOf(view());
    expect(f.has(0)).toBe(true);
    expect(f.has(2)).toBe(true);
    // Milan touches the merchant's land at (0, 3).
    expect(f.has(3)).toBe(true);
    // Contarini does not touch it (a free column between).
    expect(f.has(1)).toBe(false);
  });
});
