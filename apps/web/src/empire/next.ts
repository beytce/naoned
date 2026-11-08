import { freeTileOf } from "./NewWorkshop.js";
import { affordable, readyLots, recipeOf, wantsRelaunch } from "./logic.js";
import { deliveryPlan } from "./map/logic.js";
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
  | {
      kind: "deliver";
      city: string;
      good: string;
      qty: number;
      have: number;
      pay: bigint;
      action: EmpireAction;
    }
  | { kind: "casa"; level: number; action: EmpireAction }
  | { kind: "build"; good: string; type: string; recipe: string; casa: number }
  /** No free tile for the workshop to build: a plot of one's own first (P0-06, no dead end). */
  | { kind: "plot"; cell: string; action: EmpireAction }
  /** A workshop stopped for want of an input nobody makes yet: bought at the Market. */
  | { kind: "buy"; good: string; qty: number; type: string; action: EmpireAction }
  | { kind: "upgrade"; workshopId: string; type: string; level: number; action: EmpireAction }
  | { kind: "sell"; good: string; qty: number; deliver: boolean; action: EmpireAction }
  | { kind: "claim"; index: number; action: EmpireAction }
  | { kind: "wait"; at: number | null }
  | WelcomeStep;

/**
 * The welcome of a new house (the first steps, docs/plan-premiers-pas.md lot 2): Lorenzo leads it
 * to its first order, a gesture at a time, before anything else.
 * - build: a free tile touched, the first workshop (the welcome's) built on it, at once;
 * - launch: its first lot launched, ready in seconds;
 * - making: the lot under way;
 * - collect: the lot taken;
 * - deliver: the order of welcome brought to its town;
 * - onWay: the vehicle on its way, until it is paid.
 */
export type WelcomeStep = {
  kind: "welcome";
  phase: "build" | "launch" | "making" | "collect" | "deliver" | "onWay";
  /** The workshop to build, the good it makes. */
  type: string;
  recipe: string;
  good: string;
  /** The first workshop's id, once built. */
  workshopId?: string;
  /** The town of the order of welcome, its lot and pay, once given. */
  city?: string;
  qty?: number;
  pay?: bigint;
  /** Since when, and until when, the lot is made or the vehicle walks (its arc). */
  from?: number;
  at?: number;
  action?: EmpireAction;
};

/** The welcome's step, or null once its order is paid (or for a house of before). */
export function welcomeStep(p: EmpirePayload, now: number): WelcomeStep | null {
  const view = p.view;
  const w = view?.house.welcome;
  if (!view?.welcome || !w || w.done) return null;
  const { type, recipe } = view.welcome.workshop;
  const r = p.catalog.find((b) => b.type === type)?.recipes.find((x) => x.code === recipe);
  const good = Object.keys(r?.outputs ?? {})[0] ?? "";
  const base = { kind: "welcome" as const, type, recipe, good };
  // The welcome's own workshop, whatever was built before it.
  const first = view.house.workshops.find((x) => x.type === type);
  if (!first) {
    // Rising (at once): the next read shows it.
    if ((view.house.builds ?? []).some((b) => b.kind === "newWorkshop" && b.workshopType === type))
      return { ...base, phase: "making" };
    return { ...base, phase: "build" };
  }
  const ws = { ...base, workshopId: first.id };
  if (!w.batch)
    return {
      ...ws,
      phase: "launch",
      action: { type: "empireRelaunch", workshopId: first.id },
    };
  const order = (view.orders ?? []).flatMap((c) => c.orders).find((o) => o.id === w.order);
  const vehicle = (view.vehicles?.mine ?? []).find((v) => v.loads.some((o) => o.id === w.order));
  const city = order?.city ?? vehicle?.loads.find((o) => o.id === w.order)?.city;
  const about = {
    ...ws,
    ...(city ? { city } : {}),
    ...(order ? { qty: order.qty, pay: BigInt(order.pay) } : {}),
  };
  if (vehicle) {
    const leg = vehicle.legs.find((l) => l.to === `city:${city}`);
    return {
      ...about,
      phase: "onWay",
      ...(leg ? { from: leg.departAt, at: leg.arrivesAt } : {}),
    };
  }
  const lots = readyLots(first, now);
  if (lots > 0) return { ...about, phase: "collect", action: { type: "empireRelaunchAll" } };
  const job = first.job;
  if (job && order && (p.stock[order.good] ?? 0) < order.qty)
    return { ...about, phase: "making", from: job.startedAt, at: job.startedAt + job.batchMs };
  if (order && city)
    return {
      ...about,
      phase: "deliver",
      action: { type: "empireDeliverCity", city, orderIds: [order.id] },
    };
  // No town to serve it (a world without one): the game goes on as usual.
  return null;
}

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
    for (const r of b.recipes)
      if (good in r.outputs) return { type: b.type, recipe: r.code, inputs: r.inputs };
  return null;
}

/**
 * The workshop to build for a good, its raw matter first (P0-06: the brickworks was asked before
 * any clay): up the chain to the first good the house neither makes nor builds.
 */
function firstMakerOf(
  p: EmpirePayload,
  good: string,
  made: (g: string) => boolean,
  depth = 0,
): { type: string; recipe: string; good: string } | null {
  const maker = makerOf(p, good);
  if (!maker) return null;
  if (depth < 3)
    for (const input of Object.keys(maker.inputs)) {
      if (made(input)) continue;
      const before = firstMakerOf(p, input, made, depth + 1);
      if (before) return before;
    }
  return { type: maker.type, recipe: maker.recipe, good };
}

