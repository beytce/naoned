import { DENIERS_PER_DUCAT, type Deniers } from "../../money.js";
import {
  type EmpireWorkshop,
  type InteriorStation,
  MINUTE_MS,
  type PlayerId,
  SINK_ACCOUNT,
  SOURCE_ACCOUNT,
  type WorkshopInterior,
  cashAccount,
} from "../../state.js";
import { type Tx, fail, transfer } from "../../tx.js";
import { empireSettings, ownHouse } from "../house.js";
import type { EmpireSettings } from "../settings.js";
import { collectWorkshop, repaceWorkshop } from "../workshops.js";
import { hasInterior } from "./run.js";
import type { InteriorSettings } from "./settings.js";
import { interiorLayoutProblem, stationPorts, workingLevel } from "./throughput.js";

/**
 * The commands of a workshop's inside (docs/plan-ateliers.md § 5.5, lot A2). Each settles the
 * workshop first (its lots collected, its wear and fatigue brought to now), then changes it, then
 * re-paces the lots not yet started: nothing done goes back, nothing under way goes quicker. Money
 * through the ledger, as the rest; the goods untouched.
 */

const FULL = 10_000;
type Rot = 0 | 1 | 2 | 3;

interface Inside {
  s: EmpireSettings;
  I: InteriorSettings;
  ws: EmpireWorkshop & { interior: WorkshopInterior };
}

/** The workshop and its inside, settled to now; or a refusal. */
function inside(tx: Tx, playerId: PlayerId, workshopId: string): Inside {
  const s = empireSettings(tx.ctx);
  const h = ownHouse(tx, playerId);
  const ws = h.workshops.find((w) => w.id === workshopId);
  if (!ws || !s.interior || !ws.interior || !hasInterior(ws, s)) fail("unknown_building");
  collectWorkshop(tx, playerId, ws);
  return { s, I: s.interior, ws: ws as Inside["ws"] };
}

function stationOf(x: Inside, id: string): InteriorStation {
  const st = x.ws.interior.stations.find((y) => y.id === id);
  if (!st) fail("unknown_building");
  return st;
}

const ducats = (n: bigint) => n * DENIERS_PER_DUCAT;
const pay = (tx: Tx, playerId: PlayerId, amount: Deniers, ref: string) => {
  if (amount > 0n) transfer(tx, cashAccount(playerId), SINK_ACCOUNT, amount, "empire_build", ref);
};
const refund = (tx: Tx, playerId: PlayerId, amount: Deniers, ref: string) => {
  if (amount > 0n)
    transfer(tx, SOURCE_ACCOUNT, cashAccount(playerId), amount, "empire_refund", ref);
};

/** The plan stands after a change, or the change is refused. */
function checkLayout(x: Inside): void {
  if (interiorLayoutProblem(x.ws, x.s)) fail("no_room");
}

function rotOf(rot: number): Rot {
  if (rot !== 0 && rot !== 1 && rot !== 2 && rot !== 3) fail("invalid_quantity");
  return rot;
}

/** The next id of a station or a hand of the inside: one past the highest. */
function nextLocal(ids: string[], prefix: string): string {
  const n = ids.reduce((m, id) => Math.max(m, Number(id.slice(prefix.length)) || 0), 0);
  return `${prefix}${n + 1}`;
}

/** Puts a station down at its first level: its price paid, its site running. */
export function placeStation(
  tx: Tx,
  playerId: PlayerId,
  workshopId: string,
  kind: string,
  x0: number,
  y0: number,
  rot: number,
): void {
  const x = inside(tx, playerId, workshopId);
  const b = x.I.buildings[x.ws.type];
  const def = x.I.stations[kind];
  const allowed = [...(b?.stages.flatMap((st) => st.stations) ?? []), ...(b?.common ?? [])];
  if (!def || !allowed.includes(kind)) fail("unknown_choice");
  if (!Number.isInteger(x0) || !Number.isInteger(y0)) fail("invalid_quantity");
  const lv = def.levels[0];
  if (!lv) fail("unknown_choice");
  const id = nextLocal(
    x.ws.interior.stations.map((st) => st.id),
    "s",
  );
  x.ws.interior.stations.push({
    id,
    kind,
    x: x0,
    y: y0,
    rot: rotOf(rot),
    level: 1,
    wear: 0,
    care: 0,
    ...(lv.buildMinutes > 0 ? { readyAt: tx.now + lv.buildMinutes * MINUTE_MS } : {}),
  });
  checkLayout(x);
  pay(tx, playerId, ducats(lv.costDucats), `station:${workshopId}:${id}`);
  repaceWorkshop(tx, playerId, x.ws);
}

