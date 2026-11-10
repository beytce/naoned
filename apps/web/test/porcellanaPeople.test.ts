import { describe, expect, it } from "vitest";
import { PEOPLE, peopleOf, portersWay, trimmed } from "../src/porcellana/board/people.js";
import type { BoardScene, BoardTile } from "../src/porcellana/board/scene.js";

// The people of the board (docs/plan-carte-vivante.md, lot 1): each figure has a reason of the game.
const tile = (i: number, j: number, over: Partial<BoardTile>): BoardTile => ({
  key: `${i},${j}`,
  i,
  j,
  water: false,
  model: "lane",
  running: false,
  place: null,
  seed: i * 31 + j * 17 + 1,
  ...over,
});
const place = (id: string, badge?: BoardTile["place"] extends infer P ? unknown : never) =>
  ({
    id,
    target: { kind: "casa" },
    name: id,
    sub: "",
    line: "",
    go: "",
    pin: "",
    ready: false,
    ...(badge ? { badge } : {}),
  }) as NonNullable<BoardTile["place"]>;

function scene(tiles: BoardTile[], roads: BoardScene["roads"] = []): BoardScene {
  return { tileSize: 10, tiles, roads, home: "3,1", horizon: [], horizonReach: 0 };
}

const fondaco = (casa = 1) =>
  tile(3, 1, { model: "fondaco", size: casa, place: place("fondaco:3,1") });
const mill = (over: Partial<BoardTile> = {}) =>
  tile(1, 1, { model: "mill", level: 1, place: place("workshop:w1"), ...over });
/** The mill's road to the Fondaco: two tiles east. */
const road = {
  from: "w1",
  to: "home",
  pts: [
    [15, 15],
    [25, 15],
    [35, 15],
  ] as [number, number][],
};

const count = (s: BoardScene, why: string, budget = 500) =>
  peopleOf(s, budget).filter((w) => w.why === why).length;

describe("a workshop's people", () => {
  it("has no one while it stands idle", () => {
    const s = scene([fondaco(), mill()], [road]);
    expect(count(s, "porter")).toBe(0);
    expect(count(s, "worker")).toBe(0);
    expect(count(s, "waiting")).toBe(0);
  });

  it("has its hands round it and its porters on its road while it works", () => {
    const s = scene([fondaco(), mill({ running: true })], [road]);
    expect(count(s, "worker")).toBe(1);
    expect(count(s, "porter")).toBe(1);
    const porter = peopleOf(s, 500).find((w) => w.why === "porter");
    // There and back, a crate on the way to the Fondaco only.
    expect(porter?.mode).toBe("ping");
    expect(porter?.load).toBe("out");
    // From its doorstep to the Fondaco's, never through a building.
    expect(porter?.pts[0]?.[0]).toBeCloseTo(1.34, 2);
    expect(porter?.pts.at(-1)?.[0]).toBeCloseTo(2.61, 2);
  });

  it("has more of them as it rises, never more than its share", () => {
    const at = (level: number) => scene([fondaco(), mill({ running: true, level })], [road]);
    expect(count(at(8), "porter")).toBe(3);
    expect(count(at(8), "worker")).toBe(2);
    expect(count(at(25), "porter")).toBe(PEOPLE.porters);
    expect(count(at(25), "worker")).toBe(PEOPLE.workers);
  });

  it("sits by its crates while its lots wait for the harvest", () => {
    const s = scene([fondaco(), mill({ lots: 3 })], [road]);
    expect(count(s, "waiting")).toBe(PEOPLE.waiting);
    expect(count(s, "porter")).toBe(0);
    expect(peopleOf(s, 500).find((w) => w.why === "waiting")?.still).toBe(true);
  });

  it("works without porters where no road leads to its Fondaco", () => {
    const s = scene([fondaco(), mill({ running: true })]);
    expect(count(s, "worker")).toBe(1);
    expect(count(s, "porter")).toBe(0);
  });
});

