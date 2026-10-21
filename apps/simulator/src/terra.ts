import {
  EngineError,
  MILAN,
  type TerraConfig,
  type TerraState,
  acceptAlliance,
  advanceTerra,
  alliesOf,
  buildOnTerra,
  capOf,
  cellCost,
  cellsOf,
  chooseDecree,
  closeTerra,
  countRankedSkirmish,
  hexNeighbors,
  launchFront,
  newTerra,
  placeOnTerra,
  proposeAlliance,
  raiseCap,
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
  /** Ducats (in deniers) it spends on the Terraferma a day: cap raised, roccas, borgos. */
  budget: bigint;
  /** Skirmishes it plays a day (at its second session): only the first is ranked. */
  skirmishes: number;
}

export const TERRA_PROFILES: Record<string, TerraProfile> = {
  active: {
    name: "assidu",
    sessions: 7,
    shareBps: 4_000,
    fromDay: 0,
    budget: 15_000n,
    skirmishes: 3,
  },
  regular: {
    name: "régulier",
    sessions: 4,
    shareBps: 5_000,
    fromDay: 0,
    budget: 10_000n,
    skirmishes: 1,
  },
  casual: {
    name: "occasionnel",
    sessions: 2,
    shareBps: 7_000,
    fromDay: 0,
    budget: 5_000n,
    skirmishes: 0,
  },
  late: {
    name: "retardataire",
    sessions: 3,
    shareBps: 5_000,
    fromDay: 3,
    budget: 10_000n,
    skirmishes: 0,
  },
};

export const TERRA_MIX: Record<string, number> = { active: 12, regular: 14, casual: 10, late: 4 };

