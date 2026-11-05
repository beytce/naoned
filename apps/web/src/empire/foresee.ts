import { readyLots, recipeOf } from "./logic.js";
import type { EmpireAction, EmpirePayload } from "./types.js";

/**
 * What a gesture will do, shown at once (the gameplay audit, 5 November 2026, P5: no more waiting
 * 200 to 600 ms for the server at each touch). Pure and tested: the payload as the screen should
 * show it the moment the finger lifts, or null when the gesture is not foreseen (the screen then
 * waits for the server, as before). The server's answer replaces it a moment later, and a refusal
 * puts the screen back as it was.
 *
 * Foreseen: a workshop's ready lots taken (one, or all), orders loaded for a town, a Carnet's
 * objective claimed. Only what the player sees change: the goods into the store, the ready lots
 * gone, the town's crates gone, the medal sealed; the rest (the vehicle's road, the relaunch)
 * comes with the answer.
 */
export function foresee(p: EmpirePayload, a: EmpireAction, now: number): EmpirePayload | null {
  const view = p.view;
  if (!view) return null;
  switch (a.type) {
    case "empireRelaunch":
    case "empireRelaunchAll": {
      const stock = { ...p.stock };
      let any = false;
      const workshops = view.house.workshops.map((ws) => {
        if (a.type === "empireRelaunch" && ws.id !== a.workshopId) return ws;
        const ready = readyLots(ws, now);
        const job = ws.job;
        if (ready === 0 || !job) return ws;
        any = true;
        const yieldBps = view.upgrades[ws.id]?.yieldBps ?? 10_000;
        for (const [good, n] of Object.entries(recipeOf(p, ws)?.outputs ?? {}))
          stock[good] = (stock[good] ?? 0) + Math.floor((n * ready * yieldBps) / 10_000);
        // The lots taken: the rest of the queue goes on from where it was.
        return {
          ...ws,
          job:
            job.batches > ready
              ? {
                  ...job,
                  startedAt: job.startedAt + ready * job.batchMs,
                  batches: job.batches - ready,
                }
              : null,
        };
      });
      if (!any) return null;
      return { ...p, stock, view: { ...view, house: { ...view.house, workshops } } };
    }
    case "empireDeliverCity": {
      const at = view.orders.find((o) => o.city === a.city);
      if (!at || !a.orderIds || a.orderIds.length === 0) return null;
      const gone = new Set(a.orderIds);
      return {
        ...p,
        view: {
          ...view,
          orders: view.orders.map((o) =>
            o.city === a.city ? { ...o, orders: o.orders.filter((x) => !gone.has(x.id)) } : o,
          ),
        },
      };
    }
    case "empireClaim": {
      const n = view.carnet.objectives.length;
      const inMain = a.index < n;
      const list = inMain ? view.carnet.objectives : view.carnet.carried;
      const i = inMain ? a.index : a.index - n;
      const o = list[i];
      if (!o || o.claimed || o.progress < o.target) return null;
      const next = list.map((x, k) => (k === i ? { ...x, claimed: true } : x));
      return {
        ...p,
        view: {
          ...view,
          carnet: inMain ? { ...view.carnet, objectives: next } : { ...view.carnet, carried: next },
        },
      };
    }
    default:
      return null;
  }
}
