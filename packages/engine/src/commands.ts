import { type Draft, enableMapSet, produce } from "immer";
import { build, grantBuilding, upgrade } from "./buildings.js";
import { sellToCity } from "./cities.js";
import { fulfillContract } from "./contracts.js";
import { type Effects, emptyEffects } from "./effects.js";
import { collectExpedition, launchExpedition } from "./expeditions.js";
import { type PlaceOrderInput, cancelAllOrders, cancelOrder, placeOrder } from "./market.js";
import { collect, startProduction } from "./production.js";
import { deliverToProject } from "./projects.js";
import {
  type Building,
  DAY_MS,
  type PlayerId,
  SINK_ACCOUNT,
  SOURCE_ACCOUNT,
  type WorldContext,
  type WorldState,
  cashAccount,
  escrowAccount,
} from "./state.js";
import { findRegion } from "./theme.js";
import { tick } from "./tick.js";
import {
  EngineError,
  type EngineErrorCode,
  type Tx,
  addStock,
  emit,
  fail,
  removeStock,
  transfer,
} from "./tx.js";

enableMapSet();

export type Command =
  | { type: "join"; playerId: PlayerId; region: string }
  | {
      type: "startProduction";
      playerId: PlayerId;
      buildingId: string;
      recipe: string;
      batches: number;
    }
  | { type: "collect"; playerId: PlayerId; buildingId: string }
  | { type: "build"; playerId: PlayerId; buildingType: string }
  | { type: "upgrade"; playerId: PlayerId; buildingId: string }
  | ({ type: "placeOrder" } & PlaceOrderInput)
  | { type: "cancelOrder"; playerId: PlayerId; orderId: string }
  | { type: "sellToCity"; playerId: PlayerId; city: string; resource: string; quantity: number }
  | {
      type: "deliverToProject";
      playerId: PlayerId;
      projectId: string;
      resource: string;
      quantity: number;
    }
  | { type: "resetPlayer"; playerId: PlayerId }
  | { type: "fulfillContract"; playerId: PlayerId; contractId: string }
  | {
      type: "launchExpedition";
      playerId: PlayerId;
      destination: string;
      cargo: Record<string, number>;
      escort: boolean;
    }
  | { type: "collectExpedition"; playerId: PlayerId; expeditionId: string }
  | { type: "tick" };

export type DecideResult =
  | { ok: true; state: WorldState; effects: Effects }
  | { ok: false; state: WorldState; error: EngineErrorCode; message: string };

function ownBuilding(tx: Tx, playerId: PlayerId, buildingId: string): Draft<Building> {
  const building = tx.s.buildings[buildingId];
  if (!building) fail("unknown_building");
  if (building.playerId !== playerId) fail("not_owner");
  return building;
}

function join(tx: Tx, playerId: PlayerId, region: string): void {
  const { ctx } = tx;
  if (tx.s.players[playerId]) fail("player_exists");
  if (!findRegion(ctx.theme, region)) fail("unknown_region");
  if (tx.now >= ctx.startAt + ctx.settings.registrationClosesDay * DAY_MS)
    fail("registration_closed");
  tx.s.players[playerId] = {
    id: playerId,
    region,
    joinedAt: tx.now,
    lastActionAt: tx.now,
    upkeepDefaultUntil: 0,
  };
  tx.s.accounts[cashAccount(playerId)] = 0n;
  tx.s.accounts[escrowAccount(playerId)] = 0n;
  tx.s.inventories[playerId] = {};
  transfer(
    tx,
    SOURCE_ACCOUNT,
    cashAccount(playerId),
    ctx.settings.startingCapital,
    "starting_capital",
  );
  for (const type of ctx.settings.startingBuildings[region] ?? []) {
    const building = grantBuilding(tx, playerId, type);
    building.fastBatchesLeft = ctx.settings.tutorial.fastBatchesPerBuilding;
  }
  for (const [resource, qty] of Object.entries(ctx.settings.startingStock[region] ?? {})) {
    addStock(tx, playerId, resource, qty, "starting_kit");
  }
  emit(tx, "join", playerId, { region });
}

