import {
  EngineError,
  MILAN,
  type TerraConfig,
  type TerraState,
  advanceTerra,
  capOf,
  cellCost,
  cellsOf,
  hexNeighbors,
  launchFront,
  newTerra,
  placeOnTerra,
} from "@comptoirs/engine";

/**
 * The Terraferma prototype (docs/plan-terraferme.md) played for a week by merchants of the
 * computer: each comes at its own rhythm, sets down on a free cell, then launches fronts at
 * neutral land first, else at the weakest neighbour, else at Milan. Measures what the plan asks:
 * how fast the land fills, when merchants meet, how much the regular player is ahead, how much
 * the leader holds.
 */

const HOUR = 3_600_000;
const DAY = 24 * HOUR;
/** Monday 5 October 2026, 0 h in Paris. */
export const TERRA_START = Date.UTC(2026, 9, 4, 22, 0);

export interface TerraProfile {
  name: string;
  /** Sessions a day, spread from 8 h to 22 h. */
  sessions: number;
  /** Share of the troops sent in a front. */
  shareBps: number;
  /** First day it comes (0: Monday). */
  fromDay: number;
}

export const TERRA_PROFILES: Record<string, TerraProfile> = {
  active: { name: "assidu", sessions: 7, shareBps: 4_000, fromDay: 0 },
  regular: { name: "régulier", sessions: 4, shareBps: 5_000, fromDay: 0 },
  casual: { name: "occasionnel", sessions: 2, shareBps: 7_000, fromDay: 0 },
  late: { name: "retardataire", sessions: 3, shareBps: 5_000, fromDay: 3 },
};

export const TERRA_MIX: Record<string, number> = { active: 12, regular: 14, casual: 10, late: 4 };

export interface TerraResult {
  seed: number;
  cells: number;
  players: { id: string; profile: string; cells: number; glory: number; placed: boolean }[];
  /** Share of the land still neutral, and held by Milan, at 22 h each day. */
  daily: { neutralBps: number; milanBps: number; contested: number }[];
  /** Hours from the week's start to the first front between merchants. */
  firstContactHours: number | null;
  fronts: { launched: number; againstMerchants: number; byMilan: number };
}

function hash(key: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  h ^= h >>> 15;
  h = Math.imul(h, 0x2c1b3c6d) >>> 0;
  return (h ^ (h >>> 12)) >>> 0;
}

export function runTerra(
  cfg: TerraConfig,
  seed: number,
  mix = TERRA_MIX,
  /** Called at 22 h each day with the state (for a picture of the map). */
  onDay?: (day: number, s: TerraState) => void,
): TerraResult {
  const bots = Object.entries(mix).flatMap(([profile, n]) =>
    Array.from({ length: n }, (_, k) => ({ id: `${profile}${k}`, profile })),
  );
  const s = newTerra(cfg, `seed${seed}`, bots.length, TERRA_START);
  // Every session of the week, in order.
  const sessions: { at: number; bot: (typeof bots)[number] }[] = [];
  for (const bot of bots) {
    const p = TERRA_PROFILES[bot.profile] as TerraProfile;
    for (let day = p.fromDay; day < 7; day++) {
      for (let k = 0; k < p.sessions; k++) {
        const slot = 8 * HOUR + Math.floor(((k + 0.5) * 14 * HOUR) / p.sessions);
        const jitter = (hash(`${seed}:${bot.id}:${day}:${k}`) % 60) - 30;
        sessions.push({ at: TERRA_START + day * DAY + slot + jitter * 60_000, bot });
      }
    }
  }
  sessions.sort((a, b) => a.at - b.at || (a.bot.id < b.bot.id ? -1 : 1));

  const result: TerraResult = {
    seed,
    cells: s.owner.length,
    players: [],
    daily: [],
    firstContactHours: null,
    fronts: { launched: 0, againstMerchants: 0, byMilan: 0 },
  };
  const seen = new Set<string>();
  const watchFronts = () => {
    for (const f of s.fronts) {
      if (seen.has(f.id)) continue;
      seen.add(f.id);
      result.fronts.launched++;
      if (f.owner === MILAN) result.fronts.byMilan++;
      if (f.against !== null && f.against !== MILAN && f.owner !== MILAN) {
        result.fronts.againstMerchants++;
        if (result.firstContactHours === null)
          result.firstContactHours = Math.round((f.launchedAt - TERRA_START) / HOUR);
      }
    }
  };
  let day = 0;
  const closeDay = (until: number) => {
    while (TERRA_START + day * DAY + 22 * HOUR <= until && day < 7) {
      advanceTerra(s, cfg, TERRA_START + day * DAY + 22 * HOUR);
      watchFronts();
      const neutral = s.owner.filter((o) => o === null).length;
      const milan = s.owner.filter((o) => o === MILAN).length;
      result.daily.push({
        neutralBps: Math.round((neutral * 10_000) / s.owner.length),
        milanBps: Math.round((milan * 10_000) / s.owner.length),
        contested: s.fronts.filter((f) => f.against !== null).length,
      });
      onDay?.(day, s);
      day++;
    }
  };

  for (const { at, bot } of sessions) {
    closeDay(at);
    advanceTerra(s, cfg, at);
    watchFronts();
    play(s, cfg, bot.id, TERRA_PROFILES[bot.profile] as TerraProfile, at, seed);
    watchFronts();
  }
  closeDay(TERRA_START + 7 * DAY);
  advanceTerra(s, cfg, TERRA_START + 7 * DAY);
  result.players = bots.map((b) => ({
    id: b.id,
    profile: b.profile,
    cells: cellsOf(s, b.id).length,
    glory: s.players[b.id]?.glory ?? 0,
    placed: !!s.players[b.id],
  }));
  return result;
}

