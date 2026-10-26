import { type SkirmishAction, aiMoves, skirmishConfig } from "./skirmish.js";
import { MINUTE_MS } from "./state.js";
import {
  MILAN,
  type TerraConfig,
  type TerraState,
  advanceTerra,
  cellsOf,
  closeTerra,
  hexDistance,
  hexNeighbors,
  joinTeam,
  launchFront,
  newTerra,
  placeOnTerra,
  recallFront,
} from "./terraferma.js";
import { EngineError } from "./tx.js";

/**
 * The Condotta (E2-5 of the experts, the owner's decision of 24 October 2026): a Venetian « Red
 * Star ». One to four allied merchants set down in the middle of the Terraferma's map, two or three
 * nations of 1450 and Milan coming from its edges; a live match of a few minutes on the
 * skirmishes' engine. Won by holding the city at stake and a share of the land at the end. Its
 * levels raise the nations' troops; a win opens the next level. Held by the server in memory: it
 * pays nothing (no ducats, no goods, no Muda, no Glory), only a grade and a mission's event.
 */
export interface Condotta {
  cfg: TerraConfig;
  state: TerraState;
  startedAt: number;
  endsAt: number;
  virtualStart: number;
  speed: number;
  humans: string[];
  level: number;
  /** Merchants the computer plays (the simulator's), and the share of troops it sends a front. */
  autoplay: string[];
  autoShareBps: number;
  /** The city to hold, or -1 when the map has none. */
  holdCell: number;
  result?: { won: boolean; shareBps: number; holdsCity: boolean; cells: number };
}

/** The team the merchants of a Condotta share: allies, never a front between them. */
const TEAM = "condotta";
/** Where the nations come from, one an edge: east, north, south (Milan holds the west). */
const EDGES = [
  { x: 9_500, y: 5_000 },
  { x: 5_000, y: 300 },
  { x: 5_000, y: 9_700 },
];

function hash(seed: string): number {
  let h = 2_166_136_261;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16_777_619) >>> 0;
  return h;
}

/**
 * A nation's troops at a level: the same for each (the draw of the nations changes their manner,
 * never the match's difficulty), +`levelStepBps` a level.
 */
export function condottaNationTroops(base: TerraConfig, level: number): number {
  const c = base.condotta;
  if (!c) return 0;
  const levelBps = 10_000 + c.levelStepBps * (Math.max(1, level) - 1);
  return Math.round((c.nationTroops * levelBps) / 10_000);
}

/** The level a group plays: the highest open to all its members. */
export function groupCondottaLevel(levels: number[]): number {
  return levels.length === 0 ? 1 : Math.max(1, Math.min(...levels));
}

/** A member's level after a match played at `played`: a win opens the next one, never lower. */
export function condottaLevelAfter(
  mine: number,
  played: number,
  won: boolean,
  max: number,
): number {
  return won ? Math.max(mine, Math.min(max, played + 1)) : mine;
}

/** The skirmishes' settings, the nations chosen and set at the edges, their troops at the level. */
function condottaConfig(base: TerraConfig, level: number): TerraConfig {
  const c = base.condotta;
  if (!c) throw new Error("no condotta");
  const sk = skirmishConfig({
    ...base,
    skirmish: base.skirmish ?? {
      minutes: c.minutes,
      speed: c.speed,
      stepMinutes: c.stepMinutes,
      players: c.maxPlayers,
      cellsPerPlayer: c.cellsPerPlayer,
      lobbySeconds: c.lobbySeconds,
      troops: c.troops,
      recruit: c.recruit,
      glory: [],
      rankedPerDay: 0,
      minHumans: 1,
      calls: [],
      callLobbyMinutes: 1,
    },
  });
  // One field for all the levels, its map and its nations: only their troops grow with the level.
  const key = "condotta";
  const pool = [...base.nations].sort((a, b) => hash(`${key}:${a.id}`) - hash(`${key}:${b.id}`));
  const span = Math.max(0, c.nations.max - c.nations.min);
  const count = Math.min(
    pool.length,
    EDGES.length,
    c.nations.min + (hash(`${key}:n`) % (span + 1)),
  );
  const troops = condottaNationTroops(base, level);
  return {
    ...sk,
    cellsPerActive: c.cellsPerPlayer,
    minActive: c.maxPlayers,
    stepMinutes: c.stepMinutes,
    start: { ...sk.start, troops: c.troops },
    troops: { ...sk.troops, recruit: c.recruit },
    milan: { ...sk.milan, troops, troopsPerActive: 0, everyHours: 1 },
    nations: pool.slice(0, count).map((n, k) => ({
      ...n,
      city: undefined,
      atBps: EDGES[k],
      troops,
      troopsPerActive: 0,
      everyHours: 1,
    })),
    // Nobody closes the match early by the land taken: it is played to its end.
    close: { ...sk.close, winBps: 10_001 },
  };
}

/** The city at stake: the one named, else the city nearest the middle, else none (-1). */
function holdCellOf(s: TerraState, name: string | undefined): number {
  const named = name ? s.map.cityCode.indexOf(name) : -1;
  if (named >= 0) return named;
  const centre = Math.floor(s.map.height / 2) * s.map.width + Math.floor(s.map.width / 2);
  let best = -1;
  for (let i = 0; i < s.map.city.length; i++) {
    if (!s.map.city[i] || !s.map.land[i]) continue;
    if (best < 0 || hexDistance(s.map, i, centre) < hexDistance(s.map, best, centre)) best = i;
  }
  return best;
}

