import { applyBpsFloor } from "./money.js";
import {
  DAY_MS,
  type Project,
  SOURCE_ACCOUNT,
  activePlayerCount,
  cashAccount,
  seasonEnd,
} from "./state.js";
import { type Tx, emit, fail, nextId, removeStock, transfer } from "./tx.js";

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
      deadline: end - deadline(openedAt) < tail ? end : Math.min(deadline(openedAt), end),
      needs,
      delivered,
      unitPrice,
    };
    tx.s.projectCount += 1;
    tx.s.nextProjectAt = openedAt + cfg.intervalDays * DAY_MS;
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
  const left = need - (project.delivered[resource] ?? 0);
  if (quantity > left) fail("project_full");
  removeStock(tx, playerId, resource, quantity, "project_delivery", projectId);
  transfer(
    tx,
    SOURCE_ACCOUNT,
    cashAccount(playerId),
    price * BigInt(quantity),
    "project_delivery",
    projectId,
  );
  project.delivered[resource] = (project.delivered[resource] ?? 0) + quantity;
  project.by = {
    ...project.by,
    [playerId]: (project.by?.[playerId] ?? 0n) + price * BigInt(quantity),
  };
  emit(tx, "project_delivery", playerId, { project: projectId, resource, quantity });
  const full = Object.entries(project.needs).every(([r, n]) => (project.delivered[r] ?? 0) >= n);
  if (full && project.completedAt === undefined) completeProject(tx, project);
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
