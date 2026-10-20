import { costForLevel, costValue, topLevel, workLevel } from "./buildings.js";
import type { Deniers } from "./money.js";
import { yieldBonusBps } from "./production.js";
import { openProjects } from "./projects.js";
import type { Building, PlayerId, WorldContext, WorldState } from "./state.js";
import { recipesFor } from "./theme.js";

/** What a workshop's batches are worth an hour at reference prices, its inputs not taken off. */
function outputValue(
  ctx: WorldContext,
  state: WorldState,
  playerId: PlayerId,
  type: string,
  level: number,
  now: number,
): Deniers {
  const recipe = recipesFor(ctx.theme, type)[0];
  if (!recipe) return 0n;
  let inputs = 0n;
  for (const [res, qty] of Object.entries(recipe.inputs))
    inputs += (ctx.settings.referencePrices[res] ?? 0n) * BigInt((qty ?? 0) * level);
  return (
    marginAt(ctx, state, playerId, type, level, now) +
    (inputs * 60n) / BigInt(Math.max(1, recipe.durationMinutes))
  );
}

/** What one level of a workshop's recipe makes an hour, as margin at reference prices (deniers). */
function marginAt(
  ctx: WorldContext,
  state: WorldState,
  playerId: PlayerId,
  type: string,
  level: number,
  now: number,
): Deniers {
  const player = state.players[playerId];
  const recipe = recipesFor(ctx.theme, type)[0];
  if (!player || !recipe || level <= 0) return 0n;
  const ref = ctx.settings.referencePrices;
  const levelBonus = (level - 1) * ctx.settings.levelYieldBonusBps;
  let out = 0n;
  for (const [res, qty] of Object.entries(recipe.outputs)) {
    const bonus = 10_000 + yieldBonusBps(ctx, player, res, now) + levelBonus;
    out += ((ref[res] ?? 0n) * BigInt((qty ?? 0) * level) * BigInt(bonus)) / 10_000n;
  }
  let cost = 0n;
  for (const [res, qty] of Object.entries(recipe.inputs))
    cost += (ref[res] ?? 0n) * BigInt((qty ?? 0) * level);
  // Batches an hour.
  return ((out - cost) * 60n) / BigInt(Math.max(1, recipe.durationMinutes));
}

export interface WorkshopEconomics {
  /** Units of its first output an hour, at its level (hundredths). */
  unitsPerHour: number;
  /** Its margin an hour at reference prices: outputs less inputs (deniers). */
  marginPerHour: Deniers;
  /** The next level: its cost, what it adds an hour, how long it takes to pay back. */
  next: { cost: Deniers; addedPerHour: Deniers; paybackMinutes: number } | null;
}

/**
 * A workshop in figures, for the merchant to choose (recommendations of 20 October 2026): what it
 * earns an hour at reference prices, and what the next level would add for what it costs.
 */
export function workshopEconomics(
  ctx: WorldContext,
  state: WorldState,
  playerId: PlayerId,
  building: Building,
  now: number,
): WorkshopEconomics {
  const recipe = recipesFor(ctx.theme, building.type)[0];
  const player = state.players[playerId];
  const level = workLevel(ctx, building);
  const margin = marginAt(ctx, state, playerId, building.type, level, now);
  let unitsPerHour = 0;
  if (recipe && player) {
    const [res, qty] = Object.entries(recipe.outputs)[0] ?? ["", 0];
    const bonus =
      10_000 + yieldBonusBps(ctx, player, res, now) + (level - 1) * ctx.settings.levelYieldBonusBps;
    unitsPerHour = Math.floor(
      ((qty ?? 0) * level * bonus * 60 * 100) / (10_000 * Math.max(1, recipe.durationMinutes)),
    );
  }
  // The last level, or a manufacture's path still to choose: nothing to add by an upgrade.
  if (building.level >= topLevel(ctx, building) || building.type === "palazzo")
    return { unitsPerHour, marginPerHour: margin, next: null };
  const cost = costValue(ctx, costForLevel(ctx, building.type, building.level + 1));
  // On the quality path, a level adds what the cities pay more for the same batches.
  const added =
    building.path === "quality"
      ? (outputValue(ctx, state, playerId, building.type, level, now) *
          BigInt(ctx.settings.manufacture?.qualityBpsPerLevel ?? 0)) /
        10_000n
      : marginAt(ctx, state, playerId, building.type, level + 1, now) - margin;
  const paybackMinutes = added > 0n ? Number((cost * 60n) / added) : Number.POSITIVE_INFINITY;
  return {
    unitsPerHour,
    marginPerHour: margin,
    next: { cost, addedPerHour: added, paybackMinutes },
  };
}

