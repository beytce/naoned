import { fr } from "../i18n.js";
import type { GameProps, Names } from "./Game.js";
import type { ActionOutcome, PlayerView } from "./types.js";

/**
 * Harvesting every workshop, with or without restarting them: one place for every button and the
 * R key, so that what a button says is what it does (restarting consumes the stock's inputs).
 */
export function harvestAndRestart(props: Pick<GameProps, "act">): Promise<boolean> {
  return props.act({ type: "collectAndRestart" });
}

/** Harvests only: the goods stay in stock, nothing is started. */
export function harvestAll(props: Pick<GameProps, "act">): Promise<boolean> {
  return props.act({ type: "collectAll" });
}

/**
 * What a harvest brought in and what restarting consumed, in one line: « +80 argile · relancé :
 * 8 lots de briques (−80 argile, −16 bois) », and the open orders that ask for a good consumed.
 */
export function harvestSummary(
  o: Extract<ActionOutcome, { kind: "harvest" }>,
  view: PlayerView | null,
  names: Names,
): string {
  const t = fr.game.workshopsSheet;
  const goods = (m: Record<string, number>, sign: string) =>
    Object.entries(m)
      .filter(([, q]) => q > 0)
      .map(([r, q]) => `${sign}${q} ${names.resource(r).toLowerCase()}`)
      .join(", ");
  const parts = [t.harvested(goods(o.harvested, "+"))];
  if (o.started.length > 0) {
    const started = o.started.map((s) =>
      t.restarted(s.batches, names.resource(s.output), goods(s.inputs, "−")),
    );
    parts.push(`${t.restartedLabel} : ${started.join(", ")}`);
  }
  // Open orders of the road that ask for what restarting consumed.
  const consumed = new Set(o.started.flatMap((s) => Object.keys(s.inputs)));
  const waiting: Record<string, number> = {};
  for (const order of view?.road?.orders ?? [])
    if (order.status === "open" && consumed.has(order.resource))
      waiting[order.resource] = (waiting[order.resource] ?? 0) + 1;
  for (const [res, n] of Object.entries(waiting))
    parts.push(t.ordersWaiting(n, names.resource(res)));
  return parts.join(" · ");
}
