import { actAt } from "./acts.js";
import { hourIn, hourWithin } from "./clock.js";
import { programmeOf } from "./decrees.js";
import { familiesOn, familyCodes, levyFactorBps, membersOf, seatOf } from "./families.js";
import {
  type AccountId,
  type CampaignLand,
  type CampaignPlayer,
  type CampaignState,
  DAY_MS,
  HOUR_MS,
  type LanceStack,
  type LandHolder,
  MINUTE_MS,
  type March,
  type PlayerId,
  SINK_ACCOUNT,
  type WorldContext,
  type WorldState,
  activePlayerCount,
  cashAccount,
  dayIndex,
  seasonEnd,
} from "./state.js";
import { type Tx, emit, fail, nextId, transfer } from "./tx.js";
import { seasonWeeks, weekIndex } from "./weekly.js";

/**
 * The week's campaign in the Terraferma. Every week the map opens again: each family holds its
 * seat, the militia and Milan everything else. Merchants send lances (levied for free in open
 * hours, or engaged for ducats destroyed) to the lands next to their family's; a march reinforces
 * a land of the family, or attacks one: the attack takes it if it outnumbers the garrison times
 * the land's defense. Lances leave 48 h after being raised. Every open hour, each land is worth its
 * glory to the family holding it; Milan rides against the family ahead. The family with the most
 * glory at the end of the week imposes its decrees on the next one.
 */

export const MILAN = "milan";
const WEEK_MS = 7 * DAY_MS;

type CampaignSettings = NonNullable<WorldContext["settings"]["campaign"]>;

function rules(ctx: WorldContext): CampaignSettings {
  const c = ctx.settings.campaign;
  if (!c) fail("families_off");
  return c;
}

export function familyAccount(family: string): AccountId {
  return `family:${family}`;
}

export function landDef(ctx: WorldContext, code: string) {
  return ctx.settings.campaign?.lands.find((l) => l.code === code);
}

/** The family whose seat this land is, if it is one. */
export function seatFamily(ctx: WorldContext, land: string): string | undefined {
  return ctx.settings.families.list.find((f) => f.seat === land)?.code;
}

function kindOf(ctx: WorldContext, land: string) {
  const def = landDef(ctx, land);
  return def ? rules(ctx).kinds[def.kind] : undefined;
}

export function campaignWeekStart(ctx: WorldContext, week: number): number {
  return ctx.startAt + week * WEEK_MS;
}

/** End of a week of the campaign: the last one runs to the end of the season. */
export function campaignWeekEnd(ctx: WorldContext, week: number): number {
  return week >= seasonWeeks(ctx) - 1 ? seasonEnd(ctx) : ctx.startAt + (week + 1) * WEEK_MS;
}

// ——— Open hours ———

export function campaignOpen(ctx: WorldContext, at: number): boolean {
  return hourWithin(hourIn(at), rules(ctx).openHours);
}

const nextHour = (at: number) => Math.floor(at / HOUR_MS) * HOUR_MS + HOUR_MS;

/** Open time between two instants, in ms (Paris hours change on whole UTC hours). */
export function openMs(ctx: WorldContext, from: number, to: number): number {
  let sum = 0;
  let t = from;
  while (t < to) {
    const next = Math.min(to, nextHour(t));
    if (campaignOpen(ctx, t)) sum += next - t;
    t = next;
  }
  return sum;
}

/** The first open instant from `at` on. */
export function nextOpenAt(ctx: WorldContext, at: number): number {
  if (campaignOpen(ctx, at)) return at;
  let t = nextHour(at);
  for (let i = 0; i < 48; i++, t += HOUR_MS) if (campaignOpen(ctx, t)) return t;
  return at;
}

// ——— The map ———

/** Lands from one to the other, crossing any land (breadth first). */
export function landDistance(ctx: WorldContext, from: string, to: string): number {
  if (from === to) return 0;
  const lands = rules(ctx).lands;
  const seen = new Set([from]);
  let frontier = [from];
  for (let d = 1; frontier.length > 0; d++) {
    const next: string[] = [];
    for (const code of frontier) {
      for (const n of lands.find((l) => l.code === code)?.neighbors ?? []) {
        if (n === to) return d;
        if (!seen.has(n)) {
          seen.add(n);
          next.push(n);
        }
      }
    }
    frontier = next;
  }
  return Number.POSITIVE_INFINITY;
}

