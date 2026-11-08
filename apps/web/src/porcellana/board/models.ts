/**
 * The board's models by their key (scene.ts): the catalogue's, the board's own (a plain tile and
 * its dressing, a site under way), a town by its size.
 */
import { Group } from "three";
import { CATALOGUE } from "../catalogue.js";
import type { Palette } from "../materials.js";
import { lockedPlot } from "../models/decor.js";
import { fondaco } from "../models/fondaco.js";
import { grove, plot } from "../models/ground.js";
import { adornments, barque, loyaltyBanners, marketStalls, walkers } from "../models/life.js";
import { zattera } from "../models/lot7.js";
import { market } from "../models/market.js";
import type { Built, ModelOpts } from "../models/model.js";
import { town } from "../models/towns.js";
import { type Vehicle, cart, mule, rider, ship } from "../models/vehicles.js";
import { box, crate } from "../shapes.js";
import type { BoardTile, ModelKey } from "./scene.js";

const BY_KEY = new Map(CATALOGUE.map((e) => [e.key, e]));

/** A site under way: its plot, a scaffold of poles, crates of accent. */
function site(P: Palette): Built {
  const g = new Group();
  box(g, 4.4, 0.05, 4.4, 0, 0, 0, P.m("soil"), 0.25);
  for (const [x, z] of [
    [-1, -1],
    [1, -1],
    [-1, 1],
    [1, 1],
  ] as const)
    box(g, 0.1, 1.8, 0.1, x, 0.05, z, P.m("wood"), 0.02);
  for (const y of [0.9, 1.75]) {
    box(g, 2.1, 0.07, 0.07, 0, y, -1, P.m("wood"), 0.015);
    box(g, 2.1, 0.07, 0.07, 0, y, 1, P.m("wood"), 0.015);
  }
  box(g, 1.8, 0.7, 1.8, 0, 0.05, 0, P.m("wall2"), 0.03);
  crate(g, 1.6, 0.05, 1.6, P.accent, 0.4);
  crate(g, 1.6, 0.45, 1.62, P.m("wood"), 0.34, 0.3);
  return { group: g, pin: [0, 2.4, 0] };
}

/**
 * A town's orders as crates on its quay, along the tile's south edge (the side the camera sees):
 * of accent those the house's stock covers (it may deliver), of wood the others.
 */
export function quayCrates(P: Palette, g: Group, covered: boolean[]): void {
  const n = Math.min(covered.length, 6);
  for (let k = 0; k < n; k++) {
    const x = -2.3 + (k % 3) * 0.5;
    const y = k >= 3 ? 0.42 : 0.08;
    crate(g, x, y, 2.45, covered[k] ? P.accent : P.m("wood"), 0.42, (k % 2) * 0.15);
  }
}

/** The model of a tile, or nothing for the sea. */
export function modelOf(P: Palette, tile: BoardTile, o: ModelOpts): Built | null {
  const key: ModelKey | null = tile.model;
  if (!key) {
    // A boat on one lagoon tile in three (P3-04 of the players' audit: the water was still).
    if (tile.water && tile.raft && tile.seed % 2 === 0) {
      const r = zattera(P);
      return { group: r.group, pin: r.pin, tick: (t, dt) => r.tick?.(t, dt) };
    }
    if (tile.water && tile.seed % 3 === 0) {
      const b = barque(P, tile.seed);
      return { group: b.group, pin: [0, 1, 0], tick: (t) => b.tick(t) };
    }
    return null;
  }
  switch (key) {
    case "fondaco": {
      const b = fondaco(P);
      if (tile.decor?.length) adornments(P, b.group, tile.decor);
      // Its people: one more for each level of the Fondaco (P3-03 of the players' audit).
      if (tile.size) {
        const walk = walkers(P, b.group, 1 + tile.size, o.seed);
        const own = b.tick;
        b.tick = (t, dt) => {
          own?.(t, dt);
          walk(t);
        };
      }
      return b;
    }
    case "post": {
      const b = fondaco(P);
      b.group.scale.setScalar(0.78);
      b.pin = [b.pin[0], b.pin[1] * 0.78, b.pin[2]];
      return b;
    }
    case "market": {
      const b = market(P);
      quayCrates(P, b.group, tile.crates ?? []);
      if (tile.stalls?.length) marketStalls(P, b.group, tile.stalls);
      return b;
    }
    case "town": {
      const b = town(P, { ...o, size: tile.size ?? 1, venetian: tile.venetian });
      quayCrates(P, b.group, tile.crates ?? []);
      if (tile.loyalty) loyaltyBanners(P, b.group, tile.loyalty);
      return b;
    }
    case "plot":
      return plot(P);
    case "locked":
      return lockedPlot(P);
    case "site":
      return site(P);
    case "lane":
      return grove(P, o.seed, 4, ["round", "cypress"], o.keepOff);
    case "campo": {
      // Its orders of the day in crates on its quay (the supply by road).
      const b = BY_KEY.get("campo")?.make?.(P, o) ?? null;
      if (b && tile.crates?.length) quayCrates(P, b.group, tile.crates);
      return b;
    }
    default: {
      const make = BY_KEY.get(key)?.make;
      const b = make ? make(P, o) : null;
      // A workshop's lots ready, stacked before it in crates (P3-02 of the players' audit).
      if (b && tile.crates?.length) quayCrates(P, b.group, tile.crates);
      return b;
    }
  }
}

/** A vehicle of the house by its type: a mule, a cart, a ship, else a rider (fleet3d's reading). */
export function vehicleModel(P: Palette, type: string, o: ModelOpts): Vehicle {
  if (type === "mule") return mule(P, o);
  if (type.startsWith("carro")) return cart(P, o);
  if (/nave|galea|cocca|ship/.test(type)) return ship(P, o);
  return rider(P, o);
}

/** Where the vehicles standing at a place park, round its tile's south-east corner (world units). */
export const PARK: [number, number][] = [
  [1.1, 2.3],
  [1.9, 2.3],
  [2.5, 1.7],
  [2.5, 0.9],
  [0.3, 2.5],
  [2.6, 0.1],
];
