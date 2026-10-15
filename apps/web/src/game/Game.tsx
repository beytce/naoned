import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { type Account, ApiError } from "../api.js";
import { Emblem } from "../art/logo.js";
import { haptic } from "../haptics.js";
import { fr } from "../i18n.js";
import { DEFAULT_PALETTE, applyPalette, currentPalette, needsPass } from "../theme.js";
import { CloseButton, Slab } from "../ui.js";
import { AmbushAlert } from "./AmbushAlert.js";
import { Ceremony } from "./Ceremony.js";
import { Help } from "./Help.js";
import { Intro } from "./Intro.js";
import { Port } from "./Port.js";
import { Region } from "./Region.js";
import { Welcome } from "./Welcome.js";
import { gameApi } from "./api.js";
import { onBack } from "./back.js";
import { MapScreen } from "./map/MapScreen.js";
import type { Selection } from "./map/WorldMap.js";
import { store } from "./store.js";

/** Actions that bring something in: a fuller cue than a plain tap. */
const REWARDING = new Set<string>([
  "collect",
  "collectAll",
  "collectAndRestart",
  "claimMission",
  "build",
  "upgrade",
  "sellToCity",
  "fulfillContract",
  "deliverToProject",
  "collectExpedition",
  "collectRaid",
  "buildShip",
  "dispatchDelivery",
  "collectBooty",
]);
import type {
  Action,
  Catalog,
  Ceremony as CeremonyData,
  GameResponse,
  PlayerView,
  PriceSeries,
  Welcome as WelcomeData,
} from "./types.js";

/** What opens over the map, full screen. */
export type Page = "port";
/**
 * Where the merchant is: the map (around their counter, or with a cart chosen), or a page over it.
 * Kept as the name every screen uses to send the merchant somewhere.
 */
export type Tab = "comptoir" | "routes" | "marche" | "top" | "famille" | "profil" | Page;
/** The map shown: the trade (cities, counter, carts) or the families' campaign (lands). */
export type Layer = "trade" | "campaign";

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
  busy: boolean;
  names: Names;
  /** Pseudos of merchants met at sea, by player id. */
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
}

