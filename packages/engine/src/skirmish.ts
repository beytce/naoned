import { dayStartIn, hourIn, hourWithin } from "./clock.js";
import { MINUTE_MS } from "./state.js";
import {
  MILAN,
  type TerraBuilding,
  type TerraConfig,
  type TerraState,
  acceptAlliance,
  advanceTerra,
  breakAlliance,
  buildOnTerra,
  capOf,
  cellCost,
  cellsOf,
  closeTerra,
  fireBombard,
  isNation,
  launchFront,
  newTerra,
  placeOnTerra,
  proposeAlliance,
  raiseCap,
  recallFront,
  sendTroops,
  signal,
  terraDistance,
  terraNeighbors,
} from "./terraferma.js";
import { EngineError } from "./tx.js";

/**
 * Skirmishes (recommendations of 20 October 2026): a live match of a quarter of an hour on the
 * Terraferma's own engine and map, its time running sixty times as fast, the merchants who came
 * and houses of the computer set down at once, the ranks bringing glory to the week. Held by the
 * server in memory: nothing in it is money or goods.
 */
export interface Skirmish {
  cfg: TerraConfig;
  state: TerraState;
  /** Real time of its start and end; its own time starts at `virtualStart`. */
  startedAt: number;
  endsAt: number;
  virtualStart: number;
  speed: number;
  humans: string[];
  /** Ranked (by day, between merchants): its ranks bring glory; friendly otherwise. */
  ranked: boolean;
  result?: { ranking: { id: string; cells: number; glory: number }[] };
}

/** The starts of the day's calls of the day `at` falls on (Paris), in order. */
function callsOfDay(cfg: TerraConfig, at: number): number[] {
  const midnight = dayStartIn(at).start;
  return [...(cfg.skirmish?.calls ?? [])]
    .sort((a, b) => a - b)
    .map((m) => midnight + m * MINUTE_MS);
}

/** The call whose lobby is open at `now` (its start), or null. */
export function skirmishCallAt(cfg: TerraConfig | undefined, now: number): number | null {
  const sk = cfg?.skirmish;
  if (!cfg || !sk) return null;
  const lobby = sk.callLobbyMinutes * MINUTE_MS;
  return callsOfDay(cfg, now).find((s) => now >= s - lobby && now < s) ?? null;
}

/** The next call's start after `now` (today's, else tomorrow's first), or null without calls. */
export function nextSkirmishCall(cfg: TerraConfig | undefined, now: number): number | null {
  if (!cfg?.skirmish?.calls.length) return null;
  return (
    callsOfDay(cfg, now).find((s) => s > now) ?? callsOfDay(cfg, now + 24 * 3_600_000)[0] ?? null
  );
}

/**
 * Whether a match started now with so many merchants is ranked: within the Terraferma's open
 * hours from its start to its end (a minute's margin to pay it), with `minHumans` at least.
 */
export function skirmishRanked(cfg: TerraConfig | undefined, humans: number, now: number): boolean {
  const sk = cfg?.skirmish;
  if (!cfg || !sk || humans < sk.minHumans) return false;
  const end = now + (sk.minutes + 1) * MINUTE_MS;
  return hourWithin(hourIn(now), cfg.openHours) && hourWithin(hourIn(end), cfg.openHours);
}

/** The Terraferma's settings for a skirmish: all hours open, no truce, short steps. */
export function skirmishConfig(cfg: TerraConfig): TerraConfig {
  const sk = cfg.skirmish;
  if (!sk) throw new Error("no skirmish");
  return {
    ...cfg,
    cellsPerActive: sk.cellsPerPlayer,
    minActive: sk.players,
    openHours: { from: 0, to: 24 },
    stepMinutes: sk.stepMinutes,
    battle: undefined,
    peasants: undefined,
    teams: undefined,
    nations: [],
    start: {
      ...cfg.start,
      troops: sk.troops,
      minDistance: 2,
      troopsPerDay: 0,
      protectionHours: 0,
      placementHours: 0,
      truceHours: 0,
    },
    troops: { ...cfg.troops, recruit: sk.recruit },
    // The Battle's war chest of the match (lot T6b), else the week's.
    ...(sk.chest ? { chest: sk.chest } : {}),
    fronts: { ...cfg.fronts, neutralEverySteps: 1, maxHours: 0 },
    milan: { ...cfg.milan, everyHours: 1 },
  };
}

