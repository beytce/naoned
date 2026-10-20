import { campaignWeekEnd, campaignWeekStart, familyAccount } from "./campaign.js";
import { dayStartIn } from "./clock.js";
import { TERRA_FAMILY } from "./decrees.js";
import {
  HOUR_MS,
  MINUTE_MS,
  type PlayerId,
  SINK_ACCOUNT,
  SOURCE_ACCOUNT,
  type WorldContext,
  type WorldState,
  activePlayerCount,
  cashAccount,
} from "./state.js";
import {
  MILAN,
  type TerraBuilding,
  type TerraConfig,
  type TerraState,
  acceptAlliance,
  advanceTerra,
  alliesOf,
  breakAlliance,
  buildOnTerra,
  chooseDecree,
  closeTerra,
  launchFront,
  newTerra,
  placeOnTerra,
  proposeAlliance,
  raiseCap,
  recallFront,
  sendTroops,
  setPeasants,
} from "./terraferma.js";
import { type Tx, addStock, balance, emit, fail, transfer } from "./tx.js";
import { seasonWeeks, weekIndex } from "./weekly.js";

/**
 * The Terraferma in the world (docs/plan-terraferme.md): one map a week, made at the week's
 * first tick for the merchants active then, advanced at every tick and command, closed at the
 * week's end (Influence by tier, the Signore's decree for the next week). The ducats of the
 * buildings and of the cap go to the sink. Off until `terraferma.live`.
 */

export interface TerraDecree {
  /** The week it is in force. */
  week: number;
  code: string;
  target?: string;
  /** The Signore and his allies at the close. */
  members: PlayerId[];
}

export function terraOn(ctx: WorldContext): TerraConfig | null {
  const cfg = ctx.settings.terraferma;
  return cfg?.live ? cfg : null;
}

/** The week's map, made (and the last one closed) when the week turns. */
function terra(tx: Tx, cfg: TerraConfig): TerraState {
  const { ctx } = tx;
  const week = weekIndex(ctx, tx.now);
  let t = tx.s.terra;
  if (t && t.week < week) {
    closeTerraWeek(tx, cfg, t.week, t.map);
    t = undefined;
  }
  if (!t) {
    const active = Math.max(1, activePlayerCount(ctx, tx.s as WorldState, tx.now));
    const map = newTerra(
      cfg,
      `${ctx.seed ?? ctx.startAt}:terra:${week}`,
      active,
      campaignWeekStart(ctx, week),
    );
    tx.s.terra = { week, map };
    t = tx.s.terra;
  }
  return t.map;
}

/** Scheduled (every tick) and before every command of the Terraferma: the map up to now. */
export function advanceTerraWorld(tx: Tx): TerraState | null {
  const cfg = terraOn(tx.ctx);
  if (!cfg) return null;
  const map = terra(tx, cfg);
  const end = campaignWeekEnd(tx.ctx, tx.s.terra?.week ?? 0);
  advanceTerra(map, cfg, Math.min(tx.now, end));
  payHarvests(tx, map);
  warnBattle(tx, cfg, map);
  if (map.closed && !map.closedSeen) {
    // Won by conquest before the week's end: the close is paid at once.
    map.closedSeen = true;
    payClose(tx, cfg, tx.s.terra?.week ?? 0, map);
  }
  return map;
}

/** The land's whole units go into the merchants' stock, the routes' ducats into their purse. */
function payHarvests(tx: Tx, map: TerraState): void {
  for (const [id, p] of Object.entries(map.players).sort(([a], [b]) => (a < b ? -1 : 1))) {
    if (id === MILAN || !tx.s.players[id]) continue;
    for (const [resource, owed] of Object.entries(p.harvest ?? {})) {
      const whole = Math.floor(owed / 10_000);
      if (whole <= 0) continue;
      addStock(tx, id, resource, whole, "terraferma_harvest", `terra:${map.startAt}`);
      p.harvest = { ...p.harvest, [resource]: owed - whole * 10_000 };
    }
    const route = p.routeOwed ?? 0n;
    if (route > 0n) {
      transfer(
        tx,
        SOURCE_ACCOUNT,
        cashAccount(id),
        route,
        "terraferma_route",
        `terra:${map.startAt}`,
      );
      p.routeOwed = 0n;
    }
  }
}

