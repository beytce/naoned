import { applyBpsFloor } from "./money.js";
import { DAY_MS, type Project, SOURCE_ACCOUNT, activePlayerCount, cashAccount } from "./state.js";
import { type Tx, emit, fail, nextId, removeStock, transfer } from "./tx.js";

/** Opens the weekly city project when it is due. Needs scale with the number of active players. */
export function openDueProjects(tx: Tx): void {
  const { ctx } = tx;
  const cfg = ctx.settings.projects;
  const seasonEnd = ctx.startAt + ctx.settings.seasonDays * DAY_MS;
  while (tx.s.nextProjectAt <= tx.now && tx.s.nextProjectAt < seasonEnd) {
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
      deadline: Math.min(openedAt + cfg.durationDays * DAY_MS, seasonEnd),
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
  emit(tx, "project_delivery", playerId, { project: projectId, resource, quantity });
}
