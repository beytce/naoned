import { actAt, seasonActs } from "./acts.js";
import { addInfluence } from "./families.js";
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
  openActWorksite(tx);
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

/** The act's worksite, opened once at the start of its act, for the families to compete. */
function openActWorksite(tx: Tx): void {
  const { ctx } = tx;
  const act = actAt(ctx, tx.now);
  const site = act?.worksite;
  if (!act || !site) return;
  if (Object.values(tx.s.projects).some((p) => p.act === act.index)) return;
  const players = Math.max(1, activePlayerCount(ctx, tx.s, tx.now));
  const needs: Record<string, number> = {};
  const delivered: Record<string, number> = {};
  const unitPrice: Record<string, bigint> = {};
  for (const [res, perPlayer] of Object.entries(site.needsPerPlayer)) {
    needs[res] = perPlayer * players;
    delivered[res] = 0;
    unitPrice[res] = applyBpsFloor(
      ctx.settings.referencePrices[res] ?? 0n,
      10_000 + site.premiumBps,
    );
  }
  const id = nextId(tx, "p");
  tx.s.projects[id] = {
    id,
    city: site.city,
    openedAt: act.startsAt,
    deadline: act.endsAt,
    needs,
    delivered,
    unitPrice,
    act: act.index,
    byFamily: {},
    winner: null,
  };
  emit(tx, "project_opened", undefined, { project: id, city: site.city, act: act.code });
}

/** A worksite whose act is over: the family that delivered most wins influence for its members. */
export function closeWorksites(tx: Tx): void {
  const acts = seasonActs(tx.ctx);
  for (const p of Object.values(tx.s.projects)) {
    if (p.act === undefined || p.winner !== null || tx.now < p.deadline) continue;
    const site = acts[p.act]?.worksite;
    const ranked = Object.entries(p.byFamily ?? {})
      .filter(([, n]) => n > 0)
      .sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1));
    const winner = ranked[0]?.[0] ?? null;
    const project = tx.s.projects[p.id];
    if (!project) continue;
    project.winner = winner ?? "";
    if (!winner || !site) continue;
    for (const [playerId, family] of Object.entries(tx.s.families?.members ?? {})) {
      if (family === winner) addInfluence(tx, playerId, site.winnerInfluence);
    }
    emit(tx, "worksite_won", undefined, { project: p.id, family: winner, city: p.city });
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
  // A worksite of the families: the units count for the merchant's family, and in influence.
  const family = tx.s.families?.members[playerId];
  if (project.act !== undefined && family) {
    project.byFamily ??= {};
    project.byFamily[family] = (project.byFamily[family] ?? 0) + quantity;
    const site = seasonActs(tx.ctx)[project.act]?.worksite;
    if (site) addInfluence(tx, playerId, quantity * site.influencePerUnit);
  }
  emit(tx, "project_delivery", playerId, { project: projectId, resource, quantity });
}
