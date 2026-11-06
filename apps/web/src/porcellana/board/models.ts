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
import { market } from "../models/market.js";
import type { Built, ModelOpts } from "../models/model.js";
import { town } from "../models/towns.js";
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

/** The model of a tile, or nothing for the sea. */
export function modelOf(P: Palette, tile: BoardTile, o: ModelOpts): Built | null {
  const key: ModelKey | null = tile.model;
  if (!key) return null;
  switch (key) {
    case "fondaco":
      return fondaco(P);
    case "post": {
      const b = fondaco(P);
      b.group.scale.setScalar(0.78);
      b.pin = [b.pin[0], b.pin[1] * 0.78, b.pin[2]];
      return b;
    }
    case "market":
      return market(P);
    case "town":
      return town(P, { ...o, size: tile.size ?? 1, venetian: tile.venetian });
    case "plot":
      return plot(P);
    case "locked":
      return lockedPlot(P);
    case "site":
      return site(P);
    case "lane":
      return grove(P, o.seed, 4, ["round", "cypress"], o.keepOff);
    case "campo":
      return BY_KEY.get("campo")?.make?.(P, o) ?? null;
    default: {
      const make = BY_KEY.get(key)?.make;
      return make ? make(P, o) : null;
    }
  }
}
