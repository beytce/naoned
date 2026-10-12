import { type Deniers, applyBpsFloor } from "./money.js";
import {
  type AccountId,
  DAY_MS,
  type Guild,
  type GuildProposal,
  type GuildsState,
  HOUR_MS,
  type PlayerId,
  SINK_ACCOUNT,
  type WorldContext,
  type WorldState,
  cashAccount,
  seasonEnd,
} from "./state.js";
import { type Tx, emit, fail, nextId, transfer } from "./tx.js";
import { startWar, warRefusal } from "./wars.js";

/**
 * The merchants' guilds. A guild is founded with a stake; every ducat put in its treasury buys
 * carats at the treasury's value, so investing changes nobody's worth. Carats carry the votes
 * (no member weighs more than a cap) and the dividends; leaving sells them back at a discount
 * that stays with the guild; at the end of the season the treasury is shared out by carats.
 * The treasury is a ledger account: every movement is a transfer.
 */

export function guildAccount(guildId: string): AccountId {
  return `guild:${guildId}`;
}

export type ProposalInput =
  | { kind: "toll"; value: number }
  | { kind: "dividend"; value: number }
  | { kind: "bounty"; value: number }
  | { kind: "open"; value: number }
  | { kind: "exclude"; target: PlayerId }
  | { kind: "war"; target: string };

function guilds(tx: Tx): GuildsState {
  tx.s.guilds ??= { guilds: {}, memberOf: {}, proposals: {} };
  return tx.s.guilds;
}

function rules(ctx: WorldContext) {
  return ctx.settings.guilds;
}

/** The guild a merchant belongs to, if any. */
export function guildOf(state: WorldState, playerId: PlayerId): Guild | null {
  const id = state.guilds?.memberOf[playerId];
  return (id && state.guilds?.guilds[id]) || null;
}

export function treasury(state: WorldState, guildId: string): Deniers {
  return state.accounts[guildAccount(guildId)] ?? 0n;
}

/** What `carats` of a guild are worth: their share of the treasury. */
export function caratValue(state: WorldState, guildId: string, carats: number): Deniers {
  const g = state.guilds?.guilds[guildId];
  if (!g || g.caratsIssued <= 0 || carats <= 0) return 0n;
  return (treasury(state, guildId) * BigInt(carats)) / BigInt(g.caratsIssued);
}

/** A merchant's share of their guild, at its value. */
export function guildShareOf(state: WorldState, playerId: PlayerId): Deniers {
  const g = guildOf(state, playerId);
  return g ? caratValue(state, g.id, g.members[playerId]?.carats ?? 0) : 0n;
}

/** When a merchant may found or join a guild. */
export function guildsOpenAt(ctx: WorldContext, state: WorldState, playerId: PlayerId): number {
  const joined = state.players[playerId]?.joinedAt ?? ctx.startAt;
  return joined + rules(ctx).openDay * DAY_MS;
}

function mayEnter(tx: Tx, playerId: PlayerId): void {
  if (rules(tx.ctx).maxMembers <= 0) fail("guilds_off");
  if (!tx.s.players[playerId]) fail("unknown_player");
  if (tx.now < guildsOpenAt(tx.ctx, tx.s as WorldState, playerId)) fail("guild_locked");
  if (guilds(tx).memberOf[playerId]) fail("guild_member");
}

/** Buys carats with `amount` deniers at the treasury's value. */
function buyCarats(tx: Tx, g: Guild, playerId: PlayerId, amount: bigint): number {
  const held = treasury(tx.s as WorldState, g.id);
  const carats =
    g.caratsIssued > 0 && held > 0n
      ? Number((amount * BigInt(g.caratsIssued)) / held)
      : Number(amount / rules(tx.ctx).caratValue);
  if (carats < 1) fail("stake_too_small");
  transfer(tx, cashAccount(playerId), guildAccount(g.id), amount, "guild_stake", g.id);
  const m = g.members[playerId];
  if (m) m.carats += carats;
  g.caratsIssued += carats;
  return carats;
}

export function foundGuild(
  tx: Tx,
  playerId: PlayerId,
  name: string,
  emblem: string,
  stake: number,
): void {
  mayEnter(tx, playerId);
  const r = rules(tx.ctx);
  const clean = name.trim().replace(/\s+/g, " ");
  if (clean.length < 2 || clean.length > 32) fail("invalid_name");
  const taken = Object.values(guilds(tx).guilds).some(
    (g) => g.name.toLowerCase() === clean.toLowerCase(),
  );
  if (taken) fail("guild_name_taken");
  if (!Number.isInteger(stake) || BigInt(stake) < r.minStake) fail("stake_too_small");
  transfer(tx, cashAccount(playerId), SINK_ACCOUNT, r.foundingCost, "guild_founding", clean);
  const id = nextId(tx, "g");
  const g: Guild = {
    id,
    name: clean,
    emblem,
    founder: playerId,
    foundedAt: tx.now,
    members: { [playerId]: { carats: 0, since: tx.now } },
    caratsIssued: 0,
    open: true,
    tollBps: 0,
    dividendBps: 0,
    bountyPerUnit: 0n,
  };
  guilds(tx).guilds[id] = g;
  guilds(tx).memberOf[playerId] = id;
  const carats = buyCarats(tx, g, playerId, BigInt(stake));
  emit(tx, "guild_founded", playerId, { guild: id, name: clean, carats });
}