/** A skirmish for these merchants, the field filled with houses of the computer. */
export function createSkirmish(
  base: TerraConfig,
  seed: string,
  humans: string[],
  now: number,
): Skirmish {
  const cfg = skirmishConfig(base);
  const sk = base.skirmish;
  if (!sk) throw new Error("no skirmish");
  const players = [...humans];
  for (let k = 1; players.length < sk.players; k++) players.push(`bot:${k}`);
  const state = newTerra(cfg, `${seed}:skirmish`, players.length, now);
  for (const id of players) {
    const cell = spot(state);
    if (cell >= 0) placeOnTerra(state, cfg, id, cell, now);
  }
  return {
    cfg,
    state,
    startedAt: now,
    endsAt: now + sk.minutes * MINUTE_MS,
    virtualStart: now,
    speed: sk.speed,
    humans,
    ranked: skirmishRanked(base, humans.length, now),
  };
}

/** A free inner cell as far as can be from everyone (ties on the index). */
function spot(s: TerraState): number {
  let best = -1;
  let bestD = -1;
  const held: number[] = [];
  s.owner.forEach((o, i) => {
    if (o !== null) held.push(i);
  });
  // Room all around first; on a crowded map, any free cell two away from everyone.
  for (const room of [6, 0]) {
    for (let i = 0; i < s.owner.length; i++) {
      if (s.owner[i] !== null || !s.map.land[i]) continue;
      if (
        terraNeighbors(s.map, i).filter((n) => s.map.land[n] && s.owner[n] === null).length < room
      )
        continue;
      const d = held.length === 0 ? 0 : Math.min(...held.map((j) => terraDistance(s.map, i, j)));
      if (d >= 2 && d > bestD) {
        best = i;
        bestD = d;
      }
    }
    if (best >= 0) return best;
  }
  return best;
}

/** The skirmish's own time at a real time. */
const virtualAt = (sk: Skirmish, real: number) =>
  sk.virtualStart + (Math.min(real, sk.endsAt) - sk.startedAt) * sk.speed;

/** A time of the skirmish, as a real time (for the screens). */
export function toReal(sk: Skirmish, virtual: number): number {
  return sk.startedAt + Math.round((virtual - sk.virtualStart) / sk.speed);
}

/** Plays the skirmish up to a real time: its steps, the computer's houses, its end. */
export function advanceSkirmish(sk: Skirmish, now: number): void {
  if (sk.result) return;
  const until = virtualAt(sk, now);
  const step = sk.cfg.stepMinutes * MINUTE_MS;
  while (!sk.state.closed && sk.state.clock + step <= until) {
    advanceTerra(sk.state, sk.cfg, sk.state.clock + step);
    for (const id of Object.keys(sk.state.players).sort())
      if (id.startsWith("bot:")) aiMoves(sk.state, sk.cfg, id);
  }
  if (now >= sk.endsAt || sk.state.closed) finish(sk);
}

/**
 * A house of the computer (or a merchant the simulator plays): a front at free land, else at its
 * thinnest neighbour, else Milan.
 */
export function aiMoves(s: TerraState, cfg: TerraConfig, id: string, shareBps = 5_000): void {
  const sk = { cfg };
  const me = s.players[id];
  if (!me || me.eliminatedAt !== undefined || me.troops * 10 < capOf(s, sk.cfg, id) * 3) return;
  const mine = s.fronts.filter((f) => f.owner === id);
  if (mine.length >= sk.cfg.fronts.max) return;
  const aimed = new Set(mine.map((f) => f.aim));
  const busy = new Set(mine.map((f) => f.against));
  const density = (o: string) => (s.players[o]?.troops ?? 0) / Math.max(1, cellsOf(s, o).length);
  const rank = (o: string | null) => (o === null ? 0 : isNation(o) ? 2 : 1);
  const targets: { cell: number; against: string | null }[] = [];
  for (let i = 0; i < s.owner.length; i++) {
    const o = s.owner[i] ?? null;
    if (o === id || !s.map.land[i] || aimed.has(i) || (o !== null && busy.has(o))) continue;
    if (!terraNeighbors(s.map, i).some((n) => s.owner[n] === id)) continue;
    targets.push({ cell: i, against: o });
  }
  targets.sort(
    (a, b) =>
      rank(a.against) - rank(b.against) ||
      (a.against && b.against ? density(a.against) - density(b.against) : 0) ||
      cellCost(s, sk.cfg, a.cell) - cellCost(s, sk.cfg, b.cell) ||
      a.cell - b.cell,
  );
  for (const t of targets) {
    try {
      launchFront(s, sk.cfg, id, t.cell, shareBps, s.clock);
      return;
    } catch (e) {
      if (!(e instanceof EngineError)) throw e;
    }
  }
}

