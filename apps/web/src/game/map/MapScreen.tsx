import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { defaultCrest } from "../../art/crest.js";
import { ResourceIcon } from "../../art/resources.js";
import { GOODS_COLOUR, PLACES } from "../../art/veneto.js";
import { haptic } from "../../haptics.js";
import { fr } from "../../i18n.js";
import { Big, Label, Panel, Qty, Sheet, Slab, clock } from "../../ui.js";
import { ActCard } from "../Acts.js";
import { CargoSheet, loadOrders, loadSummary } from "../Cargo.js";
import { Coach } from "../Coach.js";
import { CounterSheets, carnetRewards } from "../Comptoir.js";
import { Criee } from "../Criee.js";
import type { GameProps } from "../Game.js";
import { HouseSheet } from "../House.js";
import { RialtoSheet } from "../Marche.js";
import { ProfileSheet } from "../Profil.js";
import { RankingSheet } from "../Top.js";
import { onBack } from "../back.js";
import { d, minutesLabel } from "../format.js";
import {
  BuyVehicleSheet,
  UpgradeVehicleSheet,
  canServe,
  capacityOf,
  total,
  vehicleName,
} from "../roadKit.js";
import type { DeliveryView, VehicleView } from "../types.js";
import { useWide } from "../useWide.js";
import { have, readyOf } from "../workshops.js";
import {
  CampaignHud,
  CampaignOverlay,
  CampaignPanel,
  CampaignSheets,
  campaignMarkers,
  familyCalls,
} from "./CampaignLayer.js";
import { MapHud } from "./Hud.js";
import { CartMarker, CityMarker, HomeMarker, SecondCounterMarker } from "./Markers.js";
import { NoticesSheet } from "./Notices.js";
import { ActionButton, ContextPanel } from "./Panel.js";
import { type MapMarker, type Selection, WorldMap, type WorldMapHandle } from "./WorldMap.js";
import { Icon } from "./icons.js";

/** Seconds to change one's mind once a cart is sent, as at a space dock. */
const DEPART_SECONDS = 10;

/** The key of a selection on the map. */
export function selectionKey(s: Selection | null): string | null {
  if (!s) return null;
  if (s.kind === "home") return "home";
  if (s.kind === "cart") return `${s.kind}:${s.id}`;
  return `${s.kind}:${s.code}`;
}

/** The trip a vehicle is on now, if any. */
function tripOf(deliveries: DeliveryView[], v: VehicleView, now: number): DeliveryView | null {
  return deliveries.find((dv) => dv.vehicleId === v.id && now < dv.backAt) ?? null;
}

/**
 * The game's one screen: the map, the HUD over it, the panel of what is selected, the windows it
 * opens. Everything the merchant does starts from a place: their counter (workshops, store), a
 * city (its orders, Venice's Rialto and port), a cart (load, send).
 */
