import {
  type ReactElement,
  type ReactNode,
  cloneElement,
  isValidElement,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { ApiError } from "../../api.js";
import { defaultCrest } from "../../art/crest.js";
import { goodsColour } from "../../art/goods.js";
import { ResourceIcon } from "../../art/resources.js";
import { PLACES } from "../../art/veneto.js";
import { haptic } from "../../haptics.js";
import { fr } from "../../i18n.js";
import { Big, Panel, Qty, Sheet, Slab, clock, useLeaving } from "../../ui.js";
import { ActCard } from "../Acts.js";
import { AtoutsSheet, atoutWaiting, useAtoutMoment } from "../Atouts.js";
import { BroglioSheet } from "../Broglio.js";
import { CargoSheet, loadOrders, loadSummary } from "../Cargo.js";
import { Coach } from "../Coach.js";
import { ComeBack } from "../ComeBack.js";
import { CounterSheets, buyRationsSheet, carnetRewards } from "../Comptoir.js";
import { Criee } from "../Criee.js";
import { perHour } from "../Dashboard.js";
import { SenateSheet, senateWaiting } from "../Doge.js";
import { FondacoSheet } from "../Fondaco.js";
import type { GameProps } from "../Game.js";
import { HouseSheet } from "../House.js";
import { LetterSheet, letterWaiting, useLetterMoment } from "../Letter.js";
import { RialtoSheet } from "../Marche.js";
import { ProfileSheet } from "../Profil.js";
import { SeraSheet, openSeraLots } from "../Sera.js";
import { ChallengeSheet, SfidaSheet } from "../Sfida.js";
import { SignoriaSheet } from "../Signoria.js";
import { SuppliersSheet } from "../Suppliers.js";
import { RankingSheet } from "../Top.js";
import { WarehouseSheet } from "../Warehouse.js";
import { gameApi } from "../api.js";
import { onBack } from "../back.js";
import { d, loafShare, minutesLabel } from "../format.js";
import { harvestAndRestart } from "../harvest.js";
import { rivalLine } from "../rival.js";
import {
  BuyVehicleSheet,
  UpgradeVehicleSheet,
  canServe,
  capacityOf,
  total,
  vehicleName,
} from "../roadKit.js";
import { signoriaOf, useSignoria } from "../signoria.js";
import { store } from "../store.js";
import { upcoming } from "../timeline.js";
import type {
  DeliveryOrderView,
  DeliveryView,
  PlayerView,
  TerraAction,
  TerraView,
  VehicleView,
} from "../types.js";
import { openTerraEarly, unlocksOf } from "../unlocks.js";
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
import {
  FleetDrawer,
  type FleetLine,
  type TipContent,
  type TipKey,
  usePresence,
} from "./HudTips.js";
import { CartMarker, CityMarker, CityName, HomeMarker } from "./Markers.js";
import { NoticesSheet } from "./Notices.js";
import { CityOrbit, ComptoirOrbit } from "./Orbit.js";
import { ActionButton, ContextPanel } from "./Panel.js";
import { SIDE_W, SideColumn } from "./SideColumn.js";
import { TabBar, activeTab } from "./TabBar.js";
import {
  CondottaBar,
  SkirmishBar,
  TerraActions,
  TerraFronts,
  TerraHud,
  TerraIntro,
  TerraOverlay,
  TerraPanel,
  TerraSheets,
  terraCalls,
  terraFocus,
  terraMarkers,
  terraSpots,
  terraTap,
  useAbsence,
  useCondotta,
  useSkirmish,
  useTerra,
  useTerraShapes,
  useWeekReplay,
} from "./TerraLayer.js";
import { TimeStrip } from "./TimeStrip.js";
import { type MapMarker, type Selection, WorldMap, type WorldMapHandle } from "./WorldMap.js";
import { ACTION_ICONS as A } from "./actions.js";
import { Icon } from "./icons.js";

/** Seconds to change one's mind once a cart is sent, as at a space dock. */
const DEPART_SECONDS = 10;

/** The key of a selection on the map. */
export function selectionKey(s: Selection | null): string | null {
  if (!s) return null;
  if (s.kind === "home") return "home";
  if (s.kind === "cart") return `${s.kind}:${s.id}`;
  if (s.kind === "terra") return `terra:${s.cell}`;
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
/** The cards of the HUD's counters: the ducats, the Influence, the workers' bread. */
function hudTips(props: GameProps): Partial<Record<TipKey, TipContent>> {
  const { view, now } = props;
  const t = fr.game.map.tips;
  const tips: Partial<Record<TipKey, TipContent>> = {
    cash: {
      title: t.cash.title,
      tone: "gold",
      text: t.cash.text,
      lines: [
        { label: t.cash.purse, value: d(view.cash) },
        ...(BigInt(view.escrow) > 0n ? [{ label: t.cash.escrow, value: d(view.escrow) }] : []),
        { label: t.cash.turnover, value: d(view.standing.turnover) },
      ],
      action: { label: t.cash.action, onClick: () => props.goTo("marche") },
    },
  };
  if (props.influence !== null) {
    tips.influence = {
      title: t.influence.title,
      tone: "gold-soft",
      text: t.influence.text,
      action: { label: t.influence.action, onClick: () => props.setSheet("house") },
    };
  }
  const { rations } = view;
  if (rations.perDay > 0) {
    const stock = have(view, rations.resource);
    const hungry = rations.hungryUntil > now;
    tips.bread = {
      title: t.bread.title,
      tone: "cream",
      text: rations.byBatch
        ? fr.game.rations.byBatch(
            loafShare(rations.byBatch.transform),
            loafShare(rations.byBatch.raw),
          )
        : t.bread.text(rations.perLevel),
      lines: [
        { label: rations.byBatch ? fr.game.rations.about : t.bread.eaten, value: rations.perDay },
        {
          label: t.bread.reserve,
          value: t.bread.reserveValue(stock, Math.floor(stock / rations.perDay)),
          tone: hungry ? "vermilion" : stock < rations.perDay ? "gold" : undefined,
        },
        ...(rations.byBatch
          ? []
          : [{ label: t.bread.nextMeal, value: clock(rations.nextMealAt - now) }]),
      ],
      alert: hungry
        ? { text: t.bread.hungry(clock(rations.hungryUntil - now)), tone: "vermilion" }
        : stock < rations.perDay
          ? {
              text: rations.byBatch
                ? fr.game.rations.lowBatch
                : t.bread.low(rations.perDay - stock),
              tone: "gold",
            }
          : undefined,
      action: {
        label: fr.game.rations.buy,
        onClick: () => props.setSheet(buyRationsSheet(view)),
      },
    };
  }
  return tips;
}

/** A line of the fleet drawer: the vehicle, where it is, what it carries. */
function fleetLine(props: GameProps, v: VehicleView, trip: DeliveryView | null): FleetLine {
  const t = fr.game.map.fleet;
  const { now } = props;
  let status = t.home;
  if (trip) {
    const city = props.names.city(trip.route.split(":")[1] ?? "");
    status =
      now < trip.arriveAt
        ? t.out(city, clock(trip.arriveAt - now))
        : t.back(clock(Math.max(0, trip.backAt - now)));
    if (trip.fattore) status = `${status} · ${t.byFattore}`;
  }
  return {
    id: v.id,
    name: vehicleName(v.type),
    status,
    away: !!trip,
    capacity: capacityOf(props, v),
  };
}

/** The workers' bread for the HUD: the reserve, what they eat a day, and how it stands. */
function breadOf(view: PlayerView, now: number) {
  const { rations } = view;
  if (rations.perDay === 0) return null;
  const stock = have(view, rations.resource);
  const state: "ok" | "low" | "hungry" =
    rations.hungryUntil > now ? "hungry" : stock < rations.perDay ? "low" : "ok";
  return { stock, perDay: rations.perDay, state };
}

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
  const [fleetOpen, setFleetOpen] = useState(false);
  const { shown: fleetShown, leaving: fleetLeaving } = usePresence(fleetOpen || null, 160);
  const closeFleet = useCallback(() => setFleetOpen(false), []);

  // The Terraferma, once live in this world: its door replaces the families'.
  const { terra: weekView, refresh: refreshTerra } = useTerra(props.layer === "terra");
  // A skirmish shown in place of the week: its own map, its own orders.
  const [skirmishOn, setSkirmishOn] = useState(false);
  const skirmish = useSkirmish(props.layer === "terra" && skirmishOn);
  const skirmishView = skirmish.status && "view" in skirmish.status ? skirmish.status.view : null;
  // The Condotta (E2-5), the same way: its own map in place of the week's.
  const [condottaOn, setCondottaOn] = useState(false);
  const [condottaError, setCondottaError] = useState<string | null>(null);
  const condotta = useCondotta(props.layer === "terra" && condottaOn);
  const condottaView = condotta.status && "view" in condotta.status ? condotta.status.view : null;
  const servedView =
    skirmishOn && skirmishView
      ? skirmishView
      : condottaOn && condottaView
        ? condottaView
        : weekView;
  // A front just ordered shows at once, before the server answers (dropped at its answer).
  const [pending, setPending] = useState<TerraView["fronts"][number] | null>(null);
  // biome-ignore lint/correctness/useExhaustiveDependencies: a fresh view replaces the pending front.
  useEffect(() => setPending(null), [servedView]);
  const terraView = useMemo(
    () =>
      servedView && pending && servedView.me
        ? {
            ...servedView,
            fronts: [...servedView.fronts, pending],
            me: { ...servedView.me, troops: Math.max(0, servedView.me.troops - pending.troops) },
          }
        : servedView,
    [servedView, pending],
  );
  const absence = useAbsence(terraView, props.layer === "terra" && !skirmishOn && !condottaOn, now);
  const week = useWeekReplay(absence.view);
  const shapes = useTerraShapes(week.view);
  const act = props.act;
  const refreshSkirmish = skirmish.refresh;
  const refreshCondotta = condotta.refresh;
  const terraAct = useCallback(
    async (a: TerraAction) => {
      const v = servedView;
      const me = v?.holders.findIndex((h) => h.me) ?? -1;
      if (v?.me && me >= 0 && (a.type === "terraFront" || a.type === "terraSail"))
        setPending({
          id: "pending",
          owner: me,
          against: v.owner[a.aim] ?? -1,
          aim: a.aim,
          troops: Math.floor((v.me.troops * a.shareBps) / 10_000),
          mine: true,
          threat: false,
          takes: [],
          endsAt: null,
        });
      if (condottaOn && condottaView) {
        const ok = await gameApi
          .condottaAct(a)
          .then((r) => r.ok)
          .catch(() => false);
        if (!ok) setPending(null);
        refreshCondotta();
        return ok;
      }
      if (skirmishOn && skirmishView) {
        const ok = await gameApi
          .skirmishAct(a)
          .then((r) => r.ok)
          .catch(() => false);
        if (!ok) setPending(null);
        refreshSkirmish();
        return ok;
      }
      const ok = await act(a);
      if (!ok) setPending(null);
      refreshTerra();
      return ok;
    },
    [
      act,
      refreshTerra,
      refreshSkirmish,
      refreshCondotta,
      skirmishOn,
      skirmishView,
      condottaOn,
      condottaView,
      servedView,
    ],
  );

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

  // Keys on a computer: R harvests and restarts, A the workshops, M the market, C the cargoes of a
  // free vehicle, 1 to 9 a workshop's production. Not while a sheet is open or a field is typed in.
  useEffect(() => {
    const keys = (e: KeyboardEvent) => {
      if (props.sheet || e.metaKey || e.ctrlKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      if (target?.closest("input, textarea, select, [contenteditable]")) return;
      const k = e.key.toLowerCase();
      if (k === "r") void harvestAndRestart(props);
      else if (k === "a") props.setSheet("workshops");
      else if (k === "m") props.goTo("marche");
      else if (k === "c" && freeVehicles[0]) props.setSheet(`cargo:${freeVehicles[0].id}`);
      else if (/^[1-9]$/.test(k)) {
        const b = view.buildings[Number(k) - 1];
        if (b) props.setSheet(`produce:${b.id}`);
      } else return;
      e.preventDefault();
    };
    window.addEventListener("keydown", keys);
    return () => window.removeEventListener("keydown", keys);
  }, [props, freeVehicles, view.buildings]);

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
  // Each city's Podestà (R2): its crest on the city, the merchant's own when it is.
  const signoria = useSignoria(view);
  // The week's Atouts open by themselves once (R3).
  useAtoutMoment(props);
  // The letter of the day opens by itself at the first visit of the day (R10).
  useLetterMoment(props);
  const podestaCrest = (code: string) => {
    const p = signoriaOf(signoria, code)?.podesta;
    if (!p) return null;
    return { crest: p.me ? crest : (p.crest ?? defaultCrest(p.id)), mine: p.me };
  };
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

  const markers: MapMarker[] = [
    {
      key: "home",
      node: (
        <HomeMarker
          name={m.homeLabel}
          crest={crest}
          ready={ready}
          rings={view.buildings.map((b) => {
            const done = readyOf(b, now);
            if (done > 0) return { share: 1, ready: true };
            if (!b.job || done >= b.job.batches) return { share: null, ready: false };
            const start = b.job.startedAt + done * b.job.batchMs;
            return { share: (now - start) / b.job.batchMs, ready: false };
          })}
          onTap={() => {
            setDeparture(null);
            haptic("tap");
            select({ kind: "home" });
          }}
        />
      ),
    },
    ...cities.flatMap((code) => {
      const orders = openOrders.filter((o) => o.city === code);
      const deliverable = orders.filter((o) =>
        freeVehicles.some((v) => canServe(props, o, capacityOf(props, v))),
      ).length;
      return [
        {
          key: `city:${code}`,
          node: (
            <CityMarker
              code={code}
              name={names.city(code)}
              orders={orders.map((o) => ({
                resource: o.resource,
                covered: have(view, o.resource) >= o.quantity,
              }))}
              deliverable={deliverable}
              criee={criee?.city === code}
              supplier={view.supplies.some((s) => s.city === code) ? crest : null}
              podesta={podestaCrest(code)}
              lit={litCities.includes(code)}
              dim={cartFree && !litCities.includes(code)}
              onTap={() => goCity(code)}
            />
          ),
        },
        {
          key: `cityname:${code}`,
          node: (
            <CityName
              code={code}
              name={names.city(code)}
              dim={cartFree && !litCities.includes(code)}
            />
          ),
        },
      ];
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
            load={loaded && (!dv || now < dv.arriveAt) ? goodsColour(loaded) : null}
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
  const terra = props.layer === "terra" && week.view && shapes ? week.view : null;
  // While the merchant's absence replays (two seconds), the markers are those of the map as it
  // stands: made again at each of its frames, they would all be measured again ten times a second.
  const liveShapes = useTerraShapes(absence.replaying ? terraView : null);
  const markerView = terra && absence.replaying && terraView && liveShapes ? terraView : terra;
  const markerShapes = markerView === terra ? shapes : liveShapes;
  // The Terraferma's markers and spots, made again when the map changes or every ten seconds
  // (their countdowns), never at each second's clock: the map stays smooth.
  const tenSeconds = Math.floor(now / 10_000);
  // biome-ignore lint/correctness/useExhaustiveDependencies: `tenSeconds` paces the countdowns.
  const terraMarkerList = useMemo(
    () =>
      markerView && markerShapes ? terraMarkers(props, markerView, markerShapes, select) : null,
    [markerView, markerShapes, select, tenSeconds],
  );
  const terraSpotList = useMemo(
    () => (terra && shapes ? terraSpots(terra, shapes) : null),
    [terra, shapes],
  );
  const terraFocusList = useMemo(
    () => (terra && shapes ? terraFocus(terra, shapes) : null),
    [terra, shapes],
  );
  // The Terraferma opens on the merchant's land; its round then shows the whole map, and back.
  const [onMine, setOnMine] = useState(true);
  useEffect(() => {
    if (props.layer === "terra") setOnMine(true);
  }, [props.layer]);
  const terraCell = terra && sel?.kind === "terra" ? sel.cell : null;
  const campaignPanel = campaign ? (
    <CampaignPanel props={props} f={campaign} sel={sel} select={select} />
  ) : null;
  const panelUp = !!sel;

  // On a computer, the trade's side column (orders, workshops, prices) beside the map.
  const side = wide && !campaign && !terra;
  // Where the HUD's band across the top ends: the map is framed under it on a phone.
  const [hudBand, setHudBand] = useState(0);
  // The HUD's band for what sits under it outside the map (Lorenzo's bubble).
  useEffect(() => {
    if (hudBand > 0) document.documentElement.style.setProperty("--hud-top", `${hudBand}px`);
  }, [hudBand]);
  const insets = wide
    ? // The tabs at the foot of the screen (and the campaign's pledge above them) stay clear.
      {
        top: 110,
        right: (panelUp ? 460 : 40) + (side ? SIDE_W : 0),
        // The Terraferma's actions above the tabs, at the right, stay clear too.
        bottom: (campaign && !campaign.mine) || (terra && !terra.me) ? 170 : terra ? 180 : 190,
        left: 40,
      }
    : {
        top: Math.max(campaign || terra ? 160 : 150, hudBand),
        right: 12,
        // The trade keeps its strip of what comes next clear, above the tabs (shown from 640 px high).
        bottom: panelUp ? 200 : terra ? 156 : campaign || window.innerHeight < 640 ? 100 : 160,
        left: 12,
      };

  // The panel of the selection.
  let panel: ReactNode = campaignPanel;
  if (terra && shapes)
    panel = (
      <TerraPanel
        key={terraCell ?? "none"}
        props={props}
        v={terra}
        s={shapes}
        cell={terraCell}
        select={select}
        act={terraAct}
      />
    );
  const trade = !campaign && !terra;
  // The layer shown, for the HUD and the tabs.
  const layer = campaign ? "campaign" : terra ? "terra" : "trade";
  // The counter opens up close, its workshops in orbit around its sun.
  if (trade && sel?.kind === "home")
    panel = (
      <ComptoirOrbit
        props={props}
        crest={crest}
        from='[data-coach="home"]'
        onClose={() => select(null)}
      />
    );
  if (trade && sel?.kind === "city") {
    const i = cities.indexOf(sel.code);
    const step = (k: number) =>
      select({ kind: "city", code: cities[(i + k + cities.length) % cities.length] ?? sel.code });
    // A city opens up close, its orders in orbit around it.
    panel = (
      <CityOrbit
        props={props}
        code={sel.code}
        from={`[data-coach="city-${sel.code}"]`}
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
  // A place closed shrinks back into the map (its exit), whichever way it was closed (its chevron,
  // Escape, the phone's back, the map touched); not when another selection takes its room.
  const orbitOpen = trade && (sel?.kind === "home" || sel?.kind === "city");
  const lastOrbit = useRef<ReactNode>(null);
  if (orbitOpen) lastOrbit.current = panel;
  const orbitLeaving = useLeaving(orbitOpen, 160);
  if (trade && selectedCart) {
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
          load={cartLoad}
          onCancel={() => setDeparture(null)}
          onGo={async () => {
            const ids = cartLoad.map((o) => o.id);
            const ok = await props.act({
              type: "dispatchDelivery",
              orderId: ids[0] ?? "",
              ...(ids.length > 1 ? { orderIds: ids } : {}),
              vehicleId: selectedCart.id,
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

  if (!orbitOpen && orbitLeaving && !panel && isValidElement(lastOrbit.current))
    panel = cloneElement(lastOrbit.current as ReactElement<{ leaving?: boolean }>, {
      leaving: true,
    });

  const [sheetKind, sheetId] = (props.sheet ?? "").split(":");
  const cargoVehicle = sheetKind === "cargo" ? vehicles.find((v) => v.id === sheetId) : undefined;
  // The letter of the day (R10), the week's Atouts (R3) and the Senate (R7) wait under the bell.
  const notice =
    props.unread +
    carnetRewards(props) +
    (letterWaiting(view) ? 1 : 0) +
    (atoutWaiting(view) ? 1 : 0) +
    (senateWaiting(props) ? 1 : 0) +
    // A spy at the door (R8).
    (view.broglio?.spied ? 1 : 0);
  const days = Math.max(1, (catalog.world.endsAt - catalog.world.startsAt) / 86_400_000);
  const open = unlocksOf(view.tutorial, now - view.player.joinedAt);
  const seasonProgress = Math.min(1, (now - catalog.world.startsAt) / (days * 86_400_000));
  const maxCarts = catalog.road?.maxVehicles ?? 0;

  return (
    <div
      className="fixed inset-0 overflow-hidden bg-night"
      style={{ overflow: "clip", ["--side" as string]: side ? `${SIDE_W}px` : "0px" }}
    >
      <WorldMap
        ref={map}
        region={region}
        cities={cities}
        layer={campaign ? "campaign" : terra ? "terra" : "trade"}
        spots={
          campaign
            ? campaign.lands.map((l) => ({ key: `land:${l.code}`, x: l.x, y: l.y }))
            : (terraSpotList ?? [])
        }
        focus={terraFocusList ?? undefined}
        overlay={
          campaign ? (
            <CampaignOverlay f={campaign} now={now} />
          ) : terra && shapes ? (
            <TerraOverlay v={terra} s={shapes} cell={terraCell} />
          ) : undefined
        }
        moving={terra && shapes ? <TerraFronts v={terra} s={shapes} /> : undefined}
        markers={campaign ? campaignMarkers(props, campaign, select) : (terraMarkerList ?? markers)}
        parked={trade ? parked : []}
        roads={trade ? roads : []}
        litRoads={trade ? litCities : []}
        planned={
          trade ? (departure?.city ?? (cartFree && cartHold?.city ? cartHold.city : null)) : null
        }
        clockOffset={props.clockOffset}
        insets={insets}
        selectedKey={key}
        onEmptyTap={(at) => {
          if (terra && shapes) {
            const cell = terraTap(terra, shapes, at.x, at.y);
            select(cell === null || cell === terraCell ? null : { kind: "terra", cell });
            return;
          }
          if (departure) setDeparture(null);
          else if (sel) select(null);
        }}
      />
      <MapHud
        onBand={setHudBand}
        pseudo={pseudo || m.home("")}
        crest={crest}
        title={view.standing.title.current.name}
        level={props.level?.level ?? null}
        tier={props.lustre?.tier ?? null}
        rank={view.standing.rank}
        rival={rivalLine(props.rival)}
        seasonProgress={seasonProgress}
        cash={view.cash}
        rate={!campaign && !terra && perHour(props) > 0n ? m.rate(d(perHour(props))) : null}
        // Three counters on the map (recommendations of 20 October 2026): the ducats, the rank
        // and the carts; the Influence lives in the Profil.
        influence={null}
        tips={hudTips(props)}
        bread={breadOf(view, now)}
        fleet={
          fleetShown && (
            <FleetDrawer
              lines={vehicles.map((v) => fleetLine(props, v, tripOf(deliveries, v, now)))}
              open={fleetOpen}
              leaving={fleetLeaving}
              canBuy={!!road && vehicles.length < maxCarts}
              onPick={(id) => {
                setFleetOpen(false);
                select({ kind: "cart", id });
              }}
              onBuy={() => {
                setFleetOpen(false);
                setBuying(true);
              }}
              onClose={closeFleet}
            />
          )
        }
        fleetOpen={fleetOpen}
        onFleet={() => setFleetOpen((o) => !o)}
        freeCarts={freeVehicles.length}
        carts={vehicles.length}
        canBuyCart={!!road && vehicles.length < maxCarts}
        notices={notice > 0 ? notice : !!criee}
        bales={view.tutorial.includes("mission") ? (view.bales?.available ?? 0) : 0}
        guidePaused={props.guidePaused}
        bottom={!panelUp}
        layer={layer}
        right={
          campaign ? (
            <CampaignHud f={campaign} now={now} />
          ) : terra ? (
            <TerraHud v={terra} now={now} regions={props.catalog.regions} folded={skirmishOn} />
          ) : undefined
        }
        timeline={
          !campaign && !terra ? (
            <TimeStrip
              now={now}
              items={upcoming(
                {
                  buildings: view.buildings,
                  deliveries,
                  nextWaveAt: view.agenda.nextWaveAt,
                  building: props.names.building,
                  city: props.names.city,
                },
                now,
              )}
            />
          ) : undefined
        }
        actions={
          // Without a camp, the invitation to set one down is the only call at the foot.
          terra?.me && !skirmishOn && !condottaOn ? (
            <TerraActions
              v={terra}
              extra={
                terraFocusList && (
                  <button
                    type="button"
                    data-hud="terra-locate"
                    aria-label={onMine ? fr.game.terra.wholeMap : fr.game.terra.locate}
                    onClick={() => {
                      if (onMine) map.current?.fit();
                      else map.current?.focus();
                      setOnMine(!onMine);
                    }}
                    className="pointer-events-auto flex h-11 w-11 items-center justify-center rounded-full bg-night/85 text-info shadow-[0_4px_14px_rgb(0_0_0/0.45)] ring-1 ring-inset ring-info/45 backdrop-blur active:scale-95"
                  >
                    {onMine ? <Icon.wholeMap /> : <Icon.locate />}
                  </button>
                )
              }
              onSkirmish={() => setSkirmishOn(true)}
              onCondotta={() => setCondottaOn(true)}
              onReplay={week.playing ? undefined : week.start}
            />
          ) : undefined
        }
        onProfile={() => props.setSheet("profile")}
        onNotices={() => props.setSheet("notices")}
        onBales={() => props.setSheet("bales")}
        onRialto={open.rialto ? () => props.goTo("marche") : undefined}
        onBuyCart={() => setBuying(true)}
        onResumeGuide={props.onResumeGuide}
        onRanking={() => props.setSheet("ranking")}
        onRival={props.rival?.sfida ? () => props.setSheet("sfida") : undefined}
        onSera={view.sera ? () => props.setSheet("sera") : undefined}
        sera={openSeraLots(view)}
        // On the Terraferma, the help is its guide with its diagrams.
        onHelp={terra ? props.openTerraGuide : props.openHelp}
      />
      <TabBar
        active={activeTab({ sheet: props.sheet, layer })}
        items={[
          {
            id: "map",
            coach: "tab-map",
            onClick: () => {
              if (layer !== "trade") props.setLayer("trade");
              props.setSheet(null);
              select(null);
            },
          },
          {
            id: "workshops",
            dot: ready > 0,
            coach: "tab-workshops",
            onClick: () => {
              if (layer !== "trade") props.setLayer("trade");
              props.setSheet("workshops");
            },
          },
          {
            // Until Venice has its own screen (lot 5 of the refonte): the city on the map.
            id: "venice",
            dot: openSeraLots(view) > 0,
            onClick: () => {
              if (layer !== "trade") props.setLayer("trade");
              props.setSheet(null);
              goCity("venezia");
            },
          },
          {
            id: "ranking",
            locked: open.ranking ? undefined : fr.game.unlocks.afterDelivery,
            onClick: () => props.setSheet("ranking"),
          },
          ...(view.families || terraView
            ? [
                {
                  id: "conquest" as const,
                  coach: "tab-layer",
                  dot:
                    layer === "trade" &&
                    (terraView ? terraCalls(terraView, now) : familyCalls(props)),
                  locked:
                    layer === "trade" && !open.terraferma
                      ? fr.game.unlocks.afterFirstDay
                      : undefined,
                  onForce: terraView
                    ? () => {
                        openTerraEarly();
                        props.setLayer("terra");
                      }
                    : undefined,
                  onClick: () => {
                    props.setSheet(null);
                    if (terraView) props.setLayer("terra");
                    else props.goTo("famille");
                  },
                },
              ]
            : []),
        ]}
      />
      {panel}
      {terra && !skirmishOn && !condottaOn && (
        <TerraIntro onGuide={props.openTerraGuide} top={Math.max(160, hudBand)} />
      )}
      {terra && skirmishOn && (
        <SkirmishBar
          status={skirmish.status}
          now={now}
          onJoin={() => {
            void gameApi
              .skirmishJoin()
              .catch(() => undefined)
              .finally(refreshSkirmish);
          }}
          onLeave={() => setSkirmishOn(false)}
        />
      )}
      {terra && condottaOn && (
        <CondottaBar
          status={condotta.status}
          now={now}
          error={condottaError}
          cityName={(cell) => {
            const code = condottaView?.map.cities.find((c) => c.cell === cell)?.code;
            return code ? props.names.city(code) : "—";
          }}
          onOpen={(company) => {
            setCondottaError(null);
            void gameApi
              .condottaOpen(company)
              .catch((e) =>
                setCondottaError(
                  fr.game.condotta.errors[e instanceof ApiError ? e.code : ""] ??
                    fr.game.condotta.errors.other ??
                    null,
                ),
              )
              .finally(refreshCondotta);
          }}
          onJoin={(lobby) => {
            void gameApi
              .condottaJoin(lobby)
              .catch(() => undefined)
              .finally(refreshCondotta);
          }}
          onLeave={() => setCondottaOn(false)}
        />
      )}
      {side && <SideColumn props={props} onCity={goCity} />}
      {terra && absence.replaying && (
        <span
          style={{ top: Math.max(120, hudBand) + 8 }}
          className="pointer-events-none absolute left-1/2 z-10 -translate-x-1/2 animate-fade whitespace-nowrap rounded-full bg-night/80 px-3 py-1 font-mono text-xs uppercase tracking-[0.1em] text-cream-dim ring-1 ring-line"
        >
          {fr.game.terra.away}
        </span>
      )}
      {terra && week.playing && (
        // The week replayed is said, as the absence is, and may be skipped.
        <button
          type="button"
          data-hud="terra-replaying"
          onClick={week.stop}
          style={{ top: Math.max(120, hudBand) + 8 }}
          className="absolute left-1/2 z-10 flex min-h-11 -translate-x-1/2 animate-fade items-center gap-2 whitespace-nowrap rounded-full bg-night/80 px-4 font-mono text-xs uppercase tracking-[0.1em] text-cream-dim ring-1 ring-line"
        >
          {fr.game.terraRecord.replaying}
          <span className="text-info">{fr.game.terraRecord.skip}</span>
        </button>
      )}

      <CounterSheets {...props} />
      <SuppliersSheet {...props} />
      <SignoriaSheet {...props} />
      <SfidaSheet {...props} />
      <ChallengeSheet {...props} />
      <SeraSheet {...props} />
      <AtoutsSheet {...props} />
      <LetterSheet {...props} />
      <SenateSheet {...props} />
      <BroglioSheet {...props} />
      <WarehouseSheet {...props} />
      <FondacoSheet {...props} />
      {families && <CampaignSheets props={props} f={families} select={select} />}
      {terraView && <TerraSheets props={props} v={terraView} act={terraAct} />}
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
      {props.sheet === null && <ComeBack {...props} />}
    </div>
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
      <span className="font-sans text-xs font-normal normal-case tracking-normal text-cream-dim">
        {units}/{capacity}
      </span>
    </>
  );
  if (trip) {
    const city = props.names.city(trip.route.split(":")[1] ?? "");
    const out = now < trip.arriveAt;
    // Influence brings it there and its vehicle home at once, for a price by the time left.
    const spend = props.view.houseSpend;
    const rush =
      spend && spend.rushMinutesPerPoint > 0 && spend.rushPerDay > 0 && now < trip.backAt
        ? {
            cost: Math.max(
              1,
              Math.ceil((trip.backAt - now) / (spend.rushMinutesPerPoint * 60_000)),
            ),
            left: spend.rushesLeft,
          }
        : null;
    const share = out
      ? (now - trip.departAt) / Math.max(1, trip.arriveAt - trip.departAt)
      : (now - trip.arriveAt) / Math.max(1, trip.backAt - trip.arriveAt);
    return (
      <ContextPanel
        title={
          <>
            {vehicleName(vehicle.type)}{" "}
            <span className="font-sans text-xs font-normal normal-case tracking-normal text-cream-dim">
              {trip.loaded} {props.names.resource(trip.resource).toLowerCase()}
            </span>
          </>
        }
        chip={<span className="font-sans text-xs text-gold">{d(trip.paid ?? trip.payment)}</span>}
        status={
          out
            ? m.cart.outbound(city, clock(trip.arriveAt - now))
            : m.cart.inbound(clock(trip.backAt - now))
        }
        extra={
          rush ? (
            <p className="text-center font-sans text-xs text-gold">
              {fr.game.house.spend.rushLine(out, rush.cost)}
            </p>
          ) : undefined
        }
        tone="lagoon"
        progress={share}
        onClose={onClose}
        onPrev={onPrev}
        onNext={onNext}
        actions={
          <>
            <ActionButton icon={Icon.follow()} label={m.buttons.follow} onClick={onFollow} />
            {rush && (
              <ActionButton
                icon={Icon.send()}
                label={fr.game.house.spend.rush}
                badge={`${rush.cost} ✦`}
                tone="gold"
                disabled={props.busy || rush.left === 0 || (props.influence ?? 0) < rush.cost}
                onClick={() => void props.spend({ use: "rush", deliveryId: trip.id })}
              />
            )}
          </>
        }
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
            tone={loadCity ? "gold" : "plain"}
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
  load,
  onGo,
  onCancel,
}: {
  props: GameProps;
  vehicle: VehicleView;
  city: string;
  /** The orders loaded. */
  load: DeliveryOrderView[];
  onGo: () => void;
  onCancel: () => void;
}) {
  const [left, setLeft] = useState(DEPART_SECONDS);
  const homeRoad = props.catalog.road?.routes[props.view.player.region]?.[city];
  const go = useRef(onGo);
  go.current = onGo;
  const fired = useRef(false);
  useEffect(() => {
    if (left <= 0) {
      if (!fired.current) {
        fired.current = true;
        go.current();
      }
      return;
    }
    const id = setTimeout(() => setLeft((x) => x - 1), 1_000);
    return () => clearTimeout(id);
  }, [left]);
  const road = props.view.road;
  const m = fr.game.map;
  const orders = road ? road.orders.filter((o) => o.city === city && o.status === "open") : [];
  const minutes =
    load[0]?.minutes[vehicle.type] ?? orders[0]?.minutes[vehicle.type] ?? homeRoad ?? 0;
  // The welcome order alone, express; after it, the first normal trip says so.
  const express = load.length > 0 && load.every((o) => o.express) ? load[0]?.express : undefined;
  const afterWelcome = !express && (road?.deliveries.some((dv) => dv.welcome) ?? false);
  return (
    <ContextPanel
      title={vehicleName(vehicle.type)}
      chip={
        <span className="meta">
          {express
            ? m.cart.express(clock(express * 1000))
            : afterWelcome
              ? m.cart.normalTrip(minutesLabel(minutes))
              : minutesLabel(minutes)}
        </span>
      }
      status={`${m.cart.leaving(props.names.city(city))} · ${left} s`}
      tone="lagoon"
      progress={(DEPART_SECONDS - left) / DEPART_SECONDS}
      onClose={onCancel}
      actions={
        <>
          <ActionButton
            icon={Icon.check()}
            label={m.buttons.go}
            tone="gold"
            coach="panel-go"
            disabled={props.busy || fired.current}
            onClick={() => {
              if (fired.current) return;
              fired.current = true;
              onGo();
            }}
          />
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
          <p className="meta">{fr.game.inStock(stock)}</p>
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
