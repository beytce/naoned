import {
  type EmpireSettings,
  type EmpireWorkshop,
  type InteriorStation,
  type InteriorView,
  adviseInterior,
  interiorLayoutProblem,
  interiorThroughput,
} from "@comptoirs/engine";
import type { InteriorRules } from "../types.js";

/**
 * The screen's own reckoning of an inside (docs/plan-ateliers.md § 5.6, lot A6), with the engine's
 * very functions: the rate a station would give on each flagstone it could stand on (while one
 * chooses where to move or to put it), and Lorenzo's advice, the one move that betters the rate
 * most. The server decides; this only foresees.
 */

/** The rarities of the hands hired at the door: all common, for now. */
const RARITY = { common: 10_000, rare: 15_000, illustrious: 20_000 };

/** The engine's settings, as much as the reckoning reads of them. */
export function settingsOf(rules: InteriorRules): EmpireSettings {
  return { interior: rules, staff: { rarityBps: RARITY } } as unknown as EmpireSettings;
}

/** The workshop as the engine sees it, from the view of its inside. */
export function workshopOf(
  id: string,
  type: string,
  level: number,
  v: InteriorView,
): EmpireWorkshop {
  return {
    id,
    type,
    recipe: "",
    level,
    job: null,
    interior: {
      v: 1,
      stations: v.stations.map((x) => ({ ...x })),
      links: v.links.map((l) => ({
        ...l,
        via: l.via.map((t) => [t[0], t[1]] as [number, number]),
      })),
      buffers: { ...v.buffers },
      hands: v.hands.map((x) => ({ ...x })),
      settledAt: 0,
      seed: 1,
    },
  };
}

export const unitsOf = (ws: EmpireWorkshop, s: EmpireSettings, now: number) =>
  interiorThroughput(ws, {}, s, now).unitsMilliPerHour;

/** A station's place changed, its conveyors taken up (as the engine does on a move). */
function moved(ws: EmpireWorkshop, id: string, x: number, y: number, rot: InteriorStation["rot"]) {
  const inside = ws.interior;
  if (!inside) return ws;
  return {
    ...ws,
    interior: {
      ...inside,
      stations: inside.stations.map((st) => (st.id === id ? { ...st, x, y, rot } : st)),
      links: inside.links.filter((l) => l.from !== id && l.to !== id),
    },
  };
}

export interface Spot {
  x: number;
  y: number;
  /** Thousandths of a unit an hour, there. */
  units: number;
}

/** Where a station could stand, turned as it is, and the rate it would give there. */
export function moveSpots(
  ws: EmpireWorkshop,
  s: EmpireSettings,
  stationId: string,
  hall: { w: number; h: number },
  now: number,
): Spot[] {
  const st = ws.interior?.stations.find((x) => x.id === stationId);
  if (!st) return [];
  const out: Spot[] = [];
  for (let y = 0; y < hall.h; y++)
    for (let x = 0; x < hall.w; x++) {
      if (x === st.x && y === st.y) continue;
      const next = moved(ws, stationId, x, y, st.rot);
      if (interiorLayoutProblem(next, s)) continue;
      out.push({ x, y, units: unitsOf(next, s, now) });
    }
  return out;
}

/**
 * Where a new station of a kind could stand (unturned), and the rate the workshop would have once
 * a hand of its trade works it (placed, it still waits for its hand: the card offers one).
 */
export function placeSpots(
  ws: EmpireWorkshop,
  s: EmpireSettings,
  kind: string,
  hall: { w: number; h: number },
  now: number,
): Spot[] {
  const inside = ws.interior;
  if (!inside) return [];
  const out: Spot[] = [];
  for (let y = 0; y < hall.h; y++)
    for (let x = 0; x < hall.w; x++) {
      const next = {
        ...ws,
        interior: {
          ...inside,
          stations: [
            ...inside.stations,
            { id: "new", kind, x, y, rot: 0 as const, level: 1, wear: 0, care: 0 },
          ],
          hands: [
            ...(inside.hands ?? []),
            ...((s.interior?.stations[kind]?.levels[0]?.seats ?? 0) > 0
              ? [
                  {
                    id: "new-hand",
                    trade: s.interior?.stations[kind]?.trades[0] ?? "labourer",
                    rarity: "common",
                    level: 1,
                    xp: 0,
                    fatigue: 0,
                    stationId: "new",
                    shift: "day" as const,
                  },
                ]
              : []),
          ],
        },
      };
      if (interiorLayoutProblem(next, s)) continue;
      out.push({ x, y, units: unitsOf(next, s, now) });
    }
  return out;
}

/** Lorenzo's advice: the engine's own (the simulator's careful bots play the same). */
export function advise(
  ws: EmpireWorkshop,
  s: EmpireSettings,
  _hall: { w: number; h: number },
  now: number,
) {
  return adviseInterior(ws, {}, s, now);
}