/** Moves or turns a station: free, at once, that one may try; never while its site runs. */
export function moveStation(
  tx: Tx,
  playerId: PlayerId,
  workshopId: string,
  stationId: string,
  x0: number,
  y0: number,
  rot: number,
): void {
  const x = inside(tx, playerId, workshopId);
  const st = stationOf(x, stationId);
  if (st.readyAt !== undefined && st.readyAt > tx.now) fail("building_busy");
  if (!Number.isInteger(x0) || !Number.isInteger(y0)) fail("invalid_quantity");
  st.x = x0;
  st.y = y0;
  st.rot = rotOf(rot);
  // Its conveyors no longer meet it: taken up, half their price back.
  dropLinks(tx, playerId, x, (l) => l.from === stationId || l.to === stationId);
  checkLayout(x);
  repaceWorkshop(tx, playerId, x.ws);
}

/** What a station cost up to its level. */
function stationPaid(x: Inside, st: InteriorStation): Deniers {
  const def = x.I.stations[st.kind];
  let paid = 0n;
  for (let k = 0; k < st.level; k++) paid += ducats(def?.levels[k]?.costDucats ?? 0n);
  return paid;
}

/** Takes a station down: part of its price back; its hands wait at the door. */
export function removeStation(
  tx: Tx,
  playerId: PlayerId,
  workshopId: string,
  stationId: string,
): void {
  const x = inside(tx, playerId, workshopId);
  const st = stationOf(x, stationId);
  const inner = x.ws.interior;
  inner.stations = inner.stations.filter((y) => y !== st);
  for (const hand of inner.hands ?? [])
    if (hand.stationId === stationId) hand.stationId = undefined;
  const h = ownHouse(tx, playerId);
  for (const m of h.staff ?? [])
    if (m.station?.workshopId === workshopId && m.station.stationId === stationId)
      m.station = undefined;
  dropLinks(tx, playerId, x, (l) => l.from === stationId || l.to === stationId);
  refund(
    tx,
    playerId,
    (stationPaid(x, st) * BigInt(x.I.refundBps)) / BigInt(FULL),
    `station:${stationId}`,
  );
  repaceWorkshop(tx, playerId, x.ws);
}

/** Raises a station a level: its price paid; it works at the level below until its site ends. */
export function upgradeStation(
  tx: Tx,
  playerId: PlayerId,
  workshopId: string,
  stationId: string,
): void {
  const x = inside(tx, playerId, workshopId);
  const st = stationOf(x, stationId);
  if (st.readyAt !== undefined && st.readyAt > tx.now) fail("building_busy");
  const lv = x.I.stations[st.kind]?.levels[st.level];
  if (!lv) fail("max_level");
  pay(tx, playerId, ducats(lv.costDucats), `station:${workshopId}:${stationId}:${st.level + 1}`);
  st.level += 1;
  if (lv.buildMinutes > 0) st.readyAt = tx.now + lv.buildMinutes * MINUTE_MS;
  else st.readyAt = undefined;
  repaceWorkshop(tx, playerId, x.ws);
}

const adjacent = (a: [number, number], b: [number, number]) =>
  Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) === 1;

/**
 * Lays a conveyor from a station (or the door « in ») to the next stage's (or the door « out »),
 * along flagstones each beside the last, from just in front of the one to just behind the other.
 */
