import { meritPoints } from "./campaign.js";
import { familiesOn, membersOf } from "./families.js";
import type { DecreePick, PlayerId, WorldContext, WorldState } from "./state.js";
import { type Tx, emit, fail } from "./tx.js";
import { weekIndex } from "./weekly.js";

/**
 * Laws and decrees. During the week, each family votes its programme (weighted by merit, no
 * member above a share); the family that wins the week imposes it for the next one. A family may
 * not impose the same decree two weeks in a row. The effects are read here by the market, the
 * roads, the Muda and the upkeep.
 */

export type DecreeCode =
  | "fondaco"
  | "gabelle"
  | "faveur"
  | "peage"
  | "levant"
  | "calmiere"
  | "franchise";

/** What a decree is aimed at, if anything. */
export function decreeTargetKind(code: string): "resource" | "city" | null {
  if (code === "gabelle" || code === "calmiere") return "resource";
  if (code === "faveur") return "city";
  return null;
}

function validPick(ctx: WorldContext, pick: DecreePick): boolean {
  if (!ctx.settings.decrees.catalog.includes(pick.code)) return false;
  const kind = decreeTargetKind(pick.code);
  if (kind === null) return pick.target === undefined;
  if (pick.target === undefined) return false;
  if (kind === "resource") return ctx.theme.resources.some((r) => r.code === pick.target);
  return pick.target in ctx.settings.cities;
}

const keyOf = (p: DecreePick) => (p.target ? `${p.code}:${p.target}` : p.code);

export function voteProgramme(tx: Tx, playerId: PlayerId, picks: DecreePick[]): void {
  if (!familiesOn(tx.ctx)) fail("families_off");
  const family = tx.s.families?.memberOf[playerId];
  if (!family) fail("no_family");
  const max = tx.ctx.settings.decrees.perWinner;
  if (!Array.isArray(picks) || picks.length === 0 || picks.length > max) fail("invalid_programme");
  const codes = new Set<string>();
  for (const p of picks) {
    if (!validPick(tx.ctx, p) || codes.has(p.code)) fail("invalid_programme");
    codes.add(p.code);
  }
  const c = tx.s.campaign;
  if (!c || c.closed) fail("season_over");
  c.ballots[playerId] = picks.map((p) =>
    p.target ? { code: p.code, target: p.target } : { code: p.code },
  );
  emit(tx, "programme_voted", playerId, { family, picks: picks.map(keyOf) });
}

/** Weight of each member's ballot: merit, capped; one each when nobody has merit yet. */
export function ballotWeights(
  ctx: WorldContext,
  state: WorldState,
  family: string,
): Record<PlayerId, number> {
  const members = membersOf(state, family);
  const merit = Object.fromEntries(members.map((p) => [p, meritPoints(ctx, state, p)]));
  const total = Object.values(merit).reduce((a, b) => a + b, 0);
  const cap = Math.max(1, Math.floor((total * ctx.settings.decrees.maxVoteBps) / 10_000));
  const voters = members.filter((p) => state.campaign?.ballots[p]);
  const weighted = voters.filter((p) => (merit[p] ?? 0) > 0);
  const out: Record<PlayerId, number> = {};
  for (const p of voters) out[p] = weighted.length > 0 ? Math.min(merit[p] ?? 0, cap) : 1;
  return out;
}

/** The decrees a family imposed for the week under way (barred for its next programme). */
function imposedNow(state: WorldState, family: string): string[] {
  const d = state.campaign?.decrees;
  return d && d.family === family && d.week === state.campaign?.week
    ? d.items.map((i) => i.code)
    : [];
}

/**
 * A family's programme as voted so far: the decrees with the most weight (the target most voted
 * for each), completed by the settings' defaults; never a decree it imposes this week.
 */
export function programmeOf(ctx: WorldContext, state: WorldState, family: string): DecreePick[] {
  const { catalog, perWinner, defaults } = ctx.settings.decrees;
  const barred = new Set(imposedNow(state, family));
  const weights = ballotWeights(ctx, state, family);
  const byCode = new Map<string, { weight: number; targets: Map<string, number> }>();
  for (const [p, w] of Object.entries(weights)) {
    for (const pick of state.campaign?.ballots[p] ?? []) {
      if (!validPick(ctx, pick) || barred.has(pick.code)) continue;
      const e = byCode.get(pick.code) ?? { weight: 0, targets: new Map() };
      e.weight += w;
      if (pick.target) e.targets.set(pick.target, (e.targets.get(pick.target) ?? 0) + w);
      byCode.set(pick.code, e);
    }
  }
  const order = (code: string) => catalog.indexOf(code);
  const voted = [...byCode.entries()]
    .sort((a, b) => b[1].weight - a[1].weight || order(a[0]) - order(b[0]))
    .map(([code, e]) => {
      const target = [...e.targets.entries()].sort(
        (a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1),
      )[0]?.[0];
      return target ? { code, target } : { code };
    });
  const out: DecreePick[] = [];
  for (const pick of [...voted, ...defaults]) {
    if (out.length >= perWinner) break;
    if (barred.has(pick.code) || out.some((o) => o.code === pick.code)) continue;
    if (!validPick(ctx, pick)) continue;
    out.push(pick.target ? { code: pick.code, target: pick.target } : { code: pick.code });
  }
  return out;
}

