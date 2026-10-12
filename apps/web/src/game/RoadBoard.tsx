import { useState } from "react";
import { P } from "../art/palette.js";
import { ResourceIcon } from "../art/resources.js";
import {
  CampGlyph,
  CityGlyph,
  DepotGlyph,
  GOODS_COLOUR,
  MAP_H,
  MAP_W,
  PLACES,
  VehicleGlyph,
  VenetoTerrain,
  curvePath,
  partialPath,
  pointOn,
  roadCurve,
} from "../art/veneto.js";
import { fr } from "../i18n.js";
import { Badge, Big, Sheet, clock } from "../ui.js";
import { have } from "./Comptoir.js";
import type { GameProps } from "./Game.js";
import { d, minutesLabel } from "./format.js";
import {
  BuyVehicleSheet,
  OrderFacts,
  OrderPanel,
  UnderwayCard,
  canServe,
  roadPosition,
  total,
  useSmoothNow,
  vehicleName,
} from "./roadKit.js";
import type { DeliveryOrderView, DeliveryView, RoadView, VehicleView } from "./types.js";

const t = () => fr.game.road;
const m = () => fr.game.roadMap;

/** Text with a dark halo, legible on any part of the map. */
function MapText(props: {
  x: number;
  y: number;
  children: string;
  size?: number;
  fill?: string;
  weight?: number;
  anchor?: "start" | "middle" | "end";
  font?: string;
}) {
  return (
    <text
      x={props.x}
      y={props.y}
      textAnchor={props.anchor ?? "middle"}
      fontSize={props.size ?? 9}
      fontWeight={props.weight ?? 700}
      fill={props.fill ?? P.cream}
      fontFamily={props.font ?? "Space Grotesk, sans-serif"}
      stroke={P.night}
      strokeWidth="3"
      strokeLinejoin="round"
      paintOrder="stroke"
    >
      {props.children}
    </text>
  );
}

/** A point of the road away from every city and depot, for its time label. */
function clearSpot(c: NonNullable<ReturnType<typeof roadCurve>>) {
  const places = Object.values(PLACES);
  let best = pointOn(c, 0.55);
  let bestGap = -1;
  for (const t of [0.55, 0.45, 0.65, 0.35, 0.75, 0.3]) {
    const p = pointOn(c, t);
    // Cities carry their name underneath: keep clear of the name too.
    const gap = Math.min(...places.map(([x, y]) => Math.hypot(p.x - x, p.y - (y + 10))));
    if (gap > 32) return p;
    if (gap > bestGap) {
      best = p;
      bestGap = gap;
    }
  }
  return best;
}

/**
 * The map of the roads, played on directly. Cities show their open orders; a tap opens the city
 * (goods, vehicle, escort, departure); vehicles travel their road in real time and come back.
 * In the bandits' mode, a tap on a road chooses where to post a band.
 */
