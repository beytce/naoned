import { useEffect, useState } from "react";
import { GoodsMark } from "../../art/goods.js";
import { ChoiceCard, Dock, PlaceHeader, TimeRing, siblingOf } from "../../dock.js";
import { d, duration, hourOf } from "../../game/format.js";
import { Icon } from "../../game/map/icons.js";
import { fr } from "../../i18n.js";
import { Slab, clock } from "../../ui.js";
import { regionName } from "../World.js";
import { buildingName, recipeOf, workshopStatus } from "../logic.js";
import type { EmpirePayload } from "../types.js";
import { deliveryPlan, hopSeconds, placePoint } from "./logic.js";

const t = () => fr.empire.orders;
const goodName = (p: EmpirePayload, code: string) =>
  fr.themeNames.resource[code] ?? p.goods[code] ?? code;

/** The towns with orders, in the view's order: the neighbours of ‹ ›. */
export function citiesWithOrders(p: EmpirePayload): string[] {
  return (p.view?.orders ?? []).filter((x) => x.orders.length > 0).map((x) => x.city);
}

/** The workshops that make a good (its recipe's outputs), the readiest first. */
export function makersOf(p: EmpirePayload, good: string, now: number) {
  const rank = { ready: 0, running: 1, idle: 2, blocked: 3 } as const;
  return (p.view?.house.workshops ?? [])
    .filter((ws) => (recipeOf(p, ws)?.outputs[good] ?? 0) > 0)
    .map((ws) => ({ ws, s: workshopStatus(p, ws, now) }))
    .sort((a, b) => rank[a.s.state] - rank[b.s.state]);
}

/**
 * A city touched (docs/plan-dock.md, lot 4; design of 4 November 2026): the dock at half height,
 * the vehicle's road drawn on the map before it leaves; the orders as crates ticked at a touch
 * (those the stock covers chosen at once, the best paid first); a crate the stock does not cover
 * opens what lacks and the two ways to it (the workshop that makes it, the market). One gold
 * « Livrer »; the neighbours with orders at ‹ ›.
 */
