import { fr } from "../i18n.js";
import type { BuildingView, DeliveryView } from "./types.js";
import { readyOf } from "./workshops.js";

/** A moment of the strip above the doors: when, what, and its colour's role. */
export interface Upcoming {
  key: string;
  at: number;
  label: string;
  /** lagoon: money coming in; info: a batch; muted: the world's clock. */
  tone: "lagoon" | "info" | "muted";
}

/**
 * What comes next on the trade's map, the soonest first and three at most: the next batch of each
 * workshop, the payment of each delivery on its road, the cities' next wave of orders. Nothing that
 * is already there (a batch ready is the counter's ring, not a moment to wait for).
 */
export function upcoming(
  input: {
    buildings: BuildingView[];
    deliveries: DeliveryView[];
    nextWaveAt: number | null;
    building: (type: string) => string;
    city: (code: string) => string;
  },
  now: number,
  max = 3,
): Upcoming[] {
  const t = fr.game.map.timeline;
  const out: Upcoming[] = [];
  for (const b of input.buildings) {
    if (!b.job) continue;
    const done = readyOf(b, now);
    if (done >= b.job.batches) continue;
    out.push({
      key: `b:${b.id}`,
      at: b.job.startedAt + (done + 1) * b.job.batchMs,
      label: t.ready(input.building(b.type)),
      tone: "info",
    });
  }
  for (const d of input.deliveries) {
    if (d.outcome !== "en_route" || d.arriveAt <= now) continue;
    out.push({
      key: `d:${d.id}`,
      at: d.arriveAt,
      label: t.pays(input.city(d.route.split(":")[1] ?? "")),
      tone: "lagoon",
    });
  }
  if (input.nextWaveAt && input.nextWaveAt > now)
    out.push({ key: "wave", at: input.nextWaveAt, label: t.orders, tone: "muted" });
  return out.sort((a, b) => a.at - b.at).slice(0, max);
}
