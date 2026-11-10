/**
 * A house to look at (the laboratory, ?lab=porcellana&vue=vivante): a domain grown for a while,
 * built as the server would send it, so that the board's life is judged without playing for a
 * week — workshops of every level at work, idle or waiting for the harvest, a site, the quay,
 * towns that know the house and towns that do not, Venice on its lagoon. Its figures are examples.
 */
import { gridRoad, ownedRoadTiles, tileCentre } from "@comptoirs/engine";
import type { EmpirePayload } from "../../empire/types.js";

const SIZE = 15;
const HOME = "10,10";

export interface DemoOpts {
  /** The Fondaco's level. */
  casa: number;
  /** The lots that waited at the clay pit are taken: its porters carry them home. */
  harvested: boolean;
  /** Every workshop a few levels higher. */
  lift: number;
  /** A plot more bought, east of the domain. */
  bought?: boolean;
  /** The site finished: its mill stands. */
  built?: boolean;
  /** A delivery more paid at Padua. */
  paid?: boolean;
}

const WORKSHOPS: {
  id: string;
  type: string;
  recipe: string;
  tile: string;
  level: number;
  state: "run" | "idle" | "ready";
}[] = [
  { id: "w1", type: "lumber_camp", recipe: "cut_wood", tile: "9,10", level: 3, state: "run" },
  { id: "w2", type: "sawmill", recipe: "saw_planks", tile: "9,9", level: 6, state: "run" },
  { id: "w3", type: "clay_pit", recipe: "dig_clay", tile: "11,10", level: 2, state: "ready" },
  { id: "w4", type: "brickworks", recipe: "fire_bricks", tile: "11,9", level: 9, state: "run" },
  { id: "w5", type: "farm", recipe: "grow_wheat", tile: "10,11", level: 12, state: "run" },
  { id: "w6", type: "mill", recipe: "mill_flour", tile: "9,11", level: 1, state: "idle" },
  { id: "w7", type: "glassworks", recipe: "blow_glass", tile: "10,9", level: 16, state: "run" },
  { id: "w8", type: "sand_pit", recipe: "dig_sand", tile: "8,9", level: 4, state: "run" },
];
const OUTPUT: Record<string, string> = {
  cut_wood: "wood",
  saw_planks: "planks",
  dig_clay: "clay",
  fire_bricks: "bricks",
  grow_wheat: "wheat",
  mill_flour: "flour",
  blow_glass: "glass",
  dig_sand: "sand",
};
const OWNED = [
  "8,9",
  "9,9",
  "10,9",
  "11,9",
  "12,9",
  "8,10",
  "9,10",
  "10,10",
  "11,10",
  "12,10",
  "13,10",
  "8,11",
  "9,11",
  "10,11",
  "11,11",
  "12,11",
  "10,8",
  "7,10",
];
const TOWNS = [
  { code: "padova", cell: "14,10", size: 3 },
  { code: "treviso", cell: "10,7", size: 2 },
  { code: "vicenza", cell: "6,10", size: 4 },
  { code: "venezia", cell: "12,13", size: 5 },
  { code: "verona", cell: "5,7", size: 4 },
];
const SEA = [
  "9,12",
  "10,12",
  "11,12",
  "12,12",
  "13,12",
  "14,12",
  "11,13",
  "13,13",
  "14,13",
  "11,14",
  "12,14",
  "13,14",
  "10,13",
];

const TERRAIN: Record<string, string> = {
  "9,10": "forest",
  "10,11": "fields",
  "12,9": "forest",
  "12,10": "pasture",
  "13,10": "fields",
  "8,11": "clay",
  "12,11": "sand",
  "10,8": "pasture",
  "7,10": "forest",
  "13,9": "clay",
  "7,9": "forest",
  "8,8": "fields",
  "9,8": "clay",
  "11,8": "pasture",
  "12,8": "forest",
  "13,11": "sand",
  "7,11": "fields",
  "8,12": "sand",
  "6,9": "forest",
  "13,8": "fields",
};