export function joinGuild(tx: Tx, playerId: PlayerId, guildId: string, stake: number): void {
  mayEnter(tx, playerId);
  const g = guilds(tx).guilds[guildId];
  if (!g) fail("unknown_guild");
  if (!g.open) fail("guild_closed");
  if (Object.keys(g.members).length >= rules(tx.ctx).maxMembers) fail("guild_full");
  if (!Number.isInteger(stake) || BigInt(stake) < rules(tx.ctx).minStake) fail("stake_too_small");
  g.members[playerId] = { carats: 0, since: tx.now };
  guilds(tx).memberOf[playerId] = guildId;
  const carats = buyCarats(tx, g, playerId, BigInt(stake));
  emit(tx, "guild_joined", playerId, { guild: guildId, carats });
}

export function investGuild(tx: Tx, playerId: PlayerId, amount: number): void {
  const g = memberGuild(tx, playerId);
  if (!Number.isInteger(amount) || amount <= 0) fail("invalid_quantity");
  const carats = buyCarats(tx, g, playerId, BigInt(amount));
  emit(tx, "guild_invested", playerId, { guild: g.id, carats, amount: String(amount) });
}

function memberGuild(tx: Tx, playerId: PlayerId): Guild {
  const id = guilds(tx).memberOf[playerId];
  const g = id ? guilds(tx).guilds[id] : undefined;
  if (!g) fail("no_guild");
  return g;
}

/** Takes a member out, paying back their carats (less `feeBps`, which stays with the guild). */
function removeMember(tx: Tx, g: Guild, playerId: PlayerId, feeBps: number, reason: string) {
  const carats = g.members[playerId]?.carats ?? 0;
  const last = Object.keys(g.members).length === 1;
  const value = caratValue(tx.s as WorldState, g.id, carats);
  const refund = last ? treasury(tx.s as WorldState, g.id) : applyBpsFloor(value, 10_000 - feeBps);
  transfer(tx, guildAccount(g.id), cashAccount(playerId), refund, "guild_refund", g.id);
  delete g.members[playerId];
  g.caratsIssued -= carats;
  delete guilds(tx).memberOf[playerId];
  emit(tx, "guild_left", playerId, { guild: g.id, reason, refund: refund.toString() });
  if (last) {
    for (const p of Object.values(guilds(tx).proposals))
      if (p.guildId === g.id && p.status === "open") p.status = "rejected";
    delete guilds(tx).guilds[g.id];
    emit(tx, "guild_dissolved", undefined, { guild: g.id, name: g.name });
  }
}

export function leaveGuild(tx: Tx, playerId: PlayerId): void {
  const g = memberGuild(tx, playerId);
  removeMember(tx, g, playerId, rules(tx.ctx).exitFeeBps, "left");
}

/** A merchant who starts over leaves their guild. */
export function leaveGuilds(tx: Tx, playerId: PlayerId): void {
  if (!tx.s.guilds?.memberOf[playerId]) return;
  leaveGuild(tx, playerId);
}

export function propose(tx: Tx, playerId: PlayerId, input: ProposalInput): void {
  const g = memberGuild(tx, playerId);
  const r = rules(tx.ctx);
  const value = input.kind === "exclude" || input.kind === "war" ? 0 : input.value;
  if (!Number.isInteger(value) || value < 0) fail("invalid_proposal");
  if (input.kind === "war") {
    const refused = warRefusal(tx.ctx, tx.s as WorldState, g.id, input.target, tx.now);
    if (refused) fail(refused);
  }
  if (input.kind === "toll" && value > r.maxTollBps) fail("invalid_proposal");
  if (input.kind === "dividend" && value > 10_000) fail("invalid_proposal");
  if (input.kind === "bounty" && BigInt(value) > r.maxBountyPerUnit) fail("invalid_proposal");
  if (input.kind === "open" && value > 1) fail("invalid_proposal");
  if (input.kind === "exclude" && (input.target === playerId || !g.members[input.target]))
    fail("invalid_proposal");
  const id = nextId(tx, "pr");
  const p: GuildProposal = {
    id,
    guildId: g.id,
    by: playerId,
    kind: input.kind,
    value,
    target: input.kind === "exclude" || input.kind === "war" ? input.target : undefined,
    openedAt: tx.now,
    closesAt: tx.now + r.voteHours * HOUR_MS,
    votes: {},
    status: "open",
  };
  guilds(tx).proposals[id] = p;
  emit(tx, "proposal_opened", playerId, { guild: g.id, proposal: id, kind: p.kind, value });
  // Who proposes votes for it.
  vote(tx, playerId, id, true);
}