export function RoadBoard(
  props: GameProps & {
    road: RoadView;
    mode?: "deliver" | "bandits";
    /** Bandits' mode: the chosen road and how to change it. */
    banditRoute?: string;
    onBanditRoute?: (route: string) => void;
  },
) {
  const { road } = props;
  const mode = props.mode ?? "deliver";
  const region = props.view.player.region;
  const routes = props.catalog.road?.routes ?? {};
  const types = props.catalog.road?.vehicles ?? [];
  const capacityOf = (v: VehicleView) => types.find((x) => x.type === v.type)?.capacity ?? 0;
  const [city, setCity] = useState<string | null>(null);
  const [focus, setFocus] = useState<string | null>(null);
  const [watching, setWatching] = useState<string | null>(null);
  const [buying, setBuying] = useState(false);

  const underway = road.deliveries.filter((dv) => props.now < dv.backAt);
  const now = useSmoothNow(props.now, underway.length > 0);
  const focused = road.vehicles.find((v) => v.id === focus && v.status === "free") ?? null;
  const ordersOf = (c: string) =>
    road.orders.filter((o) => o.city === c && (o.status === "open" || o.status === "upcoming"));
  const serves = (c: string) =>
    !focused || ordersOf(c).some((o) => canServe(props, o, capacityOf(focused)));
  const myRoutes = Object.keys(routes[region] ?? {}).map((c) => `${region}:${c}`);
  const allRoutes = Object.entries(routes).flatMap(([r, cities]) =>
    Object.keys(cities).map((c) => `${r}:${c}`),
  );
  const drawn = mode === "bandits" ? allRoutes : myRoutes;
  // Time on each road, with the merchant's own fastest vehicle (or the focused one).
  const roadMinutes = (c: string) => {
    const owned = focused ? [focused.type] : [...new Set(road.vehicles.map((v) => v.type))];
    const times = owned
      .map((type) => road.orders.find((o) => o.city === c)?.minutes[type])
      .filter((x): x is number => typeof x === "number");
    if (times.length > 0) return Math.min(...times);
    return routes[region]?.[c];
  };
  const openOrders = road.orders.filter((o) => o.status === "open").length;
  const free = road.vehicles.filter((v) => v.status === "free").length;
  const nextDay = props.catalog.world.startsAt + props.view.day * 86_400_000;
  const watchedDelivery = road.deliveries.find((dv) => dv.id === watching) ?? null;

  return (
    <section className="mx-auto w-full max-w-xl space-y-3">
      <div className="relative overflow-hidden rounded-3xl border border-line bg-night-2 shadow-xl shadow-black/30">
        <svg
          viewBox={`0 0 ${MAP_W} ${MAP_H}`}
          className="block w-full touch-manipulation select-none"
          role="img"
          aria-label={m().label}
        >
          <VenetoTerrain />

          {/* Roads: casing, then the road itself (dashed red where bandits lie in wait). */}
          {drawn.map((route) => {
            const c = roadCurve(route);
            if (!c) return null;
            const [from = "", to = ""] = route.split(":");
            const mine = from === region;
            const watched = road.watchedRoutes.includes(route);
            const chosen = mode === "bandits" ? props.banditRoute === route : city === to;
            const lit = mode === "deliver" && focused !== null && serves(to);
            const dimmed = mode === "deliver" && focused !== null && !serves(to);
            const path = curvePath(c);
            const colour = chosen ? P.gold : watched ? P.vermilion : lit ? P.goldSoft : P.cream;
            return (
              <g key={route} opacity={dimmed ? 0.25 : mode === "bandits" && !mine ? 0.75 : 1}>
                <path d={path} fill="none" stroke={P.night} strokeWidth="6" opacity="0.55" />
                <path
                  d={path}
                  fill="none"
                  stroke={colour}
                  strokeOpacity={chosen || watched || lit ? 0.95 : 0.4}
                  strokeWidth={chosen ? 2.6 : 1.7}
                  strokeDasharray={watched ? "4 4" : "7 5"}
                  strokeLinecap="round"
                  className={watched ? "map-march" : undefined}
                />
                {mode === "bandits" && (
                  // biome-ignore lint/a11y/useKeyWithClickEvents: the road list below the map offers the same choice
                  <path
                    d={path}
                    fill="none"
                    stroke="transparent"
                    strokeWidth="16"
                    pointerEvents="stroke"
                    className="cursor-pointer"
                    onClick={() => props.onBanditRoute?.(route)}
                  />
                )}
              </g>
            );
          })}

          {/* Time on each of the merchant's roads, and the bandits' mark on watched ones. */}
          {mode === "deliver" &&
            myRoutes.map((route) => {
              const c = roadCurve(route);
              const to = route.split(":")[1] ?? "";
              const minutes = roadMinutes(to);
              if (!c || minutes === undefined || (focused && !serves(to))) return null;
              const p = clearSpot(c);
              const watched = road.watchedRoutes.includes(route);
              const label = `${watched ? "⚔ " : ""}${minutesLabel(minutes)}`;
              const w = 8 + label.length * 5;
              return (
                <g key={`time-${route}`} transform={`translate(${p.x} ${p.y})`}>
                  <rect
                    x={-w / 2}
                    y="-7"
                    width={w}
                    height="13"
                    rx="6.5"
                    fill={P.night}
                    stroke={watched ? P.vermilion : P.line}
                    opacity="0.92"
                  />
                  <text
                    y="3"
                    textAnchor="middle"
                    fontSize="7.5"
                    fontFamily="Space Mono, monospace"
                    fill={watched ? P.vermilion : P.cream}
                  >
                    {label}
                  </text>
                </g>
              );
            })}

          {/* The stretch already travelled by each vehicle, in gold. */}
          {underway.map((dv) => {
            const c = roadCurve(dv.route);
            if (!c) return null;
            const f = roadPosition(dv, now);
            const out = now < dv.arriveAt;
            return (
              <path
                key={`trail-${dv.id}`}
                d={out ? partialPath(c, 0, f) : partialPath(c, f, 1)}
                fill="none"
                stroke={dv.attack?.pending ? P.vermilion : P.gold}
                strokeWidth="2.4"
                strokeLinecap="round"
                opacity={out ? 0.85 : 0.35}
              />
            );
          })}

          {/* Depots: the merchant's glows; the others show in the bandits' mode. */}
          {Object.keys(routes).map((r) => {
            const [x, y] = PLACES[r] ?? [0, 0];
            const mine = r === region;
            if (!mine && mode !== "bandits") return null;
            return (
              <g key={`depot-${r}`} transform={`translate(${x} ${y})`} opacity={mine ? 1 : 0.6}>
                <DepotGlyph />
                {mode === "bandits" && (
                  <MapText y={-22} x={0} size={8} fill={P.gold} weight={800}>
                    {props.names.region(r).toUpperCase()}
                  </MapText>
                )}
              </g>
            );
          })}

          {/* Cities: open orders, the Doge's or the family's mark, urgent orders ticking. */}
          {props.catalog.cities.map((cityInfo) => {
            const code = cityInfo.code;
            const [x, y] = PLACES[code] ?? [0, 0];
            const reached = routes[region]?.[code] !== undefined;
            const orders = ordersOf(code);
            const open = orders.filter((o) => o.status === "open");
            const star = open.some((o) => o.kind === "doge" || o.kind === "family");
            const urgent = open
              .filter((o) => o.kind === "urgent")
              .sort((a, b) => a.expiresAt - b.expiresAt)[0];
            const lit = focused !== null && serves(code);
            const dim =
              mode === "deliver" && (!reached || open.length === 0 || (focused !== null && !lit));
            const on = city === code;
            const clickable = mode === "deliver" && reached;
            return (
              // biome-ignore lint/a11y/useKeyWithClickEvents: the list view offers the same orders
              <g
                key={code}
                transform={`translate(${x} ${y})`}
                onClick={() => clickable && setCity(code)}
                className={clickable ? "cursor-pointer" : undefined}
                opacity={dim ? 0.55 : 1}
              >
                <circle r="24" fill="transparent" />
                {!dim && open.length > 0 && <circle r="30" fill="url(#vn-glow)" />}
                {urgent && (
                  <circle
                    r="18"
                    fill="none"
                    stroke={P.vermilion}
                    strokeWidth="2"
                    className="map-pulse"
                  />
                )}
                {(on || lit) && (
                  <circle r="19" fill={P.gold} opacity="0.2" stroke={P.gold} strokeWidth="1.5" />
                )}
                <circle
                  r="15.5"
                  fill={P.night}
                  stroke={on ? P.gold : dim ? P.line : P.goldDeep}
                  strokeWidth="1.8"
                />
                <g transform="translate(0 2.5) scale(1.25)">
                  <CityGlyph dim={dim} />
                </g>
                {open.length > 0 && mode === "deliver" && (
                  <g transform="translate(13 -13)">
                    <circle
                      r="7"
                      fill={star ? P.gold : P.lagoon}
                      stroke={P.night}
                      strokeWidth="1.5"
                    />
                    <text
                      y="2.6"
                      textAnchor="middle"
                      fontSize="8"
                      fontWeight="800"
                      fill={P.night}
                      fontFamily="Archivo Variable, sans-serif"
                    >
                      {open.length}
                    </text>
                  </g>
                )}
                {star && mode === "deliver" && (
                  <text x="-13" y="-8" fontSize="9" fill={P.gold}>
                    ✦
                  </text>
                )}
                <MapText x={0} y={28} size={9} weight={700}>
                  {cityInfo.name}
                </MapText>
                {urgent && mode === "deliver" && (
                  <MapText x={0} y={38} size={7.5} fill={P.vermilion} font="Space Mono, monospace">
                    {`⏱ ${clock(urgent.expiresAt - props.now)}`}
                  </MapText>
                )}
              </g>
            );
          })}

          {/* The merchant's bands: a camp on the road while they lie in wait. */}
          {road.bands
            .filter((b) => b.active)
            .map((b) => {
              const c = roadCurve(b.route);
              if (!c) return null;
              const p = pointOn(c, 0.58);
              return (
                <g key={`camp-${b.id}`} transform={`translate(${p.x} ${p.y})`}>
                  <CampGlyph />
                  <MapText x={0} y={15} size={7} fill={P.vermilion} font="Space Mono, monospace">
                    {clock(b.endAt - props.now)}
                  </MapText>
                </g>
              );
            })}

          {/* Vehicles on the road, there and back, in real time. */}
          {underway.map((dv) => (
            <MovingVehicle
              key={dv.id}
              dv={dv}
              now={now}
              type={road.vehicles.find((v) => v.id === dv.vehicleId)?.type ?? "cart"}
              onOpen={() => setWatching(dv.id)}
            />
          ))}

          {/* What a city paid, rising above it for a few seconds. */}
          {road.deliveries
            .filter(
              (dv) => dv.outcome !== "en_route" && now >= dv.arriveAt && now - dv.arriveAt < 4_000,
            )
            .map((dv) => {
              const [x, y] = PLACES[dv.route.split(":")[1] ?? ""] ?? [0, 0];
              const age = (now - dv.arriveAt) / 4_000;
              return (
                <g
                  key={`paid-${dv.id}`}
                  opacity={1 - age}
                  transform={`translate(${x} ${y - 22 - age * 18})`}
                >
                  <MapText
                    x={0}
                    y={0}
                    size={11}
                    fill={P.gold}
                    weight={800}
                    font="Archivo Variable, sans-serif"
                  >
                    {`+${d(dv.paid ?? dv.payment)}`}
                  </MapText>
                </g>
              );
            })}
        </svg>

        {/* Over the map: what waits today, and when the board renews. */}
        {mode === "deliver" && (
          <div className="pointer-events-none absolute inset-x-3 top-3 flex items-start justify-between gap-2">
            <span className="rounded-full bg-night/85 px-3 py-1.5 text-xs font-semibold text-gold ring-1 ring-gold/40 backdrop-blur">
              {m().hud(openOrders, free)}
            </span>
            <span className="rounded-full bg-night/85 px-3 py-1.5 font-mono text-[10px] text-cream-dim ring-1 ring-line backdrop-blur">
              ↻ {clock(nextDay - props.now)}
            </span>
          </div>
        )}
        {mode === "deliver" && focused && (
          <p className="pointer-events-none absolute inset-x-3 bottom-3 rounded-2xl bg-night/90 px-3 py-2 text-center text-xs text-gold ring-1 ring-gold/50">
            {m().focusHint(vehicleName(focused.type))}
          </p>
        )}
        {mode === "bandits" && (
          <p className="pointer-events-none absolute inset-x-3 top-3 rounded-2xl bg-night/90 px-3 py-2 text-center text-xs text-cream ring-1 ring-line">
            {m().pickRoad}
          </p>
        )}
      </div>

      {mode === "deliver" && (
        <Garage
          props={props}
          road={road}
          focus={focused?.id ?? null}
          now={now}
          onFocus={(id) => setFocus(id === focus ? null : id)}
          onWatch={(vehicleId) => {
            const dv = underway.find((x) => x.vehicleId === vehicleId);
            if (dv) setWatching(dv.id);
          }}
          onBuy={() => setBuying(true)}
        />
      )}

      <Sheet open={city !== null} onClose={() => setCity(null)}>
        {city && (
          <CitySheet
            key={city}
            city={city}
            props={props}
            road={road}
            vehicleId={focused?.id ?? null}
            onDone={() => {
              setCity(null);
              setFocus(null);
            }}
          />
        )}
      </Sheet>
      <Sheet open={watchedDelivery !== null} onClose={() => setWatching(null)}>
        {watchedDelivery && (
          <div className="space-y-3 pt-6">
            <UnderwayCard dv={watchedDelivery} props={props} />
          </div>
        )}
      </Sheet>
      <BuyVehicleSheet props={props} open={buying} onClose={() => setBuying(false)} />
    </section>
  );
}