/** A free cell as near the middle as can be, two away from the merchants already down. */
function middleSpot(s: TerraState): number {
  const centre = Math.floor(s.map.height / 2) * s.map.width + Math.floor(s.map.width / 2);
  const held: number[] = [];
  s.owner.forEach((o, i) => {
    if (o !== null) held.push(i);
  });
  let best = -1;
  for (let i = 0; i < s.owner.length; i++) {
    if (s.owner[i] !== null || !s.map.land[i]) continue;
    if (hexNeighbors(s.map, i).some((n) => s.owner[n] !== null)) continue;
    if (held.some((j) => hexDistance(s.map, i, j) < 2)) continue;
    if (best < 0 || hexDistance(s.map, i, centre) < hexDistance(s.map, best, centre)) best = i;
  }
  return best;
}

/** A Condotta for these merchants at a level (the group's: `groupCondottaLevel`). */
export function createCondotta(
  base: TerraConfig,
  seed: string,
  humans: string[],
  level: number,
  now: number,
  autoplay: string[] = [],
  autoShareBps = 5_000,
): Condotta {
  const c = base.condotta;
  if (!c) throw new Error("no condotta");
  const lvl = Math.min(c.levels, Math.max(1, level));
  const cfg = condottaConfig(base, lvl);
  // The same field whoever plays it and at every level: the troops alone make it harder.
  const state = newTerra(cfg, "condotta", c.maxPlayers, now);
  state.teamMode = true;
  for (const id of humans) {
    const cell = middleSpot(state);
    if (cell < 0) continue;
    placeOnTerra(state, cfg, id, cell, now);
    joinTeam(state, id, TEAM);
  }
  return {
    cfg,
    state,
    startedAt: now,
    endsAt: now + c.minutes * MINUTE_MS,
    virtualStart: now,
    speed: c.speed,
    humans: [...humans],
    level: lvl,
    autoplay: [...autoplay],
    autoShareBps,
    holdCell: holdCellOf(state, c.holdCity),
  };
}

const virtualAt = (c: Condotta, real: number) =>
  c.virtualStart + (Math.min(real, c.endsAt) - c.startedAt) * c.speed;

/** A time of the Condotta, as a real time (for the screens). */
export function condottaToReal(c: Condotta, virtual: number): number {
  return c.startedAt + Math.round((virtual - c.virtualStart) / c.speed);
}

/** Plays the Condotta up to a real time: its steps, the merchants the computer plays, its end. */
export function advanceCondotta(c: Condotta, now: number): void {
  if (c.result) return;
  const until = virtualAt(c, now);
  const step = c.cfg.stepMinutes * MINUTE_MS;
  while (!c.state.closed && c.state.clock + step <= until) {
    advanceTerra(c.state, c.cfg, c.state.clock + step);
    for (const id of c.autoplay) {
      aimAtStake(c, id);
      aiMoves(c.state, c.cfg, id, c.autoShareBps);
    }
  }
  if (now >= c.endsAt || c.state.closed) finish(c);
}

/** A merchant the computer plays goes for the city at stake first, as a player would. */
function aimAtStake(c: Condotta, id: string): void {
  const s = c.state;
  const cell = c.holdCell;
  const holder = cell >= 0 ? s.owner[cell] : undefined;
  if (cell < 0 || (holder && c.humans.includes(holder))) return;
  if (s.fronts.some((f) => f.aim === cell && c.humans.includes(f.owner))) return;
  if (!hexNeighbors(s.map, cell).some((n) => s.owner[n] === id)) return;
  try {
    launchFront(s, c.cfg, id, cell, 6_000, s.clock);
  } catch (e) {
    if (!(e instanceof EngineError)) throw e;
  }
}

/** The end: the merchants' land together, and the city at stake. */
function finish(c: Condotta): void {
  closeTerra(c.state, c.cfg, c.state.clock);
  const land = c.state.map.land.filter(Boolean).length;
  const cells = c.humans.reduce((n, id) => n + cellsOf(c.state, id).length, 0);
  const shareBps = land > 0 ? Math.floor((cells * 10_000) / land) : 0;
  const holder = c.holdCell >= 0 ? c.state.owner[c.holdCell] : null;
  const holdsCity = c.holdCell < 0 || (!!holder && c.humans.includes(holder));
  const target = c.cfg.condotta?.holdShareBps ?? 10_000;
  c.result = { won: holdsCity && shareBps >= target, shareBps, holdsCity, cells };
}

/** A merchant's order in the Condotta; whether it went through. */
export function condottaAct(c: Condotta, id: string, a: SkirmishAction, now: number): boolean {
  advanceCondotta(c, now);
  if (c.result || !c.humans.includes(id)) return false;
  try {
    if (a.type === "terraFront") launchFront(c.state, c.cfg, id, a.aim, a.shareBps, c.state.clock);
    else recallFront(c.state, id, a.frontId);
    return true;
  } catch (e) {
    if (e instanceof EngineError) return false;
    throw e;
  }
}

/** Milan, never a nation of the catalogue: re-exported for the screens' names. */
export const CONDOTTA_MILAN = MILAN;