export function MapScreen(
  props: GameProps & {
    clockOffset: number;
    unread: number;
    onRead: () => void;
    guidePaused: boolean;
    onResumeGuide: () => void;
    guideKey: number;
  },
) {
  const { view, catalog, now, names } = props;
  const road = view.road;
  const region = view.player.region;
  const wide = useWide();
  const map = useRef<WorldMapHandle>(null);
  const sel = props.selection;
  const select = props.select;
  const m = fr.game.map;

  // The dock: what each cart has been loaded with, the departure being confirmed.
  const [loads, setLoads] = useState<Record<string, string[]>>({});
  const [departure, setDeparture] = useState<{ vehicleId: string; city: string } | null>(null);
  const [cargoCity, setCargoCity] = useState<string | null>(null);
  const [buying, setBuying] = useState(false);
  const [upgrading, setUpgrading] = useState<string | null>(null);

  const cities = useMemo(
    () => catalog.cities.map((c) => c.code).filter((c) => PLACES[c] !== undefined),
    [catalog.cities],
  );
  const routes = catalog.road?.routes[region] ?? {};
  const roads = cities.filter((c) => routes[c] !== undefined);
  const vehicles = road?.vehicles ?? [];
  const deliveries = road?.deliveries ?? [];
  const openOrders = (road?.orders ?? []).filter((o) => o.status === "open");
  const freeVehicles = vehicles.filter((v) => !tripOf(deliveries, v, now) && v.status === "free");

  const selectedCart =
    sel?.kind === "cart" ? (vehicles.find((v) => v.id === sel.id) ?? null) : null;
  const cartTrip = selectedCart ? tripOf(deliveries, selectedCart, now) : null;
  const cartFree = !!selectedCart && !cartTrip && selectedCart.status === "free";
  const cartLoad = selectedCart && road ? loadOrders(road, loads[selectedCart.id] ?? []) : [];
  const cartHold = selectedCart ? loadSummary(props, selectedCart, cartLoad) : null;
  // A loaded cart lights its city; an empty one, every city it could serve now.
  const litCities = cartFree
    ? cartHold?.city
      ? [cartHold.city]
      : roads.filter((c) =>
          openOrders.some(
            (o) =>
              o.city === c && canServe(props, o, capacityOf(props, selectedCart as VehicleView)),
          ),
        )
    : [];

  // Selection lost (a cart sold, a city gone): let go.
  useEffect(() => {
    if (sel?.kind === "cart" && !vehicles.some((v) => v.id === sel.id)) select(null);
  }, [sel, vehicles, select]);

  // A new selection comes into view above the panel.
  const key = selectionKey(sel);
  useEffect(() => {
    if (key) requestAnimationFrame(() => map.current?.show(key));
  }, [key]);

  // Back button and Escape: the departure first, then the selection.
  useEffect(() => {
    if (!sel && !departure) return;
    const undo = () => {
      if (departure) setDeparture(null);
      else select(null);
    };
    const esc = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !props.sheet) undo();
    };
    window.addEventListener("keydown", esc);
    const stop = onBack(() => {
      undo();
      return true;
    });
    return () => {
      window.removeEventListener("keydown", esc);
      stop();
    };
  }, [sel, departure, select, props.sheet]);

  const goCity = (code: string) => {
    if (cartFree && selectedCart) {
      if (cartHold?.city === code && cartLoad.length > 0) {
        startDeparture(selectedCart.id, code);
        return;
      }
      if (cartLoad.length === 0 && litCities.includes(code)) {
        setCargoCity(code);
        props.setSheet(`cargo:${selectedCart.id}`);
        return;
      }
    }
    setDeparture(null);
    haptic("tap");
    select({ kind: "city", code });
  };
  const startDeparture = (vehicleId: string, city: string) => {
    haptic("tap");
    setDeparture({ vehicleId, city });
    select({ kind: "cart", id: vehicleId });
  };
  const openCargo = (vehicleId: string, city: string | null) => {
    setCargoCity(city);
    props.setSheet(`cargo:${vehicleId}`);
  };

  // What stands on the map.
  const crest = props.account.crest ?? defaultCrest(props.account.id);
  const pseudo = props.account.pseudo ?? "";
  const ready = view.buildings.reduce((n, b) => n + readyOf(b, now), 0);
  const running = view.buildings
    .filter((b) => b.job && readyOf(b, now) < b.job.batches)
    .map((b) => {
      const job = b.job as NonNullable<typeof b.job>;
      const done = readyOf(b, now);
      const start = job.startedAt + done * job.batchMs;
      return { b, at: start + job.batchMs, share: (now - start) / job.batchMs };
    })
    .sort((x, y) => x.at - y.at)[0];
  const criee = view.criee && view.criee.endsAt > now ? view.criee : null;

  // The house's second counter of the season, where its region's depot stands.
  const second = view.player.secondRegion ? PLACES[view.player.secondRegion] : undefined;
  const markers: MapMarker[] = [
    ...(second
      ? [
          {
            key: "second",
            at: { x: second[0], y: second[1] },
            node: (
              <SecondCounterMarker
                name={fr.game.house.second.marker}
                crest={crest}
                onTap={() => props.setSheet("house")}
              />
            ),
          },
        ]
      : []),
    {
      key: "home",
      node: (
        <HomeMarker
          name={m.homeLabel}
          crest={crest}
          ready={ready}
          progress={running ? running.share : null}
          onTap={() => {
            setDeparture(null);
            haptic("tap");
            select({ kind: "home" });
          }}
        />
      ),
    },
    ...cities.map((code) => {
      const orders = openOrders.filter((o) => o.city === code);
      const deliverable = orders.filter((o) =>
        freeVehicles.some((v) => canServe(props, o, capacityOf(props, v))),
      ).length;
      return {
        key: `city:${code}`,
        node: (
          <CityMarker
            code={code}
            name={names.city(code)}
            orders={orders.length}
            deliverable={deliverable}
            criee={criee?.city === code}
            lit={litCities.includes(code)}
            dim={cartFree && !litCities.includes(code)}
            onTap={() => goCity(code)}
          />
        ),
      };
    }),
    ...vehicles.map((v) => {
      const dv = tripOf(deliveries, v, now);
      const loaded = dv
        ? dv.resource
        : road
          ? (loadOrders(road, loads[v.id] ?? [])[0]?.resource ?? null)
          : null;
      return {
        key: `cart:${v.id}`,
        trip: dv
          ? {
              route: dv.route,
              departAt: dv.departAt,
              arriveAt: dv.arriveAt,
              backAt: dv.backAt,
              halted: false,
            }
          : null,
        node: (
          <CartMarker
            id={v.id}
            type={v.type}
            label={vehicleName(v.type)}
            load={loaded && (!dv || now < dv.arriveAt) ? (GOODS_COLOUR[loaded] ?? null) : null}
            state={dv ? "road" : "parked"}
            onTap={() => {
              haptic("tap");
              if (departure && departure.vehicleId !== v.id) setDeparture(null);
              select({ kind: "cart", id: v.id });
            }}
          />
        ),
      };
    }),
  ];
  const parked = vehicles.filter((v) => !tripOf(deliveries, v, now)).map((v) => v.id);
  // The families' campaign, when its layer is shown.
  const families = view.families;
  const campaign = props.layer === "campaign" && families ? families : null;
  const campaignPanel = campaign ? (
    <CampaignPanel props={props} f={campaign} sel={sel} select={select} />
  ) : null;
  const panelUp = !!sel;

  const insets = wide
    ? // The doors at the foot of the screen (and the campaign's pledge above them) stay clear.
      {
        top: 110,
        right: panelUp ? 460 : 40,
        bottom: campaign && !campaign.mine ? 170 : 120,
        left: 40,
      }
    : {
        top: campaign ? 160 : 150,
        right: 12,
        bottom: panelUp ? 200 : 100,
        left: 12,
      };

  // The panel of the selection.
  let panel: ReactNode = campaignPanel;
  if (!campaign && sel?.kind === "home")
    panel = <HomePanel props={props} onClose={() => select(null)} />;
  if (!campaign && sel?.kind === "city") {
    const i = cities.indexOf(sel.code);
    const step = (k: number) =>
      select({ kind: "city", code: cities[(i + k + cities.length) % cities.length] ?? sel.code });
    panel = (
      <CityPanel
        props={props}
        code={sel.code}
        onClose={() => select(null)}
        onPrev={() => step(-1)}
        onNext={() => step(1)}
        onCargo={() => {
          const v = freeVehicles[0];
          if (v) openCargo(v.id, sel.code);
        }}
        freeCart={freeVehicles.length > 0}
        onSheet={(s) => props.setSheet(s)}
      />
    );
  }
  if (!campaign && selectedCart) {
    const i = vehicles.findIndex((v) => v.id === selectedCart.id);
    const step = (k: number) => {
      setDeparture(null);
      const next = vehicles[(i + k + vehicles.length) % vehicles.length];
      if (next) select({ kind: "cart", id: next.id });
    };
    panel =
      departure && departure.vehicleId === selectedCart.id && cartLoad.length > 0 ? (
        <DeparturePanel
          key={`${departure.vehicleId}:${departure.city}`}
          props={props}
          vehicle={selectedCart}
          city={departure.city}
          onCancel={() => setDeparture(null)}
          onGo={async (from) => {
            const ids = cartLoad.map((o) => o.id);
            const ok = await props.act({
              type: "dispatchDelivery",
              orderId: ids[0] ?? "",
              ...(ids.length > 1 ? { orderIds: ids } : {}),
              vehicleId: selectedCart.id,
              ...(from ? { from } : {}),
            });
            setDeparture(null);
            if (ok) setLoads((all) => ({ ...all, [selectedCart.id]: [] }));
          }}
        />
      ) : (
        <CartPanel
          props={props}
          vehicle={selectedCart}
          trip={cartTrip}
          units={cartHold?.units ?? 0}
          capacity={cartHold?.capacity ?? 0}
          loadCity={cartHold?.city ?? null}
          canServe={litCities.length > 0}
          onClose={() => select(null)}
          onPrev={vehicles.length > 1 ? () => step(-1) : undefined}
          onNext={vehicles.length > 1 ? () => step(1) : undefined}
          onCargo={() => openCargo(selectedCart.id, null)}
          onUpgrade={() => setUpgrading(selectedCart.id)}
          onSend={() => cartHold?.city && startDeparture(selectedCart.id, cartHold.city)}
          onFollow={() => map.current?.show(`cart:${selectedCart.id}`)}
        />
      );
  }

  const [sheetKind, sheetId] = (props.sheet ?? "").split(":");
  const cargoVehicle = sheetKind === "cargo" ? vehicles.find((v) => v.id === sheetId) : undefined;
  const notice = props.unread + carnetRewards(props);
  const days = Math.max(1, (catalog.world.endsAt - catalog.world.startsAt) / 86_400_000);
  const seasonProgress = Math.min(1, (now - catalog.world.startsAt) / (days * 86_400_000));
  const maxCarts = catalog.road?.maxVehicles ?? 0;

  return (
    <div className="fixed inset-0 overflow-hidden bg-night" style={{ overflow: "clip" }}>
      <WorldMap
        ref={map}
        region={region}
        cities={cities}
        layer={campaign ? "campaign" : "trade"}
        spots={
          campaign ? campaign.lands.map((l) => ({ key: `land:${l.code}`, x: l.x, y: l.y })) : []
        }
        overlay={campaign ? <CampaignOverlay f={campaign} now={now} /> : undefined}
        markers={campaign ? campaignMarkers(props, campaign, select) : markers}
        parked={campaign ? [] : parked}
        roads={campaign ? [] : roads}
        litRoads={campaign ? [] : litCities}
        planned={
          campaign ? null : (departure?.city ?? (cartFree && cartHold?.city ? cartHold.city : null))
        }
        clockOffset={props.clockOffset}
        insets={insets}
        selectedKey={key}
        onEmptyTap={() => {
          if (departure) setDeparture(null);
          else if (sel) select(null);
        }}
      />
      <MapHud
        pseudo={pseudo || m.home("")}
        crest={crest}
        title={view.standing.title.current.name}
        level={props.level?.level ?? null}
        rank={view.standing.rank}
        seasonProgress={seasonProgress}
        cash={view.cash}
        influence={props.influence}
        onHouse={() => props.setSheet("house")}
        freeCarts={freeVehicles.length}
        carts={vehicles.length}
        canBuyCart={!!road && vehicles.length < maxCarts}
        notices={notice > 0 ? notice : view.player.upkeepDefaultUntil > now || !!criee}
        bales={view.tutorial.includes("mission") ? (view.bales?.available ?? 0) : 0}
        guidePaused={props.guidePaused}
        bottom={!panelUp}
        hasFamily={!!view.families}
        layer={campaign ? "campaign" : "trade"}
        familyCalls={familyCalls(props)}
        workshopsReady={ready > 0}
        right={campaign ? <CampaignHud f={campaign} now={now} /> : undefined}
        onProfile={() => props.setSheet("profile")}
        onNotices={() => props.setSheet("notices")}
        onBales={() => props.setSheet("bales")}
        onRialto={() => props.goTo("marche")}
        onBuyCart={() => setBuying(true)}
        onResumeGuide={props.onResumeGuide}
        onRanking={() => props.setSheet("ranking")}
        onFamily={() => (campaign ? props.setLayer("trade") : props.goTo("famille"))}
        onWorkshops={() => props.setSheet("workshops")}
        onHelp={props.openHelp}
      />
      {panel}

      <CounterSheets {...props} />
      {families && <CampaignSheets props={props} f={families} select={select} />}
      <RialtoSheet {...props} />
      <RankingSheet {...props} />
      <ProfileSheet {...props} />
      <HouseSheet {...props} />
      <ActCard {...props} />
      <NoticesSheet
        {...props}
        open={props.sheet === "notices"}
        onClose={() => props.setSheet(null)}
        onRead={props.onRead}
      />
      {road && <BuyVehicleSheet props={props} open={buying} onClose={() => setBuying(false)} />}
      {road && (
        <UpgradeVehicleSheet
          props={props}
          vehicle={vehicles.find((v) => v.id === upgrading) ?? null}
          onClose={() => setUpgrading(null)}
        />
      )}
      <Sheet
        open={!!cargoVehicle && !!road}
        onClose={() => {
          props.setSheet(null);
          setCargoCity(null);
        }}
      >
        {cargoVehicle && road && (
          <CargoSheet
            props={props}
            road={road}
            vehicle={cargoVehicle}
            city={cargoCity}
            load={loads[cargoVehicle.id] ?? []}
            setLoad={(ids) => setLoads((all) => ({ ...all, [cargoVehicle.id]: ids }))}
            onReady={() => {
              const city = loadSummary(
                props,
                cargoVehicle,
                loadOrders(road, loads[cargoVehicle.id] ?? []),
              ).city;
              props.setSheet(null);
              setCargoCity(null);
              if (city) startDeparture(cargoVehicle.id, city);
            }}
          />
        )}
      </Sheet>
      <Sheet open={sheetKind === "criee"} onClose={() => props.setSheet(null)}>
        <div className="pt-6">
          <Criee {...props} />
        </div>
      </Sheet>
      <Sheet open={sheetKind === "sell" && !!sheetId} onClose={() => props.setSheet(null)}>
        {sheetKind === "sell" && sheetId && <CitySellSheet props={props} city={sheetId} />}
      </Sheet>
      <Coach key={props.guideKey} {...props} departing={departure !== null} />
    </div>
  );
}

