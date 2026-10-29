import { fr } from "../i18n.js";
import type { BuildingView, DeliveryView } from "./types.js";
import { readyOf } from "./workshops.js";

/** A moment of the strip above the doors: when, what, and its colour's role. */
export interface Upcoming {
  key: string;
  at: number;
  label: string;
  /** lagoon: money coming in; info: a batch; muted: the world's clock; vermilion: war. */
  tone: "lagoon" | "info" | "muted" | "vermilion";
  /** Its time is in its label (« front 17 h 30 »): no time left under it. */
  plain?: boolean;
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

/**
 * The Conquest's strip of the day (refonte UX lot 8, maquette `Terraferme`), in its order: the
 * merchant's next front to take a cell (« front 17 h 30 »), the evening's battle (« 20 h :
 * enchères puis bataille », point ouvert 1) or the battle under way, the week's end (« fin dim.
 * 14 »). Nothing once the week is closed.
 */
export function terraUpcoming(
  input: {
    fronts: { mine: boolean; takes: { at: number }[] }[];
    battle: { from: number; on: boolean } | null;
    closesAt: number;
    closed: boolean;
  },
  now: number,
  fmt: { hour: (at: number) => string; day: (at: number) => string },
): Upcoming[] {
  if (input.closed) return [];
  const t = fr.game.map.timeline;
  const out: Upcoming[] = [];
  const next = input.fronts
    .filter((f) => f.mine)
    .map((f) => f.takes[0]?.at ?? 0)
    .filter((at) => at > now)
    .sort((a, b) => a - b)[0];
  if (next !== undefined)
    out.push({
      key: "front",
      at: next,
      label: t.front(fmt.hour(next)),
      tone: "vermilion",
      plain: true,
    });
  if (input.battle)
    out.push({
      key: "battle",
      at: now,
      label: input.battle.on ? t.battleOn : t.battle(input.battle.from),
      tone: "vermilion",
      plain: true,
    });
  out.push({
    key: "end",
    at: input.closesAt,
    label: t.end(fmt.day(input.closesAt)),
    tone: "muted",
    plain: true,
  });
  return out;
}