/** Minutes a family's march takes to a land (before the night's truce). */
export function marchMinutes(ctx: WorldContext, family: string, land: string): number {
  const { baseMinutes, perHopMinutes } = rules(ctx).march;
  const seat = seatOf(ctx, family);
  const d = seat ? landDistance(ctx, seat, land) : 1;
  return baseMinutes + perHopMinutes * Math.max(0, (Number.isFinite(d) ? d : 1) - 1);
}

const alive = (s: LanceStack, at: number) => s.expiresAt > at;

export function stackCount(stacks: LanceStack[], at: number): number {
  let n = 0;
  for (const s of stacks) if (alive(s, at)) n += s.count;
  return n;
}

/** Lances holding a land at `at`. */
export function garrisonAt(land: CampaignLand, at: number): number {
  return land.npc + stackCount(land.stacks, at);
}

/** Whether a family may send lances to a land now: its own, or next to one of its own. */
export function mayTarget(
  ctx: WorldContext,
  state: WorldState,
  family: string,
  land: string,
): boolean {
  const c = state.campaign;
  const def = landDef(ctx, land);
  if (!c || !def || seatFamily(ctx, land)) return false;
  if (c.lands[land]?.holder === family) return true;
  return def.neighbors.some((n) => c.lands[n]?.holder === family);
}

function milanBps(ctx: WorldContext, at: number): number {
  return actAt(ctx, at)?.milanBps ?? 10_000;
}

function openingGarrison(ctx: WorldContext, land: string, active: number, at: number): number {
  const def = landDef(ctx, land);
  const kind = kindOf(ctx, land);
  if (!def || !kind) return 0;
  const n = kind.militia + kind.militiaPerActive * active;
  return def.milan ? Math.floor((n * milanBps(ctx, at)) / 10_000) : n;
}

function openingLands(ctx: WorldContext, active: number, at: number): Record<string, CampaignLand> {
  const out: Record<string, CampaignLand> = {};
  for (const def of rules(ctx).lands) {
    const seat = seatFamily(ctx, def.code);
    const holder: LandHolder = seat ?? (def.milan ? MILAN : null);
    out[def.code] = {
      holder,
      npc: seat ? 0 : openingGarrison(ctx, def.code, active, at),
      stacks: [],
      since: at,
    };
  }
  return out;
}

function openCampaign(
  ctx: WorldContext,
  state: WorldState,
  week: number,
  at: number,
): CampaignState {
  const active = Math.max(1, activePlayerCount(ctx, state, at));
  return {
    week,
    accruedAt: at,
    lands: openingLands(ctx, active, at),
    glory: {},
    merit: {},
    marches: {},
    players: state.campaign?.players ?? {},
    ballots: {},
    nextMilanAt: nextOpenAt(ctx, at + rules(ctx).milan.everyHours * HOUR_MS),
    regenDay: dayIndex(ctx, at),
    history: state.campaign?.history ?? [],
    ...(state.campaign?.decrees ? { decrees: state.campaign.decrees } : {}),
  };
}

function campaign(tx: Tx): CampaignState {
  if (!tx.s.campaign) {
    const week = weekIndex(tx.ctx, tx.now);
    tx.s.campaign = openCampaign(tx.ctx, tx.s as WorldState, week, tx.now);
  }
  return tx.s.campaign;
}

// ——— Glory and merit ———

export function gloryPoints(ms: number): number {
  return Math.floor(ms / HOUR_MS);
}

/** A merchant's merit this week, in points. */
export function meritPoints(ctx: WorldContext, state: WorldState, playerId: PlayerId): number {
  const m = state.campaign?.merit[playerId];
  if (!m) return 0;
  const per = ctx.settings.campaign?.garrisonLancesPerPoint ?? 1;
  return m.battle + Math.floor(m.garrisonMs / (per * HOUR_MS));
}