// ——— In force ———

/** A decree in force at `at`: the family that imposed it and its target. */
export function decreeInForce(
  ctx: WorldContext,
  state: WorldState,
  code: DecreeCode,
  at: number,
): { family: string; target?: string } | null {
  const d = state.campaign?.decrees;
  if (!d || d.week !== weekIndex(ctx, at) || state.campaign?.closed) return null;
  const item = d.items.find((i) => i.code === code);
  if (!item) return null;
  return item.target ? { family: d.family, target: item.target } : { family: d.family };
}

const memberOf = (state: WorldState, playerId: PlayerId, family: string) =>
  state.families?.memberOf[playerId] === family;

/** Market tax on a merchant's sales: the Fondaco's privilege lightens its members'. */
export function decreeTaxBps(
  ctx: WorldContext,
  state: WorldState,
  seller: PlayerId,
  base: number,
  at: number,
): number {
  const d = decreeInForce(ctx, state, "fondaco", at);
  return d && memberOf(state, seller, d.family)
    ? Math.min(base, ctx.settings.decrees.fondaco.taxBps)
    : base;
}

/** Added share of the Dogana's quota (Fondaco's privilege). */
export function decreeQuotaBps(
  ctx: WorldContext,
  state: WorldState,
  playerId: PlayerId | undefined,
  at: number,
): number {
  if (!playerId) return 0;
  const d = decreeInForce(ctx, state, "fondaco", at);
  return d && memberOf(state, playerId, d.family) ? ctx.settings.decrees.fondaco.quotaBps : 0;
}

/** The gabelle on others' sales of a good: its rate and the family it goes to. */
export function gabelleOn(
  ctx: WorldContext,
  state: WorldState,
  seller: PlayerId,
  resource: string,
  at: number,
): { family: string; bps: number } | null {
  const d = decreeInForce(ctx, state, "gabelle", at);
  if (!d || d.target !== resource || memberOf(state, seller, d.family)) return null;
  return { family: d.family, bps: ctx.settings.decrees.gabelle.extraTaxBps };
}

/** The favour of a city: extra pay for the members' deliveries there. */
export function favourBps(
  ctx: WorldContext,
  state: WorldState,
  playerId: PlayerId,
  city: string,
  at: number,
): number {
  const d = decreeInForce(ctx, state, "faveur", at);
  return d && d.target === city && memberOf(state, playerId, d.family)
    ? ctx.settings.decrees.faveur.premiumBps
    : 0;
}

/** Until when the favoured city's urgent orders are kept for the members (null: open to all). */
export function urgentReservedUntil(
  ctx: WorldContext,
  state: WorldState,
  playerId: PlayerId,
  city: string,
  opensAt: number,
  at: number,
): number | null {
  const d = decreeInForce(ctx, state, "faveur", at);
  if (!d || d.target !== city || memberOf(state, playerId, d.family)) return null;
  return opensAt + ctx.settings.decrees.faveur.reservedMinutes * 60_000;
}

/** The toll on others' deliveries to the cities the family held: its rate and the family. */
export function tollOn(
  ctx: WorldContext,
  state: WorldState,
  playerId: PlayerId,
  city: string,
  at: number,
): { family: string; bps: number } | null {
  const d = decreeInForce(ctx, state, "peage", at);
  const cities = state.campaign?.decrees?.cities ?? [];
  if (!d || !cities.includes(city) || memberOf(state, playerId, d.family)) return null;
  return { family: d.family, bps: ctx.settings.decrees.peage.tollBps };
}

/** Port dues under the Levant's tariff: lighter for the members, heavier for the others. */
export function levantDuesBps(
  ctx: WorldContext,
  state: WorldState,
  playerId: PlayerId,
  at: number,
): number {
  const d = decreeInForce(ctx, state, "levant", at);
  if (!d) return 10_000;
  const r = ctx.settings.decrees.levant;
  return memberOf(state, playerId, d.family)
    ? 10_000 - r.memberDiscountBps
    : 10_000 + r.othersSurchargeBps;
}

/** Highest price of an offer of a good under the calmiere, if any. */
export function calmiereCap(
  ctx: WorldContext,
  state: WorldState,
  resource: string,
  at: number,
): bigint | null {
  const d = decreeInForce(ctx, state, "calmiere", at);
  const ref = ctx.settings.referencePrices[resource];
  if (!d || d.target !== resource || ref === undefined) return null;
  return (ref * BigInt(ctx.settings.decrees.calmiere.capBps)) / 10_000n;
}

/** Share of the building upkeep a member is spared (franchise). */
export function upkeepDiscountBps(
  ctx: WorldContext,
  state: WorldState,
  playerId: PlayerId,
  at: number,
): number {
  const d = decreeInForce(ctx, state, "franchise", at);
  return d && memberOf(state, playerId, d.family)
    ? ctx.settings.decrees.franchise.upkeepDiscountBps
    : 0;
}