export interface TerraResult {
  seed: number;
  cells: number;
  players: {
    id: string;
    profile: string;
    cells: number;
    glory: number;
    /** Of its glory, what its ranked skirmishes brought. */
    skirmishGlory: number;
    placed: boolean;
    influence: number;
    tier: string;
    allies: number;
  }[];
  /** The week's Signore, its profile, and whether it took the land before the end. */
  signore: { id: string | null; profile: string | null; conquest: boolean; decree: string | null };
  /** Ducats spent on the Terraferma (destroyed), in deniers. */
  spent: bigint;
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

/**
 * How a merchant ranks in its skirmishes: among the merchants of the match only, two or three
 * who take the top places ahead of the condottieri (a merchant beats the computer's houses);
 * always first (the ceiling); or no skirmish at all (the same week without them).
 */
export type SkirmishRanks = "merchants" | "first" | "off";

/**
 * The controls of a run: `draw` another draw of the skirmish ranks (another key of the hash),
 * `blind` merchants who leave the glory of the skirmishes out when they choose an ally, `sessions`
 * another draw of the minutes of their sessions (a gap that owes nothing to the skirmishes).
 */
export interface TerraControls {
  draw?: string;
  blind?: boolean;
  sessions?: string;
}

/** The rank (from 0) of a merchant in one of its skirmishes. */
export function skirmishRank(mode: SkirmishRanks, key: string): number {
  if (mode !== "merchants") return 0;
  const merchants = 2 + (hash(`${key}:merchants`) % 2);
  return hash(key) % merchants;
}

export function runTerra(
  cfg: TerraConfig,
  seed: number,
  mix = TERRA_MIX,
  /** Called at 22 h each day with the state (for a picture of the map). */
  onDay?: (day: number, s: TerraState) => void,
  ranks: SkirmishRanks = "merchants",
  controls: TerraControls = {},
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
        const salt = controls.sessions ? `${controls.sessions}:` : "";
        const jitter = (hash(`${salt}${seed}:${bot.id}:${day}:${k}`) % 60) - 30;
        sessions.push({ at: TERRA_START + day * DAY + slot + jitter * 60_000, bot });
      }
    }
  }
  sessions.sort((a, b) => a.at - b.at || (a.bot.id < b.bot.id ? -1 : 1));

  const result: TerraResult = {
    seed,
    cells: s.map.land.filter(Boolean).length,
    players: [],
    daily: [],
    firstContactHours: null,
    fronts: { launched: 0, againstMerchants: 0, byMilan: 0 },
    signore: { id: null, profile: null, conquest: false, decree: null },
    spent: 0n,
  };
  const wallet = new Map<string, { day: number; left: bigint }>();
  const skirmishGlory = new Map<string, number>();
  // Blind merchants rank their neighbours on their glory less that of the skirmishes.
  const fame = (id: string) =>
    (s.players[id]?.glory ?? 0) - (controls.blind ? (skirmishGlory.get(id) ?? 0) : 0);
  const sessionsToday = new Map<string, number>();
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
      const neutral = s.owner.filter((o, i) => o === null && s.map.land[i]).length;
      const milan = s.owner.filter((o) => o === MILAN).length;
      result.daily.push({
        neutralBps: Math.round((neutral * 10_000) / result.cells),
        milanBps: Math.round((milan * 10_000) / result.cells),
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
    const profile = TERRA_PROFILES[bot.profile] as TerraProfile;
    const today = Math.floor((at - TERRA_START) / DAY);
    const w = wallet.get(bot.id);
    if (!w || w.day !== today) wallet.set(bot.id, { day: today, left: profile.budget });
    const purse = wallet.get(bot.id) as { day: number; left: bigint };
    const before = purse.left;
    play(s, cfg, bot.id, profile, at, seed, purse, fame);
    result.spent += before - purse.left;
    // Its skirmishes of the day, at its second session: its rank as `ranks` says; the first of
    // the day ranked, the others friendly.
    const nth = (sessionsToday.get(`${bot.id}:${today}`) ?? 0) + 1;
    sessionsToday.set(`${bot.id}:${today}`, nth);
    if (ranks !== "off" && cfg.skirmish && nth === 2) {
      for (let k = 0; k < profile.skirmishes; k++) {
        const draw = controls.draw ? `:${controls.draw}` : "";
        const rank = skirmishRank(ranks, `${seed}:${bot.id}:${today}:skirmish:${k}${draw}`);
        const glory = cfg.skirmish.glory[rank] ?? 0;
        const me = s.players[bot.id];
        if (!me || me.eliminatedAt !== undefined) break;
        if (!tryAct(() => countRankedSkirmish(s, cfg, bot.id, at))) continue;
        me.glory += glory;
        skirmishGlory.set(bot.id, (skirmishGlory.get(bot.id) ?? 0) + glory);
      }
    }
    watchFronts();
  }
  closeDay(TERRA_START + 7 * DAY);
  advanceTerra(s, cfg, TERRA_START + 7 * DAY);
  const close = closeTerra(s, cfg, TERRA_START + 7 * DAY);
  const rank = new Map(close.ranking.map((r) => [r.id, r]));
  result.players = bots.map((b) => ({
    id: b.id,
    profile: b.profile,
    cells: cellsOf(s, b.id).length,
    glory: s.players[b.id]?.glory ?? 0,
    skirmishGlory: skirmishGlory.get(b.id) ?? 0,
    placed: !!s.players[b.id],
    influence: rank.get(b.id)?.influence ?? 0,
    tier: rank.get(b.id)?.tier ?? "none",
    allies: alliesOf(s, b.id).length,
  }));
  result.signore = {
    id: close.signore,
    profile: bots.find((b) => b.id === close.signore)?.profile ?? null,
    conquest: close.conquest,
    decree: close.decree?.code ?? null,
  };
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
  purse: { left: bigint },
  /** The glory it reads on a neighbour when it chooses an ally. */
  fame: (id: string) => number,
): void {
  const player = s.players[id];
  if (!player) {
    // A free inner cell of land, tried in an order of its own; failing that, the edge of Milan.
    const inner = (i: number) => hexNeighbors(s.map, i).filter((n) => s.map.land[n]).length === 6;
    const order = (a: number, b: number) => hash(`${seed}:${id}:${a}`) - hash(`${seed}:${id}:${b}`);
    const cells = s.owner
      .map((_, i) => i)
      .filter((i) => s.owner[i] === null && s.map.land[i] && inner(i))
      .sort(order);
    for (const cell of cells.slice(0, 80)) {
      if (tryAct(() => placeOnTerra(s, cfg, id, cell, now))) return;
    }
    const edge = s.owner
      .map((_, i) => i)
      .filter(
        (i) =>
          s.owner[i] === MILAN &&
          hexNeighbors(s.map, i).some((n) => s.map.land[n] && s.owner[n] !== MILAN),
      )
      .sort(order);
    for (const cell of edge.slice(0, 10)) {
      if (tryAct(() => placeOnTerra(s, cfg, id, cell, now))) return;
    }
    return;
  }
  // The decree it would impose, once.
  if (!s.programme?.[id]) {
    const decrees = cfg.close.decrees;
    tryAct(() =>
      chooseDecree(s, cfg, id, {
        code: decrees[hash(`${seed}:${id}:decree`) % decrees.length] ?? "",
      }),
    );
  }
  // Allies: accept who asks, else ask the neighbouring merchant with the most glory.
  for (const r of (s.requests ?? []).filter((x) => x.to === id))
    tryAct(() => acceptAlliance(s, cfg, id, r.from, now));
  if (alliesOf(s, id).length === 0 && (s.requests ?? []).every((r) => r.from !== id)) {
    const neighbours = new Set<string>();
    for (const c of cellsOf(s, id)) {
      for (const n of hexNeighbors(s.map, c)) {
        const o = s.owner[n];
        if (o && o !== id && o !== MILAN) neighbours.add(o);
      }
    }
    const pick = [...neighbours].sort((a, b) => fame(b) - fame(a) || (a < b ? -1 : 1))[0];
    if (pick) tryAct(() => proposeAlliance(s, cfg, id, pick, now));
  }
  // Ducats: a rocca on the border facing a merchant, a borgo, else a higher cap.
  const spend = (f: () => bigint) => {
    try {
      const price = f();
      purse.left -= price;
    } catch (e) {
      if (!(e instanceof EngineError)) throw e;
    }
  };
  const borderCell = cellsOf(s, id).find((c) =>
    hexNeighbors(s.map, c).some((n) => {
      const o = s.owner[n];
      return o && o !== id && o !== MILAN && !alliesOf(s, id).includes(o);
    }),
  );
  if (borderCell !== undefined && purse.left >= cfg.buildings.rocca.price)
    spend(() => buildOnTerra(s, cfg, id, borderCell, "rocca"));
  const inner = cellsOf(s, id).find((c) => !s.buildings?.[c]);
  const borgo = cfg.buildings.borgo;
  if (inner !== undefined && borgo && purse.left >= borgo.price)
    spend(() => buildOnTerra(s, cfg, id, inner, "borgo"));
  if (purse.left >= cfg.capRaise.price) spend(() => raiseCap(s, cfg, id, now));
  const cap = capOf(s, cfg, id);
  if (player.troops * 10 < cap * 3) return;
  if (s.fronts.filter((f) => f.owner === id).length >= cfg.fronts.max) return;
  // The cells along its borders, by holder.
  const border = new Map<string | null, number[]>();
  for (let i = 0; i < s.owner.length; i++) {
    const o = s.owner[i] ?? null;
    if (o === id || !s.map.land[i]) continue;
    if (!hexNeighbors(s.map, i).some((n) => s.owner[n] === id)) continue;
    border.set(o, [...(border.get(o) ?? []), i]);
  }
  const attacked = new Set(s.fronts.filter((f) => f.owner === id).map((f) => f.against));
  const density = (o: string) => (s.players[o]?.troops ?? 0) / Math.max(1, cellsOf(s, o).length);
  const targets = [...border.keys()]
    .filter((o) => !attacked.has(o))
    .filter((o) => o === null || o === MILAN || !alliesOf(s, id).includes(o))
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
