import type { EmpireStaff, EmpireWorkshop, InteriorStation } from "../../state.js";
import type { EmpireSettings } from "../settings.js";
import { hallAt, interiorLayoutProblem, interiorThroughput } from "./throughput.js";

/**
 * Lorenzo's advice (docs/plan-ateliers.md § 7.3, lots A6 and A8): of every station, every
 * flagstone and every turn, the one move that betters the rate most — a good plan, not the best
 * (one move at a time). Pure: the screen shows it, the simulator's careful bots play it.
 */
export interface InteriorAdvice {
  stationId: string;
  x: number;
  y: number;
  rot: InteriorStation["rot"];
  /** The rate after the move, in thousandths of a unit an hour. */
  units: number;
}

/** A station's place changed, its conveyors taken up (as the engine does on a move). */
export function withMove(
  ws: EmpireWorkshop,
  id: string,
  x: number,
  y: number,
  rot: InteriorStation["rot"],
): EmpireWorkshop {
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

export function adviseInterior(
  ws: EmpireWorkshop,
  h: { staff?: EmpireStaff[] },
  s: EmpireSettings,
  at: number,
): InteriorAdvice | null {
  const hall = hallAt(s, ws.level);
  const base = interiorThroughput(ws, h, s, at).unitsMilliPerHour;
  let best: InteriorAdvice | null = null;
  for (const st of ws.interior?.stations ?? []) {
    if (st.readyAt !== undefined && st.readyAt > at) continue;
    for (const rot of [0, 1, 2, 3] as const)
      for (let y = 0; y < hall.h; y++)
        for (let x = 0; x < hall.w; x++) {
          if (x === st.x && y === st.y && rot === st.rot) continue;
          const next = withMove(ws, st.id, x, y, rot);
          if (interiorLayoutProblem(next, s)) continue;
          const units = interiorThroughput(next, h, s, at).unitsMilliPerHour;
          if (units > (best?.units ?? base)) best = { stationId: st.id, x, y, rot, units };
        }
  }
  return best;
}
