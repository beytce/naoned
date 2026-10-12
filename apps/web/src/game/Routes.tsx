import { useState } from "react";
import { ResourceIcon } from "../art/resources.js";
import { fr } from "../i18n.js";
import { Badge, Big, Label, Panel, Sheet, Slab, Tabs, clock } from "../ui.js";
import { have } from "./Comptoir.js";
import type { GameProps } from "./Game.js";
import { RoadBoard } from "./RoadBoard.js";
import { d, minutesLabel } from "./format.js";
import {
  BuyVehicleSheet,
  OrderPanel,
  UnderwayCard,
  bestMinutes,
  roadPosition,
  total,
  vehicleName,
} from "./roadKit.js";
import { store } from "./store.js";
import type { DeliveryOrderView, RoadView } from "./types.js";

type Sort = "price" | "distance" | "deadline";

const t = () => fr.game.road;

/** Today's board, the vehicles and the roads; the bandits' screen from their opening day. */
/**
 * Map or list: the player's choice once made; until then the list while the guide is on the
 * road (its orders are the guide's targets), the map afterwards.
 */
export function roadViewOf(props: GameProps): "carte" | "liste" {
  const chosen = store.get("roadView");
  if (chosen === "carte" || chosen === "liste") return chosen;
  return props.view.tutorial.includes("sell_city") ? "carte" : "liste";
}

export function Routes(props: GameProps) {
  const road = props.view.road;
  const [tab, setTab] = useState<"livraisons" | "brigands">("livraisons");
  const [view, setView] = useState<"carte" | "liste">(() => roadViewOf(props));
  if (!road) return null;
  return (
    <div className="space-y-5">
      <header className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="label text-lagoon">{t().kicker}</p>
          <h2 className="mt-1 font-display text-xl font-extrabold uppercase leading-tight">
            {t().title}
          </h2>
        </div>
        {(tab === "livraisons" || props.now < road.banditsOpenAt) && (
          <div className="flex shrink-0 rounded-xl border border-line bg-night-2 p-0.5">
            {(["carte", "liste"] as const).map((v) => (
              <button
                key={v}
                type="button"
                aria-pressed={view === v}
                data-coach={`road-view-${v}`}
                onClick={() => {
                  store.set("roadView", v);
                  setView(v);
                }}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${view === v ? "bg-cream text-night" : "text-cream-dim"}`}
              >
                {fr.game.roadMap.view[v]}
              </button>
            ))}
          </div>
        )}
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
        <>
          {view === "carte" ? (
            <>
              <RoadBoard {...props} road={road} />
              <RoadNews {...props} />
            </>
          ) : (
            <>
              <p className="text-sm text-cream-dim">{t().help}</p>
              <Deliveries {...props} road={road} />
            </>
          )}
        </>
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
      <RoadBoard {...props} mode="bandits" banditRoute={route} onBanditRoute={setRoute} />
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
  const underway = road.deliveries.filter((dv) => props.now < dv.backAt);
  const owned = road.vehicles.map((v) => v.type);
  const orders = road.orders
    .filter((o) => o.status === "open" || o.status === "upcoming")
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
        {orders.length === 0 && <p className="text-sm text-cream-dim">{t().empty}</p>}
        {orders.map((o) => (
          <OrderCard key={o.id} o={o} props={props} onOpen={() => setSelected(o.id)} />
        ))}
      </section>

      <RoadNews {...props} />

      <Sheet open={order !== null} onClose={() => setSelected(null)}>
        {order && <OrderPanel o={order} props={props} onDone={() => setSelected(null)} />}
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

function Vehicles(props: GameProps & { road: RoadView }) {
  const [buying, setBuying] = useState(false);
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
      <BuyVehicleSheet props={props} open={buying} onClose={() => setBuying(false)} />
    </section>
  );
}

/** The gazette of the roads: the latest ambushes, without names. */
function RoadNews(props: GameProps) {
  if (props.view.roadNews.length === 0) return null;
  return (
    <section className="space-y-2">
      <Label>{t().newsTitle}</Label>
      {props.view.roadNews.map((n) => (
        <p key={`${n.route}:${n.at}`} className="text-sm text-cream-dim">
          · {t().news(props.names.city(n.route.split(":")[1] ?? ""))}
        </p>
      ))}
    </section>
  );
}
