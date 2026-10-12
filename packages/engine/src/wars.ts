import { creditGuild, guildAccount } from "./guilds.js";
import { applyBpsFloor } from "./money.js";
import {
  type Concession,
  type Delivery,
  type EngineWar,
  type Guild,
  HOUR_MS,
  type PlayerId,
  SINK_ACCOUNT,
  SOURCE_ACCOUNT,
  type WarSide,
  type WorldContext,
  type WorldState,
  activePlayerCount,
  cashAccount,
} from "./state.js";
import { type EngineErrorCode, type Tx, emit, fail, nextId, transfer } from "./tx.js";

/**
 * Concessions and trade wars. Each concession (a good in a city) belongs to the Seigneurie until a
 * guild takes it; its holder levies a toll (voted) on others' deliveries of that good to that
 * city, and pays its own members a premium. A guild declares war by vote, paying a war chest that
 * leaves the game; for two days, every unit of the good delivered to the city counts for one side
 * (the defender's a little more); merchants of no guild may supply a side for the bounty its guild
 * voted. The side that delivers more holds the concession, protected for a while.
 */

export function concessionDef(ctx: WorldContext, code: string) {
  return ctx.settings.concessions.find((c) => c.code === code);
}

export function concessionAt(ctx: WorldContext, city: string, resource: string) {
  return ctx.settings.concessions.find((c) => c.city === city && c.resource === resource);
}

/** The guild holding a concession (null: the Seigneurie). */
export function concessionHolder(state: WorldState, code: string): string | null {
  const holder = state.concessions?.[code]?.holder ?? null;
  return holder && state.guilds?.guilds[holder] ? holder : null;
}

export function activeWarOn(
  state: WorldState,
  city: string,
  resource: string,
  at: number,
): EngineWar | undefined {
  return Object.values(state.wars ?? {}).find(
    (w) => w.city === city && w.resource === resource && w.startAt <= at && at < w.endAt,
  );
}

/** Which side of a war a merchant fights on: their guild's, or the one they supply. */
export function sideOf(state: WorldState, war: EngineWar, playerId: PlayerId): WarSide | null {
  const guild = state.guilds?.memberOf[playerId];
  if (guild && guild === war.attacker) return "attacker";
  if (guild && guild === war.defender) return "defender";
  return war.enlisted[playerId] ?? null;
}

/** Why a guild may not make war on a concession now, or null. */
export function warRefusal(
  ctx: WorldContext,
  state: WorldState,
  guildId: string,
  code: string,
  at: number,
): EngineErrorCode | null {
  const def = concessionDef(ctx, code);
  if (!def) return "unknown_concession";
  const g = state.guilds?.guilds[guildId];
  if (!g) return "unknown_guild";
  if (concessionHolder(state, code) === guildId) return "own_concession";
  if ((state.concessions?.[code]?.protectedUntil ?? 0) > at) return "concession_protected";
  const live = Object.values(state.wars ?? {}).filter((w) => !w.outcome);
  if (live.some((w) => w.concession === code)) return "war_under_way";
  if (live.some((w) => w.attacker === guildId)) return "guild_at_war";
  const held = state.accounts[guildAccount(guildId)] ?? 0n;
  if (held < ctx.settings.wars.stake) return "treasury_short";
  return null;
}

/** A war voted: the chest leaves the treasury, the war opens for its hours. */
export function startWar(tx: Tx, g: Guild, code: string): void {
  const { ctx } = tx;
  const def = concessionDef(ctx, code);
  if (!def) return;
  transfer(tx, guildAccount(g.id), SINK_ACCOUNT, ctx.settings.wars.stake, "war_chest", code);
  const defender = concessionHolder(tx.s as WorldState, code);
  const active = Math.max(1, activePlayerCount(ctx, tx.s as WorldState, tx.now));
  const id = nextId(tx, "war");
  tx.s.wars ??= {};
  tx.s.wars[id] = {
    id,
    concession: code,
    city: def.city,
    resource: def.resource,
    attacker: g.id,
    attackerName: g.name,
    defender,
    defenderName: defender ? (tx.s.guilds?.guilds[defender]?.name ?? null) : null,
    startAt: tx.now,
    endAt: tx.now + ctx.settings.wars.hours * HOUR_MS,
    threshold: defender ? 0 : ctx.settings.wars.seigneurieUnitsPerActive * active,
    score: { attacker: 0, defender: 0 },
    supplied: {},
    enlisted: {},
  };
  // The board is drawn again with the war's orders.
  if (tx.s.board) tx.s.board.active = 0;
  emit(tx, "war_declared", undefined, {
    war: id,
    concession: code,
    city: def.city,
    resource: def.resource,
    guild: g.id,
    attacker: g.name,
    defender: tx.s.wars[id]?.defenderName ?? null,
  });
}

