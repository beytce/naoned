import type { EmpireHouse, InteriorHand, InteriorLink, InteriorStation } from "../../state.js";
import type { EmpireSettings } from "../settings.js";
import { ensureInterior, interiorPaceBps, settleInterior } from "./run.js";
import type { InteriorSettings } from "./settings.js";
import { type InteriorThroughput, hallAt, interiorThroughput } from "./throughput.js";

/**
 * What a house sees of its workshops' insides (docs/plan-ateliers.md § 5.6, lot A4): the hall, its
 * doors and walls, the stations and the hands settled to now, the conveyors and buffers, the rate
 * with its bottleneck, and the pace of the queue against the default plan. Read on a copy of the
 * house: the reading changes nothing.
 */
export interface InteriorView {
  hall: { w: number; h: number };
  doors: { in: [number, number]; out: [number, number] };
  walls: [number, number][];
  stages: string[];
  /** The stations of the chain by stage, and the common ones it may take. */
  kinds: { stage: string | null; kind: string }[];
  stations: InteriorStation[];
  hands: InteriorHand[];
  links: InteriorLink[];
  buffers: Record<string, number>;
  rate: InteriorThroughput;
  /** The queue's pace against the default plan, fresh (10 000: as before the switch). */
  paceBps: number;
}

/** The insides of a house's workshops, by workshop; settled on the copy it is given. */
export function interiorsOf(
  house: EmpireHouse,
  s: EmpireSettings,
  now: number,
): Record<string, InteriorView> {
  const I = s.interior;
  if (!I) return {};
  ensureInterior(house, s, now);
  const out: Record<string, InteriorView> = {};
  for (const ws of house.workshops) {
    const b = I.buildings[ws.type];
    const inside = ws.interior;
    if (!b || !inside) continue;
    settleInterior(ws, house, s, now);
    out[ws.id] = {
      hall: hallAt(s, ws.level),
      doors: { in: b.doors.in, out: b.doors.out },
      walls: b.walls,
      stages: b.stages.map((x) => x.code),
      kinds: [
        ...b.stages.flatMap((x) => x.stations.map((kind) => ({ stage: x.code, kind }))),
        ...b.common.map((kind) => ({ stage: null, kind })),
      ],
      stations: inside.stations,
      hands: inside.hands ?? [],
      links: inside.links,
      buffers: inside.buffers,
      rate: interiorThroughput(ws, house, s, now),
      paceBps: interiorPaceBps(ws, house, s, now),
    };
  }
  return out;
}

/** The rules of the insides, for the screen to reckon a rate while a machine is dragged. */
export const interiorRulesOf = (s: EmpireSettings): InteriorSettings | null => s.interior ?? null;
