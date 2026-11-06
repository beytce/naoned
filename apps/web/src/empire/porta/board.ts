/**
 * The Porta's place as a Porcellana board (docs/plan-porta-porcellana.md, P2): the near side, the
 * house's, glazed — the quay with the crew at it, the antiquarian's stall —, the lands of Rome in
 * biscuit — the six tiers as stepped plinths, the Porta of stone, the Porta noire, the woods and
 * the rocks —, the red road from the quay to the gate. Built from the Porta's view (pure but for
 * the three.js models it makes on demand).
 */
import { Group } from "three";
import { figureOf } from "../../porcellana/Pawn.js";
import { type Cell, type Spec, palette } from "../../porcellana/TileBoard.js";
import { mountain, rocks } from "../../porcellana/models/decor.js";
import { grove } from "../../porcellana/models/ground.js";
import type { Built, ModelOpts } from "../../porcellana/models/model.js";
import { porta } from "../../porcellana/models/places.js";
import { chest, darkGate, stall, tier } from "../../porcellana/models/porta.js";
import { mule } from "../../porcellana/models/vehicles.js";
import { roleOf } from "../map3d/roster.js";
import { RARITY_HEX } from "./colours.js";
import { type PortaView, RARITIES } from "./types.js";

const HOUSE = () => palette(false);
const ROME = () => palette(true);

/** Where the tiers stand, first to sixth: up the west side, then along the north. */
export const TIER_AT: [number, number][] = [
  [1, 3],
  [1, 2],
  [1, 1],
  [2, 0],
  [3, 0],
  [4, 0],
];
export const GATE_AT: [number, number] = [3, 1];
export const DARK_AT: [number, number] = [5, 0];
export const STALL_AT: [number, number] = [5, 3];
/** The quay's tiles, three abreast from (2, 3). */
export const quayAt = (k: number): [number, number] => [2 + (k % 3), 3 + Math.floor(k / 3)];

/** A vehicle at the quay: a combat vehicle by its piece, a transport by its mule. */
export interface Docked {
  id: string;
  model: string;
  role: "combat" | "transport";
}

const lane = (rome: boolean) => (o: ModelOpts) =>
  grove(rome ? ROME() : HOUSE(), o.seed + 5, 3, ["round", "cypress"], o.keepOff);

function piece(x: Docked): Built {
  const g = new Group();
  if (x.role === "combat") {
    const f = figureOf(roleOf({ side: "player", model: x.model }));
    f.scale.multiplyScalar(1.15);
    f.rotation.y = 0.5;
    g.add(f);
  } else {
    const m = mule(HOUSE(), { seed: 2, running: false });
    m.group.scale.setScalar(2.4);
    m.group.rotation.y = 0.6;
    g.add(m.group);
    chest(HOUSE(), RARITY_HEX.rare, g, 1.5, 1.4, 0.8);
  }
  return { group: g, pin: [0, 3.4, 0] };
}

/** The six tiers, those the Porta does not offer yet standing closed. */
export function sixTiers(v: PortaView): { tier: number; open: boolean }[] {
  return TIER_AT.map((_, i) => {
    const t = v.tiers.find((x) => x.tier === i + 1);
    return { tier: i + 1, open: !!t?.open };
  });
}

/** The board of the Porta for its view and the vehicles at its quay. */
export function portaSpec(v: PortaView, docked: Docked[]): Spec {
  const quayRows = Math.max(1, Math.ceil(docked.length / 3));
  const rows = 4 + quayRows;
  const grid: string[][] = Array.from({ length: rows }, () => Array<string>(7).fill(""));
  const set = ([i, j]: [number, number], k: string) => {
    const row = grid[j];
    if (row) row[i] = k;
  };
  set([1, 0], "mount");
  set([0, 1], "rocks");
  set([6, 1], "rocks");
  set([5, 2], "forest");
  for (const at of [
    [2, 1],
    [4, 1],
    [5, 1],
    [2, 2],
    [3, 2],
    [4, 2],
  ] as [number, number][])
    set(at, "rlane");
  TIER_AT.forEach((at, i) => set(at, `tier:${i}`));
  set(GATE_AT, "gate");
  set(DARK_AT, "dark");
  set(STALL_AT, "stall");
  for (let k = 0; k < quayRows * 3; k++) set(quayAt(k), k < docked.length ? `quay:${k}` : "lane");
  for (let j = 4; j < 3 + quayRows; j++) set([5, j], "lane");
  for (let i = 2; i <= 4; i++) set([i, 3 + quayRows], "~");
  const gems = RARITIES.filter((r) => v.relics[r] > 0).map((r) => RARITY_HEX[r]);
  return {
    rows: grid,
    noCarts: true,
    routes: [
      [
        [3, 2.62],
        [3, 1.45],
      ],
    ],
    viewH: (a) => (a >= 1 ? Math.max(40, 62 / a) : 36),
    cell(key, i, j): Cell | null {
      if (key === "") return null;
      if (key === "~") return { water: true };
      if (key === "lane") return { make: lane(false) };
      if (key === "rlane") return { rome: true, make: lane(true) };
      if (key === "forest")
        return {
          rome: true,
          make: (o) => grove(ROME(), o.seed, 9, ["cypress", "round"], o.keepOff),
        };
      if (key === "rocks") return { rome: true, make: (o) => rocks(ROME(), o) };
      if (key === "mount") return { rome: true, make: (o) => mountain(ROME(), o) };
      if (key.startsWith("tier:")) {
        const t = sixTiers(v)[Number(key.slice(5))];
        if (!t) return null;
        return {
          rome: true,
          make: (o) => tier(ROME(), t.tier, t.open, o),
          place: { id: `tier:${t.tier}`, label: "", info: info(`${t.tier}`) },
        };
      }
      if (key === "gate")
        return {
          rome: true,
          make: (o) => {
            const b = porta(ROME(), { ...o, running: true });
            b.group.scale.setScalar(1.25);
            b.pin = [0, b.pin[1] * 1.25, 0];
            return b;
          },
          place: { id: "gate", label: "", info: info("gate") },
        };
      if (key === "dark")
        return {
          rome: true,
          make: (o) => darkGate(ROME(), { ...o, running: true }),
          place: { id: "dark", label: "", info: info("dark") },
        };
      if (key === "stall")
        return {
          make: () => stall(HOUSE(), gems),
          place: { id: "stall", label: "", info: info("stall") },
        };
      if (key.startsWith("quay:")) {
        const x = docked[Number(key.slice(5))];
        if (!x) return { make: lane(false) };
        return {
          make: () => piece(x),
          place: { id: `veh:${x.id}`, label: "", info: info(x.id) },
        };
      }
      void i;
      void j;
      return null;
    },
  };
}

/** The board's places carry no card at the Porta: their pins and the dock say it all. */
const info = (name: string) => ({ name, sub: "", line: "", go: "" });

/** Where the camera looks for each decision of the dock, and how near. */
export const LOOK: Record<
  "quay" | "steps" | "gate" | "stall",
  { at: [number, number]; zoom: number }
> = {
  quay: { at: [3, 3], zoom: 1.15 },
  steps: { at: [2.5, 1.4], zoom: 0.95 },
  gate: { at: [3, 1.5], zoom: 1.0 },
  stall: { at: [5, 3], zoom: 1.35 },
};
