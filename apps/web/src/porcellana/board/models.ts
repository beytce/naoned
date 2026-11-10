/**
 * The board's models by their key (scene.ts): the catalogue's, the board's own (a plain tile and
 * its dressing, a site under way), a town by its size.
 */
import type { Group } from "three";
import { CATALOGUE } from "../catalogue.js";
import type { Palette } from "../materials.js";
import { lockedPlot } from "../models/decor.js";
import { domainTile, site, tierDress, tierOf } from "../models/domain.js";
import { fondaco } from "../models/fondaco.js";
import { plot } from "../models/ground.js";
import {
  adornments,
  barque,
  heldBanner,
  loyaltyBanners,
  marketStalls,
  townMarket,
} from "../models/life.js";
import { zattera } from "../models/lot7.js";
import { market } from "../models/market.js";
import type { Built, ModelOpts } from "../models/model.js";
import { isTerrain, terrainDress } from "../models/terrain.js";
import { town } from "../models/towns.js";
import { type Vehicle, cart, mule, rider, ship } from "../models/vehicles.js";
import { crate } from "../shapes.js";
import type { BoardTile, ModelKey } from "./scene.js";

const BY_KEY = new Map(CATALOGUE.map((e) => [e.key, e]));

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
      // It grows with its level: each one adds something one can name (fondacoStage).
      const b = fondaco(P, tile.size ?? 1);
      if (tile.decor?.length) adornments(P, b.group, tile.decor);
      // Its people walk with the board's crowd (board/people.ts), one more a level.
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
      if (tile.loyalty) {
        loyaltyBanners(P, b.group, tile.loyalty);
        // The market its loyalty grew at its gate (lot 5 of the living map).
        townMarket(P, b.group, tile.loyalty);
      }
      if (tile.held) heldBanner(P, b.group);
      return b;
    }
    case "plot":
    case "locked": {
      // Its land drawn round its « + », seen before it is bought (the terroirs, lot 3).
      const b = key === "plot" ? plot(P) : lockedPlot(P);
      if (isTerrain(tile.terrain))
        terrainDress(P, b.group, tile.terrain, { seed: o.seed, sparse: true });
      return b;
    }
    case "site":
      return site(P, tile.progress ?? 0);
    case "lane":
      return domainTile(P, o.seed, tile.casa ?? 1, o.keepOff, tile.terrain);
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
      // Its tier, every five levels: a paved yard, posts, walls, a dovecote, its banners.
      const wave = b ? tierDress(P, b.group, tierOf(tile.level)) : null;
      if (b && wave) {
        const own = b.tick;
        b.tick = (t, dt) => {
          own?.(t, dt);
          wave(t);
        };
      }
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
