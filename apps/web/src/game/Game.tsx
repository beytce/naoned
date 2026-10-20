import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { type Account, ApiError } from "../api.js";
import { Emblem } from "../art/logo.js";
import { haptic } from "../haptics.js";
import { fr } from "../i18n.js";
import { type SoundKind, sound } from "../sound.js";
import { DEFAULT_PALETTE, applyPalette, currentPalette, needsPass } from "../theme.js";
import { Slab } from "../ui.js";
import { Ceremony } from "./Ceremony.js";
import { Help } from "./Help.js";
import { Intro } from "./Intro.js";
import { Region } from "./Region.js";
import { Welcome } from "./Welcome.js";
import { gameApi } from "./api.js";
import { onBack } from "./back.js";
import { FxLayer, flyCoins } from "./fx.js";
import { connectLive } from "./live.js";
import { MapScreen } from "./map/MapScreen.js";
import type { Selection } from "./map/WorldMap.js";
import { store } from "./store.js";

/** Actions that bring something in: a fuller cue than a plain tap. */
const REWARDING = new Set<string>([
  "collect",
  "collectAll",
  "collectAndRestart",
  "claimMission",
  "claimHouseMission",
  "spend:rush",
  "build",
  "upgrade",
  "sellToCity",
  "fulfillContract",
  "deliverToProject",
  "dispatchDelivery",
]);

/** The sound of an action that went through (none for the small ones). */
function soundOf(type: string): SoundKind | null {
  if (type.startsWith("collect")) return "harvest";
  if (type === "dispatchDelivery") return "cart";
  if (["startProduction", "build", "upgrade", "placeOrder"].includes(type)) return "stamp";
  if (REWARDING.has(type) || type === "instantOrder") return "coin";
  return null;
}

import type {
  Action,
  Catalog,
  Ceremony as CeremonyData,
  GameResponse,
  Level,
  PlayerView,
  PriceSeries,
  Spend,
  Welcome as WelcomeData,
} from "./types.js";

/** What opens over the map, full screen. */
/**
 * Where the merchant is: the map (around their counter, or with a cart chosen), or a page over it.
 * Kept as the name every screen uses to send the merchant somewhere.
 */
export type Tab = "comptoir" | "routes" | "marche" | "top" | "famille" | "profil";
/**
 * The map shown: the trade (cities, counter, carts), the families' campaign (lands) or the
 * Terraferma (the merchants' territories, docs/plan-terraferme.md).
 */
export type Layer = "trade" | "campaign" | "terra";

export interface Names {
  resource: (code: string) => string;
  building: (type: string) => string;
  city: (code: string) => string;
  region: (code: string) => string;
}

/** What every screen needs: data, names, navigation and a way to act. */
export interface GameProps {
  catalog: Catalog;
  view: PlayerView;
  /** Pass won for later, and its prices. */
  passInfo: Pick<GameResponse, "upcomingPass" | "passPrices">;
  account: Account;
  /** Server time now, ticking every second. */
  now: number;
  act: (action: Action) => Promise<boolean>;
  /** Spends the house's Influence on something in the world. */
  spend: (what: Spend) => Promise<boolean>;
  busy: boolean;
  names: Names;
  /** Pseudos of merchants met (family, order book), by player id. */
  people: Record<string, string | null>;
  /** Computer-run houses among them. */
  bots: Set<string>;
  tab: Tab;
  goTo: (tab: Tab) => void;
  /** What is chosen on the map. */
  selection: Selection | null;
  layer: Layer;
  setLayer: (layer: Layer) => void;
  select: (selection: Selection | null) => void;
  prices: PriceSeries;
  /** Sheets opened by the guide (so it can point inside them). */
  sheet: string | null;
  setSheet: (sheet: string | null) => void;
  openHelp: () => void;
  replayIntro: () => void;
  replayGuide: () => void;
  resetGame: () => Promise<void>;
  onAccount: (account: Account) => void;
  onLogout: () => void;
  onGuidePaused: () => void;
  /** The latest message of the family's thread (to tell whether it was read). */
  familyLatestAt: number | null;
  /** The house's Influence (null in a world without the house). */
  influence: number | null;
  /** The rival of the week (null: none). */
  rival: GameResponse["rival"];
  /** The merchant's permanent level (honorary). */
  level: Level | null;
}