/** The merchant's counter: collect, the workshops, the store, building. */
function HomePanel({ props, onClose }: { props: GameProps; onClose: () => void }) {
  const { view, now } = props;
  const m = fr.game.map;
  const ready = view.buildings.reduce((n, b) => n + readyOf(b, now), 0);
  const idle = view.buildings.some((b) => !b.job && b.canStart > 0);
  const next = view.buildings
    .filter((b) => b.job && readyOf(b, now) < b.job.batches)
    .map((b) => {
      const job = b.job as NonNullable<typeof b.job>;
      const done = readyOf(b, now);
      const start = job.startedAt + done * job.batchMs;
      return { b, at: start + job.batchMs, share: (now - start) / job.batchMs };
    })
    .sort((x, y) => x.at - y.at)[0];
  const stock = view.inventory.reduce((n, i) => n + i.available, 0);
  const room = view.buildings.length < props.catalog.rules.maxBuildings;
  const hungry = view.rations.perDay > 0 && view.rations.hungryUntil > now;
  const status =
    ready > 0
      ? m.homeStatus.ready(ready)
      : next
        ? m.homeStatus.next(props.names.building(next.b.type), clock(next.at - now))
        : idle
          ? m.homeStatus.idle
          : m.homeStatus.rest;
  return (
    <ContextPanel
      title={m.home(props.account.pseudo ?? "")}
      chip={<span className="label">{m.stockChip(stock)}</span>}
      status={hungry ? fr.game.domain.hungry : status}
      tone={hungry ? "vermilion" : ready > 0 ? "gold" : "lagoon"}
      progress={ready === 0 && next ? next.share : null}
      onClose={onClose}
      actions={
        <>
          {ready > 0 || idle ? (
            <ActionButton
              icon={ready > 0 ? Icon.harvest() : Icon.restart()}
              label={ready > 0 ? m.buttons.harvest : m.buttons.restart}
              tone={ready > 0 ? "gold" : "lagoon"}
              badge={ready > 0 ? ready : undefined}
              coach="panel-harvest"
              disabled={props.busy}
              onClick={() => props.act({ type: "collectAndRestart" })}
            />
          ) : null}
          <ActionButton
            icon={Icon.workshops()}
            label={m.buttons.workshops}
            coach="panel-workshops"
            onClick={() => props.setSheet("workshops")}
          />
          <ActionButton
            icon={Icon.store()}
            label={m.buttons.store}
            onClick={() => props.setSheet("store")}
          />
          {room && (
            <ActionButton
              icon={Icon.build()}
              label={m.buttons.build}
              onClick={() => props.setSheet("buildHere")}
            />
          )}
        </>
      }
    />
  );
}

