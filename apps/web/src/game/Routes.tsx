import { useEffect, useState } from "react";
import { ResourceIcon } from "../art/resources.js";
import { fr } from "../i18n.js";
import { Badge, Big, Label, Panel, Sheet, Slab, clock } from "../ui.js";
import { have } from "./Comptoir.js";
import type { GameProps } from "./Game.js";
import { Garage, RoadBoard } from "./RoadBoard.js";
import { d, minutesLabel } from "./format.js";
import {
  BuyVehicleSheet,
  OrderFacts,
  OrderPanel,
  UnderwayCard,
  bestMinutes,
  insightOf,
  total,
} from "./roadKit.js";
import {
  Chip,
  Chips,
  Drawer,
  HelpButton,
  Hud,
  HudBar,
  HudStat,
  Segmented,
  Stage,
  Tray,
  TrayButton,
  TrayStat,
  useDrawer,
} from "./stage.js";
import { store } from "./store.js";
import type { DeliveryOrderView, RoadView } from "./types.js";

type Sort = "gain" | "price" | "distance" | "deadline";
const SORTS: Sort[] = ["gain", "price", "distance", "deadline"];

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

type RoadTab = "commandes" | "enroute" | "garage" | "brigands";

export function Routes(props: GameProps) {
  const road = props.view.road;
  // While the guide leads to an order, the list opens with the section (its targets live there).
  const drawer = useDrawer<RoadTab>("commandes", roadViewOf(props) === "liste");
  const [focus, setFocus] = useState<string | null>(null);
  const [watching, setWatching] = useState<string | null>(null);
  const [buying, setBuying] = useState(false);
  const [help, setHelp] = useState(false);
  // The guide reads whether the orders are on screen.
  const listShown = drawer.open && drawer.tab === "commandes";
  useEffect(() => {
    store.set("roadView", listShown ? "liste" : "carte");
  }, [listShown]);
  if (!road) return null;
  const r = t().frame;
  const open = road.orders.filter((o) => o.status === "open").length;
  const free = road.vehicles.filter((v) => v.status === "free").length;
  const underway = road.deliveries.filter((dv) => props.now < dv.backAt);
  const ambushed = underway.some(
    (dv) => dv.attack?.pending === true && props.now <= (dv.attack?.reactBy ?? 0),
  );
  const nextDay = props.catalog.world.startsAt + props.view.day * 86_400_000;
  const banditsOpen = props.now >= road.banditsOpenAt;
  const watchedDelivery = road.deliveries.find((dv) => dv.id === watching) ?? null;
  const max = props.catalog.road?.maxVehicles ?? 0;
  return (
    <Stage
      label={t().title}
      scene={
        <RoadBoard
          {...props}
          road={road}
          fill
          focus={focus}
          onFocus={setFocus}
          idle={
            <Tray hint={fr.game.cargo.tapDepot}>
              <TrayStat icon="⛟" value={`${free}/${road.vehicles.length}`} caption={r.free} />
              <Slab
                size="sm"
                className="min-w-0 flex-1 whitespace-nowrap !px-2"
                onClick={() => drawer.show("commandes")}
              >
                {r.orders(open)}
              </Slab>
              {road.vehicles.length < max && (
                <TrayButton label={t().buy} onClick={() => setBuying(true)}>
                  <span aria-hidden="true" className="px-0.5 text-base leading-none">
                    +
                  </span>
                </TrayButton>
              )}
            </Tray>
          }
        />
      }
      top={
        <Hud>
          <HudBar>
            <HudStat
              value={open}
              caption={r.toDeliver}
              onClick={() => drawer.show("commandes")}
              label={r.orders(open)}
            />
            <HudStat
              value={underway.length}
              caption={r.underway}
              onClick={() => drawer.show("enroute")}
              label={t().underway}
            />
            <HudStat
              value={`${free}/${road.vehicles.length}`}
              caption={r.free}
              onClick={() => drawer.show("garage")}
              label={t().vehicles}
            />
            <HelpButton onClick={() => setHelp(true)} label={fr.game.stage.help} />
          </HudBar>
          <Chips>
            <Chip>↻ {clock(nextDay - props.now)}</Chip>
            {ambushed && (
              <Chip tone="vermilion" onClick={() => drawer.show("enroute")}>
                {fr.game.domain.ambush}
              </Chip>
            )}
            {road.watchedRoutes.length > 0 && (
              <Chip tone="vermilion">⚔ {r.watched(road.watchedRoutes.length)}</Chip>
            )}
          </Chips>
        </Hud>
      }
      drawer={
        <Drawer<RoadTab>
          {...drawer.props}
          tabs={[
            { key: "commandes", label: r.tabs.commandes, coach: "road-view-liste" },
            { key: "enroute", label: r.tabs.enroute, dot: ambushed },
            { key: "garage", label: r.tabs.garage },
            { key: "brigands", label: r.tabs.brigands },
          ]}
        >
          {drawer.tab === "commandes" && <Deliveries {...props} road={road} />}
          {drawer.tab === "enroute" && (
            <>
              {underway.length === 0 && <p className="text-sm text-cream-dim">{r.noneUnderway}</p>}
              {underway.map((dv) => (
                <UnderwayCard key={dv.id} dv={dv} props={props} />
              ))}
              <RoadNews {...props} />
            </>
          )}
          {drawer.tab === "garage" && (
            <Garage
              props={props}
              road={road}
              focus={focus}
              now={props.now}
              onFocus={(id) => {
                setFocus(id === focus ? null : id);
                drawer.setOpen(false);
              }}
              onWatch={(vehicleId) => {
                const dv = underway.find((x) => x.vehicleId === vehicleId);
                if (dv) setWatching(dv.id);
              }}
              onBuy={() => setBuying(true)}
            />
          )}
          {drawer.tab === "brigands" &&
            (banditsOpen ? (
              <Bandits {...props} road={road} />
            ) : (
              <p className="text-sm text-cream-dim">
                {fr.game.bandits.locked(clock(road.banditsOpenAt - props.now))}
              </p>
            ))}
        </Drawer>
      }
    >
      <Sheet open={watchedDelivery !== null} onClose={() => setWatching(null)}>
        {watchedDelivery && (
          <div className="space-y-3 pt-6">
            <UnderwayCard dv={watchedDelivery} props={props} />
          </div>
        )}
      </Sheet>
      <BuyVehicleSheet props={props} open={buying} onClose={() => setBuying(false)} />
      <Sheet open={help} onClose={() => setHelp(false)}>
        <div className="space-y-3 pt-4">
          <p className="label text-lagoon">{t().kicker}</p>
          <h3 className="font-display text-2xl font-extrabold uppercase">{t().title}</h3>
          <p className="text-sm text-cream-dim">{t().help}</p>
          <p className="text-sm text-cream-dim">{fr.game.domain.hint}</p>
        </div>
      </Sheet>
    </Stage>
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
        <p className="mt-2 text-sm text-cream-dim">
          {tb.help(
            rules.maxAttacksPerBand,
            Math.round(rules.takeBps / 100),
            Math.round(rules.keepBps / 100),
          )}
        </p>
        <div className="mt-3 space-y-1 rounded-xl bg-night-3 p-3 text-sm">
          <p className={props.road.infamy > 0 ? "text-vermilion" : "text-cream-dim"}>
            {tb.infamy(props.road.infamy)}
          </p>
          {props.road.infamy > 0 && <p>{tb.bountyOnHead(d(props.road.bountyOnHead))}</p>}
          {BigInt(props.road.bounties) > 0n && (
            <p className="text-lagoon">{tb.bountiesWon(d(props.road.bounties))}</p>
          )}
        </div>
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
            <Segmented
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
  const [sort, setSort] = useState<Sort>(() => {
    const saved = store.get("roadSort") as Sort;
    return SORTS.includes(saved) ? saved : "gain";
  });
  const [selected, setSelected] = useState<string | null>(null);
  const owned = road.vehicles.map((v) => v.type);
  const orders = road.orders
    .filter((o) => o.status === "open" || o.status === "upcoming")
    .sort((a, b) => {
      if (sort === "distance") return bestMinutes(a, owned) - bestMinutes(b, owned);
      if (sort === "deadline") return a.expiresAt - b.expiresAt;
      if (sort === "gain") {
        // What leaves now first, then ducats per hour of road.
        const ia = insightOf(props, a);
        const ib = insightOf(props, b);
        if (ia.deliverable !== ib.deliverable) return ia.deliverable ? -1 : 1;
        const ra = ia.perHour ?? -1n;
        const rb = ib.perHour ?? -1n;
        if (ra !== rb) return ra > rb ? -1 : 1;
      }
      const ta = total(a);
      const tb = total(b);
      return ta === tb ? 0 : ta > tb ? -1 : 1;
    });
  // Shared demand: orders others were faster to take.
  const taken = road.orders.filter((o) => o.status === "taken");
  const done = road.orders.filter((o) => o.status === "done").length;
  const order = road.orders.find((o) => o.id === selected) ?? null;
  return (
    <>
      <section className="space-y-3">
        <Label>
          {orders.length} · {done} {t().done.toLowerCase()}
        </Label>
        <Segmented
          value={sort}
          onChange={(s) => {
            store.set("roadSort", s);
            setSort(s);
          }}
          options={SORTS.map((s) => ({ value: s, label: t().sort[s] }))}
        />
        {road.orders.some((o) => o.shared) && (
          <p className="text-xs text-cream-dim">{t().sharedHelp}</p>
        )}
        {orders.length === 0 && <p className="text-sm text-cream-dim">{t().empty}</p>}
        {orders.map((o) => (
          <OrderCard key={o.id} o={o} props={props} onOpen={() => setSelected(o.id)} />
        ))}
        {taken.length > 0 && (
          <details className="cut border border-line bg-night-2 px-3 py-2">
            <summary className="label cursor-pointer">{t().takenList(taken.length)}</summary>
            <ul className="mt-2 space-y-1 text-sm">
              {taken.map((o) => (
                <li key={o.id} className="flex justify-between gap-2 text-cream-dim">
                  <span className="truncate">
                    {o.quantity} {props.names.resource(o.resource).toLowerCase()} →{" "}
                    {props.names.city(o.city)}
                  </span>
                  <span className="shrink-0">
                    {t().takenBy(props.people[o.takenBy ?? ""] ?? fr.game.anonymous)}
                  </span>
                </li>
              ))}
            </ul>
          </details>
        )}
      </section>

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
      className={`flex w-full items-center gap-3 cut border bg-night-3 p-3 text-left transition active:scale-[0.99] ${o.kind === "doge" || o.kind === "family" ? "border-gold/60" : o.kind === "urgent" ? "border-vermilion/60" : "border-line"} ${upcoming ? "opacity-50" : ""}`}
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
        <OrderFacts o={o} props={props} />
      </div>
      <Big className="shrink-0 text-lg text-gold">{d(total(o))}</Big>
    </button>
  );
}

/** The gazette of the roads: the day's biggest takes on the shared board, the latest ambushes. */
function RoadNews(props: GameProps) {
  const takes = props.view.road?.boardNews ?? [];
  if (props.view.roadNews.length === 0 && takes.length === 0) return null;
  return (
    <section className="space-y-2">
      <Label>{t().newsTitle}</Label>
      {takes.map((n) => (
        <p key={`${n.playerId}:${n.city}:${n.resource}:${n.payment}`} className="text-sm">
          ·{" "}
          {t().take(
            props.people[n.playerId] ?? fr.game.anonymous,
            n.quantity,
            props.names.resource(n.resource).toLowerCase(),
            props.names.city(n.city),
            d(n.payment),
          )}
        </p>
      ))}
      {props.view.roadNews.map((n) => (
        <p key={`${n.route}:${n.at}`} className="text-sm text-cream-dim">
          · {t().news(props.names.city(n.route.split(":")[1] ?? ""))}
        </p>
      ))}
    </section>
  );
}
