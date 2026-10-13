import {
  DAY_MS,
  type FamiliesState,
  type PlayerId,
  type WorldContext,
  type WorldState,
  cashAccount,
  isActive,
} from "./state.js";
import { type Tx, emit, fail, transfer } from "./tx.js";

/**
 * The four great families. Each merchant swears allegiance to one for the season; nothing is
 * delivered to it: a family is served on the campaign's map (see `campaign.ts`), and its victory
 * imposes its decrees (see `decrees.ts`).
 */

export function familiesOn(ctx: WorldContext): boolean {
  return ctx.settings.families.list.length > 0 && ctx.settings.campaign !== undefined;
}

export function familyCodes(ctx: WorldContext): string[] {
  return ctx.settings.families.list.map((f) => f.code);
}

/** The land a family starts from. */
export function seatOf(ctx: WorldContext, family: string): string | undefined {
  return ctx.settings.families.list.find((f) => f.code === family)?.seat;
}

/** The family a merchant swore allegiance to, if any. */
export function familyOf(state: WorldState, playerId: PlayerId): string | null {
  return state.families?.memberOf[playerId] ?? null;
}

/** When a merchant may choose a family. */
export function familiesOpenAt(ctx: WorldContext, state: WorldState, playerId: PlayerId): number {
  const joined = state.players[playerId]?.joinedAt ?? ctx.startAt;
  return joined + ctx.settings.families.openDay * DAY_MS;
}

/** Members of a family active now. */
export function activeMembers(
  ctx: WorldContext,
  state: WorldState,
  family: string,
  now: number,
): PlayerId[] {
  return Object.entries(state.families?.memberOf ?? {})
    .filter(([id, f]) => {
      const p = state.players[id];
      return f === family && p !== undefined && isActive(ctx, p, now);
    })
    .map(([id]) => id)
    .sort();
}

/** All members of a family (active or not). */
export function membersOf(state: WorldState, family: string): PlayerId[] {
  return Object.entries(state.families?.memberOf ?? {})
    .filter(([id, f]) => f === family && state.players[id])
    .map(([id]) => id)
    .sort();
}

/**
 * Levy of a family's members, by its size: the average of active members per family over its
 * own, between the settings' bounds. A family nobody plays levies the most.
 */
export function levyFactorBps(
  ctx: WorldContext,
  state: WorldState,
  family: string,
  now: number,
): number {
  const { levyMinBps, levyMaxBps } = ctx.settings.families;
  const codes = familyCodes(ctx);
  if (codes.length === 0) return 10_000;
  const counts = codes.map((c) => activeMembers(ctx, state, c, now).length);
  const total = counts.reduce((a, b) => a + b, 0);
  const own = counts[codes.indexOf(family)] ?? 0;
  if (own === 0) return levyMaxBps;
  const bps = Math.floor((total * 10_000) / (codes.length * own));
  return Math.min(levyMaxBps, Math.max(levyMinBps, bps));
}

function families(tx: Tx): FamiliesState {
  tx.s.families ??= { memberOf: {}, since: {} };
  return tx.s.families;
}

export function joinFamily(tx: Tx, playerId: PlayerId, family: string): void {
  if (!familiesOn(tx.ctx)) fail("families_off");
  if (!familyCodes(tx.ctx).includes(family)) fail("unknown_family");
  if (tx.now < familiesOpenAt(tx.ctx, tx.s as WorldState, playerId)) fail("family_locked");
  const fs = families(tx);
  if (fs.memberOf[playerId]) fail("family_chosen");
  fs.memberOf[playerId] = family;
  fs.since[playerId] = tx.now;
  emit(tx, "family_joined", playerId, { family });
}

/** A merchant who starts over leaves their family (and may choose again). */
export function leaveFamily(tx: Tx, playerId: PlayerId): void {
  const fs = tx.s.families;
  if (!fs?.memberOf[playerId]) return;
  delete fs.memberOf[playerId];
  delete fs.since[playerId];
}

/**
 * States saved in the time of the guilds: each treasury is paid back to its members by carats
 * (the last carat-holder takes what rounding leaves), then guilds, concessions and wars are gone.
 */
export function dissolveLegacyGuilds(tx: Tx): void {
  const legacy = tx.s.guilds;
  if (legacy) {
    for (const [id, g] of Object.entries(legacy.guilds ?? {})) {
      const account = `guild:${id}`;
      const held = tx.s.accounts[account] ?? 0n;
      let left = held;
      const members = Object.entries(g.members).filter(([pid]) => tx.s.players[pid]);
      const issued = members.reduce((a, [, m]) => a + m.carats, 0);
      members.forEach(([pid, m], i) => {
        const share =
          i === members.length - 1 || issued <= 0
            ? left
            : (held * BigInt(m.carats)) / BigInt(issued);
        const paid = share > left ? left : share;
        transfer(tx, account, cashAccount(pid), paid, "guild_payout", id);
        left -= paid;
        if (paid > 0n) emit(tx, "guild_payout", pid, { guild: id, amount: paid.toString() });
      });
    }
    tx.s.guilds = undefined;
  }
  if (tx.s.concessions !== undefined) tx.s.concessions = undefined;
  if (tx.s.wars !== undefined) tx.s.wars = undefined;
}
