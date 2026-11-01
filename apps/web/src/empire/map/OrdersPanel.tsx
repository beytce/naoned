import { GoodsMark } from "../../art/goods.js";
import { d } from "../../game/format.js";
import { fr } from "../../i18n.js";
import { CloseButton, Slab } from "../../ui.js";
import { regionName } from "../World.js";
import type { EmpireAction, EmpirePayload } from "../types.js";
import {
  type TourDraft,
  orderLeft,
  postLabel,
  tourCities,
  tourLoad,
  tourMinutes,
  tourStock,
  vehicleFor,
} from "./logic.js";

const t = fr.empire.orders;
const goodName = (p: EmpirePayload, code: string) =>
  fr.themeNames.resource[code] ?? p.goods[code] ?? code;

/**
 * The cities' orders and the rounds (after Hades' Star's shipments, 1 November 2026), at the foot
 * of the map: a city touched shows its orders, how far they are filled, and « Charger » on each;
 * a vehicle chosen (or a first order loaded) makes a round, its stops, its load against its hold,
 * its minutes, and the one gold action « Partir ».
 */
export function OrdersPanel({
  p,
  now,
  busy,
  act,
  city,
  tour,
  onTour,
  onClose,
}: {
  p: EmpirePayload;
  now: number;
  busy: boolean;
  act: (a: EmpireAction) => Promise<void>;
  /** The city whose orders are shown. */
  city: string | null;
  tour: TourDraft | null;
  onTour: (tour: TourDraft | null) => void;
  onClose: () => void;
}) {
  const view = p.view;
  if (!view) return null;
  const at = city ? view.orders.find((x) => x.city === city) : null;
  const inReach = tour && city ? tourCities(p, tour.vehicleId).includes(city) : true;
  const vehicle = tour ? view.vehicles.mine.find((v) => v.id === tour.vehicleId) : null;
  const load = tour ? tourLoad(p, tour) : null;
  const name = (code: string) => fr.empire.cityNames[code] ?? code;
  /** What « Charger » would put on board for an order: the round (or a new one) and how many. */
  const plan = (i: number): { draft: TourDraft; n: number } | null => {
    const o = at?.orders[i];
    if (!o || !city) return null;
    const id = tour?.vehicleId ?? vehicleFor(p, city, now, o.good);
    if (!id) return null;
    const draft: TourDraft = tour ?? { vehicleId: id, stops: [], focus: city };
    const { load: carried, hold } = tourLoad(p, draft);
    const n = Math.min(orderLeft(p, draft, city, i), tourStock(p, draft, o.good), hold - carried);
    return { draft, n };
  };
  const load1 = (i: number) => {
    const x = plan(i);
    if (!x || x.n <= 0 || !city) return;
    onTour({
      ...x.draft,
      focus: city,
      stops: [...x.draft.stops, { city, order: i, qty: x.n }],
    });
  };
  return (
    <section
      className="pointer-events-auto w-full border-t border-line bg-night-2 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 shadow-xl shadow-black/50 lg:mb-4 lg:w-[30rem] lg:rounded-2xl lg:border"
      data-orders-panel={city ?? ""}
      data-touring={tour ? tour.vehicleId : undefined}
    >
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <h3 className="font-place text-sm font-bold uppercase tracking-[0.12em] text-cream">
            {city ? name(city) : t.round}
          </h3>
          <p className="text-xs text-cream-dim">
            {city && at
              ? t.cityLine(regionName(at.region), at.size, Math.round(at.fillBps / 100))
              : city
                ? t.outOfReach
                : vehicle
                  ? t.chooseCity(postLabel(p, vehicle.at, regionName))
                  : ""}
          </p>
        </div>
        <CloseButton onClick={tour ? () => onTour(null) : onClose} />
      </div>
      {at && (
        <ul className="mt-2 space-y-1.5" data-city-orders={city ?? ""}>
          {at.orders.map((o, i) => {
            const left = orderLeft(p, tour, at.city, i);
            const x = plan(i);
            const can = left > 0 && inReach && (x?.n ?? 0) > 0;
            // Why not: no free vehicle in reach, or nothing of it at the counter.
            const why = !inReach || !x ? t.noVehicle : (x.n ?? 0) <= 0 ? t.noStock : null;
            return (
              <li
                // biome-ignore lint/suspicious/noArrayIndexKey: an order is its place in the city's
                key={i}
                className="flex items-center gap-2 text-sm text-cream"
                data-order={`${at.city}:${i}`}
              >
                <GoodsMark code={o.good} size={22} covered={o.filled >= o.qty} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate">{goodName(p, o.good)}</span>
                  <span className="block text-xs text-cream-dim">
                    {t.filled(o.filled, o.qty)} · {t.unit(d(o.unit))}
                    {left > 0 && why ? ` · ${why}` : ""}
                  </span>
                </span>
                {left > 0 ? (
                  <Slab size="sm" tone="ghost" disabled={!can || busy} onClick={() => load1(i)}>
                    {t.load}
                  </Slab>
                ) : (
                  <span className="text-xs font-semibold text-lagoon">{t.done}</span>
                )}
              </li>
            );
          })}
        </ul>
      )}
      {tour && load && (
        <div className="mt-3 space-y-2 border-t border-line/60 pt-2" data-tour-bar>
          <div className="flex flex-wrap gap-1.5">
            {tour.stops.map((s, i) => {
              const good = view.orders.find((x) => x.city === s.city)?.orders[s.order]?.good ?? "";
              return (
                <button
                  // biome-ignore lint/suspicious/noArrayIndexKey: a stop is its place in the round
                  key={i}
                  type="button"
                  data-tour-stop={i}
                  onClick={() => onTour({ ...tour, stops: tour.stops.filter((_, j) => j !== i) })}
                  className="flex items-center gap-1 rounded-full px-2 py-1 text-xs text-cream ring-1 ring-gold/60"
                >
                  <GoodsMark code={good} size={14} /> {name(s.city)} ×{s.qty} ✕
                </button>
              );
            })}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-cream-dim" data-tour-load>
              {t.load_(load.load, load.hold)} ·{" "}
              {t.minutes(Math.max(1, Math.round(tourMinutes(p, tour))))}
            </span>
            <Slab
              size="md"
              tone="gold"
              className="ml-auto"
              busy={busy}
              disabled={tour.stops.length === 0}
              onClick={() =>
                void act({ type: "empireTour", vehicleId: tour.vehicleId, stops: tour.stops }).then(
                  () => onTour(null),
                )
              }
            >
              {t.go}
            </Slab>
          </div>
        </div>
      )}
    </section>
  );
}
