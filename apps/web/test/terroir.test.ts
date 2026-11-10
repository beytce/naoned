import { describe, expect, it } from "vitest";
import {
  betterTiles,
  terroirAt,
  terroirBonus,
  terroirLine,
  tileBonusLine,
} from "../src/empire/terroir.js";
import type { EmpirePayload } from "../src/empire/types.js";
import { boardOf } from "../src/porcellana/board/scene.js";

// The terroirs on the screen (docs/plan-carte-vivante.md, lot 3): what the view says of the land.
const NOW = 1_000_000;
function payload(
  over: { places?: Record<string, unknown>; unlocked?: string[] } = {},
): EmpirePayload {
  return {
    catalog: [
      {
        type: "lumber_camp",
        name: "Camp de bûcherons",
        recipes: [{ code: "cut_wood", inputs: {}, outputs: { wood: 10 } }],
      },
      {
        type: "farm",
        name: "Ferme",
        recipes: [{ code: "grow_wheat", inputs: {}, outputs: { wheat: 10 } }],
      },
    ],
    goods: {},
    stock: {},
    view: {
      house: {
        casa: 1,
        workshops: [
          { id: "w1", type: "lumber_camp", recipe: "cut_wood", level: 2, tile: "2,1", job: null },
          { id: "w2", type: "farm", recipe: "grow_wheat", level: 1, tile: "2,2", job: null },
        ],
      },
      workshopPlaces: over.places ?? {
        w1: { slots: 0, neighbourBps: 0, terrainBps: 0 },
        w2: { slots: 0, neighbourBps: 1_000, terrainBps: 1_000 },
      },
      orders: [],
      vehicles: { mine: [] },
      stores: [],
      map: {
        grid: "square",
        tileSize: 10,
        cells: {
          "2,1": { region: "veneto", coast: false },
          "2,2": { region: "veneto", coast: false },
          "3,1": { region: "veneto", coast: false },
          "3,2": { region: "veneto", coast: false },
        },
        revealed: ["2,1", "2,2", "3,1", "3,2"],
        terrain: { "2,2": "fields", "3,1": "forest", "4,1": "forest", "4,2": "sand" },
        terrains: {
          forest: { buildings: ["lumber_camp"], bonusBps: 1_000 },
          fields: { buildings: ["farm", "hemp_field"], bonusBps: 1_000 },
          sand: { buildings: ["sand_pit"], bonusBps: 1_250 },
        },
        posts: [],
        home: { x: 35, y: 25, level: 1, reach: 0, cell: "3,2", placed: true },
        buyable: [
          { cell: "4,1", region: "veneto", coast: false, casa: 1 },
          { cell: "4,2", region: "veneto", coast: true, casa: 1 },
          { cell: "2,0", region: "veneto", coast: false, casa: 1 },
        ],
        sectorCost: "7500",
        covered: [],
        unlocked: over.unlocked ?? ["2,1", "2,2", "3,1", "3,2"],
        sites: [],
        cities: [],
        roads: [],
      },
    },
  } as unknown as EmpirePayload;
}

describe("a tile's terroir", () => {
  const p = payload();

  it("is its land and whom it favours, nothing on plain land", () => {
    expect(terroirAt(p, "3,1")).toEqual({
      kind: "forest",
      buildings: ["lumber_camp"],
      bonusBps: 1_000,
    });
    expect(terroirAt(p, "2,1")).toBeNull();
    expect(terroirAt(p, undefined)).toBeNull();
  });

  it("gives its share to its workshops only", () => {
    expect(terroirBonus(p, "3,1", "lumber_camp")).toBe(1_000);
    expect(terroirBonus(p, "3,1", "farm")).toBe(0);
    expect(terroirBonus(p, "2,1", "lumber_camp")).toBe(0);
  });

  it("is told in a line, the workshops by their names", () => {
    expect(terroirLine(p, "3,1")).toBe("Forêt : +10 % pour Camp de bûcherons.");
    // A land whose workshops this world does not offer: its name only.
    expect(terroirLine(p, "4,2")).toBe("Terroir : Rive de sable");
    expect(terroirLine(p, "2,1")).toBeNull();
  });

  it("tells what a workshop's tile gives it in one line", () => {
    expect(tileBonusLine(p, "w1")).toBeNull();
    expect(tileBonusLine(p, "w2")).toBe("Terroir +10 % · voisinage +10 %");
    const only = payload({ places: { w1: { slots: 0, neighbourBps: 0, terrainBps: 1_000 } } });
    expect(tileBonusLine(only, "w1")).toBe("Terroir +10 %");
  });

  it("knows the free tiles a workshop would gain on", () => {
    expect(betterTiles(p, "w1", ["3,1", "2,0"])).toEqual(["3,1"]);
    // The farm stands in its fields already.
    expect(betterTiles(p, "w2", ["3,1", "2,0"])).toEqual([]);
  });
});

