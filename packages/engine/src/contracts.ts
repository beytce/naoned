import { draw } from "./draw.js";
import { type Deniers, applyBpsFloor } from "./money.js";
import {
  DAY_MS,
  type PlayerId,
  SOURCE_ACCOUNT,
  type WorldContext,
  cashAccount,
  dayIndex,
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
export function contractsFor(ctx: WorldContext, playerId: PlayerId, day: number): Contract[] {
  const { perDay, premiumBps, quantities, luxury } = ctx.settings.contracts;
  const resources = Object.keys(quantities);
  const exotic = Object.keys(luxury.quantities);
  const cities = ctx.theme.cities;
  if (perDay === 0 || resources.length === 0 || cities.length === 0) return [];
  const out: Contract[] = [];
  for (let i = 0; i < perDay; i++) {
    const h = draw(ctx, `contract:${playerId}:${day}:${i}`);
    const overseas =
      exotic.length > 0 &&
      draw(ctx, `contract-luxury:${playerId}:${day}:${i}`) % 10_000 < luxury.chanceBps;
    const resource = overseas
      ? (exotic[h % exotic.length] ?? "")
      : (resources[h % resources.length] ?? "");
    const city = cities[(h >>> 8) % cities.length]?.code ?? "";
    out.push({
      id: `${day}:${i}`,
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

export function contractsDoneToday(
  tx: { s: { contractsDone?: Record<string, { day: number; ids: string[] }> } },
  playerId: PlayerId,
  day: number,
) {
  const entry = tx.s.contractsDone?.[playerId];
  return entry && entry.day === day ? entry.ids : [];
}

export function fulfillContract(tx: Tx, playerId: PlayerId, contractId: string): void {
  const today = dayIndex(tx.ctx, tx.now);
  const [dayText] = contractId.split(":");
  if (Number(dayText) !== today) fail("contract_expired");
  const contract = contractsFor(tx.ctx, playerId, today).find((c) => c.id === contractId);
  if (!contract) fail("unknown_contract");
  const done = contractsDoneToday(tx, playerId, today);
  if (done.includes(contractId)) fail("contract_done");

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