export function linkStations(
  tx: Tx,
  playerId: PlayerId,
  workshopId: string,
  from: string,
  to: string,
  via: [number, number][],
): void {
  const x = inside(tx, playerId, workshopId);
  const b = x.I.buildings[x.ws.type];
  if (!b) fail("unknown_building");
  if (!Array.isArray(via) || via.length === 0 || via.length > 64) fail("invalid_quantity");
  for (const t of via)
    if (!Array.isArray(t) || !Number.isInteger(t[0]) || !Number.isInteger(t[1]))
      fail("invalid_quantity");
  const stageOf = (kind: string) => b.stages.findIndex((st) => st.stations.includes(kind));
  const fromSt = from === "in" ? null : stationOf(x, from);
  const toSt = to === "out" ? null : stationOf(x, to);
  const k0 = fromSt ? stageOf(fromSt.kind) : -1;
  const k1 = toSt ? stageOf(toSt.kind) : b.stages.length;
  if (fromSt && k0 < 0) fail("unknown_choice");
  if (toSt && k1 < 0) fail("unknown_choice");
  if (k1 !== k0 + 1) fail("unknown_choice");
  // From just in front of the one (beside the door) to just behind the other (beside the door).
  const first = via[0] as [number, number];
  const last = via[via.length - 1] as [number, number];
  const startOk = fromSt
    ? sameTile(first, stationPorts(fromSt, x.s).exit)
    : adjacent(first, b.doors.in);
  const endOk = toSt ? sameTile(last, stationPorts(toSt, x.s).entry) : adjacent(last, b.doors.out);
  if (!startOk || !endOk) fail("not_adjacent");
  for (let i = 1; i < via.length; i++)
    if (!adjacent(via[i - 1] as [number, number], via[i] as [number, number])) fail("not_adjacent");
  const inner = x.ws.interior;
  if (inner.links.some((l) => l.from === from && l.to === to)) fail("unknown_choice");
  inner.links.push({ from, to, via: via.map((t) => [t[0], t[1]]) });
  checkLayout(x);
  pay(tx, playerId, ducats(x.I.conveyorCostDucats) * BigInt(via.length), `conveyor:${workshopId}`);
  repaceWorkshop(tx, playerId, x.ws);
}

const sameTile = (a: [number, number], b: [number, number]) => a[0] === b[0] && a[1] === b[1];

function dropLinks(
  tx: Tx,
  playerId: PlayerId,
  x: Inside,
  which: (l: WorkshopInterior["links"][number]) => boolean,
): void {
  const inner = x.ws.interior;
  const gone = inner.links.filter(which);
  if (gone.length === 0) return;
  inner.links = inner.links.filter((l) => !which(l));
  const tiles = gone.reduce((n, l) => n + l.via.length, 0);
  refund(
    tx,
    playerId,
    (ducats(x.I.conveyorCostDucats) * BigInt(tiles) * BigInt(x.I.refundBps)) / BigInt(FULL),
    `conveyor:${x.ws.id}`,
  );
}

/** Takes a conveyor up: half its price back. */
export function unlinkStations(
  tx: Tx,
  playerId: PlayerId,
  workshopId: string,
  from: string,
  to: string,
): void {
  const x = inside(tx, playerId, workshopId);
  if (!x.ws.interior.links.some((l) => l.from === from && l.to === to)) fail("unknown_choice");
  dropLinks(tx, playerId, x, (l) => l.from === from && l.to === to);
  repaceWorkshop(tx, playerId, x.ws);
}

/** Sets the crates waiting between two stages that follow: free. */
export function setBuffer(
  tx: Tx,
  playerId: PlayerId,
  workshopId: string,
  link: string,
  size: number,
): void {
  const x = inside(tx, playerId, workshopId);
  const b = x.I.buildings[x.ws.type];
  const ok = b?.stages.some((st, k) => k > 0 && `${b.stages[k - 1]?.code}>${st.code}` === link);
  if (!ok) fail("unknown_choice");
  if (!Number.isInteger(size) || size < 0 || size > x.I.buffer.max) fail("invalid_quantity");
  if (size === 0) delete x.ws.interior.buffers[link];
  else x.ws.interior.buffers[link] = size;
  repaceWorkshop(tx, playerId, x.ws);
}