describe("the terroirs on the board", () => {
  const scene = boardOf(payload(), NOW);
  const card = (id: string) => scene?.tiles.find((x) => x.place?.id === id);

  it("draws a plot's land and names it before it is bought", () => {
    const forest = card("plot:4,1");
    expect(forest?.terrain).toBe("forest");
    expect(forest?.place?.name).toBe("Forêt");
    expect(forest?.place?.line).toBe("Forêt : +10 % pour Camp de bûcherons.");
    expect(forest?.place?.sub).toContain("75");
    // Plain land: the plot of before.
    expect(card("plot:2,0")?.terrain).toBeUndefined();
    expect(card("plot:2,0")?.place?.name).toBe("Parcelle libre");
  });

  it("says a free tile's land on its card", () => {
    const free = card("free:3,1");
    expect(free?.terrain).toBe("forest");
    expect(free?.place?.sub).toBe("Terroir : Forêt");
    expect(free?.place?.line).toBe("Forêt : +10 % pour Camp de bûcherons.");
  });

  it("says what its tile gives a workshop, and offers to move it while a tile is free", () => {
    const farm = card("workshop:w2");
    expect(farm?.suited).toBe(true);
    expect(farm?.place?.sub).toBe("Niveau 1 · Terroir +10 % · voisinage +10 %");
    expect(farm?.place?.alt).toBe("Déménager");
    const camp = card("workshop:w1");
    expect(camp?.suited).toBe(false);
    expect(camp?.place?.sub).toBe("Niveau 2");
    // Off its land while a forest of the house's lies free: its card says what it would gain.
    expect(camp?.place?.line).toBe(
      "À l'arrêt. Une case de forêt est libre chez toi : il y rendrait +10 %.",
    );
    // The farm stands in its fields: nothing to say.
    expect(farm?.place?.line).toBe("À l'arrêt.");
  });

  it("offers no move without a free tile of the house's", () => {
    const full = boardOf(payload({ unlocked: ["2,1", "2,2", "3,2"] }), NOW);
    expect(full?.tiles.find((x) => x.place?.id === "workshop:w2")?.place?.alt).toBeUndefined();
  });
});

// The towns' loyalty on the board (docs/plan-carte-vivante.md, lot 5).
describe("a town's loyalty on its card", () => {
  const withTown = (loyalty: unknown, served: number): EmpirePayload => {
    const p = payload() as unknown as {
      view: {
        served: Record<string, number>;
        orders: unknown[];
        map: { cities: unknown[]; covered: string[] };
      };
    };
    p.view.served = { padova: served };
    p.view.map.cities = [{ code: "padova", cell: "6,6", region: "veneto", x: 65, y: 65, size: 3 }];
    p.view.map.covered = ["padova"];
    p.view.orders = [
      {
        city: "padova",
        region: "veneto",
        size: 3,
        cap: 2,
        fillBps: 0,
        nextAt: null,
        orders: [],
        loyalty,
      },
    ];
    return p as unknown as EmpirePayload;
  };
  const town = (p: EmpirePayload) =>
    boardOf(p, NOW)?.tiles.find((x) => x.place?.id === "city:padova");

  it("says its tier, what its orders pay more, and what the next asks", () => {
    const t = town(
      withTown({ tier: 2, served: 12, premiumBps: 400, next: { at: 25, premiumBps: 600 } }, 12),
    );
    expect(t?.loyalty).toBe(2);
    expect(t?.place?.sub).toContain("fidélité 2 · commandes +4 %");
    expect(t?.place?.line).toContain("Encore 13 livraisons : ses commandes paieront +6 %.");
  });

  it("says a town at its best, and one not known yet", () => {
    const top = town(withTown({ tier: 4, served: 80, premiumBps: 800, next: null }, 80));
    expect(top?.loyalty).toBe(4);
    expect(top?.place?.line).toContain("Elle te connaît au mieux");
    const none = town(
      withTown({ tier: 0, served: 0, premiumBps: 0, next: { at: 3, premiumBps: 200 } }, 0),
    );
    expect(none?.loyalty).toBe(0);
    expect(none?.place?.sub).not.toContain("fidélité");
    expect(none?.place?.line).toContain("Encore 3 livraisons");
  });

  it("keeps the banners of before where the engine tells no tier", () => {
    expect(town(withTown(undefined, 11))?.loyalty).toBe(2);
    expect(town(withTown(undefined, 11))?.place?.sub).toContain("11 livraisons");
  });
});