/** Glory of each family at `at` (counted up to then without changing the state), in points. */
export function liveGlory(
  ctx: WorldContext,
  state: WorldState,
  at: number,
): Record<string, number> {
  const c = state.campaign;
  const out: Record<string, number> = {};
  for (const f of familyCodes(ctx)) out[f] = 0;
  if (!c) return out;
  const extra = at > c.accruedAt && !c.closed ? openMs(ctx, c.accruedAt, at) : 0;
  for (const f of familyCodes(ctx)) {
    let ms = c.glory[f] ?? 0;
    for (const [code, land] of Object.entries(c.lands)) {
      if (land.holder === f) ms += (kindOf(ctx, code)?.glory ?? 0) * extra;
    }
    out[f] = gloryPoints(ms);
  }
  return out;
}

/** Counts glory and garrison merit from the last count to `to`. */
function accrue(tx: Tx, to: number): void {
  const c = campaign(tx);
  const from = c.accruedAt;
  if (to <= from) return;
  const open = new Map<number, number>();
  const openTo = (end: number) => {
    let v = open.get(end);
    if (v === undefined) {
      v = openMs(tx.ctx, from, end);
      open.set(end, v);
    }
    return v;
  };
  for (const [code, land] of Object.entries(c.lands)) {
    const h = land.holder;
    if (!h || h === MILAN) continue;
    const value = kindOf(tx.ctx, code)?.glory ?? 0;
    if (value > 0) c.glory[h] = (c.glory[h] ?? 0) + value * openTo(to);
    for (const s of land.stacks) {
      const end = Math.min(to, s.expiresAt);
      if (end <= from) continue;
      c.merit[s.playerId] ??= { battle: 0, garrisonMs: 0 };
      const m = c.merit[s.playerId];
      if (m) m.garrisonMs += s.count * openTo(end);
    }
    land.stacks = land.stacks.filter((s) => alive(s, to));
  }
  c.accruedAt = to;
}

function addBattleMerit(c: CampaignState, stacks: LanceStack[]): void {
  for (const s of stacks) {
    c.merit[s.playerId] ??= { battle: 0, garrisonMs: 0 };
    const m = c.merit[s.playerId];
    if (m) m.battle += s.count;
  }
}

/** Keeps `total` lances of these stacks, pro rata (largest remainders first). */
export function scaleStacks(stacks: LanceStack[], total: number): LanceStack[] {
  const sum = stacks.reduce((a, s) => a + s.count, 0);
  if (total >= sum) return stacks.map((s) => ({ ...s }));
  if (total <= 0 || sum === 0) return [];
  const parts = stacks.map((s, i) => {
    const exact = s.count * total;
    return { i, keep: Math.floor(exact / sum), rest: exact % sum };
  });
  let left = total - parts.reduce((a, p) => a + p.keep, 0);
  for (const p of [...parts].sort((a, b) => b.rest - a.rest || a.i - b.i)) {
    if (left <= 0) break;
    p.keep += 1;
    left -= 1;
  }
  return parts
    .map((p) => ({ ...(stacks[p.i] as LanceStack), count: p.keep }))
    .filter((s) => s.count > 0);
}

// ——— Battles ———

function resolveMarch(tx: Tx, m: March, at: number): void {
  const c = campaign(tx);
  delete c.marches[m.id];
  const land = c.lands[m.target];
  if (!land) return;
  const stacks = m.stacks.filter((s) => alive(s, at));
  const attack = m.npc + stackCount(stacks, at);
  if (attack <= 0) return;
  const players = [...new Set(stacks.map((s) => s.playerId))];
  if (land.holder === m.family) {
    land.stacks.push(...stacks);
    land.npc += m.npc;
    for (const p of players) emit(tx, "march_reinforced", p, { land: m.target, march: m.id });
    return;
  }
  const defenders = land.stacks.filter((s) => alive(s, at));
  const garrison = land.npc + stackCount(defenders, at);
  const defenseBps = kindOf(tx.ctx, m.target)?.defenseBps ?? 10_000;
  const defense = Math.ceil((garrison * defenseBps) / 10_000);
  const from = land.holder;
  const data = { land: m.target, family: m.family, attack, defense, from };
  if (attack > defense) {
    const survivors = attack - defense;
    land.holder = m.family;
    land.since = at;
    if (m.family === MILAN) {
      land.npc = survivors;
      land.stacks = [];
    } else {
      land.npc = 0;
      land.stacks = scaleStacks(stacks, survivors);
    }
    addBattleMerit(c, stacks);
    emit(tx, "land_taken", undefined, data);
    for (const p of [...new Set(defenders.map((s) => s.playerId))]) {
      emit(tx, "land_lost", p, { land: m.target, by: m.family });
    }
    for (const p of players) emit(tx, "assault_won", p, { land: m.target, march: m.id });
  } else {
    const loss = Math.min(garrison, Math.floor((attack * 10_000) / defenseBps));
    if (defenders.length === 0) land.npc = Math.max(0, land.npc - loss);
    else land.stacks = scaleStacks(defenders, stackCount(defenders, at) - loss);
    addBattleMerit(c, defenders);
    emit(tx, "land_held", undefined, data);
    for (const p of [...new Set(defenders.map((s) => s.playerId))]) {
      emit(tx, "land_defended", p, { land: m.target, by: m.family });
    }
    for (const p of players) emit(tx, "assault_failed", p, { land: m.target, march: m.id });
  }
}

