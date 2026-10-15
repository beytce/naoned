import { useState } from "react";
import { ResourceIcon } from "../art/resources.js";
import { fr } from "../i18n.js";
import { Badge, Label, Segmented, Slab, clock } from "../ui.js";
import { have } from "./Comptoir.js";
import type { GameProps } from "./Game.js";
import { d, minutesLabel } from "./format.js";
import { capacityOf, total, vehicleName } from "./roadKit.js";
import type { DeliveryOrderView, RoadView, VehicleView } from "./types.js";

/**
 * Loading a cart, as on a space station's dock: the cargo list (tick the orders to load, the hold
 * fills); the map then sends it, with a short countdown to change one's mind.
 */

const t = () => fr.game.cargo;

/** The orders of a load, as they stand on today's board (gone ones dropped). */
export function loadOrders(road: RoadView, ids: string[]): DeliveryOrderView[] {
  return ids
    .map((id) => road.orders.find((o) => o.id === id))
    .filter((o): o is DeliveryOrderView => !!o && o.status === "open");
}

/** What a load weighs, earns and where it goes. */
export function loadSummary(props: GameProps, v: VehicleView, orders: DeliveryOrderView[]) {
  const units = orders.reduce((n, o) => n + o.quantity, 0);
  const value = orders.reduce((a, o) => a + total(o), 0n);
  const city = orders[0]?.city ?? null;
  const minutes = orders[0]?.minutes[v.type] ?? null;
  return { units, capacity: capacityOf(props, v), value, city, minutes };
}

/** Why an order cannot join this load (null: it can). */
function refusal(
  props: GameProps,
  v: VehicleView,
  load: DeliveryOrderView[],
  o: DeliveryOrderView,
): string | null {
  const max = props.catalog.road?.maxOrdersPerLoad ?? 1;
  const s = loadSummary(props, v, load);
  if (o.minutes[v.type] === null || o.minutes[v.type] === undefined) return t().why.noRoad;
  if (s.city && o.city !== s.city) return t().why.otherCity(props.names.city(s.city));
  if (load.length >= max) return t().why.full(max);
  if (s.units + o.quantity > s.capacity) return t().why.heavy;
  const loaded = load.filter((x) => x.resource === o.resource).reduce((n, x) => n + x.quantity, 0);
  const stock = have(props.view, o.resource) - loaded;
  if (stock < o.quantity) return t().why.stock(Math.max(0, stock), o.quantity);
  return null;
}

/** The hold of a vehicle: a gauge of units, like the transport's 0 / 1. */
export function HoldGauge({ units, capacity }: { units: number; capacity: number }) {
  const share = capacity > 0 ? Math.min(1, units / capacity) : 0;
  return (
    <span className="flex min-w-0 flex-1 items-center gap-2">
      <span className="relative h-2.5 flex-1 overflow-hidden rounded-full bg-night ring-1 ring-line">
        <span
          className="absolute inset-y-0 left-0 rounded-full bg-lagoon transition-all duration-300"
          style={{ width: `${share * 100}%` }}
        />
      </span>
      <span className="font-mono text-xs tabular-nums text-cream">
        {units} / {capacity}
      </span>
    </span>
  );
}

type Sort = "reward" | "distance" | "city";

