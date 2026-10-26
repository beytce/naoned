import { applyBpsFloor } from "./money.js";
import {
  DAY_MS,
  type Project,
  SOURCE_ACCOUNT,
  type WorldContext,
  type WorldState,
  activePlayerCount,
  cashAccount,
  seasonEnd,
} from "./state.js";
import { type Tx, emit, fail, nextId, removeStock, transfer } from "./tx.js";
import { weekIndex, weekStart } from "./weekly.js";

/** Opens the weekly city project when it is due. Needs scale with the number of active players. */
export function openDueProjects(tx: Tx): void {
  const { ctx } = tx;
  const cfg = ctx.settings.projects;
  // No needs: no weekly city projects in this world.
  if (Object.keys(cfg.needsPerPlayer).length === 0) return;
  const deadline = (openedAt: number) => openedAt + cfg.durationDays * DAY_MS;
  const end = seasonEnd(ctx);
  // A month rarely ends on a week boundary: no stub project in the last days, the previous one
  // runs to the end of the season instead.
  const tail = (cfg.intervalDays * DAY_MS) / 2;
  while (tx.s.nextProjectAt <= tx.now && tx.s.nextProjectAt < end - tail) {
    const openedAt = tx.s.nextProjectAt;
    // The Arsenal of the week: from one of the ranking's bounds to the next.
    const week = cfg.weekly ? weekIndex(ctx, openedAt) : -1;
    const weekEnd = cfg.weekly ? weekStart(ctx, week + 1) : 0;
    const players = Math.max(1, activePlayerCount(ctx, tx.s, tx.now));
    const cities = ctx.theme.cities;
    const city = cities[tx.s.projectCount % cities.length]?.code ?? "";
    const needs: Record<string, number> = {};
    const delivered: Record<string, number> = {};
    const unitPrice: Record<string, bigint> = {};
    for (const [res, perPlayer] of Object.entries(cfg.needsPerPlayer)) {
      needs[res] = perPlayer * players;
      delivered[res] = 0;
      unitPrice[res] = applyBpsFloor(
        ctx.settings.referencePrices[res] ?? 0n,
        10_000 + cfg.premiumBps,
      );
    }
    const id = nextId(tx, "p");
    tx.s.projects[id] = {
      id,
      city,
      openedAt,
      deadline: cfg.weekly
        ? Math.min(weekEnd, end)
        : end - deadline(openedAt) < tail
          ? end
          : Math.min(deadline(openedAt), end),
      needs,
      delivered,
      unitPrice,
    };
    tx.s.projectCount += 1;
    tx.s.nextProjectAt = cfg.weekly ? weekEnd : openedAt + cfg.intervalDays * DAY_MS;
    emit(tx, "project_opened", undefined, { project: id, city });
  }
}

export function openProjects(projects: Record<string, Project>, now: number): Project[] {
  return Object.values(projects).filter((p) => p.openedAt <= now && now < p.deadline);
}