/** The family ahead in glory (none while nobody has any), and how far ahead, in bps. */
function leader(ctx: WorldContext, c: CampaignState): { family: string; leadBps: number } | null {
  const ranked = familyCodes(ctx)
    .map((f) => ({ f, g: c.glory[f] ?? 0 }))
    .sort((a, b) => b.g - a.g || (a.f < b.f ? -1 : 1));
  const first = ranked[0];
  if (!first || first.g <= 0) return null;
  const second = ranked[1]?.g ?? 0;
  return { family: first.f, leadBps: Math.floor(((first.g - second) * 10_000) / first.g) };
}

/** Milan rides against the family ahead: its weakest land on Milan's border, or its weakest. */
function milanRides(tx: Tx, at: number): void {
  const { ctx } = tx;
  const c = campaign(tx);
  const lead = leader(ctx, c);
  if (!lead) return;
  const held = Object.entries(c.lands)
    .filter(([code, l]) => l.holder === lead.family && !seatFamily(ctx, code))
    .map(([code, l]) => ({ code, g: garrisonAt(l, at) }));
  if (held.length === 0) return;
  const border = held.filter(({ code }) =>
    landDef(ctx, code)?.neighbors.some((n) => c.lands[n]?.holder === MILAN),
  );
  const pool = border.length > 0 ? border : held;
  const target = pool.sort((a, b) => a.g - b.g || (a.code < b.code ? -1 : 1))[0];
  if (!target) return;
  const r = rules(ctx).milan;
  const active = Math.max(1, activePlayerCount(ctx, tx.s as WorldState, at));
  const base = (r.base + r.perActive * active) * milanBps(ctx, at);
  const lances = Math.floor(
    (base * (10_000 + Math.floor((r.leadBonusBps * lead.leadBps) / 10_000))) / 100_000_000,
  );
  if (lances <= 0) return;
  const id = nextId(tx, "m");
  const arriveAt = nextOpenAt(ctx, at + r.warningMinutes * MINUTE_MS);
  c.marches[id] = {
    id,
    family: MILAN,
    by: null,
    target: target.code,
    startAt: at,
    arriveAt,
    stacks: [],
    npc: lances,
  };
  emit(tx, "milan_rides", undefined, {
    march: id,
    land: target.code,
    family: lead.family,
    lances,
    arriveAt,
  });
  const land = c.lands[target.code];
  for (const p of [...new Set((land?.stacks ?? []).map((s) => s.playerId))]) {
    emit(tx, "land_threatened", p, { land: target.code, by: MILAN, arriveAt, lances });
  }
}

/** Every day, Milan's own fortresses are manned again. */
function regenerate(tx: Tx, at: number): void {
  const c = campaign(tx);
  const active = Math.max(1, activePlayerCount(tx.ctx, tx.s as WorldState, at));
  for (const [code, land] of Object.entries(c.lands)) {
    if (land.holder !== MILAN || !landDef(tx.ctx, code)?.milan) continue;
    land.npc = Math.max(land.npc, openingGarrison(tx.ctx, code, active, at));
  }
}

// ——— The week ———