/** A city: its orders, a Criée, and in Venice the Rialto and the port. */
function CityPanel({
  props,
  code,
  onClose,
  onPrev,
  onNext,
  onCargo,
  freeCart,
  onSheet,
}: {
  props: GameProps;
  code: string;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
  onCargo: () => void;
  freeCart: boolean;
  onSheet: (s: string) => void;
}) {
  const { view, now } = props;
  const m = fr.game.map;
  const road = view.road;
  const orders = (road?.orders ?? []).filter((o) => o.city === code && o.status === "open");
  const covered = orders.filter((o) => have(view, o.resource) >= o.quantity).length;
  const criee =
    view.criee && view.criee.city === code && view.criee.endsAt > now ? view.criee : null;
  const nextDay = props.catalog.world.startsAt + view.day * 86_400_000;
  const venice = code === "venezia";
  const status = criee
    ? m.city.criee(
        props.names.resource(criee.resource),
        String(Math.round(criee.premiumBps / 100)),
        clock(criee.endsAt - now),
      )
    : road
      ? orders.length > 0
        ? m.city.deliverable(covered)
        : m.city.none(clock(nextDay - now))
      : venice
        ? m.city.venice
        : "";
  const sells = !road && view.cityQuotes.some((q) => q.city === code);
  return (
    <ContextPanel
      title={props.names.city(code)}
      chip={road ? <span className="label">{m.city.orders(orders.length)}</span> : undefined}
      status={status}
      tone={criee ? "vermilion" : covered > 0 ? "gold" : "lagoon"}
      onClose={onClose}
      onPrev={onPrev}
      onNext={onNext}
      actions={
        <>
          {road && (
            <ActionButton
              icon={Icon.cargo()}
              label={m.buttons.cargo}
              tone={covered > 0 && freeCart ? "gold" : "plain"}
              badge={orders.length || undefined}
              coach="panel-cargo"
              disabled={!freeCart || orders.length === 0}
              onClick={onCargo}
            />
          )}
          {sells && (
            <ActionButton
              icon={Icon.cargo()}
              label={fr.game.sellToCity}
              tone="gold"
              onClick={() => onSheet(`sell:${code}`)}
            />
          )}
          {criee && (
            <ActionButton
              icon={Icon.criee()}
              label={m.buttons.criee}
              tone="vermilion"
              onClick={() => onSheet("criee")}
            />
          )}
          {venice && (
            <ActionButton
              icon={Icon.rialto()}
              label={m.buttons.rialto}
              coach="panel-rialto"
              onClick={() => props.goTo("marche")}
            />
          )}
        </>
      }
      extra={
        road && !freeCart && orders.length > 0 ? (
          <p className="text-center text-xs text-cream-dim">{m.city.noCart}</p>
        ) : undefined
      }
    />
  );
}

