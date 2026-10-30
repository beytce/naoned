import type { EmpireBuild, EmpirePayload, EmpireRecipe, EmpireWorkshop } from "./types.js";

/** The recipe a workshop runs, from the catalog. */
export function recipeOf(
  p: EmpirePayload,
  ws: { type: string; recipe: string },
): EmpireRecipe | undefined {
  return p.catalog.find((b) => b.type === ws.type)?.recipes.find((r) => r.code === ws.recipe);
}

export function buildingName(p: EmpirePayload, type: string): string {
  return p.catalog.find((b) => b.type === type)?.name ?? type;
}

/** Lots done and waiting to be collected. */
export function readyLots(ws: EmpireWorkshop, now: number): number {
  const job = ws.job;
  if (!job) return 0;
  return Math.max(0, Math.min(job.batches, Math.floor((now - job.startedAt) / job.batchMs)));
}

/** When the queue runs dry (null: stopped). */
export function queueEnd(ws: EmpireWorkshop): number | null {
  return ws.job ? ws.job.startedAt + ws.job.batches * ws.job.batchMs : null;
}

/** Share of the current lot done, 0 to 1 (0 when stopped or all done). */
export function lotProgress(ws: EmpireWorkshop, now: number): number {
  const job = ws.job;
  if (!job || readyLots(ws, now) >= job.batches) return 0;
  return ((now - job.startedAt) % job.batchMs) / job.batchMs;
}

/** Something to do with the workshops: lots to take, or a queue that would take more. */
export function wantsRelaunch(p: EmpirePayload, now: number): boolean {
  return (p.view?.house.workshops ?? []).some((ws) => {
    if (readyLots(ws, now) > 0) return true;
    const end = queueEnd(ws);
    if (end !== null && end - now > 11 * 3_600_000) return false;
    const r = recipeOf(p, ws);
    // Stopped, or short of a full queue: only worth it if its inputs are there.
    return Object.entries(r?.inputs ?? {}).every(([g, n]) => (p.stock[g] ?? 0) >= n);
  });
}

/** The next step of the Casa in days of income, one decimal; null before any sale. */
export function daysOfIncome(cost: string, incomePerDay: string): number | null {
  const income = BigInt(incomePerDay);
  if (income <= 0n) return null;
  return Number((BigInt(cost) * 10n) / income) / 10;
}

/** Sites under way, the soonest first. */
export function sitesByEnd(builds: EmpireBuild[]): EmpireBuild[] {
  return [...builds].sort((a, b) => a.endsAt - b.endsAt);
}

/**
 * The Casa that opens a system, by the code its level names (`scuola`, `colleganza`…): null when
 * no level names it.
 */
export function opensAt(p: EmpirePayload, code: string): number | null {
  const level = p.casa.find((c) => c.opens.includes(code));
  return level ? level.level : null;
}

/**
 * A closed system is shown only from the Casa before its opening (lot A of the UX audit): what the
 * house cannot touch yet stays out of sight.
 */
export const shownAt = (casa: number, at: number | null) => at === null || casa >= at - 1;

/** Can the house pay this in ducats? */
export const affordable = (cash: string, cost: string) => BigInt(cash) >= BigInt(cost);