function playerRecord(tx: Tx, playerId: PlayerId): CampaignPlayer {
  const c = campaign(tx);
  let rec = c.players[playerId];
  if (!rec) {
    const since = tx.s.families?.since[playerId] ?? tx.now;
    rec = { reserve: [], levySince: since, levyStored: 0, hireDay: -1, hired: 0 };
    c.players[playerId] = rec;
  }
  return rec;
}

/** Shares out what the decrees in force collected (gabelle, toll) by the members' merit. */
function payDecreeShares(tx: Tx): void {
  const c = campaign(tx);
  const d = c.decrees;
  if (!d) return;
  const account = familyAccount(d.family);
  const held = tx.s.accounts[account] ?? 0n;
  if (held <= 0n) return;
  let weights = Object.entries(d.shares).filter(([p, w]) => w > 0 && tx.s.players[p]);
  if (weights.length === 0) weights = membersOf(tx.s as WorldState, d.family).map((p) => [p, 1]);
  if (weights.length === 0) {
    transfer(tx, account, SINK_ACCOUNT, held, "decree_share", `week:${d.week}`);
    return;
  }
  const total = weights.reduce((a, [, w]) => a + w, 0);
  let left = held;
  weights.forEach(([p, w], i) => {
    const share = i === weights.length - 1 ? left : (held * BigInt(w)) / BigInt(total);
    transfer(tx, account, cashAccount(p), share, "decree_share", `week:${d.week}`);
    left -= share;
    if (share > 0n) emit(tx, "decree_share", p, { family: d.family, amount: share.toString() });
  });
}

/** The week is over: the winner, its decrees for the next week, and the map opens again. */
function closeCampaignWeek(tx: Tx, end: number): void {
  const { ctx } = tx;
  const c = campaign(tx);
  const state = tx.s as WorldState;
  const week = c.week;
  const final = week >= seasonWeeks(ctx) - 1;
  const glory: Record<string, number> = {};
  for (const f of familyCodes(ctx)) glory[f] = gloryPoints(c.glory[f] ?? 0);
  const lead = leader(ctx, c);
  const winner = lead?.family ?? null;
  const captains: Record<string, PlayerId> = {};
  for (const f of familyCodes(ctx)) {
    const best = membersOf(state, f)
      .map((p) => ({ p, m: meritPoints(ctx, state, p) }))
      .filter((x) => x.m > 0)
      .sort((a, b) => b.m - a.m || (a.p < b.p ? -1 : 1))[0];
    if (best) captains[f] = best.p;
  }
  payDecreeShares(tx);
  const items = !final && winner ? programmeOf(ctx, state, winner) : [];
  const lands: Record<string, LandHolder> = {};
  for (const [code, l] of Object.entries(c.lands)) lands[code] = l.holder;
  c.history.push({ week, winner, glory, decrees: items, lands, captains, final });
  if (!final && winner) {
    const shares: Record<PlayerId, number> = {};
    for (const p of membersOf(state, winner)) shares[p] = meritPoints(ctx, state, p);
    const cities = Object.entries(c.lands)
      .filter(([, l]) => l.holder === winner)
      .map(([code]) => landDef(ctx, code)?.city)
      .filter((city): city is string => !!city)
      .sort();
    c.decrees = { week: week + 1, family: winner, items, shares, cities };
  } else {
    c.decrees = undefined;
  }
  emit(tx, "campaign_closed", undefined, { week, winner, glory, decrees: items, final, captains });
  if (final) {
    c.closed = true;
    return;
  }
  // The lances in garrison or on the march go back to their merchants' reserves.
  const back = [
    ...Object.values(c.lands).flatMap((l) => l.stacks),
    ...Object.values(c.marches).flatMap((m) => m.stacks),
  ].filter((s) => alive(s, end));
  const next = openCampaign(ctx, state, week + 1, end);
  tx.s.campaign = next;
  for (const s of back) next.players[s.playerId]?.reserve.push(s);
}

/**
 * Brings the campaign up to now, in time order: marches arrive, Milan rides, its fortresses are
 * manned again each day, glory and merit are counted, and the week closes. Scheduled every tick,
 * and before every campaign command.
 */
