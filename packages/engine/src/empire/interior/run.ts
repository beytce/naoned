import type { EmpireHouse, EmpireWorkshop, InteriorHand, WorkshopInterior } from "../../state.js";
import { houseEffect } from "../effects.js";
import type { EmpireSettings } from "../settings.js";
import type { InteriorSettings } from "./settings.js";
import {
  fatigueResting,
  fatigueWorking,
  interiorLayoutProblem,
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
  for (const ws of h.workshops) {
    if (!hasInterior(ws, s)) continue;
    if (!ws.interior) ws.interior = presetInterior(ws.type, s, now);
    if (ws.interior.v < 2) absorbLegacy(h, ws, s);
  }
}

/** The stations' levels a house may reach: the base, then what its knowledge opens. */
export function stationLevelOpen(h: EmpireHouse, s: EmpireSettings): number {
  const u = s.interior?.unlocks;
  if (!u) return Number.POSITIVE_INFINITY;
  let open = u.baseLevel;
  for (const code of h.knowledge ?? []) open = Math.max(open, u.byKnowledge[code] ?? 0);
  return open;
}

/**
 * The systems the insides absorb (docs/plan-ateliers.md § 5.7 and lot A7), once a workshop: its
 * workshop modules but the furnace stop counting, its master steps down to work at a station, the
 * knowledge of the craft stops giving it a yield; what they gave is turned into its inside — care
 * for their quality, then station levels (and stations of the same kind beside, when a station is
 * at its last) on the bottleneck until the inside makes at least what the workshop made with them.
 * The machines and the hands start fresh. Nothing is paid, nothing is lost.
 */
function absorbLegacy(h: EmpireHouse, ws: EmpireWorkshop, s: EmpireSettings): void {
  const inside = ws.interior;
  const I = s.interior;
  const b = I?.buildings[ws.type];
  if (!inside || !I || !b) return;
  const place = { workshopId: ws.id };
  const read = () => ({
    y: houseEffect(h, "workshopYield", s, place),
    sp: houseEffect(h, "workshopSpeed", s, place),
    q: houseEffect(h, "quality", s, place),
  });
  const was = read();
  const masters = (h.staff ?? []).filter(
    (m) => m.placedAt === ws.id && s.staff.roles[m.role]?.place === "workshop",
  );
  for (const m of masters) m.placedAt = undefined;
  ws.fitted = (ws.fitted ?? []).filter(
    (code) => s.modules.find((m) => m.code === code)?.effect === "inputs",
  );
  inside.v = 2;
  const now = read();
  for (const st of inside.stations) st.wear = 0;
  for (const hand of inside.hands ?? []) hand.fatigue = 0;
  // Their quality, as care at every station.
  const lostQ = was.q - now.q;
  if (lostQ > 0 && I.care.qualityBps > 0) {
    const care = Math.min(FULL, Math.ceil((lostQ * FULL) / I.care.qualityBps));
    for (const st of inside.stations) st.care = Math.max(st.care, care);
  }
  // Their yield and their speed, as the inside's rate against the default plan's.
  const ref = referenceUnits(ws, s);
  const target = Math.ceil(
    (ref * (FULL + was.y) * (FULL + was.sp)) / ((FULL + now.y) * (FULL + now.sp)),
  );
  const idOf = (prefix: string, ids: string[]) =>
    `${prefix}${ids.reduce((n, id) => Math.max(n, Number(id.slice(prefix.length)) || 0), 0) + 1}`;
  const handFor = (stationId: string, kind: string) => {
    const hands = inside.hands ?? [];
    hands.push({
      id: idOf(
        "h",
        hands.map((x) => x.id),
      ),
      trade: I.stations[kind]?.trades[0] ?? "labourer",
      rarity: "common",
      level: 1,
      xp: 0,
      fatigue: 0,
      stationId,
      shift: "day",
    });
    inside.hands = hands;
  };
  const beside = (kind: string, level: number): boolean => {
    for (let y = 0; y < 16; y++)
      for (let x = 0; x < 16; x++)
        for (const rot of [0, 1, 2, 3] as const) {
          const id = idOf(
            "s",
            inside.stations.map((st) => st.id),
          );
          const st = { id, kind, x, y, rot, level, wear: 0, care: inside.stations[0]?.care ?? 0 };
          inside.stations.push(st);
          if (!interiorLayoutProblem(ws, s)) {
            if ((I.stations[kind]?.levels[level - 1]?.seats ?? 0) > 0) handFor(id, kind);
            return true;
          }
          inside.stations.pop();
        }
    return false;
  };
  // The master steps down to work at the bottleneck, on the day if a seat is free, else the night.
  for (const m of masters) {
    const r = interiorThroughput(ws, h, s);
    const st = inside.stations.find((x) => x.id === r.bottleneck.station) ?? inside.stations[0];
    if (!st) continue;
    const def = I.stations[st.kind];
    const seats = def?.levels[st.level - 1]?.seats ?? 0;
    const day = workersOf(ws, h.staff).filter((x) => x.stationId === st.id && x.shift === "day");
    m.trade = def?.trades[0] ?? "labourer";
    m.fatigue = 0;
    m.station = {
      workshopId: ws.id,
      stationId: st.id,
      shift: day.length < seats ? "day" : "night",
    };
  }
  for (let k = 0; k < 80; k++) {
    const r = interiorThroughput(ws, h, s);
    if (r.unitsMilliPerHour >= target) break;
    const st = inside.stations.find((x) => x.id === r.bottleneck.station);
    if (!st) {
      const kind = b.stages.find((x) => x.code === r.bottleneck.stage)?.stations[0];
      if (!kind || !beside(kind, 1)) break;
      continue;
    }
    const def = I.stations[st.kind];
    const seats = def?.levels[st.level - 1]?.seats ?? 0;
    const crew = workersOf(ws, h.staff).filter((x) => x.stationId === st.id).length;
    if (seats > 0 && crew === 0) handFor(st.id, st.kind);
    else if (def && st.level < def.levels.length) st.level += 1;
    else if (!beside(st.kind, st.level)) break;
  }
  // What the hall cannot hold yet stays as a share of pace: nothing lost.
  const reached = interiorThroughput(ws, h, s).unitsMilliPerHour;
  if (reached > 0 && reached < target)
    inside.legacyBps = Math.ceil((target * FULL) / reached) - FULL;
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
  return Math.floor((now * (FULL + (ws.interior.legacyBps ?? 0))) / ref);
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