/** The cheapest plot of Venetia the house may buy now, when it has no free tile left. */
function plotToBuy(p: EmpirePayload): NextStep | null {
  const view = p.view;
  if (!view || view.map?.grid !== "square") return null;
  const b = (view.map.buyable ?? []).find(
    (x) => x.region === "veneto" && x.casa <= view.house.casa,
  );
  if (!b || !affordable(p.cash, view.map.sectorCost)) return null;
  return { kind: "plot", cell: b.cell, action: { type: "empireUnlockCell", cell: b.cell } };
}

export function nextStep(p: EmpirePayload, now: number): NextStep {
  const view = p.view;
  if (!view) return { kind: "wait", at: null };
  // 0. The welcome of a new house, before anything else.
  const welcome = welcomeStep(p, now);
  if (welcome) return welcome;
  const ws = view.house.workshops;
  const builds = view.house.builds ?? [];
  const freeSite = builds.length < view.buildSlots;

  // 1. The lots ready.
  // The full workshops aside: their lots wait for room (the first steps, lot 3).
  const lots = ws
    .filter((w) => !view.full?.includes(w.id))
    .reduce((n, w) => n + readyLots(w, now), 0);
  if (lots > 0) return { kind: "collect", lots, action: { type: "empireRelaunchAll" } };
  // 2. A workshop that could run more.
  if (wantsRelaunch(p, now)) return { kind: "relaunch", action: { type: "empireRelaunchAll" } };
  // 2b. A city's orders the stock covers and a vehicle free: « Livrer » (after the map's audit).
  for (const c of view.orders ?? []) {
    const plan = deliveryPlan(p, c.city);
    const first = plan.orders.find((x) => x.o.id === plan.picks[0]);
    if (plan.vehicle && first)
      return {
        kind: "deliver",
        city: c.city,
        good: first.o.good,
        qty: first.o.qty,
        have: first.have,
        pay: plan.pay,
        action: { type: "empireDeliverCity", city: c.city, orderIds: plan.picks },
      };
  }

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
  // 4. A material the house makes nowhere, nor builds: its workshop, its raw matter first.
  const madeOrComing = (good: string) =>
    ws.some((w) => good in (recipeOf(p, w)?.outputs ?? {})) ||
    builds.some(
      (b) =>
        b.kind === "newWorkshop" &&
        good in
          (recipeOf(p, { type: b.workshopType ?? "", recipe: b.recipe ?? "" })?.outputs ?? {}),
    );
  for (const [good] of lacking) {
    if (madeOrComing(good)) continue;
    const maker = firstMakerOf(p, good, madeOrComing);
    if (!maker || !view.newWorkshop || !freeSite) continue;
    // No free tile of its own: a plot first, never a dead end (P0-06).
    if (view.map?.grid === "square" && !freeTileOf(p, "veneto")) {
      const plot = plotToBuy(p);
      if (plot) return plot;
      short = true;
      continue;
    }
    if (!affordable(p.cash, view.newWorkshop.cost)) {
      short = true;
      continue;
    }
    return { kind: "build", ...maker, casa: next?.level ?? 0 };
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
    // On a world of orders, the cities' orders go by « Livrer » (step 2b): the market sells.
    const asked = Boolean(best?.q?.asked) && (view.orders ?? []).length === 0;
    if (best?.q)
      return {
        kind: "sell",
        good: best.good,
        qty: best.n,
        deliver: asked,
        action: asked
          ? { type: "empireDeliver", good: best.good, qty: best.n }
          : { type: "empireSell", good: best.good, qty: best.n },
      };
  }
  // 6b. A workshop stopped for want of an input nobody makes: a lot of it bought (P0-06).
  for (const w of ws) {
    if (w.job) continue;
    const r = recipeOf(p, w);
    for (const [good, n] of Object.entries(r?.inputs ?? {})) {
      const have = p.stock[good] ?? 0;
      if (have >= n || madeOrComing(good)) continue;
      const q = p.market.find((m) => m.region === "veneto" && m.good === good);
      if (!q || q.depthLeft <= 0) continue;
      const qty = Math.min(n - have, q.depthLeft);
      if (!affordable(p.cash, (BigInt(q.price) * BigInt(qty)).toString())) continue;
      return {
        kind: "buy",
        good,
        qty,
        type: w.type,
        action: { type: "empireBuy", good, qty },
      };
    }
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
    // A vehicle back at its fondaco.
    ...(view.vehicles?.mine ?? []).map((v) => v.legs.at(-1)?.arrivesAt ?? null),
  ].filter((t): t is number => t !== null && t > now);
  return { kind: "wait", at: times.length > 0 ? Math.min(...times) : null };
}

/**
 * Lorenzo guides the founding (decision of the owner, 31 October 2026): until the Casa 2 his next
 * step and its gold button lead the first gestures; past it he withdraws, and the player plays.
 */
export function inTutorial(p: EmpirePayload): boolean {
  // Lorenzo leads the house to the Porta's level (the players' audit, P0-06: he went at the Casa 2).
  return (p.view?.house.casa ?? 1) < 4;
}
