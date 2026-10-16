import { useEffect, useRef, useState } from "react";
import { ResourceIcon } from "../art/resources.js";
import { fr } from "../i18n.js";
import { Badge, Label, Panel, Sheet, Slab, clock } from "../ui.js";
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

/** Units a vehicle carries. */
export function capacityOf(props: GameProps, v: VehicleView): number {
  return props.catalog.road?.vehicles.find((x) => x.type === v.type)?.capacity ?? 0;
}

/** Orders a vehicle could carry now: open, within its capacity, covered by the stock. */
export function canServe(props: GameProps, o: DeliveryOrderView, capacity: number): boolean {
  return (
    o.status === "open" && o.quantity <= capacity && have(props.view, o.resource) >= o.quantity
  );
}

/** The cartwright: vehicles for sale (a mule), their capacity, upkeep and cost. */
export function BuyVehicleSheet({
  props,
  open,
  onClose,
}: { props: GameProps; open: boolean; onClose: () => void }) {
  const road = props.catalog.road;
  const types = (road?.vehicles ?? []).filter((v) => road?.forSale.includes(v.type) ?? true);
  const max = road?.maxVehicles ?? 0;
  return (
    <Sheet open={open} onClose={onClose}>
      <div className="space-y-3">
        <h3 className="font-display text-xl font-extrabold uppercase">{t().buyTitle}</h3>
        <p className="text-sm text-cream-dim">
          {t().maxVehicles(max)} {t().buyHint}
        </p>
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

/** The cartwright's yard: the next step of a vehicle (mule, cart, wagon, great wagon), for ducats. */
export function UpgradeVehicleSheet({
  props,
  vehicle,
  onClose,
}: { props: GameProps; vehicle: VehicleView | null; onClose: () => void }) {
  const types = props.catalog.road?.vehicles ?? [];
  const def = vehicle ? types.find((x) => x.type === vehicle.type) : undefined;
  const next = def?.upgrade ? types.find((x) => x.type === def.upgrade?.to) : undefined;
  const cost = def?.upgrade ? BigInt(def.upgrade.costDucats) : 0n;
  const home = !!vehicle && vehicle.busyUntil <= props.now;
  const afford = BigInt(props.view.cash) >= cost;
  const pct = (bps: number) => Math.round(bps / 100);
  return (
    <Sheet open={!!vehicle} onClose={onClose}>
      {vehicle && def && (
        <div className="space-y-3">
          <h3 className="font-display text-xl font-extrabold uppercase">
            {t().upgradeTitle(vehicleName(vehicle.type))}
          </h3>
          <p className="text-sm text-cream-dim">{t().upgradeHint}</p>
          {next ? (
            <Panel className="space-y-2 p-3">
              <p className="font-display font-extrabold uppercase">
                {t().upgradeTo(vehicleName(next.type))}
              </p>
              <p className="label">
                {t().capacity(def.capacity)} → {t().capacity(next.capacity)}
              </p>
              <p className="label">
                {t().speed(pct(def.speedBps))} → {t().speed(pct(next.speedBps))}
              </p>
              <p className="label">
                {t().upkeep(d(def.upkeepPerDay))} → {t().upkeep(d(next.upkeepPerDay))}
              </p>
              {!home && <p className="text-sm text-cream-dim">{t().away}</p>}
              <Slab
                className="w-full"
                disabled={props.busy || !home || !afford}
                onClick={async () => {
                  if (await props.act({ type: "upgradeVehicle", vehicleId: vehicle.id })) onClose();
                }}
              >
                {t().upgrade(d(cost))}
              </Slab>
            </Panel>
          ) : (
            <p className="text-sm text-gold">{t().maxLevel}</p>
          )}
        </div>
      )}
    </Sheet>
  );
}