describe("the towns and the house", () => {
  it("gives the Fondaco one more of its people a level", () => {
    expect(count(scene([fondaco(1)]), "house")).toBe(2);
    expect(count(scene([fondaco(5)]), "house")).toBe(6);
    expect(count(scene([fondaco(20)]), "house")).toBe(PEOPLE.house);
  });

  it("fills a town by its size, and by how well it knows the house", () => {
    const town = (over: Partial<BoardTile>) =>
      scene([tile(6, 6, { model: "town", size: 3, place: place("city:padova"), ...over })]);
    expect(count(town({}), "citizen")).toBe(4);
    expect(count(town({ loyalty: 2 }), "citizen")).toBe(8);
    expect(count(town({ size: 5, loyalty: 4 }), "citizen")).toBe(PEOPLE.citizens);
  });

  it("leaves a town the house cannot serve yet to itself", () => {
    const s = scene([
      tile(6, 6, {
        model: "town",
        size: 5,
        place: place("city:milano", { kind: "lock", casa: 6 }),
      }),
    ]);
    expect(count(s, "citizen")).toBe(1);
  });

  it("fills San Marco's piazza with the house's stalls", () => {
    const market = (stalls: number) =>
      scene([
        tile(0, 0, {
          model: "market",
          place: place("city:venezia"),
          stalls: Array.from({ length: stalls }, () => ({ n: 1, hot: false })),
        }),
      ]);
    expect(count(market(0), "citizen")).toBe(4);
    expect(count(market(4), "citizen")).toBe(12);
  });

  it("puts travellers on the road to a town it has served, none before", () => {
    const way = {
      from: "home",
      to: "city:padova",
      pts: [
        [35, 15],
        [45, 15],
        [55, 15],
        [65, 15],
      ] as [number, number][],
    };
    const town = (over: Partial<BoardTile>) =>
      scene(
        [fondaco(), tile(6, 1, { model: "town", size: 3, place: place("city:padova"), ...over })],
        [way],
      );
    expect(count(town({}), "traveller")).toBe(0);
    expect(count(town({ served: 1 }), "traveller")).toBe(1);
    expect(count(town({ served: 30, loyalty: 3 }), "traveller")).toBe(4);
    expect(count(town({ served: 80, loyalty: 4 }), "traveller")).toBe(PEOPLE.travellers);
  });

  it("puts builders on a site", () => {
    expect(count(scene([tile(2, 2, { model: "site", running: true })]), "builder")).toBe(
      PEOPLE.builders,
    );
  });
});

describe("the budget", () => {
  const busy = scene(
    [
      fondaco(9),
      mill({ running: true, level: 12 }),
      tile(6, 6, { model: "town", size: 5, loyalty: 3, place: place("city:padova") }),
      tile(8, 8, { model: "town", size: 2, place: place("city:este") }),
    ],
    [road],
  );

  it("never draws more than it is given", () => {
    expect(peopleOf(busy, 7)).toHaveLength(7);
    expect(peopleOf(busy, 0)).toHaveLength(0);
  });

  it("keeps someone everywhere rather than a crowd in one place", () => {
    // Four places, four people: one each, the workshop's a porter on its road.
    const few = peopleOf(busy, 4);
    expect(few.map((w) => w.why).sort()).toEqual(["citizen", "citizen", "house", "porter"]);
    const towns = few.filter((w) => w.why === "citizen").map((w) => Math.round(w.pts[0]?.[0] ?? 0));
    expect(new Set(towns).size).toBe(2);
  });

  it("is the same at every call", () => {
    expect(peopleOf(busy, 60)).toEqual(peopleOf(busy, 60));
  });

  it("keeps everyone on the board: near a tile, at a walking pace", () => {
    for (const w of peopleOf(busy, 500)) {
      expect(w.speed).toBeGreaterThan(0.03);
      expect(w.speed).toBeLessThan(0.15);
      for (const [x, z] of w.pts) {
        expect(Number.isFinite(x) && Number.isFinite(z)).toBe(true);
        expect(Math.abs(x - Math.round(x))).toBeLessThanOrEqual(0.5);
        expect(Math.abs(z - Math.round(z))).toBeLessThanOrEqual(0.5);
      }
    }
  });
});

describe("a way without its ends", () => {
  it("cuts a doorstep from each end", () => {
    expect(
      trimmed(
        [
          [0, 0],
          [1, 0],
          [2, 0],
        ],
        0.25,
        0.5,
      ),
    ).toEqual([
      [0.25, 0],
      [1, 0],
      [1.5, 0],
    ]);
  });

  it("is nothing when the doorsteps meet", () => {
    expect(
      trimmed(
        [
          [0, 0],
          [0.5, 0],
        ],
        0.3,
        0.3,
      ),
    ).toBeNull();
  });

  it("is the way of a workshop's porters, from its road", () => {
    expect(portersWay(scene([fondaco(), mill()], [road]), "w1")?.length).toBe(3);
    expect(portersWay(scene([fondaco(), mill()]), "w1")).toBeNull();
  });
});
