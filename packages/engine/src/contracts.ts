import { draw } from "./draw.js";
import { type Deniers, applyBpsFloor } from "./money.js";
import {
  DAY_MS,
  type PlayerId,
  SOURCE_ACCOUNT,
  type WorldContext,
  type WorldState,
  cashAccount,
  dayIndex,
  hasPass,
} from "./state.js";
import { type Tx, emit, fail, removeStock, transfer } from "./tx.js";

export interface Contract {
  id: string;
  day: number;
  resource: string;
  quantity: number;
  city: string;
  unitPrice: Deniers;
  expiresAt: number;
}

/**
 * The Doge's orders for a player and a day. Drawn from the world's secret seed, so they are the
 * same on every request and cannot be predicted from outside.
 */
export function contractsFor(
  ctx: WorldContext,
  playerId: PlayerId,
  day: number,
  /** Slots swapped with the Pass today: slot index → number of swaps. */
  rerolls: Record<number, number> = {},
): Contract[] {
  const { perDay, premiumBps, quantities, luxury } = ctx.settings.contracts;
  const resources = Object.keys(quantities);
  const exotic = Object.keys(luxury.quantities);
  const cities = ctx.theme.cities;
  if (perDay === 0 || resources.length === 0 || cities.length === 0) return [];
  const out: Contract[] = [];
  for (let i = 0; i < perDay; i++) {
    const n = rerolls[i] ?? 0;
    const suffix = n > 0 ? `:r${n}` : "";
    const h = draw(ctx, `contract:${playerId}:${day}:${i}${suffix}`);
    const overseas =
      exotic.length > 0 &&
      draw(ctx, `contract-luxury:${playerId}:${day}:${i}${suffix}`) % 10_000 < luxury.chanceBps;
    const resource = overseas
      ? (exotic[h % exotic.length] ?? "")
      : (resources[h % resources.length] ?? "");
    const city = cities[(h >>> 8) % cities.length]?.code ?? "";
    out.push({
      id: `${day}:${i}${suffix}`,
      day,
      resource,
      quantity: (overseas ? luxury.quantities[resource] : quantities[resource]) ?? 0,
      city,
      unitPrice: applyBpsFloor(ctx.settings.referencePrices[resource] ?? 0n, 10_000 + premiumBps),
      expiresAt: ctx.startAt + (day + 1) * DAY_MS,
    });
  }
  return out;
}

function isLuxury(ctx: WorldContext, resource: string): boolean {
  return ctx.theme.resources.find((r) => r.code === resource)?.tier === "luxury";
}

export function contractsDoneToday(
  tx: { s: { contractsDone?: Record<string, { day: number; ids: string[] }> } },
  playerId: PlayerId,
  day: number,
) {
  const entry = tx.s.contractsDone?.[playerId];
  return entry && entry.day === day ? entry.ids : [];
}

/** Today's swapped slots of a merchant (empty on another day). */
export function rerollsOf(state: WorldState, playerId: PlayerId, day: number) {
  const entry = state.contractRerolls?.[playerId];
  return entry && entry.day === day ? entry.slots : {};
}

/** Pass Négociant: swaps one of today's orders (not yet fulfilled) for another. */
export function rerollContract(tx: Tx, playerId: PlayerId, contractId: string): void {
  // The board of deliveries is never swapped, Pass or not.
  if (tx.ctx.settings.deliveries.ordersPerDay.max > 0) fail("city_sales_closed");
  const allowed = tx.ctx.settings.pass.contractRerollsPerDay;
  if (allowed === 0 || !hasPass(tx.s as WorldState, playerId, tx.now)) fail("pass_required");
  const today = dayIndex(tx.ctx, tx.now);
  const slots = rerollsOf(tx.s as WorldState, playerId, today);
  const used = Object.values(slots).reduce((a, b) => a + b, 0);
  if (used >= allowed) fail("no_reroll_left");
  const list = contractsFor(tx.ctx, playerId, today, slots);
  const index = list.findIndex((c) => c.id === contractId);
  if (index < 0) fail("unknown_contract");
  if (contractsDoneToday(tx, playerId, today).includes(contractId)) fail("contract_done");
  tx.s.contractRerolls ??= {};
  tx.s.contractRerolls[playerId] = {
    day: today,
    slots: { ...slots, [index]: (slots[index] ?? 0) + 1 },
  };
  emit(tx, "contract_rerolled", playerId, { contract: contractId });
}

export function fulfillContract(tx: Tx, playerId: PlayerId, contractId: string): void {
  const today = dayIndex(tx.ctx, tx.now);
  const [dayText] = contractId.split(":");
  if (Number(dayText) !== today) fail("contract_expired");
  const contract = contractsFor(
    tx.ctx,
    playerId,
    today,
    rerollsOf(tx.s as WorldState, playerId, today),
  ).find((c) => c.id === contractId);
  if (!contract) fail("unknown_contract");
  const done = contractsDoneToday(tx, playerId, today);
  if (done.includes(contractId)) fail("contract_done");
  // With deliveries, home goods go by road; goods from overseas are still handed in here.
  if (tx.ctx.settings.deliveries.ordersPerDay.max > 0 && !isLuxury(tx.ctx, contract.resource))
    fail("city_sales_closed");

  removeStock(tx, playerId, contract.resource, contract.quantity, "contract", contractId);
  transfer(
    tx,
    SOURCE_ACCOUNT,
    cashAccount(playerId),
    contract.unitPrice * BigInt(contract.quantity),
    "contract_reward",
    contractId,
  );
  tx.s.contractsDone ??= {};
  tx.s.contractsDone[playerId] = { day: today, ids: [...done, contractId] };
  emit(tx, "contract_fulfilled", playerId, { contract: contractId, resource: contract.resource });
}
