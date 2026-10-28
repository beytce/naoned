import { hourIn, hourWithin } from "./clock.js";
import { type Deniers, applyBpsFloor } from "./money.js";
import { specialtyEffects } from "./specialties.js";
import {
  DAY_MS,
  MINUTE_MS,
  type PlayerId,
  type WorldContext,
  type WorldState,
  cashAccount,
  dayIndex,
} from "./state.js";
import { type Tx, emit, transfer } from "./tx.js";

/**
 * The Signoria of the cities (R2 of the audit of 27 October 2026, docs/plan-rupture.md): a city
 * is taken by trade or by arms, on one gauge. A delivery's ducats count on its city's gauge, and
 * so does each open hour the city is held on the Terraferma. At each day's close the points
 * decay, and the leader becomes the city's Podestà: it takes a toll on the others' deliveries
 * there and sees and takes the city's orders before them. Never a house of the computer. Off
 * without its settings.
 */

export type SignoriaRules = NonNullable<WorldContext["settings"]["signoria"]>;

function rulesOf(ctx: WorldContext): SignoriaRules | undefined {
  return ctx.settings.signoria;
}

/** The city's Podestà (undefined: none). */
export function podestaOf(state: WorldState, city: string): PlayerId | undefined {
  return state.signoria?.podesta[city]?.playerId;
}

/** The cities a merchant is Podestà of. */
export function citiesHeldBy(state: WorldState, playerId: PlayerId): string[] {
  return Object.entries(state.signoria?.podesta ?? {})
    .filter(([, p]) => p.playerId === playerId)
    .map(([city]) => city)
    .sort();
}

/** The city's gauge, the most first. */
export function signoriaStandings(
  state: WorldState,
  city: string,
): { playerId: PlayerId; points: number }[] {
  return Object.entries(state.signoria?.points[city] ?? {})
    .filter(([, points]) => points > 0)
    .map(([playerId, points]) => ({ playerId, points }))
    .sort((a, b) => b.points - a.points || a.playerId.localeCompare(b.playerId));
}

function signoriaOf(tx: Tx): NonNullable<WorldState["signoria"]> {
  tx.s.signoria ??= { day: dayIndex(tx.ctx, tx.now), points: {}, podesta: {} };
  return tx.s.signoria;
}

/** Points added to a merchant on a city's gauge; the leader passed is told. */
function addPoints(tx: Tx, playerId: PlayerId, city: string, raw: number): void {
  // An Atout may weigh a merchant's points more, or less (R3).
  const bps = specialtyEffects(tx.ctx, tx.s as WorldState, playerId).signoriaBps;
  const points = Math.floor((raw * Math.max(0, 10_000 + bps)) / 10_000);
  if (points <= 0) return;
  const signoria = signoriaOf(tx);
  const before = signoriaStandings(tx.s as WorldState, city)[0];
  const gauge = signoria.points[city] ?? {};
  gauge[playerId] = (gauge[playerId] ?? 0) + points;
  signoria.points[city] = gauge;
  const after = signoriaStandings(tx.s as WorldState, city)[0];
  if (before && after && before.playerId !== after.playerId && after.playerId === playerId)
    emit(tx, "signoria_overtaken", before.playerId, { city, by: playerId });
}

/** A delivery paid `paid` in a city: its ducats on the gauge, if it left in the open hours. */
export function signoriaArrived(
  tx: Tx,
  playerId: PlayerId,
  city: string,
  paid: Deniers,
  departAt: number,
): void {
  const rules = rulesOf(tx.ctx);
  if (!rules || paid <= 0n) return;
  if (!hourWithin(hourIn(departAt), rules.openHours)) return;
  addPoints(tx, playerId, city, Number(paid / 100n));
}

/** A city held on the Terraferma for `minutes` of open hours. */
export function signoriaHeld(tx: Tx, playerId: PlayerId, city: string, minutes: number): void {
  const rules = rulesOf(tx.ctx);
  if (!rules || !tx.ctx.theme.cities.some((c) => c.code === city)) return;
  addPoints(tx, playerId, city, Math.floor((rules.cityPointsPerHour * minutes) / 60));
}