const point = (cell: string): [number, number] => {
  const [x, y] = tileCentre(cell, SIZE);
  return [x, y];
};

export function demoPayload(now: number, o: DemoOpts): EmpirePayload {
  const land: Record<string, { region: string; coast?: boolean }> = {};
  for (let i = 3; i <= 16; i++)
    for (let j = 5; j <= 13; j++) {
      const k = `${i},${j}`;
      if (!SEA.includes(k) && k !== "12,13") land[k] = { region: "veneto" };
    }
  land["12,13"] = { region: "veneto", coast: true };
  const sq = { tileSize: SIZE, tiles: land };
  const owned = new Set(o.bought ? [...OWNED, "13,9"] : OWNED);
  const shops = o.built
    ? [
        ...WORKSHOPS,
        {
          id: "w9",
          type: "mill",
          recipe: "mill_flour",
          tile: "8,10",
          level: 1,
          state: "run" as const,
        },
      ]
    : WORKSHOPS;
  const townTiles = new Set(TOWNS.map((t) => t.cell));
  const road = (from: string, to: string) => {
    const through = ownedRoadTiles(from, to, sq, townTiles, owned);
    return through ? gridRoad(point(from), point(to), sq, townTiles, through) : null;
  };
  const roads: { from: string; to: string; pts: [number, number][] }[] = [];
  for (const w of shops) {
    const pts = road(w.tile, HOME);
    if (pts) roads.push({ from: w.id, to: "home", pts });
  }
  for (const t of TOWNS) {
    const pts = road(HOME, t.cell);
    if (pts) roads.push({ from: "home", to: `city:${t.code}`, pts });
  }
  const quay = road("11,11", HOME);
  if (quay) roads.push({ from: "depot", to: "home", pts: quay });

  const hour = 3_600_000;
  const workshops = shops.map((w) => ({
    id: w.id,
    type: w.type,
    recipe: w.recipe,
    level: w.level + o.lift,
    tile: w.tile,
    job:
      w.state === "run"
        ? { recipe: w.recipe, startedAt: now - hour / 3, batches: 4, level: w.level, batchMs: hour }
        : w.state === "ready" && !o.harvested
          ? {
              recipe: w.recipe,
              startedAt: now - 4 * hour,
              batches: 3,
              level: w.level,
              batchMs: hour,
            }
          : null,
  }));
  const buyable = Object.keys(land)
    .filter((k) => !owned.has(k) && !townTiles.has(k))
    .filter((k) => {
      const [i = 0, j = 0] = k.split(",").map(Number);
      return [`${i},${j - 1}`, `${i + 1},${j}`, `${i},${j + 1}`, `${i - 1},${j}`].some((n) =>
        owned.has(n),
      );
    })
    .map((cell) => ({ cell, region: "veneto", coast: false, casa: 1 }));
  const types = [...new Set(WORKSHOPS.map((w) => w.type))];
  const cities = TOWNS.map((t) => {
    const [x, y] = point(t.cell);
    return { code: t.code, cell: t.cell, region: "veneto", x, y, size: t.size };
  });
  const [hx, hy] = point(HOME);
  return {
    catalog: types.map((type) => ({
      type,
      name: type,
      recipes: WORKSHOPS.filter((w) => w.type === type).map((w) => ({
        code: w.recipe,
        inputs: {},
        outputs: { [OUTPUT[w.recipe] ?? "wood"]: 10 },
      })),
    })),
    goods: {},
    casa: [],
    stock: { wood: 60, planks: 45, bricks: 30, wheat: 20, glass: 12 },
    market: ["wood", "planks", "bricks", "glass"].map((good, k) => ({
      region: "veneto",
      good,
      price: String(1000 + k * 300),
      ref: String(k % 2 ? 900 : 1100),
    })),
    view: {
      house: {
        casa: o.casa,
        joinedAt: now - 30 * 24 * hour,
        lastActionAt: now,
        workshops,
        builds: o.built
          ? []
          : [
              {
                kind: "newWorkshop",
                cell: "8,10",
                level: 1,
                workshopType: "mill",
                startedAt: now - hour,
                endsAt: now + hour,
              },
            ],
        favour: 0,
        seals: 0,
      },
      orders: [
        {
          city: "padova",
          region: "veneto",
          size: 3,
          cap: 3,
          fillBps: 6_600,
          nextAt: now + hour,
          posts: ["home"],
          orders: [
            { id: "padova#1", city: "padova", good: "planks", qty: 12, pay: "24000" },
            { id: "padova#2", city: "padova", good: "glass", qty: 30, pay: "40000" },
          ],
        },
        {
          city: "treviso",
          region: "veneto",
          size: 2,
          cap: 2,
          fillBps: 0,
          nextAt: now + hour,
          posts: ["home"],
          orders: [],
        },
        {
          city: "venezia",
          region: "veneto",
          size: 5,
          cap: 4,
          fillBps: 2_500,
          nextAt: now + hour,
          posts: ["home"],
          orders: [{ id: "venezia#1", city: "venezia", good: "bricks", qty: 20, pay: "30000" }],
        },
      ],
      served: { padova: o.paid ? 15 : 14, venezia: 31, treviso: 1 },
      embellishments: { owned: o.casa >= 4 ? ["well", "banners"] : [], prices: {} },
      vehicles: {
        shop: [],
        mine: [
          { id: "v1", type: "mule", busyUntil: 0, capacity: 25, at: "home", loads: [], legs: [] },
          { id: "v2", type: "carro", busyUntil: 0, capacity: 40, at: "home", loads: [], legs: [] },
        ],
      },
      stores: [{ post: "home", region: "veneto", goods: { wood: 60, planks: 45, bricks: 30 } }],
      workshopPlaces: Object.fromEntries(
        shops.map((w) => [
          w.id,
          {
            slots: 0,
            neighbourBps: w.type === "sawmill" || w.type === "lumber_camp" ? 1_000 : 0,
            terrainBps:
              (TERRAIN[w.tile] === "forest" && w.type === "lumber_camp") ||
              (TERRAIN[w.tile] === "fields" && w.type === "farm")
                ? 1_000
                : 0,
          },
        ]),
      ),
      storeCap: 400,
      full: [],
      map: {
        grid: "square",
        tileSize: SIZE,
        hexSize: 24,
        cells: Object.fromEntries(
          [...owned, ...TOWNS.map((t) => t.cell)].map((k) => [
            k,
            { region: "veneto", coast: !!land[k]?.coast },
          ]),
        ),
        revealed: [...owned, ...SEA],
        // The terroirs: a land of each kind round the domain, some of it the house's already.
        terrain: TERRAIN,
        terrains: {
          forest: { buildings: ["lumber_camp"], bonusBps: 1_000 },
          clay: { buildings: ["clay_pit"], bonusBps: 1_000 },
          fields: { buildings: ["farm", "hemp_field"], bonusBps: 1_000 },
          pasture: { buildings: ["sheepfold"], bonusBps: 1_000 },
          sand: { buildings: ["sand_pit", "salt_pans"], bonusBps: 1_000 },
        },
        posts: [],
        home: { x: hx, y: hy, level: o.casa, reach: 0, cell: HOME, placed: true },
        reach: null,
        postSpacing: 0,
        cityClearance: 0,
        tiles: true,
        water: [],
        transferUnitsPerHour: 20,
        covered: ["padova", "treviso", "venezia"],
        unlocked: [...owned],
        toLink: {},
        buyable,
        sectorCost: "12000",
        sites: [],
        arsenal: null,
        camp: null,
        zoneCasa: { vicenza: 4, verona: 6 },
        cities,
        roads,
        radius: 1,
        campSite: null,
        depot: "11,11",
        depotSite: null,
      },
    },
  } as unknown as EmpirePayload;
}