const POLL_MS = 15_000;

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
  const [page, setPage] = useState<Page | null>(null);
  const [selection, setSelection] = useState<Selection | null>(null);
  const [layer, setLayerState] = useState<Layer>("trade");
  const setLayer = useCallback((l: Layer) => {
    haptic("tap");
    setSheet(null);
    setSelection(null);
    setLayerState(l);
  }, []);
  useEffect(() => {
    if (new URLSearchParams(window.location.search).has("ambush"))
      window.history.replaceState(null, "", "/");
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

  const apply = useCallback((serverTime: number, v: PlayerView | null) => {
    setOffset(serverTime - Date.now());
    viewRef.current = v;
    setView(v);
  }, []);

  const refresh = useCallback(async () => {
    try {
      const res = await gameApi.view();
      setViewFailed(null);
      apply(res.serverTime, res.view);
      setUnread((before) => {
        // A notice arrived while playing: a light cue (convoys, offers taken, boardings).
        if (loaded.current && (res.unread ?? 0) > before) haptic("success");
        loaded.current = true;
        return res.unread ?? 0;
      });
      setFamilyLatestAt(res.familyLatestAt ?? null);
      if (res.welcome) setWelcome(res.welcome);
      setCeremony(res.ceremony ?? null);
      setPassInfo({ upcomingPass: res.upcomingPass, passPrices: res.passPrices });
      setPeople(res.names ?? {});
      setBots(new Set(res.bots ?? []));
      if (res.view) setPrices((await gameApi.prices()).series);
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
    const poll = setInterval(refresh, POLL_MS);
    const clock = setInterval(() => setNow(Date.now()), 1000);
    return () => {
      clearInterval(poll);
      clearInterval(clock);
    };
  }, [refresh, loadCatalog]);

  /** Sends the merchant somewhere: a page over the map, or a place on it. */
  const goTo = useCallback((t: Tab) => {
    setSheet(null);
    haptic("tap");
    if (t === "famille") {
      // The families' campaign is a layer of the same map.
      setPage(null);
      setSelection(null);
      setLayerState("campaign");
      return;
    }
    if (t !== "profil" && t !== "port" && t !== "top") setLayerState("trade");
    if (t === "comptoir") {
      setPage(null);
      setSelection({ kind: "home" });
      return;
    }
    if (t === "routes") {
      setPage(null);
      const free = viewRef.current?.road?.vehicles.find((v) => v.status === "free");
      const any = viewRef.current?.road?.vehicles[0];
      const cart = free ?? any;
      setSelection(cart ? { kind: "cart", id: cart.id } : { kind: "home" });
      return;
    }
    if (t === "marche" || t === "top" || t === "profil") {
      // The Rialto (a sheet of Venice), the ranking and the profile open over the map.
      setPage(null);
      setSheet(t === "marche" ? "rialto" : t === "top" ? "ranking" : "profile");
      return;
    }
    setPage(t);
  }, []);
  const select = useCallback((s: Selection | null) => setSelection(s), []);

  // Back button: a page closes back to the map.
  useEffect(() => {
    if (!page) return;
    return onBack(() => {
      setPage(null);
      return true;
    });
  }, [page]);

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

  const act = useCallback(
    async (action: Action) => {
      if (acting.current) return false;
      acting.current = true;
      setBusy(true);
      try {
        const res = await gameApi.act(action);
        apply(res.serverTime, res.view);
        if (res.names) setPeople(res.names);
        if (res.bots) setBots(new Set(res.bots));
        if (res.error) {
          haptic("warn");
          setToast(fr.game.errors[res.error] ?? fr.errors.unknown ?? null);
          return false;
        }
        haptic(REWARDING.has(action.type) ? "success" : "tap");
        if (action.type === "instantOrder" || action.type === "sellToCity") {
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
    busy,
    names,
    people,
    familyLatestAt,
    bots,
    tab: page ?? (selection?.kind === "cart" ? "routes" : "comptoir"),
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
      setPage(null);
      setSelection(null);
    },
    resetGame: async () => {
      try {
        const res = await gameApi.reset();
        for (const key of ["introSeen", "guideDone", "guideHidden", "skipMarketBuy"])
          store.set(key, "0");
        setSheet(null);
        setPage(null);
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
          setPage(null);
          setGuideKey((k) => k + 1);
        }}
      />
      {page && <PageOverlay page={page} gp={gp} onClose={() => setPage(null)} />}

      {toast && (
        <div
          role="alert"
          className="fixed inset-x-4 top-[max(5rem,calc(env(safe-area-inset-top)+4.5rem))] z-50 mx-auto max-w-md animate-rise"
        >
          <button
            type="button"
            onClick={() => setToast(null)}
            className="flex w-full items-start gap-3 rounded-2xl bg-vermilion px-4 py-3 text-left text-sm font-semibold text-cream shadow-lg shadow-black/40"
          >
            <span aria-hidden="true" className="mt-px font-display font-extrabold">
              !
            </span>
            <span className="flex-1">{toast}</span>
          </button>
        </div>
      )}

      <AmbushAlert {...gp} />
      {help && <Help {...gp} onClose={() => setHelp(false)} />}
      {welcome && <Welcome {...gp} data={welcome} onClose={() => setWelcome(null)} />}
    </>
  );
}

/**
 * A page over the map (the Rialto, the port, the family, the ranking, the profile): full screen,
 * its name and a way back to the map, nothing else around it.
 */
function PageOverlay({ page, gp, onClose }: { page: Page; gp: GameProps; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-30 animate-screen overflow-y-auto overscroll-contain bg-night">
      <div className="mx-auto flex max-w-md items-center gap-3 px-4 pt-[max(0.75rem,env(safe-area-inset-top))] lg:max-w-6xl lg:px-8">
        <CloseButton onClick={onClose} />
        <h1 className="font-display text-lg font-extrabold uppercase tracking-wide">
          {fr.game.tabs[page]}
        </h1>
      </div>
      <main className="mx-auto w-full max-w-md px-4 pb-40 pt-4 lg:max-w-6xl lg:px-8 lg:pb-16 lg:pt-6">
        {page === "port" && <Port {...gp} />}
      </main>
    </div>
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
