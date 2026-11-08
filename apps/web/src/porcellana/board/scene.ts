/**
 * The Carte on square tiles (docs/plan-porcellana.md lot 3): what stands on each tile of the board,
 * out of the house's view, as plain data. The board has the shape of what was bought: the house's
 * tiles, the « + » plots round them, the towns of the regions reached as islands, the sea along the
 * coasts; nothing else. Pure, tested (test/porcellanaBoard.test.ts).
 */
import { tileAt } from "@comptoirs/engine";
import { buildingName, workshopStatus } from "../../empire/logic.js";
import { type Target, deliveryPlan } from "../../empire/map/logic.js";
import { welcomeStep } from "../../empire/next.js";
import type { EmpirePayload } from "../../empire/types.js";
import { hourOf } from "../../game/format.js";
import { fr } from "../../i18n.js";

const t = fr.empire;
const goodName = (p: EmpirePayload, code: string) =>
  fr.themeNames.resource[code] ?? p.goods[code] ?? code;

/** The models a tile may carry (catalogue.ts keys, and the board's own). */
export type ModelKey =
  | "lumber_camp"
  | "sawmill"
  | "mill"
  | "farm"
  | "glassworks"
  | "clay_pit"
  | "sand_pit"
  | "brickworks"
  | "salt_pans"
  | "hemp_field"
  | "rope_walk"
  | "palazzo"
  | "fondaco"
  | "post"
  | "market"
  | "town"
  | "depot"
  | "campo"
  | "porta"
  | "arsenal"
  | "plot"
  | "locked"
  | "site"
  | "lane";

export const WORKSHOP_MODELS = new Set<string>([
  "lumber_camp",
  "sawmill",
  "mill",
  "farm",
  "glassworks",
  "clay_pit",
  "sand_pit",
  "brickworks",
  "salt_pans",
  "hemp_field",
  "rope_walk",
  "palazzo",
]);

/** A place one touches: its card, and what its round button opens (the game's target). */
export interface BoardPlace {
  id: string;
  target: Target;
  name: string;
  sub: string;
  line: string;
  /** What the round button says to a screen reader. */
  go: string;
  /** The pin's text: a number to see at once (lots ready, crates waiting), « + », or nothing. */
  pin: string;
  /** The pin full: something to do there now. */
  ready: boolean;
  plus?: boolean;
  /** No pin until chosen (a free tile of the house's: the board stays quiet). */
  quiet?: boolean;
  /** What the pin shows, when it says more than a figure (the first steps, lot 4). */
  badge?: PinBadge;
}

/**
 * A pin that speaks (the first steps, lot 4: « the black dots are all the same »): a workshop's good
 * and its state, a town's orders, a lock and the level that opens it. No badge and no text: no pin.
 */
export type PinBadge =
  | {
      kind: "work";
      good: string;
      state: "running" | "ready" | "blocked" | "full" | "idle";
      /** The lot under way, 0 to 1. */
      progress: number;
      /** Lots ready. */
      n: number;
    }
  | { kind: "orders"; n: number; good: string; covered: boolean }
  | { kind: "lock"; casa?: number };

export interface BoardTile {
  key: string;
  i: number;
  j: number;
  water: boolean;
  model: ModelKey | null;
  /** It works now (its sails turn, its kiln glows): the game says so. */
  running: boolean;
  /** A town's size (1 to 5). */
  size?: number;
  /** Venice's own houses. */
  venetian?: boolean;
  /** A town's orders in crates on its quay: each one covered by the house's stock or not. */
  crates?: boolean[];
  /** The Fondaco's embellishments bought with Seals (I5 of the publication plan). */
  decor?: string[];
  /** How well a town knows the house: 1 to 3 banners at 3, 10 and 25 deliveries (P3-07). */
  loyalty?: number;
  /** A tile of water near a lumber camp: its boat is a raft of logs (the Cadore's, lot 7). */
  raft?: boolean;
  place: BoardPlace | null;
  seed: number;
}

export interface BoardRoad {
  from: string;
  to: string;
  /** The road's points on the chart (its units). */
  pts: [number, number][];
}