/** Sets a station between quick (0) and careful (10 000): free. */
export function setCare(
  tx: Tx,
  playerId: PlayerId,
  workshopId: string,
  stationId: string,
  care: number,
): void {
  const x = inside(tx, playerId, workshopId);
  const st = stationOf(x, stationId);
  if (!Number.isInteger(care) || care < 0 || care > FULL) fail("invalid_quantity");
  st.care = care;
  repaceWorkshop(tx, playerId, x.ws);
}

/** Mends a station (or all of them): its wear back to nothing, at once, for a little money. */
export function maintainStations(
  tx: Tx,
  playerId: PlayerId,
  workshopId: string,
  stationId?: string,
): void {
  const x = inside(tx, playerId, workshopId);
  const which = stationId ? [stationOf(x, stationId)] : x.ws.interior.stations;
  const per = ducats(x.I.wear.careCostDucats);
  let cost = 0n;
  for (const st of which) {
    if (st.wear <= 0) continue;
    cost += (per * BigInt(st.wear) + BigInt(FULL - 1)) / BigInt(FULL);
    st.wear = 0;
  }
  pay(tx, playerId, cost, `maintain:${workshopId}`);
  repaceWorkshop(tx, playerId, x.ws);
}

/** The seats of a workshop's stations at work now. */
function seatsOf(x: Inside, st: InteriorStation, at: number): number {
  const lv = workingLevel(st, at);
  return lv >= 1 ? (x.I.stations[st.kind]?.levels[lv - 1]?.seats ?? 0) : 0;
}

/**
 * Hires a hand at the workshop's door (decided 6 November 2026), of a trade its stations take or a
 * labourer: so many a seat at most; it waits at the door until placed.
 */
export function hireHand(tx: Tx, playerId: PlayerId, workshopId: string, trade: string): void {
  const x = inside(tx, playerId, workshopId);
  const inner = x.ws.interior;
  const b = x.I.buildings[x.ws.type];
  const kinds = [...(b?.stages.flatMap((st) => st.stations) ?? []), ...(b?.common ?? [])];
  const trades = new Set(["labourer", ...kinds.flatMap((k) => x.I.stations[k]?.trades ?? [])]);
  if (typeof trade !== "string" || !trades.has(trade)) fail("unknown_choice");
  const seats = inner.stations.reduce((n, st) => {
    const def = x.I.stations[st.kind];
    return n + (def?.levels[Math.min(st.level, def.levels.length) - 1]?.seats ?? 0);
  }, 0);
  const hands = inner.hands ?? [];
  if (hands.length >= seats * x.I.hands.perSeat) fail("no_room");
  pay(tx, playerId, ducats(x.I.hands.hireCostDucats), `hand:${workshopId}`);
  inner.hands = [
    ...hands,
    {
      id: nextLocal(
        hands.map((y) => y.id),
        "h",
      ),
      trade,
      rarity: "common",
      level: 1,
      xp: 0,
      fatigue: 0,
      shift: "day",
    },
  ];
}

/**
 * Places a hand at a station on a shift (or at the door, `stationId` null): free, at once, within
 * the station's seats on that shift.
 */
export function assignHand(
  tx: Tx,
  playerId: PlayerId,
  workshopId: string,
  handId: string,
  stationId: string | null,
  shift: "day" | "night",
): void {
  const x = inside(tx, playerId, workshopId);
  const hand = (x.ws.interior.hands ?? []).find((y) => y.id === handId);
  if (!hand) fail("unknown_building");
  if (shift !== "day" && shift !== "night") fail("unknown_choice");
  if (stationId === null) {
    hand.stationId = undefined;
  } else {
    const st = stationOf(x, stationId);
    const there = (x.ws.interior.hands ?? []).filter(
      (y) => y !== hand && y.stationId === stationId && y.shift === shift,
    ).length;
    if (there >= seatsOf(x, st, tx.now)) fail("no_room");
    hand.stationId = stationId;
  }
  hand.shift = shift;
  repaceWorkshop(tx, playerId, x.ws);
}
