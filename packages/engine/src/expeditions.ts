import { draw } from "./draw.js";
import { type Deniers, applyBpsFloor } from "./money.js";
import { type Expedition, HOUR_MS, type PlayerId, SINK_ACCOUNT, cashAccount } from "./state.js";
import { type Tx, addStock, emit, fail, nextId, removeStock, transfer } from "./tx.js";

/** Resources a galley can carry: priced, and not exotic goods brought back from the East. */
function shippable(tx: Tx, resource: string): boolean {
  const exotic = Object.values(tx.ctx.settings.expeditions.destinations).some(
    (d) => d.returns === resource,
  );
  const def = tx.ctx.theme.resources.find((r) => r.code === resource);
  return !exotic && def?.tier !== "luxury" && resource in tx.ctx.settings.referencePrices;
}

export function launchExpedition(
  tx: Tx,
  playerId: PlayerId,
  destination: string,
  cargo: Record<string, number>,
  escort: boolean,
): Expedition {
  const { settings } = tx.ctx;
  const dest = settings.expeditions.destinations[destination];
  if (!dest) fail("unknown_destination");
  const active = Object.values(tx.s.expeditions ?? {}).filter(
    (e) => e.playerId === playerId && e.outcome === "pending",
  );
  if (active.length >= settings.expeditions.maxActive) fail("too_many_galleys");

  let value: Deniers = 0n;
  const entries = Object.entries(cargo).filter(([, q]) => q !== 0);
  if (entries.length === 0) fail("invalid_cargo");
  for (const [resource, qty] of entries) {
    if (!Number.isInteger(qty) || qty <= 0 || !shippable(tx, resource)) fail("invalid_cargo");
    value += (settings.referencePrices[resource] ?? 0n) * BigInt(qty);
  }
  if (value > dest.maxCargoValue) fail("cargo_too_valuable");

  const id = nextId(tx, "g");
  for (const [resource, qty] of entries)
    removeStock(tx, playerId, resource, qty, "expedition_out", id);
  for (const [resource, qty] of Object.entries(dest.provisions)) {
    removeStock(tx, playerId, resource, qty, "expedition_out", id);
  }
  const fee = dest.charter + (escort ? dest.escort : 0n);
  transfer(tx, cashAccount(playerId), SINK_ACCOUNT, fee, "expedition_charter", id);

  const expedition: Expedition = {
    id,
    playerId,
    destination,
    departAt: tx.now,
    returnAt: tx.now + dest.hours * HOUR_MS,
    cargo: Object.fromEntries(entries),
    escort,
    cargoValue: value,
    outcome: "pending",
    brought: 0,
  };
  tx.s.expeditions ??= {};
  tx.s.expeditions[id] = expedition;
  emit(tx, "expedition_launched", playerId, { expedition: id, destination, escort });
  return expedition;
}

/** Unloads a galley back in port. Pirates are drawn now, from the world's secret seed. */
export function collectExpedition(tx: Tx, playerId: PlayerId, expeditionId: string): void {
  const e = tx.s.expeditions?.[expeditionId];
  if (!e) fail("unknown_expedition");
  if (e.playerId !== playerId) fail("not_owner");
  if (e.outcome !== "pending") fail("unknown_expedition");
  if (tx.now < e.returnAt) fail("expedition_not_back");
  const dest = tx.ctx.settings.expeditions.destinations[e.destination];
  if (!dest) fail("unknown_destination");

  const risk = e.escort ? dest.escortRiskBps : dest.riskBps;
  if (draw(tx.ctx, `pirates:${e.id}`) % 10_000 < risk) {
    e.outcome = "lost";
    emit(tx, "expedition_lost", playerId, { expedition: e.id });
    return;
  }
  const unit = tx.ctx.settings.referencePrices[dest.returns] ?? 0n;
  const worth = applyBpsFloor(e.cargoValue, 10_000 + dest.gainBps);
  const brought = unit > 0n ? Number(worth / unit) : 0;
  addStock(tx, playerId, dest.returns, brought, "expedition_return", e.id);
  e.outcome = "returned";
  e.brought = brought;
  emit(tx, "expedition_returned", playerId, { expedition: e.id, brought });
}
