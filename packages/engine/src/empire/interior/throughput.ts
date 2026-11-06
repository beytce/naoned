import type { EmpireStaff, EmpireWorkshop, InteriorStation } from "../../state.js";
import type { EmpireSettings } from "../settings.js";
import type { InteriorSettings } from "./settings.js";

/**
 * The rate of a workshop's inside (docs/plan-ateliers.md § 5.3), pure, deterministic, in integers:
 * each station's time a unit from its cycle, its level, its care, its hands, its wear, plus the
 * carrying from the station that feeds it; each stage the sum of its stations, less what the
 * variations take without a buffer; the workshop the slowest stage's. Used alike by the engine (the
 * queue's cadence) and the screen (the rate while a machine is dragged).
 */

const FULL = 10_000;
const HOUR_MS = 3_600_000;
/** Thousandths of a unit an hour from milliseconds a unit. */
const MILLI_HOUR = 3_600_000_000;

type Tile = [number, number];

export interface StationRate {
  id: string;
  /** Thousandths of a unit an hour. */
  rateMilli: number;
  /** Milliseconds a unit spends being carried to it (and, at the last stage, to the door). */
  handlingMs: number;
}

export interface StageRate {
  code: string;
  rateMilli: number;
  stations: StationRate[];
}

export interface InteriorThroughput {
  /** Thousandths of a unit of the inside an hour. */
  unitsMilliPerHour: number;
  /** Thousandths of a lot of the recipe an hour. */
  lotsMilliPerHour: number;
  stages: StageRate[];
  /** The slowest stage, and its slowest station (none if the stage has none). */
  bottleneck: { stage: string; station: string | null };
  /** Share of the lots made better, in bps. */
  qualityBps: number;
  byproductMilliPerHour: number;
}

/** The hall's width and height at a workshop's level. */
export function hallAt(s: EmpireSettings, level: number): { w: number; h: number } {
  const I = need(s);
  let at = I.floorAt[0] as [number, number, number];
  for (const f of I.floorAt) if (f[0] <= level) at = f;
  return { w: at[1], h: at[2] };
}

function need(s: EmpireSettings): InteriorSettings {
  if (!s.interior) throw new Error("no interior in this world");
  return s.interior;
}

/** A station's footprint, turned: its width and height on the flagstones. */
function dims(st: InteriorStation, I: InteriorSettings): [number, number] {
  const size = I.stations[st.kind]?.size ?? [1, 1];
  return st.rot % 2 ? [size[1], size[0]] : [size[0], size[1]];
}

/** The flagstones a station stands on. */
export function stationTiles(st: InteriorStation, s: EmpireSettings): Tile[] {
  const [w, h] = dims(st, need(s));
  const out: Tile[] = [];
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) out.push([st.x + i, st.y + j]);
  return out;
}

/**
 * Where a station's goods come in (the flagstone behind it) and go out (in front of it): its work
 * goes toward +x unturned, then a quarter turn at each `rot`.
 */
export function stationPorts(st: InteriorStation, s: EmpireSettings): { entry: Tile; exit: Tile } {
  const [w, h] = dims(st, need(s));
  const cx = st.x + Math.floor((w - 1) / 2);
  const cy = st.y + Math.floor((h - 1) / 2);
  switch (st.rot) {
    case 0:
      return { entry: [st.x - 1, cy], exit: [st.x + w, cy] };
    case 1:
      return { entry: [cx, st.y - 1], exit: [cx, st.y + h] };
    case 2:
      return { entry: [st.x + w, cy], exit: [st.x - 1, cy] };
    default:
      return { entry: [cx, st.y + h], exit: [cx, st.y - 1] };
  }
}

export type LayoutProblem = "kind" | "outside" | "wall" | "overlap";

/** What is wrong with a workshop's plan, if anything: a station unknown, outside, on a wall, on another. */
export function interiorLayoutProblem(ws: EmpireWorkshop, s: EmpireSettings): LayoutProblem | null {
  const I = need(s);
  const b = I.buildings[ws.type];
  const inside = ws.interior;
  if (!b || !inside) return "kind";
  const allowed = new Set([...b.stages.flatMap((x) => x.stations), ...b.common]);
  const { w, h } = hallAt(s, ws.level);
  const walls = new Set(b.walls.map(([x, y]) => `${x},${y}`));
  const taken = new Set<string>();
  for (const st of inside.stations) {
    if (!I.stations[st.kind] || !allowed.has(st.kind)) return "kind";
    for (const [x, y] of stationTiles(st, s)) {
      if (x < 0 || y < 0 || x >= w || y >= h) return "outside";
      const k = `${x},${y}`;
      if (walls.has(k)) return "wall";
      if (taken.has(k)) return "overlap";
      taken.add(k);
    }
  }
  return null;
}