export function advanceCampaign(tx: Tx): void {
  const { ctx } = tx;
  if (!familiesOn(ctx)) return;
  campaign(tx);
  for (let guard = 0; guard < 10_000; guard++) {
    const c = campaign(tx);
    if (c.closed) return;
    const end = campaignWeekEnd(ctx, c.week);
    const horizon = Math.min(tx.now, end);
    const march = Object.values(c.marches)
      .filter((m) => m.arriveAt <= horizon)
      .sort((a, b) => a.arriveAt - b.arriveAt || (a.id < b.id ? -1 : 1))[0];
    const regenAt = ctx.startAt + (c.regenDay + 1) * DAY_MS;
    const events = [
      march ? { at: march.arriveAt, kind: "march" as const } : null,
      c.nextMilanAt <= horizon && c.nextMilanAt < end
        ? { at: c.nextMilanAt, kind: "milan" as const }
        : null,
      regenAt <= horizon && regenAt < end ? { at: regenAt, kind: "regen" as const } : null,
    ]
      .filter((e) => e !== null)
      .sort((a, b) => a.at - b.at);
    const first = events[0];
    if (first) {
      accrue(tx, first.at);
      if (first.kind === "march" && march) resolveMarch(tx, march, first.at);
      else if (first.kind === "milan") {
        if (campaignOpen(ctx, first.at)) milanRides(tx, first.at);
        c.nextMilanAt = nextOpenAt(ctx, first.at + rules(ctx).milan.everyHours * HOUR_MS);
      } else {
        regenerate(tx, first.at);
        c.regenDay += 1;
      }
      continue;
    }
    accrue(tx, horizon);
    if (tx.now < end) return;
    closeCampaignWeek(tx, end);
  }
}

// ——— The merchants' lances ———

/** Free lances waiting for a merchant (before the family's size is applied). */
export function levyWaiting(ctx: WorldContext, state: WorldState, playerId: PlayerId, at: number) {
  const r = ctx.settings.campaign;
  if (!r) return 0;
  const rec = state.campaign?.players[playerId];
  const since = rec?.levySince ?? state.families?.since[playerId];
  if (since === undefined) return 0;
  const raw =
    (rec?.levyStored ?? 0) + Math.floor((openMs(ctx, since, at) * r.levy.perHour) / HOUR_MS);
  return Math.min(r.levy.max, raw);
}

/** Lances in a merchant's reserve at `at`. */
export function reserveOf(state: WorldState, playerId: PlayerId, at: number): number {
  return stackCount(state.campaign?.players[playerId]?.reserve ?? [], at);
}

/** Lances a merchant has engaged for ducats today. */
export function hiredToday(ctx: WorldContext, state: WorldState, playerId: PlayerId, at: number) {
  const rec = state.campaign?.players[playerId];
  return rec && rec.hireDay === dayIndex(ctx, at) ? rec.hired : 0;
}

/** Price of the next `count` lances after `already` today; undefined beyond the day's limit. */
export function hireCost(ctx: WorldContext, already: number, count: number): bigint | undefined {
  let skip = already;
  let left = count;
  let cost = 0n;
  for (const tier of ctx.settings.campaign?.hire ?? []) {
    const room = Math.max(0, tier.count - skip);
    skip = Math.max(0, skip - tier.count);
    const n = Math.min(room, left);
    cost += tier.price * BigInt(n);
    left -= n;
  }
  return left > 0 ? undefined : cost;
}

export function hireLimit(ctx: WorldContext): number {
  return (ctx.settings.campaign?.hire ?? []).reduce((a, t) => a + t.count, 0);
}

function memberFamily(tx: Tx, playerId: PlayerId): string {
  if (!familiesOn(tx.ctx)) fail("families_off");
  const family = tx.s.families?.memberOf[playerId];
  if (!family) fail("no_family");
  return family;
}

function newStack(tx: Tx, playerId: PlayerId, count: number): LanceStack {
  return { playerId, count, expiresAt: tx.now + rules(tx.ctx).lanceHours * HOUR_MS };
}