/** A vehicle on its road: loaded on the way out, empty on the way back, halted by an ambush. */
function MovingVehicle({
  dv,
  now,
  type,
  onOpen,
}: { dv: DeliveryView; now: number; type: string; onOpen: () => void }) {
  const c = roadCurve(dv.route);
  if (!c) return null;
  const f = roadPosition(dv, now);
  const out = now < dv.arriveAt;
  const p = pointOn(c, f);
  // Facing where it goes: along the curve out, against it back.
  const heading = out ? p.dx : -p.dx;
  const ambushed = dv.attack?.pending === true && now <= dv.attack.reactBy;
  const until = ambushed ? (dv.attack?.reactBy ?? now) : out ? dv.arriveAt : dv.backAt;
  const label = ambushed ? `⚔ ${clock(until - now)}` : clock(until - now);
  const w = 10 + label.length * 4.7;
  return (
    // biome-ignore lint/a11y/useKeyWithClickEvents: the deliveries under way are listed too
    <g transform={`translate(${p.x} ${p.y})`} onClick={onOpen} className="cursor-pointer">
      <circle r="16" fill="transparent" />
      {ambushed && <circle r="14" fill={P.vermilion} opacity="0.35" className="map-pulse" />}
      <ellipse cx="0" cy="8" rx="11" ry="2.5" fill="#000" opacity="0.35" />
      <g transform={`scale(${heading < 0 ? -1 : 1} 1)`}>
        <VehicleGlyph type={type} load={out ? (GOODS_COLOUR[dv.resource] ?? P.cream) : null} />
      </g>
      <g transform="translate(0 -20)">
        <rect
          x={-w / 2}
          y="-7"
          width={w}
          height="12"
          rx="6"
          fill={ambushed ? P.vermilion : P.night}
          stroke={ambushed ? P.vermilion : P.gold}
          strokeOpacity="0.8"
        />
        <text
          y="2"
          textAnchor="middle"
          fontSize="7.5"
          fontFamily="Space Mono, monospace"
          fill={ambushed ? P.cream : P.gold}
        >
          {label}
        </text>
      </g>
    </g>
  );
}

