import { useEffect, useRef, useState } from "react";
import { ResourceIcon } from "../art/resources.js";
import { fr } from "../i18n.js";
import { Label, Panel, Sheet, Slab, clock } from "../ui.js";
import { have } from "./Comptoir.js";
import type { GameProps } from "./Game.js";
import { d, minutesLabel } from "./format.js";
import type { DeliveryOrderView, DeliveryView, RoadView, VehicleView } from "./types.js";

/** Pieces of the road shared by the map and the list: helpers, the order panel, the garage. */

const t = () => fr.game.road;

export function vehicleName(type: string): string {
  return t().vehicleNames[type] ?? type;
}

export const total = (o: DeliveryOrderView) => BigInt(o.unitPrice) * BigInt(o.quantity);

/** Shortest road time of an order with the merchant's own vehicles (for sorting and display). */
export function bestMinutes(o: DeliveryOrderView, owned: string[]): number {
  const all = Object.entries(o.minutes)
    .filter(([type]) => owned.length === 0 || owned.includes(type))
    .map(([, m]) => m)
    .filter((m): m is number => m !== null);
  return all.length > 0 ? Math.min(...all) : Number.POSITIVE_INFINITY;
}

/** Where a delivery stands on its road: 0 at the depot, 1 at the city, back to 0. */
export function roadPosition(dv: DeliveryView, now: number): number {
  if (now <= dv.arriveAt) {
    // Halted by an ambush waiting for an answer: it stays mid-way.
    if (dv.attack?.pending) return 0.5;
    return (now - dv.departAt) / Math.max(1, dv.arriveAt - dv.departAt);
  }
  return 1 - (now - dv.arriveAt) / Math.max(1, dv.backAt - dv.arriveAt);
}

/**
 * Server time, refreshed on every frame while `active` (vehicles on the road glide instead of
 * jumping once a second). Follows the game's clock, which ticks every second.
 */