/** Voting weight of each member: carats, at most `maxVoteBps` of all the carats. */
export function votingWeights(ctx: WorldContext, g: Guild): Record<PlayerId, number> {
  const cap = Math.floor((g.caratsIssued * ctx.settings.guilds.maxVoteBps) / 10_000);
  const out: Record<PlayerId, number> = {};
  for (const [id, m] of Object.entries(g.members)) out[id] = Math.min(m.carats, cap);
  return out;
}

/** Yes and no so far, and the guild's whole (capped) weight. */
export function tally(
  ctx: WorldContext,
  g: Guild,
  p: GuildProposal,
): { yes: number; no: number; total: number } {
  const w = votingWeights(ctx, g);
  let yes = 0;
  let no = 0;
  let total = 0;
  for (const [id, weight] of Object.entries(w)) {
    total += weight;
    const v = p.votes[id];
    if (v === true) yes += weight;
    else if (v === false) no += weight;
  }
  return { yes, no, total };
}

export function vote(tx: Tx, playerId: PlayerId, proposalId: string, yes: boolean): void {
  const g = memberGuild(tx, playerId);
  const p = guilds(tx).proposals[proposalId];
  if (!p || p.guildId !== g.id) fail("unknown_proposal");
  if (p.status !== "open") fail("proposal_closed");
  p.votes[playerId] = yes;
  emit(tx, "voted", playerId, { guild: g.id, proposal: p.id, yes });
  // A majority of the whole guild decides at once.
  const t = tally(tx.ctx, g, p);
  if (t.yes * 2 > t.total) settle(tx, g, p, true);
  else if (t.no * 2 > t.total) settle(tx, g, p, false);
}

function settle(tx: Tx, g: Guild, p: GuildProposal, passed: boolean): void {
  p.status = passed ? "passed" : "rejected";
  p.closedAt = tx.now;
  if (passed) {
    if (p.kind === "toll") g.tollBps = p.value;
    else if (p.kind === "dividend") g.dividendBps = p.value;
    else if (p.kind === "bounty") g.bountyPerUnit = BigInt(p.value);
    else if (p.kind === "open") g.open = p.value === 1;
    else if (p.kind === "exclude" && p.target && g.members[p.target])
      removeMember(tx, g, p.target, 0, "excluded");
    else if (p.kind === "war" && p.target) {
      // Circumstances may have changed during the vote: then the war does not start.
      if (warRefusal(tx.ctx, tx.s as WorldState, g.id, p.target, tx.now)) p.status = "rejected";
      else startWar(tx, g, p.target);
    }
  }
  emit(tx, "proposal_closed", undefined, {
    guild: g.id,
    proposal: p.id,
    kind: p.kind,
    passed: p.status === "passed",
  });
}

/**
 * Scheduled: proposals whose vote is over pass if their yes outweigh their no; at the end of the
 * season, each treasury is shared out by carats.
 */
export function closeGuildBusiness(tx: Tx): void {
  const gs = tx.s.guilds;
  if (!gs) return;
  for (const p of Object.values(gs.proposals)) {
    if (p.status !== "open" || tx.now < p.closesAt) continue;
    const g = gs.guilds[p.guildId];
    if (!g) {
      p.status = "rejected";
      continue;
    }
    const t = tally(tx.ctx, g, p);
    settle(tx, g, p, t.yes > t.no);
  }
  if (tx.now >= seasonEnd(tx.ctx) && !gs.paidOut) {
    gs.paidOut = true;
    for (const g of Object.values(gs.guilds)) {
      const held = treasury(tx.s as WorldState, g.id);
      for (const [playerId, m] of Object.entries(g.members)) {
        if (g.caratsIssued <= 0) break;
        const share = (held * BigInt(m.carats)) / BigInt(g.caratsIssued);
        transfer(tx, guildAccount(g.id), cashAccount(playerId), share, "guild_payout", g.id);
        emit(tx, "guild_payout", playerId, { guild: g.id, amount: share.toString() });
      }
      for (const m of Object.values(g.members)) m.carats = 0;
      g.caratsIssued = 0;
    }
  }
}

/**
 * Money coming into a guild (a toll, a prize): its voted share goes at once to the members by
 * carats, the rest to the treasury (raising the carats' value).
 */
export function creditGuild(
  tx: Tx,
  from: AccountId,
  guildId: string,
  amount: Deniers,
  reason: "toll" | "worksite_prize",
  ref?: string,
): void {
  const g = guilds(tx).guilds[guildId];
  if (!g || amount <= 0n) return;
  transfer(tx, from, guildAccount(guildId), amount, reason, ref);
  const dividend = applyBpsFloor(amount, g.dividendBps);
  if (dividend <= 0n || g.caratsIssued <= 0) return;
  for (const [playerId, m] of Object.entries(g.members)) {
    const share = (dividend * BigInt(m.carats)) / BigInt(g.caratsIssued);
    transfer(tx, guildAccount(guildId), cashAccount(playerId), share, "guild_dividend", ref);
  }
  emit(tx, "dividend_paid", undefined, { guild: guildId, amount: dividend.toString(), reason });
}