/** A cart: at the counter (load it, send it) or on the road (where, how long, fight back). */
function CartPanel({
  props,
  vehicle,
  trip,
  units,
  capacity,
  loadCity,
  canServe: serves,
  onClose,
  onPrev,
  onNext,
  onCargo,
  onUpgrade,
  onSend,
  onFollow,
}: {
  props: GameProps;
  vehicle: VehicleView;
  trip: DeliveryView | null;
  units: number;
  capacity: number;
  loadCity: string | null;
  canServe: boolean;
  onClose: () => void;
  onPrev?: () => void;
  onNext?: () => void;
  onCargo: () => void;
  onUpgrade: () => void;
  onSend: () => void;
  onFollow: () => void;
}) {
  const { now } = props;
  const m = fr.game.map;
  const canUpgrade = !!props.catalog.road?.vehicles.find((x) => x.type === vehicle.type)?.upgrade;
  const title = (
    <>
      {vehicleName(vehicle.type)}{" "}
      <span className="font-mono text-[11px] font-normal normal-case tracking-normal text-cream-dim">
        {units}/{capacity}
      </span>
    </>
  );
  if (trip) {
    const city = props.names.city(trip.route.split(":")[1] ?? "");
    const out = now < trip.arriveAt;
    const share = out
      ? (now - trip.departAt) / Math.max(1, trip.arriveAt - trip.departAt)
      : (now - trip.arriveAt) / Math.max(1, trip.backAt - trip.arriveAt);
    return (
      <ContextPanel
        title={
          <>
            {vehicleName(vehicle.type)}{" "}
            <span className="font-mono text-[11px] font-normal normal-case tracking-normal text-cream-dim">
              {trip.loaded} {props.names.resource(trip.resource).toLowerCase()}
            </span>
          </>
        }
        chip={<span className="font-mono text-xs text-gold">{d(trip.paid ?? trip.payment)}</span>}
        status={
          out
            ? m.cart.outbound(city, clock(trip.arriveAt - now))
            : m.cart.inbound(clock(trip.backAt - now))
        }
        tone="lagoon"
        progress={share}
        onClose={onClose}
        onPrev={onPrev}
        onNext={onNext}
        actions={<ActionButton icon={Icon.follow()} label={m.buttons.follow} onClick={onFollow} />}
      />
    );
  }
  return (
    <ContextPanel
      title={title}
      status={
        loadCity
          ? m.cart.loaded(props.names.city(loadCity))
          : serves
            ? `${m.cart.atHome} · ${m.cart.pickCity}`
            : m.cart.nothing
      }
      tone={loadCity ? "gold" : "lagoon"}
      progress={capacity > 0 ? units / capacity : null}
      onClose={onClose}
      onPrev={onPrev}
      onNext={onNext}
      actions={
        <>
          <ActionButton
            icon={Icon.cargo()}
            label={m.buttons.cargo}
            coach="panel-cargo"
            tone={!loadCity && serves ? "gold" : "plain"}
            onClick={onCargo}
          />
          <ActionButton
            icon={Icon.send()}
            label={m.buttons.send}
            tone={loadCity ? "lagoon" : "plain"}
            coach="panel-send"
            disabled={!loadCity}
            onClick={onSend}
          />
          {canUpgrade && (
            <ActionButton icon={Icon.upgrade()} label={m.buttons.upgrade} onClick={onUpgrade} />
          )}
        </>
      }
    />
  );
}

