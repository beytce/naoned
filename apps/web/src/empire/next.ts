import { affordable, readyLots, recipeOf, wantsRelaunch } from "./logic.js";
import type { EmpireAction, EmpirePayload } from "./types.js";

/**
 * The next step (the UX audit of 31 October 2026, lot A): the one thing the house should do now,
 * why, and the gesture that does it. Read from the view alone, in this order: take what is ready,
 * relaunch, build the Casa, build the workshop the Casa lacks, raise a workshop, sell what piles
 * up when ducats are short, claim an objective; else wait, and say until when.
 */
export type NextStep =
  | { kind: "collect"; lots: number; action: EmpireAction }
  | { kind: "relaunch"; action: EmpireAction }
  | { kind: "casa"; level: number; action: EmpireAction }
  | { kind: "build"; good: string; type: string; recipe: string; casa: number }
  | { kind: "upgrade"; workshopId: string; type: string; level: number; action: EmpireAction }
  | { kind: "sell"; good: string; qty: number; deliver: boolean; action: EmpireAction }
  | { kind: "claim"; index: number; action: EmpireAction }
  | { kind: "wait"; at: number | null };

/** What the house keeps of a good: the next Casa's materials, two lots of each workshop's inputs. */
export function keptOf(p: EmpirePayload, good: string): number {
  const view = p.view;
  if (!view) return 0;
  let keep = view.nextCasa?.materials[good] ?? 0;
  for (const ws of view.house.workshops) keep += 2 * (recipeOf(p, ws)?.inputs[good] ?? 0);
  return keep;
}

/** The workshop that makes a good, from the catalog: its building and its recipe. */
function makerOf(p: EmpirePayload, good: string) {
  for (const b of p.catalog)
    for (const r of b.recipes) if (good in r.outputs) return { type: b.type, recipe: r.code };
  return null;
}

export function nextStep(p: EmpirePayload, now: number): NextStep {
  const view = p.view;
  if (!view) return { kind: "wait", at: null };
  const ws = view.house.workshops;
  const builds = view.house.builds ?? [];
  const freeSite = builds.length < view.buildSlots;

  // 1. The lots ready.
  const lots = ws.reduce((n, w) => n + readyLots(w, now), 0);
  if (lots > 0) return { kind: "collect", lots, action: { type: "empireRelaunchAll" } };
  // 2. A workshop that could run more.
  if (wantsRelaunch(p, now)) return { kind: "relaunch", action: { type: "empireRelaunchAll" } };

  const next = view.nextCasa;
  const lacking = next
    ? Object.entries(next.materials).filter(([g, n]) => (p.stock[g] ?? 0) < n)
    : [];
  // 3. The Casa, all there.
  if (
    next?.requirementMet &&
    lacking.length === 0 &&
    affordable(p.cash, next.cost) &&
    freeSite &&
    !builds.some((b) => b.kind === "casa")
  )
    return { kind: "casa", level: next.level, action: { type: "empireBuildCasa" } };

  let short = false;
  // 4. A material the house makes nowhere, nor builds: its workshop.
  for (const [good] of lacking) {
    const made = ws.some((w) => good in (recipeOf(p, w)?.outputs ?? {}));
    const coming = builds.some(
      (b) =>
        b.kind === "newWorkshop" &&
        good in
          (recipeOf(p, { type: b.workshopType ?? "", recipe: b.recipe ?? "" })?.outputs ?? {}),
    );
    const maker = makerOf(p, good);
    if (made || coming || !maker || !view.newWorkshop || !freeSite) continue;
    if (!affordable(p.cash, view.newWorkshop.cost)) {
      short = true;
      continue;
    }
    return { kind: "build", good, ...maker, casa: next?.level ?? 0 };
  }
  // 5. The levels the Casa asks: the lowest workshop up.
  if (next && !next.requirementMet && freeSite) {
    const low = [...ws]
      .filter((w) => view.upgrades[w.id] && !builds.some((b) => b.workshopId === w.id))
      .sort((a, b) => a.level - b.level)[0];
    const up = low ? view.upgrades[low.id] : null;
    if (low && up) {
      if (affordable(p.cash, up.cost))
        return {
          kind: "upgrade",
          workshopId: low.id,
          type: low.type,
          level: up.level,
          action: { type: "empireUpgrade", workshopId: low.id },
        };
      short = true;
    }
  }
  if (next && !affordable(p.cash, next.cost)) short = true;
  // 6. Ducats short: what piles up, sold at its best outlet.
  if (short) {
    const sales = Object.entries(p.stock)
      .filter(([g]) => !g.includes(":"))
      .map(([good, qty]) => {
        const q = p.market.find((m) => m.region === "veneto" && m.good === good);
        const spare = qty - keptOf(p, good);
        const n = q ? Math.min(spare, q.asked ? spare : q.depthLeft) : 0;
        return { good, n, q, value: q ? BigInt(q.price) * BigInt(Math.max(0, n)) : 0n };
      })
      .filter((x) => x.q && x.n > 0)
      .sort((a, b) => (a.value < b.value ? 1 : a.value > b.value ? -1 : 0));
    const best = sales[0];
    if (best?.q)
      return {
        kind: "sell",
        good: best.good,
        qty: best.n,
        deliver: best.q.asked,
        action: best.q.asked
          ? { type: "empireDeliver", good: best.good, qty: best.n }
          : { type: "empireSell", good: best.good, qty: best.n },
      };
  }
  // 7. An objective met.
  const all = [...view.carnet.objectives, ...view.carnet.carried];
  const index = all.findIndex((o) => !o.claimed && o.progress >= o.target);
  if (index >= 0) return { kind: "claim", index, action: { type: "empireClaim", index } };
  // 8. Wait: the next lot, or the next site's end.
  const times = [
    ...ws.map((w) => {
      const job = w.job;
      if (!job || readyLots(w, now) >= job.batches) return null;
      return job.startedAt + (readyLots(w, now) + 1) * job.batchMs;
    }),
    ...builds.map((b) => b.endsAt),
  ].filter((t): t is number => t !== null && t > now);
  return { kind: "wait", at: times.length > 0 ? Math.min(...times) : null };
}

/**
 * Lorenzo guides the founding (decision of the owner, 31 October 2026): until the Casa 2 his next
 * step and its gold button lead the first gestures; past it he withdraws, and the player plays.
 */
export function inTutorial(p: EmpirePayload): boolean {
  return (p.view?.house.casa ?? 1) < 2;
}
