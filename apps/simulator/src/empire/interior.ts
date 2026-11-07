import {
  DENIERS_PER_DUCAT,
  type EmpireHouse,
  type EmpireWorkshop,
  type InteriorStation,
  adviseInterior,
  hallAt,
  interiorInputsBps,
  interiorLayoutProblem,
  interiorPaceBps,
  interiorQualityBps,
  interiorThroughput,
  presetInterior,
  settleInterior,
  stationLevelOpen,
  venice1450,
  workersOf,
} from "@comptoirs/engine";
import type { House, Workshop, World } from "./model.js";
import { destroy } from "./world.js";

/**
 * The workshops' insides at the 24-month simulator (docs/plan-ateliers.md § 9, lot A8): each
 * workshop of a house carries its inside, played with the engine's own functions — its pace, its
 * wear and its hands' fatigue settled over the hours its queue ran, Lorenzo's advice. Three ways of
 * tending it, by house:
 * - hasty: the default plan, never mended, never rested;
 * - average: breaks the main bottleneck once (a level), mends a machine below 80 %, half care;
 * - careful: plays the advice until nothing betters the plan, mends every machine at each
 *   session, puts a night shift on every staffed station, raises the bottleneck as far as its
 *   knowledge opens, then puts a station of the same kind beside it.
 */

export type Tending = "hasty" | "average" | "careful";
export const TENDINGS: Tending[] = ["hasty", "average", "careful"];

/** A house's way of tending its insides: a third each, by its id. */
export const tendingOf = (h: House): Tending => TENDINGS[h.id % 3] ?? "hasty";

const MS = 3_600_000;
/** The care a careful house sets its stations to, and an average one. */
const CAREFUL_CARE = 6_000;
const AVERAGE_CARE = 3_000;
const BUILDING_OF: Record<string, string> = Object.fromEntries(
  venice1450.recipes.flatMap((r) => Object.keys(r.outputs).map((g) => [g, r.building])),
);

/** Its staff as the engine reads it: none at the stations (the masters are not modelled there). */
const NOBODY = { staff: [] } as unknown as EmpireHouse;

export const insidesOn = (w: World) => !!w.s.interior;

/** The engine's workshop for a workshop of the model, its queue of the last 12 hours. */
function engineOf(w: World, h: House, ws: Workshop, i: number): EmpireWorkshop | null {
  const type = BUILDING_OF[ws.good];
  if (!type || !w.s.interior?.buildings[type]) return null;
  ws.inside ??= { ...presetInterior(type, w.s, w.now * MS), v: 2 };
  return {
    id: String(i),
    type,
    recipe: "",
    level: ws.level,
    job: {
      recipe: "",
      startedAt: h.relaunchedAt * MS,
      batches: w.m.queueHours,
      level: ws.level,
      batchMs: MS,
    },
    interior: ws.inside,
  };
}

/** A workshop's pace (bps of its default plan), frozen at its last relaunch. */
export const paceOf = (ws: Workshop) => ws.pace ?? 10_000;

/**
 * At a relaunch: wear and fatigue brought to now over the hours the queue ran, then the new
 * pace, frozen for the queue to come (as the engine's night queue is).
 */
export function settleInsides(w: World, h: House) {
  if (!insidesOn(w)) return;
  for (const [i, ws] of h.workshops.entries()) {
    const e = engineOf(w, h, ws, i);
    if (!e) continue;
    settleInterior(e, NOBODY, w.s, w.now * MS);
    ws.pace = interiorPaceBps({ ...e, job: null }, NOBODY, w.s, w.now * MS);
  }
}

/** What a workshop's inside saves of its inputs, in bps (lot A8, « A »). */
export function insideInputsBps(w: World, h: House, ws: Workshop, i: number): number {
  if (!insidesOn(w)) return 0;
  const e = engineOf(w, h, ws, i);
  return e ? interiorInputsBps(e, NOBODY, w.s, w.now * MS) : 0;
}

/** The share of better pieces its inside adds, in bps (lot A8, « B »). */
export function insideQualityBps(w: World, h: House, ws: Workshop, i: number): number {
  if (!insidesOn(w)) return 0;
  const e = engineOf(w, h, ws, i);
  return e ? interiorQualityBps(e, NOBODY, w.s, w.now * MS) : 0;
}

const ducats = (n: bigint) => n * DENIERS_PER_DUCAT;