/** "Départ vers Vérone · 10 s": the cart leaves by itself unless called back. */
function DeparturePanel({
  props,
  vehicle,
  city,
  onGo,
  onCancel,
}: {
  props: GameProps;
  vehicle: VehicleView;
  city: string;
  /** `second`: from the house's second counter. */
  onGo: (from?: "second") => void;
  onCancel: () => void;
}) {
  const [left, setLeft] = useState(DEPART_SECONDS);
  // The second counter of the season: chosen by default when its road is shorter.
  const routes = props.catalog.road?.routes ?? {};
  const home = props.view.player.region;
  const secondRegion = props.view.player.secondRegion;
  const homeRoad = routes[home]?.[city];
  const secondRoad = secondRegion ? routes[secondRegion]?.[city] : undefined;
  const [fromSecond, setFromSecond] = useState(
    secondRoad !== undefined && homeRoad !== undefined && secondRoad < homeRoad,
  );
  const from = fromSecond ? ("second" as const) : undefined;
  const go = useRef(onGo);
  go.current = onGo;
  const fromRef = useRef(from);
  fromRef.current = from;
  const fired = useRef(false);
  useEffect(() => {
    if (left <= 0) {
      if (!fired.current) {
        fired.current = true;
        go.current(fromRef.current);
      }
      return;
    }
    const id = setTimeout(() => setLeft((x) => x - 1), 1_000);
    return () => clearTimeout(id);
  }, [left]);
  const road = props.view.road;
  const m = fr.game.map;
  const orders = road ? road.orders.filter((o) => o.city === city && o.status === "open") : [];
  const homeMinutes = orders[0]?.minutes[vehicle.type] ?? homeRoad ?? 0;
  // From the second counter: the same vehicle on that road (in proportion to the home one).
  const minutes =
    fromSecond && secondRoad !== undefined && homeRoad
      ? Math.max(1, Math.round((homeMinutes * secondRoad) / homeRoad))
      : homeMinutes;
  return (
    <ContextPanel
      title={vehicleName(vehicle.type)}
      chip={<span className="label">{minutesLabel(minutes)}</span>}
      status={`${m.cart.leaving(props.names.city(city))}${fromSecond ? ` · ${fr.game.house.second.from}` : ""} · ${left} s`}
      tone="lagoon"
      progress={(DEPART_SECONDS - left) / DEPART_SECONDS}
      onClose={onCancel}
      actions={
        <>
          <ActionButton
            icon={Icon.check()}
            label={m.buttons.go}
            tone="lagoon"
            coach="panel-go"
            disabled={props.busy || fired.current}
            onClick={() => {
              if (fired.current) return;
              fired.current = true;
              onGo(from);
            }}
          />
          {secondRoad !== undefined && (
            <ActionButton
              icon={Icon.send()}
              label={fromSecond ? fr.game.house.second.fromHome : fr.game.house.second.from}
              onClick={() => setFromSecond((x) => !x)}
            />
          )}
          <ActionButton icon={Icon.cross()} label={m.buttons.cancel} onClick={onCancel} />
        </>
      }
    />
  );
}

