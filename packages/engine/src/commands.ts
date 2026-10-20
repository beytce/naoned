import { type Draft, enableMapSet, produce } from "immer";
import { claimDaily, rerollDaily, sellToCriee, trackDaily } from "./activity.js";
import { grantStartingBales, openBale } from "./bales.js";
import { build, grantBuilding, upgrade } from "./buildings.js";
import {
  buildWork,
  buyTroops,
  collectLevy,
  finishWork,
  hireLances,
  joinMarch,
  sendMarch,
} from "./campaign.js";
import { sellToCity } from "./cities.js";
import { fulfillContract, rerollContract } from "./contracts.js";
import { voteProgramme } from "./decrees.js";
import {
  buyVehicle,
  dispatchDelivery,
  ensureBoard,
  grantStartingVehicles,
  upgradeVehicle,
} from "./deliveries.js";
import { type Effects, emptyEffects } from "./effects.js";
import { joinFamily, leaveFamily } from "./families.js";
import {
  claimHouseMission,
  grantPatent,
  resetSpecialty,
  rushDelivery,
  trackHouseMissions,
} from "./house.js";
import { type PlaceOrderInput, cancelAllOrders, cancelOrder, placeOrder } from "./market.js";
import { claimMission, trackMissions } from "./missions.js";
import { collect, startProduction } from "./production.js";
import { deliverToProject } from "./projects.js";
import { chooseSpecialty } from "./specialties.js";
import {
  type Building,
  DAY_MS,
  type DecreePick,
  type PlayerId,
  SINK_ACCOUNT,
  SOURCE_ACCOUNT,
  type WorldContext,
  type WorldState,
  cashAccount,
  escrowAccount,
  seasonEnd,
} from "./state.js";
import { type TerraCommand, applyTerra } from "./terraWorld.js";
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
import { startWeek } from "./weekly.js";

enableMapSet();

export type Command =
  | {
      type: "join";
      playerId: PlayerId;
      region: string;
      /** Privileges the house holds (kept by the server from season to season). */
      patents?: string[];
    }
  /** A patent bought with Influence (server only: it checked and took the price). */
  | { type: "grantPatent"; playerId: PlayerId; patent: string }
  | { type: "claimHouseMission"; playerId: PlayerId; missionId: string }
  // Bought with Influence (server only: it took the price first).
  | { type: "rushDelivery"; playerId: PlayerId; deliveryId: string }
  | { type: "buyTroops"; playerId: PlayerId; count: number }
  | { type: "rushWork"; playerId: PlayerId; land: string }
  | { type: "resetSpecialty"; playerId: PlayerId }
  | { type: "rerollDaily"; playerId: PlayerId; taskId: string }
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
  | { type: "claimMission"; playerId: PlayerId; missionId: string }
  | { type: "chooseSpecialty"; playerId: PlayerId; specialty: string }
  | { type: "sellToCriee"; playerId: PlayerId; quantity: number }
  | { type: "claimDaily"; playerId: PlayerId; taskId: string }
  | { type: "openBale"; playerId: PlayerId }
  | { type: "rerollContract"; playerId: PlayerId; contractId: string }
  | { type: "joinFamily"; playerId: PlayerId; family: string }
  | { type: "collectLevy"; playerId: PlayerId }
  | { type: "hireLances"; playerId: PlayerId; count: number }
  | { type: "sendMarch"; playerId: PlayerId; land: string; lances: number }
  | { type: "buildWork"; playerId: PlayerId; land: string; kind: string }
  | { type: "joinMarch"; playerId: PlayerId; marchId: string; lances: number }
  | { type: "voteProgramme"; playerId: PlayerId; picks: DecreePick[] }
  /** From the server: the Pass Négociant until this time (a later date never shortens it). */
  | { type: "grantPass"; playerId: PlayerId; until: number }
  | { type: "buyVehicle"; playerId: PlayerId; vehicleType: string }
  | { type: "upgradeVehicle"; playerId: PlayerId; vehicleId: string }
  | {
      type: "dispatchDelivery";
      playerId: PlayerId;
      orderId: string;
      /** Several orders for the same city, carried together (`orderId` alone otherwise). */
      orderIds?: string[];
      vehicleId: string;
    }
  | TerraCommand
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

function join(tx: Tx, playerId: PlayerId, region: string, patents?: string[]): void {
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
    ...(patents && patents.length > 0 ? { patents: [...patents] } : {}),
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
  grantStartingVehicles(tx, playerId);
  grantStartingBales(tx, playerId);
  for (const [resource, qty] of Object.entries(ctx.settings.startingStock[region] ?? {})) {
    addStock(tx, playerId, resource, qty, "starting_kit");
  }
  startWeek(tx, playerId);
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
  for (const v of Object.values(tx.s.vehicles ?? {})) {
    if (v.playerId === playerId) delete tx.s.vehicles?.[v.id];
  }
  if (tx.s.weekly) delete tx.s.weekly.start[playerId];
  if (tx.s.turnover) delete tx.s.turnover[playerId];
  if (tx.s.missions) delete tx.s.missions[playerId];
  if (tx.s.bales) delete tx.s.bales[playerId];
  leaveFamily(tx, playerId);
  if (tx.s.campaign) {
    delete tx.s.campaign.players[playerId];
    delete tx.s.campaign.ballots[playerId];
  }
  resets[playerId] = used + 1;
  emit(tx, "player_reset", playerId);
}