/**
 * The Podestà's toll on another merchant's delivery to its city (not on a newcomer's), paid from
 * the deliverer's purse to the Podestà's. Returns what was taken.
 */
export function signoriaToll(tx: Tx, playerId: PlayerId, city: string, amount: Deniers): Deniers {
  const rules = rulesOf(tx.ctx);
  const podesta = podestaOf(tx.s as WorldState, city);
  if (!rules || !podesta || podesta === playerId || amount <= 0n) return 0n;
  if (!tx.s.players[podesta]) return 0n;
  const joined = tx.s.players[playerId]?.joinedAt ?? 0;
  if (tx.now - joined < rules.newcomerDays * DAY_MS) return 0n;
  const due = applyBpsFloor(amount, rules.tollBps);
  if (due <= 0n) return 0n;
  transfer(tx, cashAccount(playerId), cashAccount(podesta), due, "signoria_toll", city);
  return due;
}

/** How long before an order of the city opens its Podestà may see and take it. */
export function podestaAdvanceMs(
  ctx: WorldContext,
  state: WorldState,
  playerId: PlayerId,
  city: string,
): number {
  const rules = rulesOf(ctx);
  if (!rules || podestaOf(state, city) !== playerId) return 0;
  return rules.previewMinutes * MINUTE_MS;
}

/**
 * At each day's close (Paris), once per day passed: the points decay, then each city's leader
 * above the threshold is named Podestà, the strongest gauges first so that a house that may hold
 * few cities keeps its best ones (the next in line takes the others). Houses of the computer are
 * passed over.
 */
export function closeSignoriaDays(tx: Tx): void {
  const rules = rulesOf(tx.ctx);
  if (!rules) return;
  const signoria = signoriaOf(tx);
  const today = dayIndex(tx.ctx, tx.now);
  while (signoria.day < today) {
    signoria.day += 1;
    nameAndDecay(tx, rules, signoria);
  }
}

function nameAndDecay(
  tx: Tx,
  rules: SignoriaRules,
  signoria: NonNullable<WorldState["signoria"]>,
): void {
  const state = tx.s as WorldState;
  const eligible = (id: PlayerId) => !!state.players[id] && !state.players[id]?.npc;
  const candidates: { city: string; playerId: PlayerId; points: number }[] = [];
  for (const city of Object.keys(signoria.points).sort()) {
    for (const s of signoriaStandings(state, city)) {
      if (s.points >= rules.minPoints && eligible(s.playerId)) candidates.push({ city, ...s });
    }
  }
  candidates.sort(
    (a, b) =>
      b.points - a.points || a.city.localeCompare(b.city) || a.playerId.localeCompare(b.playerId),
  );
  const named: Record<string, PlayerId> = {};
  const held: Record<PlayerId, number> = {};
  // The strongest gauges first: a city goes to its best merchant who may still hold one more.
  for (const c of candidates) {
    if (named[c.city] || (held[c.playerId] ?? 0) >= rules.maxCities) continue;
    named[c.city] = c.playerId;
    held[c.playerId] = (held[c.playerId] ?? 0) + 1;
  }
  const before = signoria.podesta;
  const after: typeof before = {};
  for (const city of [...new Set([...Object.keys(before), ...Object.keys(named)])].sort()) {
    const was = before[city]?.playerId;
    const now = named[city];
    const kept = was === now ? before[city] : undefined;
    if (now) after[city] = kept ?? { playerId: now, since: tx.now };
    if (was && was !== now) emit(tx, "podesta_lost", was, { city, ...(now ? { by: now } : {}) });
    if (now && was !== now) emit(tx, "podesta_named", now, { city });
  }
  signoria.podesta = after;
  const points: typeof signoria.points = {};
  for (const [city, merchants] of Object.entries(signoria.points)) {
    const gauge: Record<PlayerId, number> = {};
    for (const [id, p] of Object.entries(merchants)) {
      const kept = Math.floor((p * rules.decayBps) / 10_000);
      if (kept > 0) gauge[id] = kept;
    }
    if (Object.keys(gauge).length > 0) points[city] = gauge;
  }
  signoria.points = points;
}