/** A machine's speed under its wear, in bps, to a floor. */
export function wearFactorBps(wear: number, I: InteriorSettings): number {
  return Math.max(I.wear.floorBps, FULL - Math.floor((wear * I.wear.slowdownBps) / FULL));
}

/** A machine's wear after so many units worked, never past the full. */
export function wearAfter(wear: number, units: number, perUnitBps: number): number {
  return Math.min(FULL, wear + units * perUnitBps);
}

/** A hand's speed under its fatigue, in bps, to a floor. */
export function fatigueFactorBps(fatigue: number, I: InteriorSettings): number {
  return Math.max(I.fatigue.floorBps, FULL - fatigue);
}

/** A hand's fatigue after so long at work. */
export function fatigueWorking(fatigue: number, ms: number, I: InteriorSettings): number {
  return Math.min(FULL, fatigue + Math.floor((I.fatigue.perHourBps * ms) / HOUR_MS));
}

/** A hand's fatigue after so long at rest. */
export function fatigueResting(fatigue: number, ms: number, I: InteriorSettings): number {
  return Math.max(0, fatigue - Math.floor((I.fatigue.restPerHourBps * ms) / HOUR_MS));
}

const byId = <T extends { id: string }>(a: T, b: T) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
const dist = (a: Tile, b: Tile) => Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]);

/** What a hand gives at a station, in bps: its trade's fit, its skill, its rarity, its fatigue. */
function handBps(
  hand: EmpireStaff,
  trades: string[],
  I: InteriorSettings,
  s: EmpireSettings,
): number {
  const fit =
    hand.trade && trades.includes(hand.trade)
      ? I.tradeFit.same
      : hand.trade === "labourer"
        ? I.tradeFit.labourer
        : I.tradeFit.other;
  const skill = FULL + Math.max(0, hand.level - 1) * I.skillPerLevelBps;
  const rarity = s.staff.rarityBps[hand.rarity] ?? FULL;
  let v = Math.floor((fit * skill) / FULL);
  v = Math.floor((v * rarity) / FULL);
  return Math.floor((v * fatigueFactorBps(hand.fatigue ?? 0, I)) / FULL);
}

/**
 * The hands of a station in bps (10 000: one hand of its trade, fresh): each shift's best hands
 * up to its seats; with both shifts, their mean over the day; with one, it covers the day.
 */
function handsBps(
  st: InteriorStation,
  seats: number,
  trades: string[],
  hands: EmpireStaff[],
  I: InteriorSettings,
  s: EmpireSettings,
): number {
  if (seats === 0) return FULL;
  const shift = (which: "day" | "night") =>
    hands
      .filter((x) => x.station?.stationId === st.id && x.station.shift === which)
      .map((x) => handBps(x, trades, I, s))
      .sort((a, b) => b - a)
      .slice(0, seats)
      .reduce((a, b) => a + b, 0);
  const day = shift("day");
  const night = shift("night");
  if (day === 0) return night;
  if (night === 0) return day;
  return Math.floor((day + night) / 2);
}