/** The cargo list of the depot: tick orders into the vehicle's hold. */
export function CargoSheet({
  props,
  road,
  vehicle,
  load,
  setLoad,
  onReady,
  city,
}: {
  props: GameProps;
  road: RoadView;
  vehicle: VehicleView;
  load: string[];
  setLoad: (ids: string[]) => void;
  onReady: () => void;
  /** Opened from a city of the map: its orders only. */
  city?: string | null;
}) {
  const [sort, setSort] = useState<Sort>("reward");
  const loaded = loadOrders(road, load);
  const s = loadSummary(props, vehicle, loaded);
  const open = road.orders.filter(
    (o) => o.status === "open" && !load.includes(o.id) && (!city || o.city === city),
  );
  const minutes = (o: DeliveryOrderView) => o.minutes[vehicle.type] ?? Number.POSITIVE_INFINITY;
  const sorted = [...open].sort((a, b) => {
    if (sort === "distance") return minutes(a) - minutes(b);
    if (sort === "city") return a.city.localeCompare(b.city) || Number(total(b) - total(a));
    const ta = total(a);
    const tb = total(b);
    return ta === tb ? 0 : ta > tb ? -1 : 1;
  });
  // What fits first: a load is built from the top of the list.
  const rows = [
    ...sorted.filter((o) => refusal(props, vehicle, loaded, o) === null),
    ...sorted.filter((o) => refusal(props, vehicle, loaded, o) !== null),
  ];
  const nextDay = props.catalog.world.startsAt + props.view.day * 86_400_000;
  const row = (o: DeliveryOrderView, inHold: boolean) => {
    const why = inHold ? null : refusal(props, vehicle, loaded, o);
    return (
      <li key={o.id}>
        <button
          type="button"
          data-coach={inHold ? undefined : `cargo-order-${o.id}`}
          disabled={!inHold && why !== null}
          onClick={() => setLoad(inHold ? load.filter((x) => x !== o.id) : [...load, o.id])}
          className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left ring-1 ring-inset transition ${inHold ? "bg-lagoon/15 ring-lagoon/60" : why ? "bg-night-2/60 opacity-50 ring-line/50" : "bg-night-2 ring-line/70 active:scale-[0.99]"}`}
        >
          <span
            className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full ring-2 ${inHold ? "bg-lagoon ring-lagoon" : "ring-cream-dim/60"}`}
          >
            {inHold && <span className="text-[11px] font-black text-night">✓</span>}
          </span>
          <ResourceIcon code={o.resource} size={26} />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold">
              {o.quantity} {props.names.resource(o.resource).toLowerCase()}
              {o.kind !== "city" && (
                <span className="ml-1 align-middle">
                  <Badge tone={o.kind === "urgent" ? "vermilion" : "gold"}>
                    {t().kinds[o.kind] ?? o.kind}
                  </Badge>
                </span>
              )}
            </span>
            <span className="block truncate text-xs text-cream-dim">
              {props.names.city(o.city)}
              {Number.isFinite(minutes(o)) ? ` · ${minutesLabel(minutes(o))}` : ""}
              {why ? ` · ${why}` : ""}
            </span>
          </span>
          <span className="shrink-0 font-display text-base font-extrabold tabular-nums text-gold">
            {d(total(o))}
          </span>
        </button>
      </li>
    );
  };
  return (
    <div className="space-y-3">
      <div className="text-center">
        <h3 className="font-display text-2xl font-extrabold uppercase">{t().title}</h3>
        <p className="label mt-1 text-lagoon">
          {vehicleName(vehicle.type)}
          {city ? ` · ${props.names.city(city)}` : ""}
        </p>
      </div>
      <Segmented<Sort>
        value={sort}
        onChange={setSort}
        options={[
          { value: "reward", label: t().sort.reward },
          { value: "distance", label: t().sort.distance },
          { value: "city", label: t().sort.city },
        ]}
      />
      <ul className="max-h-[42svh] space-y-1.5 overflow-y-auto pr-1">
        {rows.length === 0 && (
          <li className="py-6 text-center text-sm text-cream-dim">
            {t().none(clock(nextDay - props.now))}
          </li>
        )}
        {rows.map((o) => row(o, false))}
      </ul>
      <div className="rounded-2xl bg-night p-3 ring-1 ring-line">
        <div className="flex items-center gap-3">
          <Label>{t().hold}</Label>
          <HoldGauge units={s.units} capacity={s.capacity} />
        </div>
        {loaded.length > 0 ? (
          <ul className="mt-2 space-y-1.5">{loaded.map((o) => row(o, true))}</ul>
        ) : (
          <p className="mt-2 text-center text-xs text-cream-dim">{t().empty}</p>
        )}
      </div>
      <Slab className="w-full" coach="cargo-ready" disabled={loaded.length === 0} onClick={onReady}>
        {s.city ? t().ready(props.names.city(s.city), d(s.value)) : t().pick}
      </Slab>
      <p className="label text-center">{t().nextOrders(clock(nextDay - props.now))}</p>
    </div>
  );
}