function tryAct(f: () => void): boolean {
  try {
    f();
    return true;
  } catch (e) {
    if (e instanceof EngineError) return false;
    throw e;
  }
}

/** One session of a merchant of the computer. */
function play(
  s: TerraState,
  cfg: TerraConfig,
  id: string,
  profile: TerraProfile,
  now: number,
  seed: number,
): void {
  const player = s.players[id];
  if (!player) {
    // A free inner cell, tried in an order of its own.
    const cells = s.owner
      .map((_, i) => i)
      .filter((i) => s.owner[i] === null && hexNeighbors(s.map, i).length === 6)
      .sort((a, b) => hash(`${seed}:${id}:${a}`) - hash(`${seed}:${id}:${b}`));
    for (const cell of cells.slice(0, 80)) {
      if (tryAct(() => placeOnTerra(s, cfg, id, cell, now))) return;
    }
    return;
  }
  const cap = capOf(s, cfg, id);
  if (player.troops * 10 < cap * 3) return;
  if (s.fronts.filter((f) => f.owner === id).length >= cfg.fronts.max) return;
  // The cells along its borders, by holder.
  const border = new Map<string | null, number[]>();
  for (let i = 0; i < s.owner.length; i++) {
    const o = s.owner[i] ?? null;
    if (o === id) continue;
    if (!hexNeighbors(s.map, i).some((n) => s.owner[n] === id)) continue;
    border.set(o, [...(border.get(o) ?? []), i]);
  }
  const attacked = new Set(s.fronts.filter((f) => f.owner === id).map((f) => f.against));
  const density = (o: string) => (s.players[o]?.troops ?? 0) / Math.max(1, cellsOf(s, o).length);
  const targets = [...border.keys()]
    .filter((o) => !attacked.has(o))
    // Merchants only once neither side is protected any more.
    .filter(
      (o) =>
        o === null ||
        o === MILAN ||
        (player.protectedUntil <= now && (s.players[o]?.protectedUntil ?? 0) <= now),
    )
    .sort((a, b) => {
      // Neutral land first, then the thinnest neighbour, Milan last.
      const rank = (o: string | null) => (o === null ? 0 : o === MILAN ? 2 : 1);
      return rank(a) - rank(b) || (a && b ? density(a) - density(b) : 0);
    });
  const against = targets[0];
  if (against === undefined) return;
  const cells = (border.get(against) ?? []).sort(
    (a, b) => cellCost(s, cfg, a) - cellCost(s, cfg, b) || a - b,
  );
  const aim = cells[0];
  if (aim === undefined) return;
  tryAct(() => launchFront(s, cfg, id, aim, profile.shareBps, now));
}