/** The end: ranked by land held, then glory; the ranks bring their glory. */
function finish(sk: Skirmish): void {
  closeTerra(sk.state, sk.cfg, sk.state.clock);
  const rewards = sk.cfg.skirmish?.glory ?? [];
  const ranked = Object.entries(sk.state.players)
    .filter(([id]) => id !== MILAN && !isNation(id))
    .map(([id, p]) => ({ id, cells: cellsOf(sk.state, id).length, glory: p.glory }))
    .sort((a, b) => b.cells - a.cells || b.glory - a.glory || (a.id < b.id ? -1 : 1));
  sk.result = {
    ranking: ranked.map((r, k) => ({ id: r.id, cells: r.cells, glory: rewards[k] ?? 0 })),
  };
}

export type SkirmishAction =
  | { type: "terraFront"; aim: number; shareBps: number }
  | { type: "terraRecall"; frontId: string }
  // The Battle's (lot T6b): the week's orders, on the match's map.
  | { type: "terraBuild"; cell: number; kind: TerraBuilding }
  | { type: "terraRaise" }
  | { type: "terraFire"; cell: number }
  | { type: "terraAlly"; other: string }
  | { type: "terraAccept"; from: string }
  | { type: "terraBreak"; other: string }
  | { type: "terraSend"; to: string; count: number }
  | { type: "terraSignal"; kind: "help" | "attack" | "thanks" | "peace"; cell?: number };

/** A merchant's order in a skirmish; whether it went through. */
export function skirmishAct(sk: Skirmish, id: string, a: SkirmishAction, now: number): boolean {
  advanceSkirmish(sk, now);
  if (sk.result || !sk.humans.includes(id)) return false;
  const s = sk.state;
  const at = s.clock;
  try {
    switch (a.type) {
      case "terraFront":
        launchFront(s, sk.cfg, id, a.aim, a.shareBps, at);
        break;
      case "terraRecall":
        recallFront(s, id, a.frontId);
        break;
      case "terraBuild":
        buildOnTerra(s, sk.cfg, id, a.cell, a.kind, at);
        break;
      case "terraRaise":
        raiseCap(s, sk.cfg, id, at);
        break;
      case "terraFire":
        fireBombard(s, sk.cfg, id, a.cell, at);
        break;
      case "terraAlly":
        proposeAlliance(s, sk.cfg, id, a.other, at);
        break;
      case "terraAccept":
        acceptAlliance(s, sk.cfg, id, a.from, at);
        break;
      case "terraBreak":
        breakAlliance(s, sk.cfg, id, a.other, at);
        break;
      case "terraSend":
        sendTroops(s, sk.cfg, id, a.to, a.count, at);
        break;
      case "terraSignal":
        signal(s, sk.cfg, id, a.kind, a.cell, at);
        break;
    }
    return true;
  } catch (e) {
    if (e instanceof EngineError) return false;
    throw e;
  }
}

/** The Battle's cote settings (lot T6b, B3). */
export interface BattleRating {
  start: number;
  k: number;
  band: number;
  botRating: number;
}

/**
 * The Battle's cote after a match (lot T6b, B3): an Elo of many, each player against each other by
 * their ranks at the end (`ranked`, the first first), a step of `k` shared over the others; the
 * computer's houses (« bot: ») count at their cote but are never moved. Whole numbers.
 */
export function battleRatings(
  ranked: { id: string; rating: number }[],
  rating: BattleRating,
): Record<string, number> {
  const n = ranked.length;
  if (n < 2) return {};
  const step = rating.k / (n - 1);
  const delta = new Map<string, number>();
  for (let i = 0; i < n; i++)
    for (let j = i + 1; j < n; j++) {
      const a = ranked[i] as { id: string; rating: number };
      const b = ranked[j] as { id: string; rating: number };
      const expected = 1 / (1 + 10 ** ((b.rating - a.rating) / 400));
      const d = step * (1 - expected);
      delta.set(a.id, (delta.get(a.id) ?? 0) + d);
      delta.set(b.id, (delta.get(b.id) ?? 0) - d);
    }
  const out: Record<string, number> = {};
  for (const r of ranked)
    if (!r.id.startsWith("bot:")) out[r.id] = Math.round(r.rating + (delta.get(r.id) ?? 0));
  return out;
}

/** The band of cote a player's lobby is drawn from (lot T6b, B3). */
export function battleBand(rating: BattleRating, cote: number): number {
  return Math.max(0, Math.floor(cote / rating.band));
}
