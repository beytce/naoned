import { useState } from "react";
import { RoadMap } from "../art/map.js";
import { ResourceIcon } from "../art/resources.js";
import { fr } from "../i18n.js";
import { Badge, Big, Label, Panel, Sheet, Slab, Tabs, clock } from "../ui.js";
import { have } from "./Comptoir.js";
import type { GameProps } from "./Game.js";
import { d, minutesLabel } from "./format.js";
import { store } from "./store.js";
import type { DeliveryOrderView, DeliveryView, RoadView, VehicleView } from "./types.js";

type Sort = "price" | "distance" | "deadline";

const t = () => fr.game.road;

export function vehicleName(type: string): string {
  return t().vehicleNames[type] ?? type;
}

const total = (o: DeliveryOrderView) => BigInt(o.unitPrice) * BigInt(o.quantity);

/** Shortest road time of an order with the merchant's own vehicles (for sorting and display). */
function bestMinutes(o: DeliveryOrderView, owned: string[]): number {
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

/** Today's board, the vehicles and the roads; the bandits' screen from their opening day. */
export function Routes(props: GameProps) {
  const road = props.view.road;
  const [tab, setTab] = useState<"livraisons" | "brigands">("livraisons");
  if (!road) return null;
  return (
    <div className="space-y-5">
      <header>
        <p className="label text-lagoon">{t().kicker}</p>
        <h2 className="mt-1 font-display text-2xl font-extrabold uppercase">{t().title}</h2>
        <p className="mt-2 text-sm text-cream-dim">{t().help}</p>
      </header>
      {props.now < road.banditsOpenAt ? (
        <p className="text-xs text-muted">
          {fr.game.bandits.locked(clock(road.banditsOpenAt - props.now))}
        </p>
      ) : (
        <Tabs
          value={tab}
          onChange={setTab}
          options={[
            { value: "livraisons", label: t().tabs.livraisons },
            { value: "brigands", label: t().tabs.brigands },
          ]}
        />
      )}
      {tab === "livraisons" || props.now < road.banditsOpenAt ? (
        <Deliveries {...props} road={road} />
      ) : (
        <Bandits {...props} road={road} />
      )}
    </div>
  );
}

/**
 * The bandits' screen: a road and a duration, the cost and the rules in plain words, then the
 * bands under way with their attempts and booty.
 */
function Bandits(props: GameProps & { road: RoadView }) {
  const rules = props.catalog.road?.bandits;
  const routes = Object.entries(props.catalog.road?.routes ?? {}).flatMap(([region, cities]) =>
    Object.keys(cities).map((city) => `${region}:${city}`),
  );
  const [route, setRoute] = useState(routes[0] ?? "");
  const [hours, setHours] = useState(rules?.hoursOptions[0] ?? 0);
  if (!rules) return null;
  const tb = fr.game.bandits;
  const cost = BigInt(rules.feePerHour) * BigInt(hours);
  const provisions = Object.entries(rules.provisionsPerHour)
    .filter(([, q]) => q > 0)
    .map(([r, q]) => `${q * hours} ${props.names.resource(r).toLowerCase()}`);
  const label = (r: string) => {
    const [region = "", city = ""] = r.split(":");
    return `${props.names.region(region)} → ${props.names.city(city)}`;
  };
  return (
    <div className="space-y-5">
      <Panel>
        <h3 className="font-display text-lg font-extrabold uppercase">{tb.title}</h3>
        <p className="mt-2 text-sm text-cream-dim">{tb.help}</p>
        <label className="mt-4 block">
          <Label>{tb.route}</Label>
          <select
            value={route}
            onChange={(e) => setRoute(e.target.value)}
            className="mt-1 w-full rounded-xl border border-line bg-night-2 px-3 py-2.5 text-sm"
          >
            {routes.map((r) => (
              <option key={r} value={r}>
                {label(r)}
                {props.road.watchedRoutes.includes(r) ? " ⚔" : ""}
              </option>
            ))}
          </select>
        </label>
        <div className="mt-4">
          <Label>{tb.hours}</Label>
          <div className="mt-1">
            <Tabs
              value={String(hours)}
              onChange={(h) => setHours(Number(h))}
              options={rules.hoursOptions.map((h) => ({
                value: String(h),
                label: tb.hoursLabel(h),
              }))}
            />
          </div>
        </div>
        <p className="mt-4 text-sm">{tb.cost([d(cost), ...provisions].join(" + "))}</p>
        <Slab
          className="mt-4 w-full"
          disabled={props.busy || !route}
          onClick={() => props.act({ type: "postBand", route, hours })}
        >
          {tb.post}
        </Slab>
      </Panel>

      <section className="space-y-2">
        <Label>{tb.mine}</Label>
        {props.road.bands.length === 0 && <p className="text-sm text-cream-dim">{tb.none}</p>}
        {props.road.bands.map((b) => {
          const booty = Object.entries(b.booty).filter(([, q]) => q > 0);
          return (
            <Panel key={b.id} glow={b.collectable ? "gold" : undefined} className="p-3">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-display text-sm font-extrabold uppercase">
                    {label(b.route)}
                  </p>
                  <p className="label mt-1">
                    {b.active
                      ? tb.active(clock(b.endAt - props.now))
                      : b.dispersed
                        ? tb.dispersed
                        : tb.over}{" "}
                    · {tb.attempts(b.attacks, rules.maxAttacksPerBand)}
                  </p>
                  <p className="mt-1 flex flex-wrap items-center gap-2 text-sm">
                    <span className="text-cream-dim">{tb.booty} :</span>
                    {booty.length === 0
                      ? "—"
                      : booty.map(([r, q]) => (
                          <span key={r} className="inline-flex items-center gap-1">
                            <ResourceIcon code={r} size={18} />
                            {q}
                          </span>
                        ))}
                  </p>
                </div>
                {b.collected ? (
                  <span className="label text-lagoon">✓ {tb.collected}</span>
                ) : (
                  b.collectable && (
                    <Slab
                      size="sm"
                      disabled={props.busy}
                      onClick={() => props.act({ type: "collectBooty", bandId: b.id })}
                    >
                      {tb.collect}
                    </Slab>
                  )
                )}
              </div>
            </Panel>
          );
        })}
      </section>
    </div>
  );
}

function Deliveries(props: GameProps & { road: RoadView }) {
  const { road } = props;
  const [sort, setSort] = useState<Sort>(() => (store.get("roadSort") as Sort) || "price");
  const [selected, setSelected] = useState<string | null>(null);
  const [city, setCity] = useState<string | null>(null);
  const region = props.view.player.region;
  const reached = Object.keys(props.catalog.road?.routes[region] ?? {});
  const underway = road.deliveries.filter((dv) => props.now < dv.backAt);
  const owned = road.vehicles.map((v) => v.type);
  const orders = road.orders
    .filter((o) => o.status === "open" || o.status === "upcoming")
    .filter((o) => !city || o.city === city)
    .sort((a, b) => {
      // The Doge's and the family's orders first: they earn more than ducats.
      const star = (o: DeliveryOrderView) => (o.kind === "doge" || o.kind === "family" ? 0 : 1);
      if (star(a) !== star(b)) return star(a) - star(b);
      if (sort === "distance") return bestMinutes(a, owned) - bestMinutes(b, owned);
      if (sort === "deadline") return a.expiresAt - b.expiresAt;
      const ta = total(a);
      const tb = total(b);
      return ta === tb ? 0 : ta > tb ? -1 : 1;
    });
  const done = road.orders.filter((o) => o.status === "done").length;
  const order = road.orders.find((o) => o.id === selected) ?? null;
  const nextDay = props.catalog.world.startsAt + props.view.day * 86_400_000;

  return (
    <>
      <Panel className="overflow-hidden p-0">
        <RoadMap
          region={region}
          regions={props.catalog.regions}
          cities={props.catalog.cities}
          reached={reached}
          watched={road.watchedRoutes}
          selected={city}
          dots={underway.map((dv) => ({
            id: dv.id,
            route: dv.route,
            f: roadPosition(dv, props.now),
            alarm: dv.attack?.pending === true,
          }))}
          onSelect={(c) => setCity(c === city ? null : c)}
        />
      </Panel>

      {underway.length > 0 && (
        <section className="space-y-2">
          <Label>{t().underway}</Label>
          {underway.map((dv) => (
            <UnderwayCard key={dv.id} dv={dv} props={props} />
          ))}
        </section>
      )}

      <Vehicles {...props} road={road} />

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <Label>
            {orders.length} · {done} {t().done.toLowerCase()}
          </Label>
          <span className="label">
            {t().renewIn} {clock(nextDay - props.now)}
          </span>
        </div>
        <Tabs
          value={sort}
          onChange={(s) => {
            store.set("roadSort", s);
            setSort(s);
          }}
          options={(["price", "distance", "deadline"] as const).map((s) => ({
            value: s,
            label: t().sort[s],
          }))}
        />
        {city && (
          <button type="button" className="label text-gold" onClick={() => setCity(null)}>
            {props.names.city(city)} ✕
          </button>
        )}
        {orders.length === 0 && <p className="text-sm text-cream-dim">{t().empty}</p>}
        {orders.map((o) => (
          <OrderCard key={o.id} o={o} props={props} onOpen={() => setSelected(o.id)} />
        ))}
      </section>

      {props.view.roadNews.length > 0 && (
        <section className="space-y-2">
          <Label>{t().newsTitle}</Label>
          {props.view.roadNews.map((n) => (
            <p key={`${n.route}:${n.at}`} className="text-sm text-cream-dim">
              · {t().news(props.names.city(n.route.split(":")[1] ?? ""))}
            </p>
          ))}
        </section>
      )}

      <Sheet open={order !== null} onClose={() => setSelected(null)}>
        {order && <OrderSheet o={order} props={props} onDone={() => setSelected(null)} />}
      </Sheet>
    </>
  );
}

function OrderCard({
  o,
  props,
  onOpen,
}: { o: DeliveryOrderView; props: GameProps; onOpen: () => void }) {
  const road = props.view.road;
  const route = `${props.view.player.region}:${o.city}`;
  const watched = road?.watchedRoutes.includes(route) ?? false;
  const stock = have(props.view, o.resource);
  const minutes = bestMinutes(o, road?.vehicles.map((v) => v.type) ?? []);
  const upcoming = o.status === "upcoming";
  return (
    <button
      type="button"
      onClick={onOpen}
      disabled={upcoming}
      data-coach={`road-order-${o.id}`}
      className={`flex w-full items-center gap-3 rounded-2xl border bg-night-3 p-3 text-left transition active:scale-[0.99] ${o.kind === "doge" || o.kind === "family" ? "border-gold/60" : o.kind === "urgent" ? "border-vermilion/60" : "border-line"} ${upcoming ? "opacity-50" : ""}`}
    >
      <div className="relative shrink-0">
        <ResourceIcon code={o.resource} size={40} />
        <span className="absolute -bottom-1 -right-2 bg-night px-1 font-display text-xs font-extrabold text-gold">
          ×{o.quantity}
        </span>
      </div>
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-center gap-1.5">
          {o.kind !== "city" && (
            <Badge tone={o.kind === "urgent" ? "vermilion" : "gold"}>{t().kinds[o.kind]}</Badge>
          )}
          <span className="truncate font-display text-sm font-extrabold uppercase">
            {props.names.city(o.city)}
          </span>
        </p>
        <p className="label mt-1">
          {Number.isFinite(minutes) ? t().oneWay(minutesLabel(minutes)) : "—"}
          {watched && <span className="text-vermilion"> · ⚔ {t().watched}</span>}
          {o.kind === "urgent" &&
            (upcoming
              ? ` · ${t().opensIn} ${clock(o.opensAt - props.now)}`
              : ` · ${t().closesIn} ${clock(o.expiresAt - props.now)}`)}
        </p>
        {stock < o.quantity && (
          <p className="mt-1 text-xs text-vermilion">{t().sheet.missing(o.quantity - stock)}</p>
        )}
      </div>
      <Big className="shrink-0 text-lg text-gold">{d(total(o))}</Big>
    </button>
  );
}

function OrderSheet({
  o,
  props,
  onDone,
}: { o: DeliveryOrderView; props: GameProps; onDone: () => void }) {
  const road = props.view.road as RoadView;
  const vehicles = props.catalog.road?.vehicles ?? [];
  const capacity = (v: VehicleView) => vehicles.find((x) => x.type === v.type)?.capacity ?? 0;
  const fit = road.vehicles.filter((v) => v.status === "free" && capacity(v) >= o.quantity);
  const [vehicleId, setVehicleId] = useState<string | null>(fit[0]?.id ?? null);
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

function UnderwayCard({ dv, props }: { dv: DeliveryView; props: GameProps }) {
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

function Vehicles(props: GameProps & { road: RoadView }) {
  const [buying, setBuying] = useState(false);
  const types = props.catalog.road?.vehicles ?? [];
  const max = props.catalog.road?.maxVehicles ?? 0;
  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between">
        <Label>{t().vehicles}</Label>
        {props.road.vehicles.length < max && (
          <Slab tone="ghost" size="sm" onClick={() => setBuying(true)}>
            {t().buy}
          </Slab>
        )}
      </div>
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        {props.road.vehicles.map((v) => (
          <div key={v.id} className="rounded-xl bg-night-3 px-3 py-2.5 ring-1 ring-inset ring-line">
            <p className="text-sm font-semibold">{vehicleName(v.type)}</p>
            <p className={`label mt-0.5 ${v.status === "free" ? "text-lagoon" : ""}`}>
              {v.status === "free" ? t().free : t().backIn(clock(v.busyUntil - props.now))}
            </p>
          </div>
        ))}
      </div>
      <Sheet open={buying} onClose={() => setBuying(false)}>
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
                    if (await props.act({ type: "buyVehicle", vehicleType: v.type }))
                      setBuying(false);
                  }}
                >
                  {t().buy}
                </Slab>
              </div>
            </Panel>
          ))}
        </div>
      </Sheet>
    </section>
  );
}