function apply(tx: Tx, cmd: Command): void {
  const { ctx } = tx;
  if (cmd.type === "tick") {
    tick(tx);
    return;
  }
  if (cmd.type === "grantPass") {
    const p = tx.s.players[cmd.playerId];
    if (!p) fail("unknown_player");
    p.passUntil = Math.max(p.passUntil ?? 0, cmd.until);
    emit(tx, "pass_granted", cmd.playerId, { until: cmd.until });
    return;
  }
  if (cmd.type === "join") {
    join(tx, cmd.playerId, cmd.region, cmd.patents);
    // A newcomer finds the day's board of the world at once.
    ensureBoard(tx);
    return;
  }
  if (cmd.type === "resetPlayer") {
    resetPlayer(tx, cmd.playerId);
    return;
  }

  const player = tx.s.players[cmd.playerId];
  if (!player) fail("unknown_player");
  if (tx.now >= seasonEnd(ctx)) fail("season_over");
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
    case "terraPlace":
    case "terraFront":
    case "terraRecall":
    case "terraAlly":
    case "terraAccept":
    case "terraBreak":
    case "terraSend":
    case "terraBuild":
    case "terraRaise":
    case "terraDecree":
    case "terraPeasants":
    case "terraSail":
    case "terraFire":
    case "terraSignal":
    case "terraGift":
    case "terraEmbargo":
    case "terraSkirmishGlory":
      applyTerra(tx, cmd);
      break;
    case "chooseSpecialty":
      chooseSpecialty(tx, cmd.playerId, cmd.specialty);
      break;
    case "grantPatent":
      grantPatent(tx, cmd.playerId, cmd.patent);
      break;
    case "claimHouseMission":
      claimHouseMission(tx, cmd.playerId, cmd.missionId);
      break;
    case "rushDelivery":
      rushDelivery(tx, cmd.playerId, cmd.deliveryId);
      break;
    case "buyTroops":
      buyTroops(tx, cmd.playerId, cmd.count, ctx.settings.house?.spend?.troopsPerDay ?? 0);
      break;
    case "rushWork":
      finishWork(tx, cmd.playerId, cmd.land);
      break;
    case "resetSpecialty":
      resetSpecialty(tx, cmd.playerId);
      break;
    case "rerollDaily":
      rerollDaily(tx, cmd.playerId, cmd.taskId);
      break;
    case "claimMission":
      claimMission(tx, cmd.playerId, cmd.missionId);
      break;
    case "sellToCriee":
      sellToCriee(tx, cmd.playerId, cmd.quantity);
      break;
    case "claimDaily":
      claimDaily(tx, cmd.playerId, cmd.taskId);
      break;
    case "openBale":
      openBale(tx, cmd.playerId);
      break;
    case "rerollContract":
      rerollContract(tx, cmd.playerId, cmd.contractId);
      break;
    case "joinFamily":
      joinFamily(tx, cmd.playerId, cmd.family);
      break;
    case "collectLevy":
      collectLevy(tx, cmd.playerId);
      break;
    case "hireLances":
      hireLances(tx, cmd.playerId, cmd.count);
      break;
    case "buildWork":
      buildWork(tx, cmd.playerId, cmd.land, cmd.kind);
      break;
    case "sendMarch":
      sendMarch(tx, cmd.playerId, cmd.land, cmd.lances);
      break;
    case "joinMarch":
      joinMarch(tx, cmd.playerId, cmd.marchId, cmd.lances);
      break;
    case "voteProgramme":
      voteProgramme(tx, cmd.playerId, cmd.picks);
      break;
    case "buyVehicle":
      buyVehicle(tx, cmd.playerId, cmd.vehicleType);
      break;
    case "upgradeVehicle":
      upgradeVehicle(tx, cmd.playerId, cmd.vehicleId);
      break;
    case "dispatchDelivery":
      dispatchDelivery(tx, cmd.playerId, cmd.orderIds ?? cmd.orderId, cmd.vehicleId);
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
      const tx = { ctx, s: draft, now, fx };
      apply(tx, cmd);
      trackMissions(tx);
      trackDaily(tx);
      trackHouseMissions(tx);
    });
    return { ok: true, state: next, effects: fx };
  } catch (err) {
    if (err instanceof EngineError) {
      return { ok: false, state, error: err.code, message: err.message };
    }
    throw err;
  }
}