/**
 * The stable, under the map: each vehicle with where it is (at the depot, on the way to a city,
 * on the way back, stopped by bandits) and when it will be free; then buying another one.
 * A vehicle at the depot lights the cities it can serve.
 */
function Garage({
  props,
  road,
  focus,
  now,
  onFocus,
  onWatch,
  onBuy,
}: {
  props: GameProps;
  road: RoadView;
  focus: string | null;
  now: number;
  onFocus: (id: string) => void;
  onWatch: (vehicleId: string) => void;
  onBuy: () => void;
}) {
  const max = props.catalog.road?.maxVehicles ?? 0;
  const types = props.catalog.road?.vehicles ?? [];
  const g = m().stable;
  const free = road.vehicles.filter((v) => v.status === "free").length;
  return (
    <section className="space-y-2">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="font-display text-sm font-extrabold uppercase tracking-wide">{g.title}</h3>
        <span className="label">{g.summary(free, road.vehicles.length - free)}</span>
      </div>
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-3">
        {road.vehicles.map((v) => {
          const dv = road.deliveries.find((x) => x.vehicleId === v.id && now < x.backAt);
          const atDepot = v.status === "free" || !dv;
          const on = focus === v.id;
          const city = dv ? props.names.city(dv.route.split(":")[1] ?? "") : "";
          const stopped = dv?.attack?.pending === true && now <= (dv.attack?.reactBy ?? 0);
          const outbound = !!dv && now < dv.arriveAt;
          // Progress of the whole trip, there and back.
          const progress = dv ? (now - dv.departAt) / Math.max(1, dv.backAt - dv.departAt) : 0;
          const capacity = types.find((x) => x.type === v.type)?.capacity ?? 0;
          return (
            <button
              key={v.id}
              type="button"
              onClick={() => (atDepot ? onFocus(v.id) : onWatch(v.id))}
              aria-pressed={on}
              className={`flex flex-col gap-2 rounded-2xl border p-3 text-left transition active:scale-[0.98] ${on ? "border-gold bg-gold/15" : stopped ? "border-vermilion bg-vermilion/10" : atDepot ? "border-lagoon/60 bg-night-3" : "border-line bg-night-3"}`}
            >
              <span className="flex items-center gap-2">
                <svg viewBox="-20 -16 40 26" width="34" height="22" aria-hidden="true">
                  <VehicleGlyph
                    type={v.type}
                    load={outbound && dv ? (GOODS_COLOUR[dv.resource] ?? null) : null}
                  />
                </svg>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold">
                    {vehicleName(v.type)}
                  </span>
                  <span className="label block">{t().capacity(capacity)}</span>
                </span>
              </span>
              <span
                className={`text-xs font-semibold ${stopped ? "text-vermilion" : atDepot ? "text-lagoon" : "text-cream"}`}
              >
                {atDepot
                  ? g.atDepot
                  : stopped
                    ? g.stopped(city)
                    : outbound
                      ? g.outbound(city)
                      : g.inbound(city)}
              </span>
              {dv && !atDepot ? (
                <span className="block space-y-1">
                  <span className="block h-1.5 overflow-hidden rounded-full bg-night-4">
                    <span
                      className={`block h-full rounded-full ${stopped ? "bg-vermilion" : "bg-gold"}`}
                      style={{ width: `${Math.max(0, Math.min(1, progress)) * 100}%` }}
                    />
                  </span>
                  <span className="label block">
                    {stopped
                      ? g.reactIn(clock((dv.attack?.reactBy ?? now) - now))
                      : outbound
                        ? g.arrivesIn(clock(dv.arriveAt - now))
                        : g.freeIn(clock(dv.backAt - now))}
                  </span>
                </span>
              ) : (
                <span className="label block text-lagoon">{on ? g.chosen : g.ready}</span>
              )}
            </button>
          );
        })}
      </div>
      {road.vehicles.length < max ? (
        <button
          type="button"
          onClick={onBuy}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-gold/50 px-4 py-3 font-display text-sm font-extrabold uppercase tracking-wide text-gold transition hover:bg-gold/10 active:scale-[0.99]"
        >
          + {g.buy}
          <span className="font-sans text-xs font-normal normal-case text-cream-dim">
            ({road.vehicles.length} / {max})
          </span>
        </button>
      ) : (
        <p className="text-center text-xs text-muted">{t().maxVehicles(max)}</p>
      )}
    </section>
  );
}