/** Polling without the live line; with it, a safety net now and then. */
const POLL_MS = 15_000;
const POLL_LIVE_MS = 60_000;
/** On the minute's tick, everyone fetches within this span, not all at once. */
const TICK_SPREAD_MS = 20_000;
/** Price history: at most this often. */
const PRICES_MS = 60_000;

export function Game(props: {
  account: Account;
  onAccount: (a: Account) => void;
  onLogout: () => void;
}) {
  const { onLogout } = props;
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [catalogFailed, setCatalogFailed] = useState(false);
  /** Why the first view could not be read (shown on the opening screen), if it failed. */
  const [viewFailed, setViewFailed] = useState<string | null>(null);
  const [view, setView] = useState<PlayerView | null | undefined>(undefined);
  const [offset, setOffset] = useState(0);
  const [now, setNow] = useState(Date.now());
  const [selection, setSelection] = useState<Selection | null>(null);
  const [layer, setLayerState] = useState<Layer>("trade");
  const setLayer = useCallback((l: Layer) => {
    haptic("tap");
    setSheet(null);
    setSelection(null);
    setLayerState(l);
  }, []);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [prices, setPrices] = useState<PriceSeries>({});
  const [sheet, setSheet] = useState<string | null>(null);
  const [help, setHelp] = useState(false);
  const [introSeen, setIntroSeen] = useState(() => store.get("introSeen") === "1");
  const [guideKey, setGuideKey] = useState(0);
  const [unread, setUnread] = useState(0);
  const [familyLatestAt, setFamilyLatestAt] = useState<number | null>(null);
  const [influence, setInfluence] = useState<number | null>(null);
  const [rival, setRival] = useState<GameResponse["rival"]>(null);
  const [level, setLevel] = useState<Level | null>(null);
  const loaded = useRef(false);
  const [welcome, setWelcome] = useState<WelcomeData | null>(null);
  const [ceremony, setCeremony] = useState<CeremonyData | null>(null);
  const [passInfo, setPassInfo] = useState<Pick<GameResponse, "upcomingPass" | "passPrices">>({});
  const [people, setPeople] = useState<Record<string, string | null>>({});
  const [bots, setBots] = useState<Set<string>>(new Set());
  const clearUnread = useCallback(() => setUnread(0), []);
  /** One action at a time: a double tap must not buy, build or sail twice. */
  const acting = useRef(false);
  /** Where each section was scrolled to, so coming back to it finds the same place. */
  const viewRef = useRef<PlayerView | null | undefined>(undefined);
  /** The world's version of the view on screen, and when it was fetched. */
  const versionRef = useRef(0);
  const fetchedAt = useRef(0);
  const pricesAt = useRef(0);
  const liveOpen = useRef(false);

  const apply = useCallback((serverTime: number, v: PlayerView | null) => {
    setOffset(serverTime - Date.now());
    // Ducats came in (a sale, a delivery paid, a reward): they fly to the purse.
    const before = viewRef.current?.cash;
    if (before && v) flyCoins(BigInt(v.cash) - BigInt(before));
    viewRef.current = v;
    setView(v);
  }, []);

  const refresh = useCallback(async () => {
    try {
      fetchedAt.current = Date.now();
      const res = await gameApi.view();
      versionRef.current = Math.max(versionRef.current, res.version ?? 0);
      setViewFailed(null);
      // Ducats come in between two actions (a delivery paid on arrival): the coin's ring.
      const before = viewRef.current?.cash;
      if (loaded.current && before && res.view && BigInt(res.view.cash) > BigInt(before))
        sound("coin");
      apply(res.serverTime, res.view);
      setUnread((before) => {
        // A notice arrived while playing: a light cue (deliveries, offers taken).
        if (loaded.current && (res.unread ?? 0) > before) {
          haptic("success");
          sound("bell");
        }
        loaded.current = true;
        return res.unread ?? 0;
      });
      setFamilyLatestAt(res.familyLatestAt ?? null);
      setInfluence(res.influence ?? null);
      setRival(res.rival ?? null);
      setLevel(res.level ?? null);
      if (res.welcome) setWelcome(res.welcome);
      setCeremony(res.ceremony ?? null);
      setPassInfo({ upcomingPass: res.upcomingPass, passPrices: res.passPrices });
      setPeople(res.names ?? {});
      setBots(new Set(res.bots ?? []));
      if (res.view && Date.now() - pricesAt.current >= PRICES_MS) {
        pricesAt.current = Date.now();
        setPrices((await gameApi.prices()).series);
      }
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) onLogout();
      else setViewFailed(err instanceof ApiError ? `${err.status || ""} ${err.code}`.trim() : "?");
    }
  }, [apply, onLogout]);

  const loadCatalog = useCallback(() => {
    setCatalogFailed(false);
    gameApi
      .catalog()
      .then(setCatalog)
      .catch(() => setCatalogFailed(true));
  }, []);

  useEffect(() => {
    loadCatalog();
    refresh();
    // Polling, as a safety net once the live line is open; nothing while the game is hidden.
    const poll = setInterval(() => {
      if (document.hidden) return;
      const every = liveOpen.current ? POLL_LIVE_MS : POLL_MS;
      if (Date.now() - fetchedAt.current >= every - 1_000) refresh();
    }, POLL_MS);
    const clock = setInterval(() => setNow(Date.now()), 1000);
    // Back on the game after a while: fetch at once.
    const visible = () => {
      if (!document.hidden && Date.now() - fetchedAt.current >= POLL_MS) refresh();
    };
    document.addEventListener("visibilitychange", visible);
    // Live: the server says when the view changed.
    let pending: ReturnType<typeof setTimeout> | undefined;
    let pendingAt = Number.POSITIVE_INFINITY;
    const fetchIn = (ms: number) => {
      const at = Date.now() + ms;
      if (pending && pendingAt <= at) return;
      if (pending) clearTimeout(pending);
      pendingAt = at;
      pending = setTimeout(() => {
        pending = undefined;
        pendingAt = Number.POSITIVE_INFINITY;
        refresh();
      }, ms);
    };
    const close = connectLive(
      (message) => {
        // A view built from this version or a later one is already on screen.
        if (message.version <= versionRef.current) return;
        if (message.type === "changed") fetchIn(250);
        else fetchIn(Math.floor(Math.random() * TICK_SPREAD_MS));
      },
      (open) => {
        liveOpen.current = open;
      },
    );
    return () => {
      clearInterval(poll);
      clearInterval(clock);
      if (pending) clearTimeout(pending);
      document.removeEventListener("visibilitychange", visible);
      close();
    };
  }, [refresh, loadCatalog]);

  /**
   * Sends the merchant somewhere, always on the map: a place of the trade, the family's campaign,
   * or a sheet over it (the Rialto, the ranking, the profile).
   */
  const goTo = useCallback((t: Tab) => {
    setSheet(null);
    haptic("tap");
    if (t === "famille") {
      setSelection(null);
      setLayerState("campaign");
      return;
    }
    if (t === "top" || t === "profil") {
      setSheet(t === "top" ? "ranking" : "profile");
      return;
    }
    setLayerState("trade");
    if (t === "comptoir") {
      setSelection({ kind: "home" });
      return;
    }
    if (t === "routes") {
      const free = viewRef.current?.road?.vehicles.find((v) => v.status === "free");
      const any = viewRef.current?.road?.vehicles[0];
      const cart = free ?? any;
      setSelection(cart ? { kind: "cart", id: cart.id } : { kind: "home" });
      return;
    }
    // The Rialto, a sheet of Venice.
    setSheet("rialto");
  }, []);
  const select = useCallback((s: Selection | null) => setSelection(s), []);

  // Back button: another layer goes back to the trade's map.
  useEffect(() => {
    if (layer === "trade") return;
    return onBack(() => {
      setLayerState("trade");
      setSelection(null);
      return true;
    });
  }, [layer]);

  // The Pass's palette goes back to the default when the Pass ends.
  const passActive = view?.pass.active;
  useEffect(() => {
    if (passActive === false && needsPass(currentPalette())) applyPalette(DEFAULT_PALETTE);
  }, [passActive]);

  // A season closed while the game was open: the catalog (dates, name) is the new month's.
  const closedWorld = ceremony?.worldId;
  useEffect(() => {
    if (!closedWorld) return;
    gameApi
      .catalog()
      .then(setCatalog)
      .catch(() => undefined);
  }, [closedWorld]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  const names = useMemo<Names>(() => {
    const pick = (
      list: { code?: string; type?: string; name: string }[] | undefined,
      key: string,
    ) => list?.find((x) => x.code === key || x.type === key)?.name ?? key;
    return {
      resource: (c) => pick(catalog?.resources, c),
      building: (t) => pick(catalog?.buildings, t),
      city: (c) => pick(catalog?.cities, c),
      region: (c) => pick(catalog?.regions, c),
    };
  }, [catalog]);

  /** Sends an action (or a use of Influence) and puts the answer on screen. */
  const send = useCallback(
    async (request: () => Promise<GameResponse>, type: string) => {
      if (acting.current) return false;
      acting.current = true;
      setBusy(true);
      try {
        const res = await request();
        versionRef.current = Math.max(versionRef.current, res.version ?? 0);
        apply(res.serverTime, res.view);
        if (res.names) setPeople(res.names);
        if (res.bots) setBots(new Set(res.bots));
        if (res.influence !== undefined) setInfluence(res.influence);
        if (res.error) {
          haptic("warn");
          setToast(fr.game.errors[res.error] ?? fr.errors.unknown ?? null);
          return false;
        }
        haptic(REWARDING.has(type) ? "success" : "tap");
        const cue = soundOf(type);
        if (cue) sound(cue);
        if (type === "instantOrder" || type === "sellToCity") {
          pricesAt.current = Date.now();
          gameApi
            .prices()
            .then((p) => setPrices(p.series))
            .catch(() => undefined);
        }
        return true;
      } catch (err) {
        const code = err instanceof ApiError ? err.code : "unknown";
        haptic("warn");
        setToast(fr.game.errors[code] ?? fr.errors[code] ?? fr.errors.unknown ?? null);
        return false;
      } finally {
        acting.current = false;
        setBusy(false);
      }
    },
    [apply],
  );
  const act = useCallback((action: Action) => send(() => gameApi.act(action), action.type), [send]);
  const spend = useCallback(
    (what: Spend) => send(() => gameApi.spend(what), `spend:${what.use}`),
    [send],
  );

  if (!catalog || view === undefined) {
    const failed = catalogFailed || (view === undefined && viewFailed !== null);
    return (
      <Loading
        failed={failed}
        detail={viewFailed}
        onRetry={() => {
          loadCatalog();
          void refresh();
        }}
      />
    );
  }

  if (ceremony) {
    return (
      <Ceremony
        data={ceremony}
        nextSeason={catalog.world.name}
        pseudo={props.account.pseudo ?? ""}
        onDone={() => {
          haptic("success");
          setCeremony(null);
          gameApi.ceremonySeen(ceremony.worldId).catch(() => undefined);
        }}
      />
    );
  }

  if (view === null) {
    if (!introSeen) {
      return (
        <Intro
          onDone={() => {
            store.set("introSeen", "1");
            setIntroSeen(true);
          }}
        />
      );
    }
    return (
      <Region
        catalog={catalog}
        names={names}
        toast={toast}
        onJoin={async (region) => {
          try {
            const res = await gameApi.join(region);
            apply(res.serverTime, res.view);
          } catch (err) {
            const code = err instanceof ApiError ? err.code : "unknown";
            setToast(fr.game.errors[code] ?? fr.errors.unknown ?? null);
          }
        }}
      />
    );
  }

  if (!introSeen) {
    return (
      <Intro
        onDone={() => {
          store.set("introSeen", "1");
          setIntroSeen(true);
        }}
      />
    );
  }

  const gp: GameProps = {
    catalog,
    view,
    account: props.account,
    now: now + offset,
    act,
    spend,
    busy,
    names,
    people,
    familyLatestAt,
    influence,
    rival,
    level,
    bots,
    tab: layer === "campaign" ? "famille" : selection?.kind === "cart" ? "routes" : "comptoir",
    passInfo,
    goTo,
    selection,
    select,
    layer,
    setLayer,
    prices,
    sheet,
    setSheet,
    openHelp: () => setHelp(true),
    replayIntro: () => {
      store.set("introSeen", "0");
      setIntroSeen(false);
    },
    replayGuide: () => {
      store.set("guideDone", "0");
      store.set("guideHidden", "0");
      store.set("skipMarketBuy", "0");
      setGuideKey((k) => k + 1);
      setSelection(null);
    },
    resetGame: async () => {
      try {
        const res = await gameApi.reset();
        for (const key of ["introSeen", "guideDone", "guideHidden", "skipMarketBuy"])
          store.set(key, "0");
        setSheet(null);
        setSelection(null);
        setIntroSeen(false);
        apply(res.serverTime, res.view);
      } catch (err) {
        const code = err instanceof ApiError ? err.code : "unknown";
        setToast(fr.game.errors[code] ?? fr.errors.unknown ?? null);
      }
    },
    onAccount: props.onAccount,
    onLogout,
    onGuidePaused: () => setGuideKey((k) => k + 1),
  };
  const guidePaused = store.get("guideHidden") === "1" && store.get("guideDone") !== "1";

  return (
    <>
      <MapScreen
        {...gp}
        clockOffset={offset}
        unread={unread}
        onRead={clearUnread}
        guidePaused={guidePaused}
        guideKey={guideKey}
        onResumeGuide={() => {
          store.set("guideHidden", "0");
          setGuideKey((k) => k + 1);
        }}
      />

      {toast && (
        <div
          role="alert"
          className="fixed inset-x-4 top-[max(5rem,calc(env(safe-area-inset-top)+4.5rem))] z-50 mx-auto max-w-md animate-rise"
        >
          <button
            type="button"
            onClick={() => setToast(null)}
            className="flex w-full items-start gap-3 cut bg-vermilion px-4 py-3 text-left text-sm font-semibold text-cream shadow-lg shadow-black/40"
          >
            <span aria-hidden="true" className="mt-px font-display font-extrabold">
              !
            </span>
            <span className="flex-1">{toast}</span>
          </button>
        </div>
      )}

      <FxLayer />
      {help && <Help {...gp} onClose={() => setHelp(false)} />}
      {welcome && <Welcome {...gp} data={welcome} onClose={() => setWelcome(null)} />}
    </>
  );
}

/** Opening the game: the sign while it loads, and a way out when the network fails. */
function Loading({
  failed,
  detail,
  onRetry,
}: { failed: boolean; detail: string | null; onRetry: () => void }) {
  return (
    <main className="flex min-h-[100dvh] flex-col items-center justify-center gap-6 px-6 text-center">
      <span className={failed ? "" : "animate-pulse"}>
        <Emblem size={72} />
      </span>
      {failed ? (
        <>
          <p className="max-w-xs text-cream-dim">{fr.errors.network}</p>
          {detail && <p className="font-mono text-xs text-muted">{detail}</p>}
          <Slab onClick={onRetry}>{fr.game.retry}</Slab>
        </>
      ) : (
        <output className="label">{fr.game.loading}</output>
      )}
    </main>
  );
}