/** A quarter of an hour before the battle hour, the merchants on the map are told, once. */
function warnBattle(tx: Tx, cfg: TerraConfig, map: TerraState): void {
  const b = cfg.battle;
  if (!b || map.closed) return;
  const start = dayStartIn(tx.now).start + b.from * HOUR_MS;
  if (tx.now < start - b.warnMinutes * MINUTE_MS || tx.now >= start) return;
  if (tx.s.terraBattleWarned === start) return;
  tx.s.terraBattleWarned = start;
  for (const [id, p] of Object.entries(map.players).sort(([a], [c]) => (a < c ? -1 : 1))) {
    if (id === MILAN || p.eliminatedAt !== undefined) continue;
    emit(tx, "terra_battle_soon", id, { at: start });
  }
}

function closeTerraWeek(tx: Tx, cfg: TerraConfig, week: number, map: TerraState): void {
  const end = campaignWeekEnd(tx.ctx, week);
  advanceTerra(map, cfg, end);
  closeTerra(map, cfg, end);
  if (!map.closedSeen) payClose(tx, cfg, week, map);
}

/** Influence by tier, the shares of the decree that ends, the decree of the next week. */
function payClose(tx: Tx, cfg: TerraConfig, week: number, map: TerraState): void {
  const close = map.closed;
  if (!close) return;
  map.closedSeen = true;
  tx.s.terraLast = {
    week,
    glory: Object.fromEntries(
      Object.entries(map.players)
        .filter(([id]) => id !== MILAN)
        .map(([id, p]) => [id, p.glory]),
    ),
  };
  close.ranking.forEach((r, k) => {
    if (r.influence > 0)
      emit(tx, "influence_earned", r.id, { source: "terraferma", week, amount: r.influence });
    emit(tx, "terra_result", r.id, {
      week,
      rank: k + 1,
      tier: r.tier,
      influence: r.influence,
      signore: r.id === close.signore,
      conquest: close.conquest,
      decree: close.decree?.code ?? null,
    });
  });
  emit(tx, "terra_closed", undefined, {
    week,
    signore: close.signore,
    conquest: close.conquest,
    decree: close.decree,
    ranking: close.ranking.slice(0, 10),
  });
  payTerraShares(tx, week);
  const next = week + 1;
  const previous = tx.s.terraDecree;
  if (
    close.signore &&
    close.decree &&
    next < seasonWeeks(tx.ctx) &&
    // Never the same decree two weeks running.
    !(previous && previous.week === week && previous.code === close.decree.code)
  ) {
    tx.s.terraDecree = {
      week: next,
      code: close.decree.code,
      ...(close.decree.target ? { target: close.decree.target } : {}),
      members: [close.signore, ...alliesOf(map, close.signore)],
    };
  }
}

/** What the decree collected (monopole, dime), shared out equally among its members. */
function payTerraShares(tx: Tx, week: number): void {
  const account = familyAccount(TERRA_FAMILY);
  const held = tx.s.accounts[account] ?? 0n;
  if (held <= 0n) return;
  const members = (tx.s.terraDecree?.members ?? []).filter((p) => tx.s.players[p]).sort();
  if (members.length === 0) {
    transfer(tx, account, SINK_ACCOUNT, held, "decree_share", `terra:${week}`);
    return;
  }
  let left = held;
  members.forEach((p, i) => {
    const share = i === members.length - 1 ? left : held / BigInt(members.length);
    transfer(tx, account, cashAccount(p), share, "decree_share", `terra:${week}`);
    left -= share;
    if (share > 0n) emit(tx, "decree_share", p, { family: TERRA_FAMILY, amount: share.toString() });
  });
}

// ——— Commands ———