/** A city's orders; choosing one opens the loading: vehicle, escort, departure. */
function CitySheet({
  city,
  props,
  road,
  vehicleId,
  onDone,
}: {
  city: string;
  props: GameProps;
  road: RoadView;
  vehicleId: string | null;
  onDone: () => void;
}) {
  const orders = road.orders
    .filter((o) => o.city === city && o.status !== "expired")
    .sort((a, b) => {
      const rank = (o: DeliveryOrderView) =>
        o.status === "done" ? 3 : o.status === "upcoming" ? 2 : o.kind === "city" ? 1 : 0;
      if (rank(a) !== rank(b)) return rank(a) - rank(b);
      const ta = total(a);
      const tb = total(b);
      return ta === tb ? 0 : ta > tb ? -1 : 1;
    });
  const firstOpen = orders.filter((o) => o.status === "open");
  const [chosen, setChosen] = useState<string | null>(
    firstOpen.length === 1 ? (firstOpen[0]?.id ?? null) : null,
  );
  const order = orders.find((o) => o.id === chosen);
  const route = `${props.view.player.region}:${city}`;
  const minutes = props.catalog.road?.routes[props.view.player.region]?.[city];
  if (order) {
    return (
      <div className="space-y-3">
        {firstOpen.length > 1 && (
          <button type="button" className="label text-gold" onClick={() => setChosen(null)}>
            ← {m().back(props.names.city(city))}
          </button>
        )}
        <OrderPanel o={order} props={props} onDone={onDone} vehicleId={vehicleId} />
      </div>
    );
  }
  return (
    <div className="space-y-4">
      <div>
        <p className="label text-lagoon">
          {m().cityKicker}
          {minutes !== undefined ? ` · ${t().oneWay(minutesLabel(minutes))}` : ""}
        </p>
        <h3 className="mt-1 font-display text-2xl font-extrabold uppercase">
          {props.names.city(city)}
        </h3>
      </div>
      {road.watchedRoutes.includes(route) && (
        <p className="rounded-xl bg-vermilion/15 p-3 text-sm text-vermilion ring-1 ring-vermilion/60">
          ⚔ {t().watchedWarning}
        </p>
      )}
      {orders.length === 0 && <p className="text-sm text-cream-dim">{m().noOrder}</p>}
      <div className="space-y-2">
        {orders.map((o) => {
          const stock = have(props.view, o.resource);
          const open = o.status === "open";
          return (
            <button
              key={o.id}
              type="button"
              disabled={!open}
              onClick={() => setChosen(o.id)}
              className={`flex w-full items-center gap-3 rounded-2xl border bg-night-3 p-3 text-left transition active:scale-[0.99] disabled:opacity-45 ${o.kind === "doge" || o.kind === "family" ? "border-gold/60" : o.kind === "urgent" ? "border-vermilion/60" : "border-line"}`}
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
                    <Badge tone={o.kind === "urgent" ? "vermilion" : "gold"}>
                      {t().kinds[o.kind]}
                    </Badge>
                  )}
                  <span className="truncate text-sm font-semibold">
                    {props.names.resource(o.resource)}
                  </span>
                </p>
                <p className="label mt-1">
                  {o.status === "done"
                    ? `✓ ${t().done}`
                    : o.status === "taken"
                      ? t().takenBy(props.people[o.takenBy ?? ""] ?? fr.game.anonymous)
                      : o.status === "upcoming"
                        ? `${t().opensIn} ${clock(o.opensAt - props.now)}`
                        : o.kind === "urgent"
                          ? `${t().closesIn} ${clock(o.expiresAt - props.now)}`
                          : `${fr.game.inStock} ${stock}`}
                </p>
                {open && stock < o.quantity && (
                  <p className="mt-1 text-xs text-vermilion">
                    {t().sheet.missing(o.quantity - stock)}
                  </p>
                )}
                {open && <OrderFacts o={o} props={props} />}
              </div>
              <Big className="shrink-0 text-lg text-gold">{d(total(o))}</Big>
            </button>
          );
        })}
      </div>
    </div>
  );
}