/** What a house's tending does at a session; the gestures it took, counted. */
export function tendInsides(w: World, h: House, spendable: () => bigint): void {
  if (!insidesOn(w)) return;
  const how = tendingOf(h);
  if (how === "hasty") return;
  const I = w.s.interior;
  if (!I) return;
  const at = w.now * MS;
  const pay = (amount: bigint): boolean => {
    if (amount <= 0n) return true;
    if (spendable() < amount) return false;
    destroy(w, h, amount, "interior");
    h.interiorSpent = (h.interiorSpent ?? 0n) + amount;
    return true;
  };
  let gestures = 0;
  const open = stationLevelOpen(h.ident, w.s);
  // A few minutes a session (rule 7): the careful tend six workshops, the average four — the
  // most worn first.
  const worn = (ws: Workshop) => (ws.inside?.stations ?? []).reduce((n, x) => n + x.wear, 0);
  const order = [...h.workshops.entries()]
    .sort((a, b) => worn(b[1]) - worn(a[1]))
    .slice(0, how === "careful" ? 6 : 4);
  for (const [i, ws] of order) {
    const e = engineOf(w, h, ws, i);
    const inside = e?.interior;
    if (!e || !inside) continue;
    // Mending: every machine for the careful, those below 80 % for the average.
    // (« Entretenir tout »: one gesture for the workshop.)
    let mended = false;
    for (const st of inside.stations) {
      const due = how === "careful" ? st.wear > 0 : st.wear >= 2_000;
      if (!due) continue;
      const cost = (ducats(I.wear.careCostDucats) * BigInt(st.wear) + 9_999n) / 10_000n;
      if (!pay(cost)) break;
      st.wear = 0;
      mended = true;
    }
    if (mended) gestures++;
    // Where the cities' demand bounds the trade, speed is spent on care — fewer inputs, more
    // better pieces (lot A8, « A + B »): much for the careful, some for the average.
    const care = how === "careful" ? CAREFUL_CARE : AVERAGE_CARE;
    if (inside.stations.some((x) => x.care < care)) {
      for (const st of inside.stations) st.care = Math.max(st.care, care);
      gestures++;
    }
    // The plan: the careful play the advice until nothing betters it (free, at once).
    // (Reckoned again only when the plan changed: a level, a station, the hall.)
    const key = `${ws.level}|${inside.stations.map((x) => `${x.kind}${x.x},${x.y},${x.rot},${x.level}`).join(";")}`;
    if (how === "careful" && ws.advised !== key)
      for (let k = 0; k < 6; k++) {
        const a = adviseInterior(e, NOBODY, w.s, at);
        if (!a) break;
        const st = inside.stations.find((x) => x.id === a.stationId);
        if (!st) break;
        st.x = a.x;
        st.y = a.y;
        st.rot = a.rot;
        inside.links = inside.links.filter((l) => l.from !== st.id && l.to !== st.id);
        gestures++;
      }
    if (how === "careful")
      ws.advised = `${ws.level}|${inside.stations.map((x) => `${x.kind}${x.x},${x.y},${x.rot},${x.level}`).join(";")}`;
    // The night shift: a hand hired for each staffed station, so that the day's hand rests.
    if (how === "careful")
      for (const st of inside.stations) {
        const seats = I.stations[st.kind]?.levels[st.level - 1]?.seats ?? 0;
        const crew = workersOf(e, []).filter((x) => x.stationId === st.id);
        if (seats === 0 || crew.length === 0 || crew.some((x) => x.shift === "night")) continue;
        if (!pay(ducats(I.hands.hireCostDucats))) break;
        inside.hands = [
          ...(inside.hands ?? []),
          {
            id: `h${(inside.hands ?? []).length + 1}`,
            trade: I.stations[st.kind]?.trades[0] ?? "labourer",
            rarity: "common",
            level: 1,
            xp: 0,
            fatigue: 0,
            stationId: st.id,
            shift: "night",
          },
        ];
        gestures++;
      }
    // The bottleneck: a level (the average now and then, the careful whenever it can), then,
    // at the last level open, a station of the same kind beside it.
    // Nothing more to gain past the hall's ceiling: no money spent there.
    const full = interiorPaceBps({ ...e, job: null }, NOBODY, w.s, at) >= I.maxPaceBps;
    // The average breaks its main bottleneck once (a level), then leaves the plan be.
    const broken = inside.stations.some((x) => x.level > 1);
    const raise = !full && (how === "careful" || !broken);
    if (!raise) continue;
    const r = interiorThroughput(e, NOBODY, w.s, at);
    const neck = inside.stations.find((x) => x.id === r.bottleneck.station);
    if (!neck || (neck.readyAt ?? 0) > at) continue;
    const def = I.stations[neck.kind];
    const next = def?.levels[neck.level];
    if (next && neck.level < open) {
      if (pay(ducats(next.costDucats))) {
        neck.level += 1;
        neck.readyAt = at + next.buildMinutes * 60_000;
        gestures++;
      }
    } else if (how === "careful" && def?.levels[0]) {
      const spot = besideSpot(e, neck, w);
      if (spot && pay(ducats(def.levels[0].costDucats) + ducats(I.hands.hireCostDucats))) {
        const id = `s${inside.stations.length + 1}`;
        inside.stations.push({
          ...spot,
          id,
          level: 1,
          wear: 0,
          care: 0,
          readyAt: at + def.levels[0].buildMinutes * 60_000,
        });
        if ((def.levels[0].seats ?? 0) > 0)
          inside.hands = [
            ...(inside.hands ?? []),
            {
              id: `h${(inside.hands ?? []).length + 1}`,
              trade: def.trades[0] ?? "labourer",
              rarity: "common",
              level: 1,
              xp: 0,
              fatigue: 0,
              stationId: id,
              shift: "day",
            },
          ];
        gestures++;
      }
    }
  }
  h.interiorGestures = (h.interiorGestures ?? 0) + gestures;
}

/** A free spot for a station of the bottleneck's kind, the one that gives the best rate. */
function besideSpot(
  e: EmpireWorkshop,
  neck: InteriorStation,
  w: World,
): Pick<InteriorStation, "kind" | "x" | "y" | "rot"> | null {
  const inside = e.interior;
  if (!inside) return null;
  const hall = hallAt(w.s, e.level);
  let best: { spot: Pick<InteriorStation, "kind" | "x" | "y" | "rot">; units: number } | null =
    null;
  for (let y = 0; y < hall.h; y++)
    for (let x = 0; x < hall.w; x++)
      for (const rot of [0, 1, 2, 3] as const) {
        const st = { id: "new", kind: neck.kind, x, y, rot, level: 1, wear: 0, care: 0 };
        const trial = { ...e, interior: { ...inside, stations: [...inside.stations, st] } };
        if (interiorLayoutProblem(trial, w.s)) continue;
        const units = interiorThroughput(trial, NOBODY, w.s).unitsMilliPerHour;
        if (!best || units > best.units) best = { spot: { kind: neck.kind, x, y, rot }, units };
      }
  return best?.spot ?? null;
}