export type TerraCommand =
  | { type: "terraPlace"; playerId: PlayerId; cell: number }
  | { type: "terraFront"; playerId: PlayerId; aim: number; shareBps: number }
  | { type: "terraRecall"; playerId: PlayerId; frontId: string }
  | { type: "terraAlly"; playerId: PlayerId; other: PlayerId }
  | { type: "terraAccept"; playerId: PlayerId; from: PlayerId }
  | { type: "terraBreak"; playerId: PlayerId; other: PlayerId }
  | { type: "terraSend"; playerId: PlayerId; to: PlayerId; count: number }
  | { type: "terraBuild"; playerId: PlayerId; cell: number; kind: TerraBuilding }
  | { type: "terraRaise"; playerId: PlayerId }
  | { type: "terraDecree"; playerId: PlayerId; code: string; target?: string }
  | { type: "terraPeasants"; playerId: PlayerId; shareBps: number };

/** Ducats for the Terraferma: checked first, then destroyed. */
function pay(tx: Tx, playerId: PlayerId, price: bigint, ref: string): void {
  if (balance(tx, cashAccount(playerId)) < price) fail("insufficient_funds");
  transfer(tx, cashAccount(playerId), SINK_ACCOUNT, price, "terraferma", ref);
}

export function applyTerra(tx: Tx, cmd: TerraCommand): void {
  const cfg = terraOn(tx.ctx);
  if (!cfg) fail("terra_off");
  if (!tx.s.players[cmd.playerId]) fail("unknown_player");
  const map = advanceTerraWorld(tx) as TerraState;
  if (map.closed) fail("terra_closed");
  const id = cmd.playerId;
  const now = tx.now;
  switch (cmd.type) {
    case "terraPlace":
      placeOnTerra(map, cfg, id, cmd.cell, now);
      emit(tx, "terra_placed", id, { cell: cmd.cell });
      break;
    case "terraFront": {
      const f = launchFront(map, cfg, id, cmd.aim, cmd.shareBps, now);
      emit(tx, "terra_front", id, { against: f.against, troops: f.troops, aim: f.aim });
      if (f.against && f.against !== MILAN)
        emit(tx, "terra_attacked", f.against, { by: id, troops: f.troops, aim: f.aim });
      break;
    }
    case "terraRecall":
      recallFront(map, id, cmd.frontId);
      break;
    case "terraAlly":
      proposeAlliance(map, cfg, id, cmd.other, now);
      emit(tx, "terra_alliance_asked", cmd.other, { from: id });
      break;
    case "terraAccept":
      acceptAlliance(map, cfg, id, cmd.from, now);
      emit(tx, "terra_alliance_made", cmd.from, { with: id });
      break;
    case "terraBreak":
      breakAlliance(map, cfg, id, cmd.other, now);
      emit(tx, "terra_alliance_broken", cmd.other, { by: id });
      break;
    case "terraSend":
      sendTroops(map, cfg, id, cmd.to, cmd.count, now);
      emit(tx, "terra_troops_received", cmd.to, { from: id, count: cmd.count });
      break;
    case "terraBuild": {
      const price = cfg.buildings[cmd.kind]?.price;
      if (price === undefined) fail("unknown_building_type");
      if (balance(tx, cashAccount(id)) < price) fail("insufficient_funds");
      buildOnTerra(map, cfg, id, cmd.cell, cmd.kind);
      pay(tx, id, price, `terra:${cmd.kind}:${cmd.cell}`);
      emit(tx, "terra_built", id, { kind: cmd.kind, cell: cmd.cell });
      break;
    }
    case "terraRaise": {
      if (balance(tx, cashAccount(id)) < cfg.capRaise.price) fail("insufficient_funds");
      const price = raiseCap(map, cfg, id, now);
      pay(tx, id, price, "terra:cap");
      break;
    }
    case "terraPeasants":
      if (!cfg.peasants) fail("terra_off");
      setPeasants(map, id, cmd.shareBps);
      break;
    case "terraDecree": {
      const inForce = tx.s.terraDecree;
      if (inForce && inForce.week === weekIndex(tx.ctx, now) && inForce.code === cmd.code)
        fail("decree_repeat");
      chooseDecree(
        map,
        cfg,
        id,
        cmd.target ? { code: cmd.code, target: cmd.target } : { code: cmd.code },
      );
      break;
    }
  }
}
