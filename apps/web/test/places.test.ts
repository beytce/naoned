import { describe, expect, it } from "vitest";
import { type CityOrder, cityPlace, halos, homePlace } from "../src/game/map/places.js";

const MIN = 60_000;
const NOW = 1_000 * MIN;

const order = (over: Partial<CityOrder> = {}): CityOrder => ({
  id: "o1",
  good: "pains",
  quantity: 30,
  pay: 4_800n,
  payLabel: "48 d",
  have: 30,
  fits: true,
  ...over,
});

const city = (over: Partial<Parameters<typeof cityPlace>[0]> = {}) =>
  cityPlace({
    code: "padova",
    name: "Padoue",
    orders: [],
    freeCart: true,
    cartBackAt: null,
    master: false,
    venice: null,
    now: NOW,
    ...over,
  });

describe("the counter's place on the map", () => {
  it("harvests in place what is ready, naming the workshops", () => {
    const p = homePlace({
      name: "Mes ateliers",
      ready: [
        { name: "le moulin", batches: 1 },
        { name: "la ferme", batches: 1 },
      ],
      nextAt: null,
    });
    expect(p.line).toBe("2 lots prêts : le moulin et la ferme.");
    expect(p.gold).toEqual({ kind: "harvest", label: "Récolter 2 lots" });
    expect(p.ghost).toBe("Ouvrir");
    expect(p.waits).toBe("ready");
  });

  it("says when the next batch comes, with no gold while nothing is ready", () => {
    const p = homePlace({ name: "Mes ateliers", ready: [], nextAt: NOW + 30 * MIN });
    expect(p.line).toMatch(/^Prochain lot à /);
    expect(p.gold).toBeNull();
    expect(p.waits).toBeNull();
  });

  it("says the workshops wait for work when none runs", () => {
    const p = homePlace({ name: "Mes ateliers", ready: [], nextAt: null });
    expect(p.line).toBe("Vos ateliers attendent du travail.");
    expect(p.gold).toBeNull();
  });
});

describe("a city's place on the map", () => {
  it("delivers in place an order the stock covers and a free vehicle carries", () => {
    const p = city({ orders: [order()] });
    expect(p.line).toBe("Veut 30 pains, paie 48 d. Vous les avez.");
    expect(p.gold).toEqual({ kind: "deliver", label: "Livrer 30 pains · +48 d", order: "o1" });
    expect(p.ghost).toBe("Voir Padoue");
    expect(p.waits).toBe("city");
  });

  it("prefers the order it can deliver, then the best paid", () => {
    const p = city({
      orders: [
        order({ id: "rich", pay: 9_000n, payLabel: "90 d", have: 0 }),
        order({ id: "small", pay: 1_000n, payLabel: "10 d" }),
        order({ id: "better", pay: 2_000n, payLabel: "20 d" }),
      ],
    });
    expect(p.gold?.kind === "deliver" && p.gold.order).toBe("better");
  });

  it("never puts in gold what cannot be done: it says what is missing", () => {
    const short = city({ orders: [order({ have: 18 })] });
    expect(short.line).toBe("Veut 30 pains, paie 48 d. Il vous en manque 12.");
    expect(short.gold).toBeNull();
    expect(short.waits).toBeNull();

    const busy = city({ orders: [order()], freeCart: false, cartBackAt: NOW + 12 * MIN });
    expect(busy.line).toBe("Veut 30 pains, paie 48 d. Un véhicule se libère dans 12 min.");
    expect(busy.gold).toBeNull();

    const heavy = city({ orders: [order({ fits: false })] });
    expect(heavy.line).toBe("Veut 30 pains, paie 48 d. Trop lourd pour vos véhicules.");
    expect(heavy.gold).toBeNull();
  });

  it("a calm city has a single way in, and says who holds it", () => {
    const calm = city({ name: "Trévise" });
    expect(calm.line).toBe("Rien à livrer pour l’instant.");
    expect(calm.gold).toBeNull();
    expect(calm.ghost).toBe("Voir Trévise");
    expect(city({ master: true }).line).toBe("Vous en êtes le maître.");
  });

  it("Venice speaks of its auctions, then of its rumours, and leads inside", () => {
    const auction = city({
      code: "venezia",
      name: "Venise",
      venice: { lots: 3, hour: "20 h", rumours: 2 },
    });
    expect(auction.line).toBe("Enchères ce soir à 20 h : 3 lots.");
    // The ghost leads to the auctions while lots are open, else inside Venice.
    expect(auction.ghost).toBe("Voir les enchères");
    expect(auction.to).toBe("sera");
    expect(auction.gold).toBeNull();
    expect(auction.waits).toBe("rumour");
    const rumours = city({
      code: "venezia",
      name: "Venise",
      venice: { lots: 0, hour: "20 h", rumours: 2 },
    });
    expect(rumours.line).toBe("2 rumeurs ce matin au Palais.");
    expect(rumours.ghost).toBe("Entrer à Venise");
    // An order to deliver comes first, even in Venice.
    const both = city({
      code: "venezia",
      name: "Venise",
      orders: [order()],
      venice: { lots: 3, hour: "20 h", rumours: 2 },
    });
    expect(both.gold?.kind).toBe("deliver");
    expect(both.ghost).toBe("Entrer à Venise");
  });
});

describe("the halos of the map", () => {
  const p = (key: string, waits: "ready" | "city" | "rumour" | null) => ({ key, waits });
  it("lights two places at most, the harvest first, then a delivery, then a rumour", () => {
    const lit = halos([
      p("venezia", "rumour"),
      p("padova", "city"),
      p("treviso", null),
      p("home", "ready"),
      p("verona", "city"),
    ]);
    expect(lit.get("home")).toBe("halo");
    expect(lit.get("padova")).toBe("halo");
    expect(lit.get("verona")).toBe("dot");
    expect(lit.get("venezia")).toBe("dot");
    expect(lit.has("treviso")).toBe(false);
  });
});