export function useSmoothNow(now: number, active: boolean): number {
  const offset = useRef(now - Date.now());
  offset.current = now - Date.now();
  const [smooth, setSmooth] = useState(now);
  useEffect(() => {
    if (!active) return;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;
    let frame = 0;
    const step = () => {
      setSmooth(Date.now() + offset.current);
      frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [active]);
  return active ? Math.max(smooth, now - 1_000) : now;
}

export function OrderPanel({
  o,
  props,
  onDone,
  vehicleId: preferred,
}: {
  o: DeliveryOrderView;
  props: GameProps;
  onDone: () => void;
  /** Vehicle chosen beforehand (from the garage), if it fits. */
  vehicleId?: string | null;
}) {
  const road = props.view.road as RoadView;
  const vehicles = props.catalog.road?.vehicles ?? [];
  const capacity = (v: VehicleView) => vehicles.find((x) => x.type === v.type)?.capacity ?? 0;
  const fit = road.vehicles.filter((v) => v.status === "free" && capacity(v) >= o.quantity);
  const [vehicleId, setVehicleId] = useState<string | null>(
    fit.find((v) => v.id === preferred)?.id ?? fit[0]?.id ?? null,
  );
  const route = `${props.view.player.region}:${o.city}`;
  const watched = road.watchedRoutes.includes(route);
  const [escort, setEscort] = useState<string>(watched ? "guards" : "none");
  const stock = have(props.view, o.resource);
  const vehicle = road.vehicles.find((v) => v.id === vehicleId);
  const minutes = vehicle ? o.minutes[vehicle.type] : null;
  const escorts = ["none", ...Object.keys(props.catalog.road?.escorts ?? {})];
  return (
    <div className="space-y-4">
      <div>
        <p className="label text-lagoon">{t().kinds[o.kind]}</p>
        <h3 className="mt-1 font-display text-xl font-extrabold uppercase">
          {o.quantity} {props.names.resource(o.resource).toLowerCase()} → {props.names.city(o.city)}
        </h3>
        <p className="mt-2 text-sm">
          {t().sheet.payment} : <span className="font-bold text-gold">{d(total(o))}</span>
        </p>
      </div>

      {watched && (
        <p className="rounded-xl bg-vermilion/15 p-3 text-sm text-vermilion ring-1 ring-vermilion/60">
          ⚔ {t().watchedWarning}
        </p>
      )}

      <div className="space-y-2">
        <Label>{t().sheet.vehicle}</Label>
        {fit.length === 0 && <p className="text-sm text-cream-dim">{t().sheet.noVehicle}</p>}
        {fit.map((v) => (
          <button
            key={v.id}
            type="button"
            onClick={() => setVehicleId(v.id)}
            className={`flex w-full items-center justify-between rounded-xl border px-3 py-2.5 text-left text-sm ${vehicleId === v.id ? "border-gold bg-gold/10" : "border-line bg-night-3"}`}
          >
            <span className="font-semibold">{vehicleName(v.type)}</span>
            <span className="label">
              {t().capacity(capacity(v))} ·{" "}
              {o.minutes[v.type] !== null ? t().oneWay(minutesLabel(o.minutes[v.type] ?? 0)) : "—"}
            </span>
          </button>
        ))}
      </div>

      <div className="space-y-2">
        <Label>{t().sheet.escort}</Label>
        {escorts.map((e) => (
          <button
            key={e}
            type="button"
            onClick={() => setEscort(e)}
            className={`flex w-full items-center justify-between rounded-xl border px-3 py-2.5 text-left text-sm ${escort === e ? "border-gold bg-gold/10" : "border-line bg-night-3"}`}
          >
            <span className="font-semibold">{t().sheet.escorts[e] ?? e}</span>
            <span className="label text-right">
              {e !== "none" && `${t().sheet.escortCost(d(o.escorts[e] ?? "0"))} · `}
              {t().sheet.chance(Math.round((road.ambushChance[e] ?? 0) / 100))}
            </span>
          </button>
        ))}
      </div>

      {stock < o.quantity && (
        <p className="text-sm text-vermilion">{t().sheet.missing(o.quantity - stock)}</p>
      )}
      <Slab
        size="lg"
        className="w-full"
        disabled={props.busy || !vehicleId || stock < o.quantity || o.status !== "open"}
        onClick={async () => {
          if (!vehicleId) return;
          const ok = await props.act({
            type: "dispatchDelivery",
            orderId: o.id,
            vehicleId,
            escort,
          });
          if (ok) onDone();
        }}
      >
        {t().sheet.go}
        {minutes ? ` · ${minutesLabel(minutes)}` : ""}
      </Slab>
    </div>
  );
}

export function UnderwayCard({ dv, props }: { dv: DeliveryView; props: GameProps }) {
  const city = props.names.city(dv.route.split(":")[1] ?? "");
  const pending = dv.attack?.pending === true && props.now <= (dv.attack?.reactBy ?? 0);
  const taken = Object.values(dv.attack?.taken ?? {}).reduce((a, b) => a + b, 0);
  return (
    <Panel glow={pending ? "vermilion" : undefined} className="p-3">
      <div className="flex items-center gap-3">
        <ResourceIcon code={dv.resource} size={32} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-sm font-extrabold uppercase">
            {dv.loaded} → {city}
          </p>
          <p className="label mt-1">
            {pending
              ? `${t().ambushed} ${clock((dv.attack?.reactBy ?? 0) - props.now)}`
              : props.now < dv.arriveAt
                ? t().arrivesIn(clock(dv.arriveAt - props.now))
                : t().backHome(clock(dv.backAt - props.now))}
          </p>
          {dv.outcome !== "en_route" && (
            <p className="mt-1 text-xs text-lagoon">
              {dv.attack?.success ? t().robbed(taken) : t().arrived(d(dv.paid ?? dv.payment))}
            </p>
          )}
          {dv.attack?.success === false && (
            <p className="mt-1 text-xs text-lagoon">{t().repelled}</p>
          )}
        </div>
        {pending && (
          <Slab
            tone="vermilion"
            size="sm"
            disabled={props.busy}
            onClick={() => props.act({ type: "reactToAmbush", deliveryId: dv.id })}
          >
            {t().react}
          </Slab>
        )}
      </div>
    </Panel>
  );
}

/** The cartwright: vehicles for sale, their capacity, upkeep and cost. */
export function BuyVehicleSheet({
  props,
  open,
  onClose,
}: { props: GameProps; open: boolean; onClose: () => void }) {
  const types = props.catalog.road?.vehicles ?? [];
  const max = props.catalog.road?.maxVehicles ?? 0;
  return (
    <Sheet open={open} onClose={onClose}>
      <div className="space-y-3">
        <h3 className="font-display text-xl font-extrabold uppercase">{t().buyTitle}</h3>
        <p className="text-sm text-cream-dim">{t().maxVehicles(max)}</p>
        {types.map((v) => (
          <Panel key={v.type} className="p-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-display font-extrabold uppercase">{vehicleName(v.type)}</p>
                <p className="label mt-1">
                  {t().capacity(v.capacity)} · {t().upkeep(d(v.upkeepPerDay))}
                </p>
                <p className="mt-1 text-sm">
                  {d(v.costDucats)}
                  {Object.entries(v.costMaterials).map(
                    ([r, q]) => ` + ${q} ${props.names.resource(r).toLowerCase()}`,
                  )}
                </p>
              </div>
              <Slab
                size="sm"
                disabled={props.busy}
                onClick={async () => {
                  if (await props.act({ type: "buyVehicle", vehicleType: v.type })) onClose();
                }}
              >
                {t().buy}
              </Slab>
            </div>
          </Panel>
        ))}
      </div>
    </Sheet>
  );
}
