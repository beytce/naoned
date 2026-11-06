import type { EmpireHouse, EmpireWorkshop, InteriorHand, WorkshopInterior } from "../../state.js";
import type { EmpireSettings } from "../settings.js";
import type { InteriorSettings } from "./settings.js";
import {
  fatigueResting,
  fatigueWorking,
  interiorThroughput,
  wearAfter,
  workersOf,
} from "./throughput.js";

/**
 * A workshop's inside at work (docs/plan-ateliers.md § 5.1, 5.4, 5.7, lot A2): the default plan a
 * workshop gets at the switch, its wear and fatigue settled at each read, and its pace — how much
 * quicker or slower its night queue runs than with the default plan, fresh.
 */

const FULL = 10_000;
const MILLI_HOUR = 3_600_000_000;

/** The inside of a new (or migrated) workshop: the default plan, a hand of its trade at each station. */
export function presetInterior(type: string, s: EmpireSettings, now: number): WorkshopInterior {
  const I = s.interior as InteriorSettings;
  const b = I.buildings[type];
  if (!b) throw new Error(`no inside for ${type}`);
  const stations = b.preset.map((p, i) => ({
    id: `s${i + 1}`,
    kind: p.kind,
    x: p.x,
    y: p.y,
    rot: p.rot,
    level: 1,
    wear: 0,
    care: 0,
  }));
  const hands: InteriorHand[] = [];
  for (const st of stations) {
    const kind = I.stations[st.kind];
    if (!kind || (kind.levels[0]?.seats ?? 0) === 0) continue;
    hands.push({
      id: `h${hands.length + 1}`,
      trade: kind.trades[0] ?? "labourer",
      rarity: "common",
      level: 1,
      xp: 0,
      fatigue: 0,
      stationId: st.id,
      shift: "day",
    });
  }
  return { v: 1, stations, links: [], buffers: {}, hands, settledAt: now, seed: 1 };
}

/** Whether this world's workshops have insides, and this one's type has one. */
export const hasInterior = (ws: EmpireWorkshop, s: EmpireSettings) =>
  !!s.interior?.buildings[ws.type];

/**
 * The switch (§ 5.7), once a workshop, at the read: the default plan, fresh. Its pace is then the
 * same as before to the unit; the modules, the master and the researches stay as they are until
 * lot A7 turns them into stations.
 */
export function ensureInterior(h: EmpireHouse, s: EmpireSettings, now: number): void {
  if (!s.interior) return;
  for (const ws of h.workshops)
    if (!ws.interior && hasInterior(ws, s)) ws.interior = presetInterior(ws.type, s, now);
}

/** The rate of the default plan, fresh: what the workshop made before the switch. */
function referenceUnits(ws: EmpireWorkshop, s: EmpireSettings): number {
  const ref = { ...ws, interior: presetInterior(ws.type, s, 0) };
  return interiorThroughput(ref, {}, s).unitsMilliPerHour;
}

/**
 * The pace of a workshop's queue, in bps of the default plan's, fresh: 10 000 at the switch,
 * more as the plan is bettered, less as it wears and tires; 0 while it cannot work.
 */
export function interiorPaceBps(
  ws: EmpireWorkshop,
  h: EmpireHouse,
  s: EmpireSettings,
  at: number,
): number {
  if (!ws.interior || !hasInterior(ws, s)) return FULL;
  const ref = referenceUnits(ws, s);
  if (ref <= 0) return FULL;
  const now = interiorThroughput(ws, h, s, at).unitsMilliPerHour;
  return Math.floor((now * FULL) / ref);
}

/** The quality the inside adds to its workshop's lots. */
export function interiorQualityBps(
  ws: EmpireWorkshop,
  h: EmpireHouse,
  s: EmpireSettings,
  at: number,
): number {
  if (!ws.interior || !hasInterior(ws, s)) return 0;
  return interiorThroughput(ws, h, s, at).qualityBps;
}

/**
 * Wear and fatigue from the last settling to `now`, in closed form (§ 5.4): a machine wears with
 * the units it worked while the queue ran; a hand tires while it works — half the time when its
 * station has both shifts — and rests the rest. Nothing breaks: both stop at their floors in the
 * rate. To be called before the queue is collected.
 */
export function settleInterior(
  ws: EmpireWorkshop,
  h: EmpireHouse,
  s: EmpireSettings,
  now: number,
): void {
  const inside = ws.interior;
  const I = s.interior;
  if (!inside || !I || !hasInterior(ws, s)) return;
  const from = inside.settledAt;
  const elapsed = now - from;
  if (elapsed <= 0) return;
  const job = ws.job;
  const workedMs = job
    ? Math.max(
        0,
        Math.min(now, job.startedAt + job.batches * job.batchMs) - Math.max(from, job.startedAt),
      )
    : 0;
  if (workedMs > 0) {
    const r = interiorThroughput(ws, h, s, from);
    const rateOf = new Map(r.stages.flatMap((x) => x.stations.map((y) => [y.id, y.rateMilli])));
    for (const st of inside.stations) {
      const per = I.stations[st.kind]?.wearPerUnitBps ?? 0;
      const units = Math.floor(((rateOf.get(st.id) ?? 0) * workedMs) / MILLI_HOUR);
      st.wear = wearAfter(st.wear, units, per);
    }
  }
  const working = workersOf(ws, h.staff);
  const shifts = (stationId: string) =>
    new Set(working.filter((x) => x.stationId === stationId).map((x) => x.shift)).size;
  const tire = (fatigue: number, stationId: string | undefined) => {
    const worked = stationId ? Math.floor(workedMs / Math.max(1, shifts(stationId))) : 0;
    return fatigueResting(fatigueWorking(fatigue, worked, I), elapsed - worked, I);
  };
  for (const hand of inside.hands ?? []) hand.fatigue = tire(hand.fatigue, hand.stationId);
  for (const m of h.staff ?? [])
    if (m.station?.workshopId === ws.id) m.fatigue = tire(m.fatigue ?? 0, m.station.stationId);
  inside.settledAt = now;
}

/** The hands of a workshop grow with its lots, as the staff does. */
export function interiorXp(ws: EmpireWorkshop, lots: number, s: EmpireSettings): void {
  if (lots <= 0) return;
  for (const hand of ws.interior?.hands ?? []) {
    if (!hand.stationId) continue;
    hand.xp += lots;
    hand.level = Math.min(s.staff.maxLevel, 1 + Math.floor(hand.xp / s.staff.xpPerLevel));
  }
}

/** The byproduct of so many lots: its good and its units. */
export function interiorByproduct(
  ws: EmpireWorkshop,
  lots: number,
  s: EmpireSettings,
): { good: string; qty: number } | null {
  const b = s.interior?.buildings[ws.type];
  if (!ws.interior || !b?.byproduct || lots <= 0) return null;
  const qty = Math.floor((lots * b.unitsPerLot * b.byproduct.perUnitBps) / FULL);
  return qty > 0 ? { good: b.byproduct.good, qty } : null;
}