/** A world without deliveries: the city buys straight from the store. */
function CitySellSheet({ props, city }: { props: GameProps; city: string }) {
  const quotes = props.view.cityQuotes.filter((q) => q.city === city);
  return (
    <div className="space-y-3">
      <h3 className="font-display text-xl font-extrabold uppercase">{props.names.city(city)}</h3>
      {quotes.map((q) => (
        <SellLine
          key={q.resource}
          props={props}
          city={city}
          resource={q.resource}
          price={q.unitPrice}
        />
      ))}
    </div>
  );
}

function SellLine({
  props,
  city,
  resource,
  price,
}: { props: GameProps; city: string; resource: string; price: string }) {
  const stock = have(props.view, resource);
  const [qty, setQty] = useState(Math.max(1, stock));
  const q = Math.min(qty, Math.max(1, stock));
  return (
    <Panel glow={stock > 0 ? "gold" : undefined} className="p-3">
      <div className="flex items-center gap-3">
        <ResourceIcon code={resource} size={36} />
        <div className="min-w-0 flex-1">
          <p className="font-display text-sm font-extrabold uppercase">
            {props.names.resource(resource)}
          </p>
          <Label>
            {fr.game.inStock} {stock}
          </Label>
        </div>
        <Big className="text-xl text-gold">{d(price)}</Big>
      </div>
      {stock > 0 && (
        <div className="mt-3 flex items-center justify-between gap-2">
          <Qty value={q} max={stock} onChange={setQty} />
          <Slab
            coach={`city-sell-${resource}`}
            disabled={props.busy}
            onClick={() => props.act({ type: "sellToCity", city, resource, quantity: q })}
          >
            {fr.game.sellToCity} · {d(BigInt(price) * BigInt(q))}
          </Slab>
        </div>
      )}
    </Panel>
  );
}

export { total };