/** The rate of a workshop's inside; zero everywhere for a workshop without one. */
export function interiorThroughput(
  ws: EmpireWorkshop,
  h: { staff?: EmpireStaff[] },
  s: EmpireSettings,
): InteriorThroughput {
  const I = need(s);
  const b = I.buildings[ws.type];
  const inside = ws.interior;
  if (!b || !inside) throw new Error(`no inside for ${ws.type}`);
  const hands = (h.staff ?? []).filter((x) => x.station?.workshopId === ws.id).sort(byId);
  const stations = [...inside.stations].sort(byId);
  const stageOf = new Map<string, number>();
  b.stages.forEach((st, k) => {
    for (const kind of st.stations) stageOf.set(kind, k);
  });
  const conveyor = new Set(inside.links.map((l) => `${l.from}>${l.to}`));
  const carry = (from: string, to: string, a: Tile, z: Tile) =>
    conveyor.has(`${from}>${to}`)
      ? I.conveyorHandlingS * 1_000
      : I.handlingSPerTile * 1_000 * dist(a, z);

  const ports = new Map(stations.map((st) => [st.id, stationPorts(st, s)]));
  const byStage: InteriorStation[][] = b.stages.map(() => []);
  for (const st of stations) {
    const k = stageOf.get(st.kind);
    if (k !== undefined) byStage[k]?.push(st);
  }
  const last = b.stages.length - 1;

  const stages: StageRate[] = b.stages.map((stage, k) => {
    const rates: StationRate[] = (byStage[k] ?? []).map((st) => {
      const kind = I.stations[st.kind];
      const lv = kind?.levels[Math.min(st.level, kind.levels.length) - 1];
      const p = ports.get(st.id);
      if (!kind || !lv || !p) return { id: st.id, rateMilli: 0, handlingMs: 0 };
      // Carried from the nearest station of the stage before (or the door), to the door after.
      let handlingMs: number;
      if (k === 0) handlingMs = carry("in", st.id, b.doors.in, p.entry);
      else {
        handlingMs = Number.POSITIVE_INFINITY;
        for (const up of byStage[k - 1] ?? []) {
          const q = ports.get(up.id);
          if (q) handlingMs = Math.min(handlingMs, carry(up.id, st.id, q.exit, p.entry));
        }
        if (!Number.isFinite(handlingMs)) handlingMs = 0;
      }
      if (k === last) handlingMs += carry(st.id, "out", p.exit, b.doors.out);
      const crew = handsBps(st, lv.seats, kind.trades, hands, I, s);
      if (crew === 0) return { id: st.id, rateMilli: 0, handlingMs };
      const careAdd = BigInt(Math.floor((st.care * I.care.slowdownBps) / FULL));
      const num = BigInt(lv.cycleS * 1_000) * (BigInt(FULL) + careAdd) * BigInt(FULL);
      const den = BigInt(crew) * BigInt(wearFactorBps(st.wear, I)) * BigInt(lv.capacity);
      const unitMs = Number(num / den) + handlingMs;
      return { id: st.id, rateMilli: unitMs > 0 ? Math.floor(MILLI_HOUR / unitMs) : 0, handlingMs };
    });
    let rate = rates.reduce((a, r) => a + r.rateMilli, 0);
    if (k > 0) {
      const buf = Math.min(
        inside.buffers[`${b.stages[k - 1]?.code}>${stage.code}`] ?? 0,
        I.buffer.max,
      );
      const short = Math.max(0, I.buffer.fullAt - buf);
      const loss = Math.floor((I.buffer.lossBps * short) / I.buffer.fullAt);
      rate = Math.floor((rate * (FULL - loss)) / FULL);
    }
    return { code: stage.code, rateMilli: rate, stations: rates };
  });

  let neck = 0;
  stages.forEach((st, k) => {
    if (st.rateMilli < (stages[neck]?.rateMilli ?? 0)) neck = k;
  });
  const slow = stages[neck];
  const slowest = slow?.stations.reduce<StationRate | null>(
    (a, x) => (!a || x.rateMilli < a.rateMilli ? x : a),
    null,
  );
  const units = slow?.rateMilli ?? 0;

  // Quality: the stages' mean care, then each inspection that has its hands.
  const careOf = (k: number) => {
    const xs = byStage[k] ?? [];
    return xs.length ? Math.floor(xs.reduce((a, x) => a + x.care, 0) / xs.length) : 0;
  };
  const meanCare = Math.floor(b.stages.reduce((a, _, k) => a + careOf(k), 0) / b.stages.length);
  let quality = Math.floor((meanCare * I.care.qualityBps) / FULL);
  for (const st of stations) {
    const kind = I.stations[st.kind];
    if (!kind?.qualityBps || stageOf.has(st.kind)) continue;
    const lv = kind.levels[Math.min(st.level, kind.levels.length) - 1];
    if (lv && handsBps(st, lv.seats, kind.trades, hands, I, s) > 0) quality += kind.qualityBps;
  }

  return {
    unitsMilliPerHour: units,
    lotsMilliPerHour: Math.floor(units / b.unitsPerLot),
    stages,
    bottleneck: { stage: slow?.code ?? "", station: slowest?.id ?? null },
    qualityBps: Math.min(FULL, quality),
    byproductMilliPerHour: b.byproduct ? Math.floor((units * b.byproduct.perUnitBps) / FULL) : 0,
  };
}