export function OrdersPanel({
  p,
  now,
  busy,
  city,
  onDeliver,
  onClose,
  onCity,
  onWorkshop,
  onOpen,
  onPlan,
}: {
  p: EmpirePayload;
  now: number;
  busy: boolean;
  city: string;
  /** Sends the orders chosen (the server picks the vehicle, as the plan shows it). */
  onDeliver: (orderIds: string[], vehicleId: string | null) => void;
  onClose: () => void;
  /** Another town with orders (‹ ›). */
  onCity: (code: string) => void;
  /** The workshop that makes what lacks. */
  onWorkshop: (id: string) => void;
  /** A sheet (the market, the production). */
  onOpen: (sheet: string) => void;
  /** The road the vehicle would take, for the map to draw (null: none). */
  onPlan: (road: { from: string; to: string } | null) => void;
}) {
  const view = p.view;
  // The orders the player took out (all the others the stock covers go).
  const [out, setOut] = useState<Set<string>>(new Set());
  const [lack, setLack] = useState<string | null>(null);
  // biome-ignore lint/correctness/useExhaustiveDependencies: a new city, a new choice
  useEffect(() => {
    setOut(new Set());
    setLack(null);
  }, [city]);
  const at = view?.orders.find((x) => x.city === city);
  const open = at?.orders ?? [];
  const chosen = new Set(open.filter((o) => !out.has(o.id)).map((o) => o.id));
  const plan = deliveryPlan(p, city, chosen);
  const from = plan.vehicle?.at ?? null;
  // The road shown on the map while the dock is open.
  useEffect(() => {
    onPlan(from && !lack ? { from, to: `city:${city}` } : null);
  }, [from, city, lack, onPlan]);
  useEffect(() => () => onPlan(null), [onPlan]);
  if (!view) return null;
  const name = fr.empire.cityNames[city] ?? city;
  const picked = new Set(plan.picks);
  const toggle = (id: string) =>
    setOut((was) => {
      const next = new Set(was);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const a = from ? placePoint(p, from) : null;
  const b = placePoint(p, `city:${city}`);
  const seconds = a && b ? hopSeconds(p, a, b) : null;
  const vehicleName = plan.vehicle
    ? (fr.empire.vehicleNames[plan.vehicle.type] ?? plan.vehicle.type)
    : "";
  const why =
    plan.reason === "stock"
      ? t().blockStock
      : plan.reason === "busy"
        ? plan.freeAt
          ? t().blockBusy(hourOf(plan.freeAt))
          : t().blockBusyNone
        : plan.reason === "none"
          ? t().blockNone
          : null;
  const ring = citiesWithOrders(p);
  const lacking = lack ? plan.orders.find((x) => x.o.id === lack) : undefined;
  return (
    <Dock onClose={onClose} label={name} attrs={{ "data-orders-panel": city }}>
      <PlaceHeader
        title={name}
        sub={
          lacking
            ? t().forCity(name)
            : at
              ? at.nextAt === null
                ? t().full
                : t().renews(hourOf(at.nextAt))
              : t().outOfReach
        }
        onBack={lacking ? () => setLack(null) : undefined}
        siblings={
          !lacking && ring.length > 1
            ? {
                index: Math.max(0, ring.indexOf(city)),
                count: ring.length,
                onPrev: () => onCity(siblingOf(ring, city, -1) ?? city),
                onNext: () => onCity(siblingOf(ring, city, 1) ?? city),
              }
            : undefined
        }
        onClose={onClose}
      />
      {at && regionName(at.region) && !lacking && (
        <p className="-mt-2 text-xs text-cream-dim">
          {t().cityLine(regionName(at.region), at.size, open.length, at.cap)}
        </p>
      )}
      <div key={lack ?? "orders"} className="dock-view flex flex-col gap-3">
        {lacking ? (
          <Lack
            p={p}
            now={now}
            good={lacking.o.good}
            qty={lacking.o.qty}
            have={lacking.have}
            pay={lacking.o.pay}
            onWorkshop={onWorkshop}
            onOpen={onOpen}
          />
        ) : !at ? null : open.length === 0 ? (
          <p className="text-sm text-cream-dim">{t().none}</p>
        ) : (
          <>
            <ul className="grid grid-cols-3 gap-2.5" data-city-orders={city}>
              {plan.orders.map(({ o, have, covered }) => {
                const on = picked.has(o.id);
                return (
                  <li key={o.id}>
                    <ChoiceCard
                      selected={on}
                      onClick={() => (covered ? toggle(o.id) : setLack(o.id))}
                      className={`h-32 w-full flex-col items-center justify-center gap-1 ${
                        covered ? "" : "border-2 border-dashed border-edge !bg-night !ring-0"
                      } ${on ? "!bg-gold/10 !ring-gold" : ""}`}
                      attrs={{
                        "data-order": o.id,
                        "data-picked": on ? "" : undefined,
                        "data-lacking": covered ? undefined : "",
                      }}
                      label={`${goodName(p, o.good)} × ${o.qty}`}
                    >
                      <GoodsMark code={o.good} size={40} covered={covered} />
                      <span className="font-display text-base font-extrabold tabular-nums">
                        ×{o.qty}
                      </span>
                      {covered ? (
                        <span className="font-display text-sm font-bold tabular-nums text-gold">
                          {d(o.pay)}
                        </span>
                      ) : (
                        <span className="text-xs text-cream-dim">{t().lack(o.qty - have)}</span>
                      )}
                    </ChoiceCard>
                  </li>
                );
              })}
            </ul>
            {plan.vehicle ? (
              <div className="flex flex-col gap-1.5" data-deliver>
                <Slab
                  size="lg"
                  className="w-full"
                  busy={busy}
                  onClick={() => onDeliver(plan.picks, plan.vehicle?.id ?? null)}
                >
                  {t().deliver(plan.picks.length, d(plan.pay.toString()))}
                </Slab>
                <p className="text-center text-xs text-cream-dim">
                  {seconds !== null ? t().route(vehicleName, duration(seconds * 1_000)) : null}
                </p>
              </div>
            ) : why ? (
              <p className="rounded-2xl bg-night px-3 py-2.5 text-sm text-cream-dim" data-why>
                {why}
              </p>
            ) : null}
          </>
        )}
      </div>
    </Dock>
  );
}

/** What lacks for an order: have / need as pips, and the two ways to it. */
function Lack({
  p,
  now,
  good,
  qty,
  have,
  pay,
  onWorkshop,
  onOpen,
}: {
  p: EmpirePayload;
  now: number;
  good: string;
  qty: number;
  have: number;
  pay: string;
  onWorkshop: (id: string) => void;
  onOpen: (sheet: string) => void;
}) {
  const makers = makersOf(p, good, now);
  const maker = makers[0];
  const pips = Math.min(qty, 12);
  const full = Math.round((Math.min(have, qty) / Math.max(1, qty)) * pips);
  return (
    <div className="flex flex-col gap-3" data-lack={good}>
      <div className="flex items-center gap-3">
        <GoodsMark code={good} size={40} covered={false} />
        <p className="flex-1 text-base font-bold">
          {goodName(p, good)} ×{qty} · <span className="text-gold">{d(pay)}</span>
        </p>
      </div>
      <div className="flex flex-col gap-2 rounded-2xl bg-night p-3.5">
        <div className="flex gap-1" aria-hidden="true">
          {Array.from({ length: pips }, (_, i) => (
            <span
              // biome-ignore lint/suspicious/noArrayIndexKey: a pip is its place
              key={i}
              className={`h-3.5 flex-1 rounded ${i < full ? "bg-lagoon" : "border-[1.5px] border-dashed border-edge"}`}
            />
          ))}
        </div>
        <div className="flex justify-between text-sm">
          <span>{t().haveNeed(have)}</span>
          <span className="text-vermilion">{t().lackOf(qty - have)}</span>
        </div>
      </div>
      <p className="label text-cream-dim">{t().twoWays}</p>
      <div className="flex min-h-16 items-center gap-3 rounded-2xl bg-night-3 px-3.5 py-2.5">
        {maker && maker.s.state === "running" ? (
          <TimeRing progress={maker.s.progress} size={36} />
        ) : (
          <span className="text-cream-dim [&_svg]:h-7 [&_svg]:w-7">{Icon.workshops()}</span>
        )}
        <span className="flex flex-1 flex-col">
          <span className="text-sm font-bold">
            {maker ? t().madeBy(buildingName(p, maker.ws.type)) : t().madeNone}
          </span>
          {maker && (
            <span className="text-xs text-cream-dim">
              {maker.s.state === "running"
                ? fr.empire.dock.running(clock(maker.s.left))
                : maker.s.state === "ready"
                  ? fr.empire.orbit.ready
                  : maker.s.state === "blocked"
                    ? fr.empire.dock.waits(goodName(p, maker.s.resource))
                    : fr.empire.dock.idle}
            </span>
          )}
        </span>
      </div>
      <button
        type="button"
        onClick={() => onOpen("market")}
        className="flex min-h-14 items-center gap-3 rounded-2xl px-3.5 py-2 text-left ring-1 ring-inset ring-edge active:scale-[0.98] [&>svg]:h-6 [&>svg]:w-6"
        data-lack-market
      >
        <span className="[&_svg]:h-6 [&_svg]:w-6">{Icon.rialto()}</span>
        <span className="flex flex-1 flex-col">
          <span className="text-sm font-semibold">{t().buyAt}</span>
          <span className="text-xs text-cream-dim">{t().buyText}</span>
        </span>
        <span className="text-cream-dim [&_svg]:h-4 [&_svg]:w-4">{Icon.chevronRight()}</span>
      </button>
      {maker ? (
        <Slab size="lg" className="w-full" onClick={() => onWorkshop(maker.ws.id)}>
          {t().toWorkshop(buildingName(p, maker.ws.type))}
        </Slab>
      ) : (
        <Slab size="lg" className="w-full" onClick={() => onOpen("production")}>
          {t().buildOne}
        </Slab>
      )}
    </div>
  );
}