/** The merchant's upgrade that pays back first (null: none left). */
export function bestUpgrade(
  ctx: WorldContext,
  state: WorldState,
  playerId: PlayerId,
  now: number,
): { buildingId: string; paybackMinutes: number; addedPerHour: Deniers } | null {
  let best: { buildingId: string; paybackMinutes: number; addedPerHour: Deniers } | null = null;
  for (const b of Object.values(state.buildings).sort((x, y) => (x.id < y.id ? -1 : 1))) {
    if (b.playerId !== playerId) continue;
    const next = workshopEconomics(ctx, state, playerId, b, now).next;
    if (!next || !Number.isFinite(next.paybackMinutes)) continue;
    if (!best || next.paybackMinutes < best.paybackMinutes)
      best = {
        buildingId: b.id,
        paybackMinutes: next.paybackMinutes,
        addedPerHour: next.addedPerHour,
      };
  }
  return best;
}

/** One piece of advice from the guide, the most urgent first (see `nextActions`). */
export type NextAction =
  | { kind: "harvest"; count: number }
  | { kind: "produce"; buildingId: string }
  | { kind: "company"; projectId: string; resource: string; quantity: number }
  | { kind: "upgrade"; buildingId: string; paybackMinutes: number; addedPerHour: Deniers };

/**
 * The next best actions of a merchant (recommendations of 20 October 2026), most urgent first:
 * batches waiting in the workshops, workshops standing idle that have what they need, goods in
 * stock the company order asks for, then the upgrade that pays back first once it is affordable.
 */
export function nextActions(
  ctx: WorldContext,
  state: WorldState,
  playerId: PlayerId,
  now: number,
): NextAction[] {
  const out: NextAction[] = [];
  const stock = (res: string) => state.inventories[playerId]?.[res]?.available ?? 0;
  const mine = Object.values(state.buildings)
    .filter((b) => b.playerId === playerId)
    .sort((x, y) => (x.id < y.id ? -1 : 1));
  let ready = 0;
  for (const b of mine) {
    const job = b.job;
    if (job && Math.floor((now - job.startedAt) / job.batchMs) > 0) ready += 1;
  }
  if (ready > 0) out.push({ kind: "harvest", count: ready });
  for (const b of mine) {
    const job = b.job;
    if (job && job.startedAt + job.batches * job.batchMs > now) continue;
    const recipe = recipesFor(ctx.theme, b.type)[0];
    if (!recipe) continue;
    const can = Object.entries(recipe.inputs).every(
      ([res, qty]) => stock(res) >= (qty ?? 0) * workLevel(ctx, b),
    );
    if (can) out.push({ kind: "produce", buildingId: b.id });
  }
  for (const p of openProjects(state.projects, now)) {
    const resource = Object.keys(p.needs)
      .sort()
      .find((r) => (p.needs[r] ?? 0) > (p.delivered[r] ?? 0) && stock(r) > 0);
    if (!resource) continue;
    const quantity = Math.min(
      stock(resource),
      (p.needs[resource] ?? 0) - (p.delivered[resource] ?? 0),
    );
    out.push({ kind: "company", projectId: p.id, resource, quantity });
    break;
  }
  const best = bestUpgrade(ctx, state, playerId, now);
  const b = best && state.buildings[best.buildingId];
  if (best && b) {
    const cost = costForLevel(ctx, b.type, b.level + 1);
    const cash = state.accounts[`cash:${playerId}`] ?? 0n;
    const materials = Object.entries(cost.materials).every(([res, qty]) => stock(res) >= qty);
    if (cash >= cost.ducats && materials) out.push({ kind: "upgrade", ...best });
  }
  return out;
}