export function collectLevy(tx: Tx, playerId: PlayerId): number {
  const family = memberFamily(tx, playerId);
  advanceCampaign(tx);
  const waiting = levyWaiting(tx.ctx, tx.s as WorldState, playerId, tx.now);
  const factor = levyFactorBps(tx.ctx, tx.s as WorldState, family, tx.now);
  const count = Math.floor((waiting * factor) / 10_000);
  if (count <= 0) fail("nothing_to_levy");
  const rec = playerRecord(tx, playerId);
  rec.levySince = tx.now;
  rec.levyStored = 0;
  rec.reserve.push(newStack(tx, playerId, count));
  emit(tx, "levy_collected", playerId, { family, lances: count });
  return count;
}

export function hireLances(tx: Tx, playerId: PlayerId, count: number): void {
  const family = memberFamily(tx, playerId);
  if (!Number.isInteger(count) || count <= 0) fail("invalid_quantity");
  advanceCampaign(tx);
  const rec = playerRecord(tx, playerId);
  const today = dayIndex(tx.ctx, tx.now);
  if (rec.hireDay !== today) {
    rec.hireDay = today;
    rec.hired = 0;
  }
  const cost = hireCost(tx.ctx, rec.hired, count);
  if (cost === undefined) fail("hire_limit");
  transfer(tx, cashAccount(playerId), SINK_ACCOUNT, cost, "campaign_hire", family);
  rec.hired += count;
  rec.reserve.push(newStack(tx, playerId, count));
  emit(tx, "lances_hired", playerId, { family, lances: count, cost: cost.toString() });
}

/** Takes lances from a merchant's reserve, those leaving first first. */
function takeLances(tx: Tx, playerId: PlayerId, count: number): LanceStack[] {
  if (!Number.isInteger(count) || count <= 0) fail("invalid_quantity");
  const rec = playerRecord(tx, playerId);
  rec.reserve = rec.reserve
    .filter((s) => alive(s, tx.now))
    .sort((a, b) => a.expiresAt - b.expiresAt);
  if (stackCount(rec.reserve, tx.now) < count) fail("not_enough_lances");
  const taken: LanceStack[] = [];
  let left = count;
  for (const s of rec.reserve) {
    if (left <= 0) break;
    const n = Math.min(s.count, left);
    taken.push({ ...s, count: n });
    s.count -= n;
    left -= n;
  }
  rec.reserve = rec.reserve.filter((s) => s.count > 0);
  return taken;
}

export function sendMarch(tx: Tx, playerId: PlayerId, target: string, lances: number): March {
  const family = memberFamily(tx, playerId);
  advanceCampaign(tx);
  const c = campaign(tx);
  if (c.closed) fail("season_over");
  if (!landDef(tx.ctx, target)) fail("unknown_land");
  if (seatFamily(tx.ctx, target)) fail("seat_untouchable");
  if (!mayTarget(tx.ctx, tx.s as WorldState, family, target)) fail("not_adjacent");
  const stacks = takeLances(tx, playerId, lances);
  const minutes = marchMinutes(tx.ctx, family, target);
  const arriveAt = Math.min(
    nextOpenAt(tx.ctx, tx.now + minutes * MINUTE_MS),
    campaignWeekEnd(tx.ctx, c.week) - 1,
  );
  const id = nextId(tx, "m");
  const march: March = {
    id,
    family,
    by: playerId,
    target,
    startAt: tx.now,
    arriveAt,
    stacks,
    npc: 0,
  };
  c.marches[id] = march;
  const land = c.lands[target];
  const attack = land?.holder !== family;
  emit(tx, "march_sent", playerId, { march: id, land: target, lances, arriveAt, attack });
  if (attack && land) {
    for (const p of [...new Set(land.stacks.map((s) => s.playerId))]) {
      emit(tx, "land_threatened", p, { land: target, by: family, arriveAt, lances });
    }
  }
  return march;
}

export function joinMarch(tx: Tx, playerId: PlayerId, marchId: string, lances: number): void {
  const family = memberFamily(tx, playerId);
  advanceCampaign(tx);
  const c = campaign(tx);
  const march = c.marches[marchId];
  if (!march || march.family !== family) fail("unknown_march");
  const stacks = takeLances(tx, playerId, lances);
  march.stacks.push(...stacks);
  emit(tx, "march_joined", playerId, { march: marchId, land: march.target, lances });
}