/**
 * Restarts a player from scratch. Orders are cancelled, then cash and stock leave the game through
 * the journals (like a sink), so the invariants hold; the player may then join again.
 */
function resetPlayer(tx: Tx, playerId: PlayerId): void {
  const { ctx } = tx;
  if (!tx.s.players[playerId]) fail("unknown_player");
  const resets = tx.s.resets ?? {};
  tx.s.resets = resets;
  const used = resets[playerId] ?? 0;
  if (used >= ctx.settings.maxResetsPerPlayer) fail("reset_limit");

  cancelAllOrders(tx, playerId);
  for (const [resource, line] of Object.entries(tx.s.inventories[playerId] ?? {})) {
    removeStock(tx, playerId, resource, line.available, "player_reset");
  }
  const cash = cashAccount(playerId);
  transfer(tx, cash, SINK_ACCOUNT, tx.s.accounts[cash] ?? 0n, "player_reset");
  for (const b of Object.values(tx.s.buildings)) {
    if (b.playerId === playerId) delete tx.s.buildings[b.id];
  }
  delete tx.s.inventories[playerId];
  delete tx.s.accounts[cash];
  delete tx.s.accounts[escrowAccount(playerId)];
  delete tx.s.players[playerId];
  resets[playerId] = used + 1;
  emit(tx, "player_reset", playerId);
}

function apply(tx: Tx, cmd: Command): void {
  const { ctx } = tx;
  if (cmd.type === "tick") {
    tick(tx);
    return;
  }
  if (cmd.type === "join") {
    join(tx, cmd.playerId, cmd.region);
    return;
  }
  if (cmd.type === "resetPlayer") {
    resetPlayer(tx, cmd.playerId);
    return;
  }

  const player = tx.s.players[cmd.playerId];
  if (!player) fail("unknown_player");
  if (tx.now >= ctx.startAt + ctx.settings.seasonDays * DAY_MS) fail("season_over");
  player.lastActionAt = tx.now;

  switch (cmd.type) {
    case "startProduction": {
      const building = ownBuilding(tx, cmd.playerId, cmd.buildingId);
      startProduction(tx, building, cmd.recipe, cmd.batches);
      break;
    }
    case "collect":
      collect(tx, ownBuilding(tx, cmd.playerId, cmd.buildingId));
      break;
    case "build":
      build(tx, cmd.playerId, cmd.buildingType);
      break;
    case "upgrade": {
      const building = ownBuilding(tx, cmd.playerId, cmd.buildingId);
      collect(tx, building);
      upgrade(tx, building);
      break;
    }
    case "placeOrder": {
      const { type: _, ...input } = cmd;
      placeOrder(tx, input);
      break;
    }
    case "cancelOrder":
      cancelOrder(tx, cmd.playerId, cmd.orderId);
      break;
    case "sellToCity":
      sellToCity(tx, cmd.playerId, cmd.city, cmd.resource, cmd.quantity);
      break;
    case "fulfillContract":
      fulfillContract(tx, cmd.playerId, cmd.contractId);
      break;
    case "launchExpedition":
      launchExpedition(tx, cmd.playerId, cmd.destination, cmd.cargo, cmd.escort);
      break;
    case "collectExpedition":
      collectExpedition(tx, cmd.playerId, cmd.expeditionId);
      break;
    case "deliverToProject":
      deliverToProject(tx, cmd.playerId, cmd.projectId, cmd.resource, cmd.quantity);
      break;
  }
}

/**
 * Single entry point of the engine. Pure: same context, state, command and time give the same
 * result. A rejected command leaves the state untouched, like a rolled-back SQL transaction.
 */
export function decide(
  ctx: WorldContext,
  state: WorldState,
  cmd: Command,
  now: number,
): DecideResult {
  const fx = emptyEffects();
  try {
    const next = produce(state, (draft) => {
      apply({ ctx, s: draft, now, fx }, cmd);
    });
    return { ok: true, state: next, effects: fx };
  } catch (err) {
    if (err instanceof EngineError) {
      return { ok: false, state, error: err.code, message: err.message };
    }
    throw err;
  }
}