/** A merchant of no guild offers to supply one side of a war. */
export function enlist(tx: Tx, playerId: PlayerId, warId: string, side: WarSide): void {
  const war = tx.s.wars?.[warId];
  if (!war || war.outcome || tx.now >= war.endAt) fail("unknown_war");
  if (tx.s.guilds?.memberOf[playerId]) fail("guild_member");
  if (war.enlisted[playerId]) fail("already_enlisted");
  if (side === "defender" && !war.defender) fail("no_side");
  war.enlisted[playerId] = side;
  emit(tx, "enlisted", playerId, { war: warId, side });
}

/**
 * A delivery reaches its city: the concession's toll or premium, and in a war, the units for the
 * merchant's side and the bounty of its guild.
 */
export function onArrival(tx: Tx, d: Delivery, units: number, paid: bigint): void {
  const { ctx } = tx;
  const city = d.route.split(":")[1] ?? "";
  const def = concessionAt(ctx, city, d.resource);
  if (!def) return;
  const state = tx.s as WorldState;
  const holder = concessionHolder(state, def.code);
  const own = holder ? state.guilds?.memberOf[d.playerId] === holder : false;
  if (holder && paid > 0n) {
    const g = state.guilds?.guilds[holder];
    if (own) {
      const premium = applyBpsFloor(paid, ctx.settings.wars.memberPremiumBps);
      transfer(tx, SOURCE_ACCOUNT, cashAccount(d.playerId), premium, "concession_premium", d.id);
    } else if (g && g.tollBps > 0) {
      const toll = applyBpsFloor(paid, g.tollBps);
      creditGuild(tx, cashAccount(d.playerId), holder, toll, "toll", d.id);
    }
  }
  const war = activeWarOn(state, city, d.resource, tx.now);
  if (!war || units <= 0) return;
  const side = sideOf(state, war, d.playerId);
  if (!side) return;
  const w = tx.s.wars?.[war.id];
  if (!w) return;
  const counted =
    side === "defender"
      ? Math.floor((units * (10_000 + ctx.settings.wars.defenderBonusBps)) / 10_000)
      : units;
  w.score[side] += counted;
  w.supplied[d.playerId] = (w.supplied[d.playerId] ?? 0) + units;
  // A supplier of no guild is paid the bounty its side's guild voted, as long as the treasury holds.
  if (w.enlisted[d.playerId]) {
    const guildId = side === "attacker" ? w.attacker : w.defender;
    const g = guildId ? tx.s.guilds?.guilds[guildId] : undefined;
    if (g && g.bountyPerUnit > 0n) {
      const held = tx.s.accounts[guildAccount(g.id)] ?? 0n;
      const due = g.bountyPerUnit * BigInt(units);
      const bounty = due < held ? due : held;
      transfer(tx, guildAccount(g.id), cashAccount(d.playerId), bounty, "war_bounty", w.id);
    }
  }
  emit(tx, "war_supplied", d.playerId, { war: w.id, side, units: counted });
}

/** Scheduled: wars whose time is up are decided; the winner holds the concession. */
export function closeWars(tx: Tx): void {
  const { ctx } = tx;
  for (const w of Object.values(tx.s.wars ?? {})) {
    if (w.outcome || tx.now < w.endAt) continue;
    const defence = w.defender ? w.score.defender : Math.max(w.threshold, w.score.defender);
    const attackerWins = w.score.attacker > defence && !!tx.s.guilds?.guilds[w.attacker];
    w.outcome = attackerWins ? "attacker" : "defender";
    tx.s.concessions ??= {};
    const before = tx.s.concessions[w.concession];
    tx.s.concessions[w.concession] = {
      holder: attackerWins ? w.attacker : (before?.holder ?? null),
      since: attackerWins ? w.endAt : (before?.since ?? ctx.startAt),
      protectedUntil: w.endAt + ctx.settings.wars.protectHours * HOUR_MS,
    } satisfies Concession;
    emit(tx, "war_closed", undefined, {
      war: w.id,
      concession: w.concession,
      city: w.city,
      resource: w.resource,
      attacker: w.attackerName,
      defender: w.defenderName,
      attackerId: w.attacker,
      defenderId: w.defender,
      winner: w.outcome,
      score: { ...w.score },
    });
  }
}

/** Bands may lie in wait only on a war's road, posted by one of its sides. */
export function warForBand(
  state: WorldState,
  city: string,
  playerId: PlayerId,
  at: number,
): EngineWar | undefined {
  return Object.values(state.wars ?? {}).find(
    (w) => w.city === city && w.startAt <= at && at < w.endAt && sideOf(state, w, playerId),
  );
}
