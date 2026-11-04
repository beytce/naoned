import { useEffect, useState } from "react";
import { GoodsMark } from "../../art/goods.js";
import { d, duration, hourOf } from "../../game/format.js";
import { fr } from "../../i18n.js";
import { CloseButton, Slab } from "../../ui.js";
import { regionName } from "../World.js";
import type { EmpirePayload } from "../types.js";
import { deliveryPlan, hopSeconds, placePoint } from "./logic.js";

const t = fr.empire.orders;
const goodName = (p: EmpirePayload, code: string) =>
  fr.themeNames.resource[code] ?? p.goods[code] ?? code;

/**
 * A city touched (after Hades' Star's planets; « Livrer » from the city, decision of the owner,
 * 3 November 2026): its orders, each a card with its good's mark, its lot, the stock of it and its
 * pay; those the stock covers chosen at once, the best paid first. One gold « Livrer » loads them on
 * the smallest free vehicle that takes them, which leaves at once and comes back alone; else a line
 * says why not, and when.
 */
export function OrdersPanel({
  p,
  busy,
  city,
  onDeliver,
  onClose,
}: {
  p: EmpirePayload;
  busy: boolean;
  city: string;
  /** Sends the orders chosen (the server picks the vehicle, as the plan shows it). */
  onDeliver: (orderIds: string[]) => void;
  onClose: () => void;
}) {
  const view = p.view;
  // The orders the player took out (all the others the stock covers go).
  const [out, setOut] = useState<Set<string>>(new Set());
  // biome-ignore lint/correctness/useExhaustiveDependencies: a new city, a new choice
  useEffect(() => setOut(new Set()), [city]);
  if (!view) return null;
  const at = view.orders.find((x) => x.city === city);
  const name = fr.empire.cityNames[city] ?? city;
  const open = at?.orders ?? [];
  const chosen = new Set(open.filter((o) => !out.has(o.id)).map((o) => o.id));
  const plan = deliveryPlan(p, city, chosen);
  const picked = new Set(plan.picks);
  const toggle = (id: string) =>
    setOut((was) => {
      const next = new Set(was);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  // The way there, from the vehicle's counter (the time on the road, one way).
  const from = plan.vehicle ? placePoint(p, plan.vehicle.at) : null;
  const to = placePoint(p, `city:${city}`);
  const seconds = from && to ? hopSeconds(p, from, to) : null;
  const vehicleName = plan.vehicle
    ? (fr.empire.vehicleNames[plan.vehicle.type] ?? plan.vehicle.type)
    : "";
  // The order nearest to be covered, when some of its good is in: what it still lacks.
  const short = plan.orders
    .filter((x) => !x.covered && x.have > 0 && (!chosen || chosen.has(x.o.id)))
    .sort((a, b) => a.o.qty - a.have - (b.o.qty - b.have))[0];
  const why =
    plan.reason === "stock"
      ? short
        ? t.blockShort(short.o.qty - short.have, goodName(p, short.o.good), short.have, short.o.qty)
        : t.blockStock
      : plan.reason === "busy"
        ? plan.freeAt
          ? t.blockBusy(hourOf(plan.freeAt))
          : t.blockBusyNone
        : plan.reason === "none"
          ? t.blockNone
          : null;
  return (
    <section
      className="pointer-events-auto w-full border-t border-line bg-night-2 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 shadow-xl shadow-black/50 lg:mb-4 lg:w-[30rem] lg:rounded-2xl lg:border"
      data-orders-panel={city}
    >
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <h3 className="font-place text-sm font-bold uppercase tracking-[0.12em] text-cream">
            {name}
          </h3>
          <p className="text-xs text-cream-dim">
            {at ? t.cityLine(regionName(at.region), at.size, open.length, at.cap) : t.outOfReach}
          </p>
        </div>
        <CloseButton onClick={onClose} />
      </div>
      {at && (
        <>
          {open.length === 0 ? (
            <p className="mt-2 text-sm text-cream-dim">{t.none}</p>
          ) : (
            <ul className="mt-2 grid gap-1.5" data-city-orders={city}>
              {plan.orders.map(({ o, have, covered }) => {
                const on = picked.has(o.id);
                const pct = Math.min(100, Math.round((have / Math.max(1, o.qty)) * 100));
                return (
                  <li key={o.id}>
                    <button
                      type="button"
                      className={`flex min-h-[3.25rem] w-full items-center gap-3 rounded-xl border px-3 py-2 text-left transition ${
                        on
                          ? "border-info bg-info/10"
                          : covered
                            ? "border-line bg-night"
                            : "border-line/60 bg-night opacity-75"
                      }`}
                      aria-pressed={on}
                      disabled={!covered}
                      onClick={() => toggle(o.id)}
                      data-order={o.id}
                      data-picked={on ? "" : undefined}
                    >
                      <GoodsMark code={o.good} size={28} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm text-cream">
                          {goodName(p, o.good)} × {o.qty}
                        </span>
                        {/* The stock of it against the lot: full, the order may go. */}
                        <span className="mt-1 flex items-center gap-2">
                          <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-line">
                            <span
                              className={`block h-full rounded-full ${covered ? "bg-lagoon" : "bg-cream-dim/60"}`}
                              style={{ width: `${pct}%` }}
                            />
                          </span>
                          <span className="shrink-0 text-xs tabular-nums text-cream-dim">
                            {covered ? t.inStock(have) : t.lacking(o.qty - have)}
                          </span>
                        </span>
                      </span>
                      <span className="font-display text-sm font-bold tabular-nums text-gold">
                        {d(o.pay)}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
          {open.length > 0 && plan.vehicle ? (
            <div className="mt-3" data-deliver>
              <Slab
                size="md"
                tone="gold"
                className="w-full"
                busy={busy}
                onClick={() => onDeliver(plan.picks)}
              >
                {t.deliver(plan.picks.length, d(plan.pay.toString()))}
              </Slab>
              <p className="mt-1.5 text-center text-xs text-cream-dim">
                {seconds !== null ? t.deliverBy(vehicleName, duration(seconds * 1_000)) : null}
              </p>
            </div>
          ) : open.length > 0 && why ? (
            <p className="mt-3 rounded-xl bg-night px-3 py-2 text-sm text-cream-dim" data-why>
              {why}
            </p>
          ) : null}
          <p className="mt-2 text-xs text-cream-dim" data-renews>
            {at.nextAt === null ? t.full : t.renews(hourOf(at.nextAt))}
          </p>
        </>
      )}
    </section>
  );
}