export interface BoardScene {
  tileSize: number;
  tiles: BoardTile[];
  roads: BoardRoad[];
  /** The first fondaco's tile: where the camera starts. */
  home: string;
  /**
   * The first fondaco's zone (the first steps, lot 3): its middle and reach in the chart's units,
   * and the reach at the next Casa, drawn while the Fondaco is chosen.
   */
  zone?: { x: number; y: number; reach: number; next?: number };
}

const parse = (k: string): [number, number] => {
  const [i = 0, j = 0] = k.split(",").map(Number);
  return [i, j];
};
const seedOf = (k: string) => {
  const [i, j] = parse(k);
  return Math.abs(i * 31 + j * 17) + 1;
};

/** The board of the house, from its view; null on a map that is not of square tiles. */
export function boardOf(p: EmpirePayload, now: number): BoardScene | null {
  const v = p.view;
  const map = v?.map;
  if (!v || !map || map.grid !== "square") return null;
  const size = map.tileSize ?? 15;
  const house = v.house;
  const out = new Map<string, BoardTile>();
  const put = (key: string, tile: Omit<BoardTile, "key" | "i" | "j" | "seed">) => {
    const [i, j] = parse(key);
    out.set(key, { key, i, j, seed: seedOf(key), ...tile });
  };
  const owned = new Set(map.unlocked);
  const homeTile = tileAt(map.home.x, map.home.y, size);

  // The sea seen along the coasts first: anything on land covers it. Near a lumber camp, rafts of
  // logs float down to Venice (the Cadore's zattere, lot 7).
  const camps = house.workshops
    .filter((w) => w.type === "lumber_camp" && w.tile)
    .map((w) => parse(w.tile as string));
  const nearCamp = (k: string) => {
    const [i, j] = parse(k);
    return camps.some(([ci, cj]) => Math.abs(ci - i) + Math.abs(cj - j) <= 2);
  };
  for (const k of map.revealed)
    if (!(k in map.cells))
      put(k, { water: true, model: null, running: false, place: null, raft: nearCamp(k) });

  // The plots one may buy round the house's tiles.
  const price = BigInt(map.sectorCost);
  const ducats = Number(price / 100n);
  // Those next to the house's tiles by a side; across the sea, only the coasts of a region open.
  const touches = (k: string) => {
    const [i, j] = parse(k);
    return [`${i},${j - 1}`, `${i + 1},${j}`, `${i},${j + 1}`, `${i - 1},${j}`].some((n) =>
      owned.has(n),
    );
  };
  // The plots on the way to a town in reach not yet linked (7 November 2026): they call, in accent.
  const onWay = new Map<string, string>();
  for (const [code, tiles] of Object.entries(map.toLink ?? {}))
    for (const k of tiles) if (!onWay.has(k)) onWay.set(k, t.cityNames[code] ?? code);
  for (const b of map.buyable) {
    const open = b.casa <= house.casa;
    if (!touches(b.cell) && !open) continue;
    const way = open ? onWay.get(b.cell) : undefined;
    put(b.cell, {
      water: false,
      model: open ? "plot" : "locked",
      running: false,
      place: {
        id: `plot:${b.cell}`,
        target: { kind: "sector", cell: b.cell },
        name: open ? t.porcellana.plot : t.porcellana.locked,
        sub: open ? t.porcellana.plotPrice(ducats) : t.porcellana.lockedCasa(b.casa),
        line: way
          ? t.porcellana.plotLink(way)
          : open
            ? t.porcellana.plotLine
            : t.porcellana.lockedLine,
        go: open ? t.porcellana.buy : t.porcellana.see,
        pin: "+",
        ready: way !== undefined,
        plus: true,
        ...(open ? {} : { badge: { kind: "lock" as const, casa: b.casa } }),
      },
    });
  }

  // The house's own tiles: plain land, its dressing round the roads; free, a workshop may rise there.
  // While the welcome asks the first workshop (the first steps, lot 2), the free tiles call: a « + »
  // in accent over each, the one to touch.
  const calling = welcomeStep(p, now)?.phase === "build";
  for (const k of owned)
    put(k, {
      water: false,
      model: "lane",
      running: false,
      place: {
        id: `free:${k}`,
        target: { kind: "free", tile: k },
        name: t.porcellana.freeTile,
        sub: t.porcellana.freeSub,
        line: t.porcellana.freeLine,
        go: t.porcellana.build,
        // A « + » on each free tile of the house's, always (the players' audit, P0-12: free tiles
        // were invisible out of the guide); in accent when the guide calls for one.
        pin: "+",
        plus: true,
        ready: calling,
      },
    });

  // The towns of the regions reached: islands where they are not the house's.
  const orders = new Map(v.orders.map((o) => [o.city, o]));
  for (const c of map.cities) {
    const k = tileAt(c.x, c.y, size);
    const o = orders.get(c.code);
    const waiting = o?.orders.length ?? 0;
    const venice = c.code === "venezia";
    // In the Fondaco's zone (its orders come), or out of it (the first steps, lot 4).
    // Venice's market (San Marco) is open to all, in the zone or not.
    const inZone =
      venice || !map.covered || map.covered.length === 0 || map.covered.includes(c.code);
    // In the zone but not linked by the house's own tiles: its mules cannot go (7 November 2026).
    const toLink = inZone && !venice ? map.toLink?.[c.code] : undefined;
    const crates = waiting > 0 ? deliveryPlan(p, c.code).orders.map((x) => x.covered) : [];
    const served = v.served?.[c.code] ?? 0;
    put(k, {
      crates,
      loyalty: served >= 25 ? 3 : served >= 10 ? 2 : served >= 3 ? 1 : 0,
      water: false,
      model: venice ? "market" : "town",
      size: c.size ?? 1,
      running: false,
      place: {
        id: `city:${c.code}`,
        target: { kind: "city", code: c.code },
        name: venice ? t.porcellana.market : (t.cityNames[c.code] ?? c.code),
        sub: venice
          ? t.porcellana.marketSub
          : `${t.regionNames[c.region] ?? c.region} · ${t.porcellana.townSize(c.size ?? 1)}${served > 0 ? ` · ${t.porcellana.served(served)}` : ""}`,
        line: !inZone
          ? t.porcellana.outOfZone(map.zoneCasa?.[c.code] ?? null)
          : toLink
            ? t.porcellana.toLink(toLink.length)
            : waiting > 0
              ? t.porcellana.cityOrders(waiting)
              : o?.nextAt
                ? // When its next order comes (P2-04 of the players' audit).
                  t.porcellana.nextOrder(hourOf(o.nextAt))
                : t.porcellana.cityQuiet,
        go: venice ? t.porcellana.openMarket : t.porcellana.openCity,
        pin: waiting > 0 ? String(waiting) : "",
        ready: waiting > 0 && !toLink,
        // Its orders, by their good, in accent when the stock covers them; out of the zone, a lock
        // and the Fondaco's level that reaches it (the first steps, lot 4).
        ...(!inZone || toLink
          ? {
              badge: {
                kind: "lock" as const,
                ...(map.zoneCasa?.[c.code] ? { casa: map.zoneCasa[c.code] } : {}),
              },
            }
          : waiting > 0
            ? {
                badge: {
                  kind: "orders" as const,
                  n: waiting,
                  good: o?.orders[0]?.good ?? "",
                  covered: crates.some(Boolean),
                },
              }
            : {}),
      },
    });
  }

  // The house's places.
  const place = (
    k: string | null | undefined,
    model: ModelKey,
    target: Target,
    name: string,
    sub: string,
    line: string,
  ) => {
    if (!k) return;
    put(k, {
      water: false,
      model,
      running: false,
      // The Fondaco's level: so many people round it (P3-03).
      ...(model === "fondaco" ? { size: house.casa, decor: v.embellishments?.owned ?? [] } : {}),
      place: {
        id: `${model}:${k}`,
        target,
        name,
        sub,
        line,
        go: t.porcellana.enter,
        pin: "",
        ready: false,
      },
    });
  };
  // The sites under way: a place being built, a new workshop rising on its tile.
  for (const s of map.sites)
    put(s.cell, { water: false, model: "site", running: true, place: null });
  for (const b of house.builds ?? [])
    if (b.kind === "newWorkshop" && b.cell)
      put(b.cell, { water: false, model: "site", running: true, place: null });
  place(map.depot, "depot", { kind: "depot" }, t.porcellana.depot, t.porcellana.depotSub, "");
  place(
    map.camp,
    "campo",
    { kind: "region", code: "veneto" },
    t.porcellana.campo,
    t.porcellana.campoSub,
    "",
  );
  place(
    map.arsenal,
    "arsenal",
    { kind: "arsenal" },
    t.porcellana.arsenal,
    t.porcellana.arsenalSub,
    "",
  );
  // The Porta: its tile, once it stands (the Porta's own view).
  place(
    v.porta?.cell ?? (house as { porta?: { cell?: string } }).porta?.cell,
    "porta",
    { kind: "porta" },
    t.porcellana.porta,
    t.porcellana.portaSub,
    "",
  );
  for (const post of map.posts)
    place(
      tileAt(post.x, post.y, size),
      "post",
      { kind: "region", code: post.region },
      t.porcellana.post(t.regionNames[post.region] ?? post.region),
      t.porcellana.level(post.level),
      "",
    );
  place(
    homeTile,
    "fondaco",
    { kind: "casa" },
    t.porcellana.fondaco,
    t.porcellana.casa(house.casa),
    // Its stock and its zone, what its level gives (the first steps, lot 3).
    v.storeCap != null
      ? t.fondaco.storeLine(new Intl.NumberFormat("fr-FR").format(v.storeCap), v.orders.length)
      : t.porcellana.fondacoLine,
  );

  // The workshops on their tiles, working when the game says so.
  for (const w of house.workshops) {
    if (!w.tile) continue;
    const st = workshopStatus(p, w, now);
    const model = WORKSHOP_MODELS.has(w.type) ? (w.type as ModelKey) : "post";
    const lots = st.state === "ready" ? st.lots : 0;
    put(w.tile, {
      water: false,
      model,
      running: st.state === "running",
      // Its lots ready in crates before it, of accent; full, a stack of wood that waits for the
      // harvest (golden rule 3, seen: P3-02 of the players' audit).
      ...(lots > 0
        ? { crates: Array.from({ length: Math.min(lots, 6) }, () => true) }
        : st.state === "full"
          ? { crates: Array.from({ length: 6 }, () => false) }
          : {}),
      place: {
        id: `workshop:${w.id}`,
        target: { kind: "workshop", id: w.id },
        name: buildingName(p, w.type),
        sub: t.porcellana.level(w.level),
        line:
          st.state === "ready"
            ? t.porcellana.ready(st.lots)
            : st.state === "running"
              ? t.porcellana.running
              : st.state === "blocked"
                ? t.porcellana.blocked(goodName(p, st.resource))
                : st.state === "full"
                  ? t.orbit.full(goodName(p, st.good))
                  : t.porcellana.idle,
        go: t.porcellana.enter,
        pin: lots > 0 ? String(lots) : "",
        ready: lots > 0,
        badge: {
          kind: "work",
          good:
            Object.keys(
              p.catalog.find((b) => b.type === w.type)?.recipes.find((r) => r.code === w.recipe)
                ?.outputs ?? {},
            )[0] ?? "",
          state: st.state,
          progress: st.state === "running" ? st.progress : 0,
          n: lots,
        },
      },
    });
  }

  return {
    tileSize: size,
    tiles: [...out.values()].sort((a, b) => a.j - b.j || a.i - b.i),
    roads: (map.roads ?? []).map((r) => ({ from: r.from, to: r.to, pts: r.pts })),
    home: homeTile,
    ...(map.home.reach > 0
      ? {
          zone: {
            x: map.home.x,
            y: map.home.y,
            reach: map.home.reach,
            ...(v.nextCasa?.reach && v.nextCasa.reach > map.home.reach
              ? { next: v.nextCasa.reach }
              : {}),
          },
        }
      : {}),
  };
}