/** Delivers materials to a project; the city pays at a fixed price on delivery. */
export function deliverToProject(
  tx: Tx,
  playerId: string,
  projectId: string,
  resource: string,
  quantity: number,
): void {
  const project = tx.s.projects[projectId];
  if (!project) fail("unknown_project");
  if (tx.now >= project.deadline) fail("project_closed");
  if (!Number.isInteger(quantity) || quantity <= 0) fail("invalid_quantity");
  const need = project.needs[resource];
  const price = project.unitPrice[resource];
  if (need === undefined || price === undefined) fail("not_bought_here");
  const cfg = tx.ctx.settings.projects;
  const was = project.delivered[resource] ?? 0;
  const left = tierNeed(need, cfg.tiersBps.at(-1) ?? 10_000) - was;
  if (quantity > left) fail("project_full");
  // Up to the Bronze at the order's price, past it at a smaller premium (E2-6).
  const above = Math.max(0, was + quantity - Math.max(need, was));
  const abovePrice = applyBpsFloor(
    tx.ctx.settings.referencePrices[resource] ?? 0n,
    10_000 + cfg.premiumAboveBps,
  );
  const paid = price * BigInt(quantity - above) + abovePrice * BigInt(above);
  removeStock(tx, playerId, resource, quantity, "project_delivery", projectId);
  transfer(tx, SOURCE_ACCOUNT, cashAccount(playerId), paid, "project_delivery", projectId);
  project.delivered[resource] = was + quantity;
  // The bonus of the Bronze is shared on what was paid up to it.
  project.by = {
    ...project.by,
    [playerId]: (project.by?.[playerId] ?? 0n) + price * BigInt(quantity - above),
  };
  if (cfg.tiersBps.length > 1) {
    project.units = { ...project.units, [playerId]: (project.units?.[playerId] ?? 0) + quantity };
    if (above > 0)
      project.above = { ...project.above, [playerId]: (project.above?.[playerId] ?? 0) + above };
  }
  emit(tx, "project_delivery", playerId, { project: projectId, resource, quantity });
  const full = Object.entries(project.needs).every(([r, n]) => (project.delivered[r] ?? 0) >= n);
  if (full && project.completedAt === undefined) completeProject(tx, project);
  if (cfg.tiersBps.length > 1) climbTiers(tx, project);
}

/** A tier's need of a resource, from the Bronze's. */
function tierNeed(need: number, bps: number): number {
  return Math.ceil((need * bps) / 10_000);
}

/** The Arsenal's tiers reached by the last delivery: Silver and Gold told, Gold's Influence. */
function climbTiers(tx: Tx, project: Project): void {
  const cfg = tx.ctx.settings.projects;
  let tier = 0;
  cfg.tiersBps.forEach((bps, i) => {
    const reached = Object.entries(project.needs).every(
      ([r, n]) => (project.delivered[r] ?? 0) >= tierNeed(n, bps),
    );
    if (reached && tier === i) tier = i + 1;
  });
  const was = project.tier ?? 0;
  if (tier <= was) return;
  project.tier = tier;
  if (tier >= 2) emit(tx, "project_tier", undefined, { project: project.id, tier });
  if (tier < cfg.tiersBps.length || cfg.goldInfluence === 0) return;
  // Gold: whoever delivered its share and at least a unit past the Bronze.
  const gold = Object.values(project.needs).reduce(
    (n, need) => n + tierNeed(need, cfg.tiersBps.at(-1) ?? 10_000),
    0,
  );
  const least = Math.ceil((gold * cfg.goldMinShareBps) / 10_000);
  for (const [playerId, units] of Object.entries(project.units ?? {}).sort(([a], [b]) =>
    a < b ? -1 : 1,
  )) {
    if (units < least || (project.above?.[playerId] ?? 0) < 1) continue;
    emit(tx, "influence_earned", playerId, {
      source: "arsenal",
      key: `arsenal:${project.id}`,
      amount: cfg.goldInfluence,
    });
  }
}

/** More at the galleys in the week after an Arsenal that reached the Silver (bps; 0 without). */
export function arsenalMudaBps(ctx: WorldContext, state: WorldState, at: number): number {
  const bps = ctx.settings.projects.silverMudaBps;
  if (bps === 0) return 0;
  const boosted = Object.values(state.projects).some(
    (p) => (p.tier ?? 0) >= 2 && p.deadline <= at && at < p.deadline + 7 * DAY_MS,
  );
  return boosted ? bps : 0;
}

/** The order filled: each merchant who delivered gets the bonus on what he was paid. */
function completeProject(tx: Tx, project: Project): void {
  project.completedAt = tx.now;
  const bonusBps = tx.ctx.settings.projects.bonusBps;
  const shares = Object.entries(project.by ?? {}).sort(([a], [b]) => (a < b ? -1 : 1));
  for (const [playerId, paid] of shares) {
    const bonus = applyBpsFloor(paid, bonusBps);
    if (bonus <= 0n) continue;
    transfer(tx, SOURCE_ACCOUNT, cashAccount(playerId), bonus, "project_bonus", project.id);
  }
  emit(tx, "project_completed", undefined, {
    project: project.id,
    city: project.city,
    merchants: shares.length,
  });
}
