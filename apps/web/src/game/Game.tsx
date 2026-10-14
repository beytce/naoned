import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { type Account, ApiError } from "../api.js";
import { Crest, defaultCrest } from "../art/crest.js";
import { Coin, NavIcon } from "../art/icons.js";
import { Emblem, Logotype } from "../art/logo.js";
import { Lorenzo } from "../art/scenes.js";
import { haptic } from "../haptics.js";
import { fr } from "../i18n.js";
import { DEFAULT_PALETTE, applyPalette, currentPalette, needsPass } from "../theme.js";
import { CountUp, Slab } from "../ui.js";
import { ActCard, SeasonFrieze } from "./Acts.js";
import { AmbushAlert } from "./AmbushAlert.js";
import { Bell } from "./Bell.js";
import { Ceremony } from "./Ceremony.js";
import { Coach } from "./Coach.js";
import { Comptoir, carnetRewards } from "./Comptoir.js";
import { Criee } from "./Criee.js";
import { Famille } from "./Famille.js";
import { Gazette } from "./Gazette.js";
import { Help } from "./Help.js";
import { Intro } from "./Intro.js";
import { Marche } from "./Marche.js";
import { Port, portOpensAt } from "./Port.js";
import { Profil } from "./Profil.js";
import { Region } from "./Region.js";
import { Routes } from "./Routes.js";
import { Top } from "./Top.js";
import { Welcome } from "./Welcome.js";
import { gameApi } from "./api.js";
import { onBack } from "./back.js";
import { amount } from "./format.js";
import { SectionBar, SectionNav } from "./stage.js";
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

export type Tab = "comptoir" | "routes" | "marche" | "famille" | "port" | "top" | "profil";
export type MarketTab = "joueurs" | "villes";

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
  marketTab: MarketTab;
  setMarketTab: (tab: MarketTab) => void;
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
/** Bottom bar; the profile opens from the coat of arms in the header. */
const ALL_TABS: Tab[] = ["comptoir", "routes", "marche", "famille", "port", "top"];

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
  // Opened from an ambush notification: straight to the roads (the alert shows over them).
  const [tab, setTab] = useState<Tab>(() =>
    new URLSearchParams(window.location.search).has("ambush") ? "routes" : "comptoir",
  );
  useEffect(() => {
    if (new URLSearchParams(window.location.search).has("ambush"))
      window.history.replaceState(null, "", "/");
  }, []);
  const [marketTab, setMarketTab] = useState<MarketTab>("joueurs");
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
  const scrolls = useRef<Partial<Record<Tab, number>>>({});
  const tabRef = useRef(tab);
  tabRef.current = tab;

  const apply = useCallback((serverTime: number, v: PlayerView | null) => {
    setOffset(serverTime - Date.now());
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

  // The drawers mounted now: a section's drawer carries the sections, else the game shows a bar.
  const [drawers, setDrawers] = useState(0);
  const holdSections = useCallback(() => {
    setDrawers((n) => n + 1);
    return () => setDrawers((n) => n - 1);
  }, []);

  /** Switches section, keeping each one's scroll; the current one again goes back to its top. */
  const goTo = useCallback((t: Tab) => {
    setSheet(null);
    if (t === tabRef.current) {
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    haptic("tap");
    scrolls.current[tabRef.current] = window.scrollY;
    setTab(t);
  }, []);

  useLayoutEffect(() => {
    window.scrollTo({ top: scrolls.current[tab] ?? 0 });
  }, [tab]);

  // Back button: from any section, back to the counter first (windows close before that).
  useEffect(
    () =>
      onBack(() => {
        if (tabRef.current === "comptoir") return false;
        goTo("comptoir");
        return true;
      }),
    [goTo],
  );

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

  // The road's tab only in a world with deliveries.
  const hasRoad = !!view?.road;
  const hasFamilies = !!view?.families;
  const TABS = useMemo(
    () => ALL_TABS.filter((t) => (t !== "routes" || hasRoad) && (t !== "famille" || hasFamilies)),
    [hasRoad, hasFamilies],
  );
  // The screen slides in from the side of the tab it comes from, as one turns pages.
  const lastTab = useRef(tab);
  const slide = useRef<"left" | "right">("right");
  if (lastTab.current !== tab) {
    const at = (t: Tab) => [...ALL_TABS, "profil"].indexOf(t);
    slide.current = at(tab) >= at(lastTab.current) ? "right" : "left";
    lastTab.current = tab;
  }

  // Computer: keys 1 to 6 switch sections (not while typing).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const next = TABS[Number(e.key) - 1];
      if (next) goTo(next);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [goTo, TABS]);

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
    tab,
    passInfo,
    goTo,
    marketTab,
    setMarketTab,
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
      setTab("comptoir");
    },
    resetGame: async () => {
      try {
        const res = await gameApi.reset();
        for (const key of ["introSeen", "guideDone", "guideHidden", "skipMarketBuy"])
          store.set(key, "0");
        setSheet(null);
        setTab("comptoir");
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

  const crest = props.account.crest ?? defaultCrest(props.account.id);
  // The family calls: open to the merchant, who has none yet; a levy waits; a land of theirs is
  // under attack.
  const fam = view.families;
  const familyCalls =
    !!fam &&
    ((!fam.mine && fam.opensAt <= now + offset) ||
      (fam.me?.levy ?? 0) > 0 ||
      fam.marches.some(
        (m) =>
          m.family !== fam.mine &&
          fam.lands.some((l) => l.code === m.target && l.holder === fam.mine && l.mine > 0),
      ));
  const portLocked = portOpensAt(view) > gp.now;
  const galleyBack =
    view.expeditions.some((e) => e.outcome === "pending" && e.returnAt <= gp.now) ||
    view.raids.some((r) => r.outcome === "cruising" && r.endAt <= gp.now) ||
    view.ships.some((s) => s.status === "damaged");

  const dayProgress = Math.min(1, view.day / catalog.world.seasonDays);
  const daysLeft = Math.ceil((catalog.world.endsAt - (now + offset)) / 86_400_000);
  const roadCalls =
    !!view.road &&
    (view.road.deliveries.some((dv) => dv.attack?.pending) ||
      (view.road.vehicles.some((v) => v.status === "free") &&
        view.road.orders.some((o) => o.status === "open")));
  // A message of the family's thread not read yet (the thread remembers the last one seen).
  const familyUnread =
    familyLatestAt !== null && familyLatestAt > Number(store.get("familySeen") ?? 0);
  const badge = (t: Tab) =>
    (t === "famille" && (familyCalls || familyUnread)) ||
    (t === "comptoir" && carnetRewards(gp) > 0) ||
    (t === "port" && galleyBack) ||
    (t === "routes" && roadCalls);
  const resumeGuide = guidePaused && (
    <button
      type="button"
      aria-label={fr.game.coach.resume}
      className="flex h-11 w-10 items-center justify-center rounded-full transition active:scale-95"
      onClick={() => {
        store.set("guideHidden", "0");
        setTab("comptoir");
        setGuideKey((k) => k + 1);
      }}
    >
      <span className="flex rounded-full ring-2 ring-gold">
        <Lorenzo size={26} />
      </span>
    </button>
  );
  const purse = (
    <div className="mr-1 flex items-center gap-1.5 rounded-full bg-night-3 py-1 pl-1 pr-2.5 ring-1 ring-line">
      <Coin size={22} />
      <span className="whitespace-nowrap font-display text-sm font-extrabold tabular-nums">
        <CountUp value={Number(view.cash)} format={(v) => amount(BigInt(Math.round(v)))} />
      </span>
    </div>
  );
  const crestButton = (
    <button
      type="button"
      aria-label={fr.game.tabs.profil}
      aria-current={tab === "profil" ? "page" : undefined}
      className={`flex h-11 w-11 items-center justify-center rounded-full transition active:scale-95 ${tab === "profil" ? "bg-gold/15" : ""}`}
      onClick={() => gp.goTo("profil")}
    >
      <span
        className={`rounded-full bg-night-3 p-0.5 ring-2 ${tab === "profil" ? "ring-gold" : "ring-gold/50"}`}
      >
        <Crest crest={crest} size={30} />
      </span>
    </button>
  );

  const sections = {
    items: TABS.map((t) => {
      const Icon = NavIcon[t];
      return {
        key: t,
        label: fr.game.tabs[t],
        icon: <Icon />,
        dot: badge(t),
        dim: t === "port" && portLocked,
      };
    }),
    current: tab,
    go: (t: string) => gp.goTo(t as Tab),
    hold: holdSections,
  };

  return (
    <SectionNav.Provider value={sections}>
      <div className="flex min-h-[100dvh] flex-col lg:pl-64">
        {/* Computer: a game's side bar, sections in full and the merchant at the bottom. */}
        <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-line bg-night-2 px-4 py-6 lg:flex">
          <Logotype size={30} className="px-2" />
          <nav className="mt-10 space-y-1">
            {TABS.map((t, i) => {
              const on = tab === t;
              const Icon = NavIcon[t];
              return (
                <button
                  key={t}
                  type="button"
                  data-coach={`tab-${t}`}
                  aria-current={on ? "page" : undefined}
                  onClick={() => gp.goTo(t)}
                  className={`relative flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition ${on ? "bg-night-4 text-gold" : "text-cream-dim hover:bg-night-3 hover:text-cream"} ${t === "port" && portLocked ? "opacity-50" : ""}`}
                >
                  <Icon />
                  <span className="flex-1 font-display text-sm font-extrabold uppercase tracking-wide">
                    {fr.game.tabs[t]}
                  </span>
                  {badge(t) && !on && <span className="h-2 w-2 rounded-full bg-vermilion" />}
                  <kbd className="font-mono text-[10px] text-muted">{i + 1}</kbd>
                </button>
              );
            })}
          </nav>
          <button
            type="button"
            onClick={() => gp.goTo("profil")}
            aria-current={tab === "profil" ? "page" : undefined}
            className={`mt-auto flex items-center gap-3 rounded-2xl border p-3 text-left transition hover:border-gold/60 ${tab === "profil" ? "border-gold/70" : "border-line"}`}
          >
            <Crest crest={crest} size={40} />
            <span className="min-w-0">
              <span className="block truncate font-display text-sm font-extrabold">
                {props.account.pseudo ?? fr.game.anonymous}
              </span>
              <span className="label block truncate">
                {view.standing.title.current.name} · #{view.standing.rank ?? "—"}
              </span>
            </span>
          </button>
        </aside>

        <header className="sticky top-0 z-20 border-b border-line/60 bg-night/90 px-4 pb-2 pt-[max(0.75rem,env(safe-area-inset-top))] backdrop-blur lg:px-8 lg:py-3">
          <div className="mx-auto flex max-w-md items-center gap-2 lg:max-w-6xl lg:gap-4">
            {/* Phone: the game's name on the counter, the section's name everywhere else. */}
            <h1 className="flex min-w-0 flex-1 items-center gap-2 lg:hidden">
              {tab === "comptoir" && (
                <span className="shrink-0">
                  <Emblem size={32} />
                </span>
              )}
              {/* With the guide's button in the header, the counter keeps just its sign. */}
              {!(tab === "comptoir" && guidePaused) && (
                <span className="truncate font-display text-base font-extrabold uppercase leading-none tracking-tight">
                  {tab === "comptoir" ? fr.appName : fr.game.tabs[tab]}
                </span>
              )}
            </h1>
            <div className="hidden min-w-0 flex-1 lg:block">
              {view.acts.length > 0 ? (
                <SeasonFrieze {...gp} className="max-w-md" />
              ) : (
                <>
                  <p className="label text-lagoon">
                    {fr.game.dayOf(view.day, catalog.world.seasonDays)}
                  </p>
                  <div className="mt-1.5 h-1 w-64 overflow-hidden rounded-full bg-night-4">
                    <div
                      className="h-full rounded-full bg-lagoon"
                      style={{ width: `${dayProgress * 100}%` }}
                    />
                  </div>
                </>
              )}
            </div>
            <div className="ml-auto flex shrink-0 items-center gap-0.5 lg:gap-3">
              {purse}
              {resumeGuide}
              <Bell {...gp} unread={unread} onRead={clearUnread} />
              <span className="lg:hidden">{crestButton}</span>
            </div>
          </div>
          {/* Phone: the season's day, as a line under the header. */}
          {view.acts.length > 0 ? (
            <div className="mx-auto mt-2 max-w-md lg:hidden">
              <SeasonFrieze {...gp} />
            </div>
          ) : (
            <div className="mx-auto mt-2 flex max-w-md items-center gap-3 lg:hidden">
              <p className="label shrink-0 text-lagoon">
                {fr.game.dayOf(view.day, catalog.world.seasonDays)}
              </p>
              <div className="h-1 flex-1 overflow-hidden rounded-full bg-night-4">
                <div
                  className="h-full rounded-full bg-lagoon"
                  style={{ width: `${dayProgress * 100}%` }}
                />
              </div>
            </div>
          )}
        </header>

        <Gazette {...gp} />
        <ActCard {...gp} />

        {view.player.upkeepDefaultUntil > gp.now && (
          <div className="mx-auto mt-3 w-full max-w-md px-4 lg:max-w-6xl lg:px-8">
            <p className="rounded-xl bg-vermilion/15 p-3 text-sm text-vermilion ring-1 ring-vermilion/60">
              {fr.game.upkeepDefault}
            </p>
          </div>
        )}

        <Ambient tab={tab} />
        <main className="mx-auto w-full max-w-md flex-1 px-4 pb-40 pt-4 lg:max-w-6xl lg:px-8 lg:pb-16 lg:pt-6">
          <Criee {...gp} />
          {daysLeft > 0 && daysLeft <= 3 && (
            <p className="mb-4 rounded-2xl border border-gold/60 bg-gold/10 px-4 py-3 text-sm text-gold">
              {fr.game.season.lastSprint(daysLeft)}
            </p>
          )}
          {/* Each section slides in from its side, its blocks rising one after the other. */}
          <div
            key={tab}
            className={`stagger ${slide.current === "right" ? "animate-screen-right" : "animate-screen-left"}`}
          >
            {tab === "comptoir" && <Comptoir {...gp} />}
            {tab === "routes" && <Routes {...gp} />}
            {tab === "marche" && <Marche {...gp} />}
            {tab === "famille" && <Famille {...gp} />}
            {tab === "port" && <Port {...gp} />}
            {tab === "top" && <Top {...gp} />}
            {tab === "profil" && <Profil {...gp} />}
          </div>
        </main>

        <Coach key={guideKey} {...gp} />

        {toast && (
          <div
            role="alert"
            className="fixed inset-x-4 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-50 mx-auto max-w-md animate-rise lg:bottom-8"
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

        {/* Phone: a section's folded drawer carries the sections; a screen without a drawer (the
            profile, the port before its day) keeps them as a bar of their own. */}
        {drawers === 0 && (
          <nav
            data-bottom-nav
            className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-night-2/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
          >
            <SectionBar />
          </nav>
        )}
      </div>
    </SectionNav.Provider>
  );
}

const GLOW: Record<string, string> = {
  comptoir: "gold",
  routes: "lagoon",
  marche: "gold",
  famille: "vermilion",
  port: "lagoon",
  top: "gold",
  profil: "gold",
};

/**
 * Behind the screens: a light whose colour follows the section, and a few blurred shapes (a sail,
 * crates) drifting slowly in the haze.
 */
function Ambient({ tab }: { tab: Tab }) {
  const tone = GLOW[tab] ?? "gold";
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      {(["gold", "lagoon", "vermilion"] as const).map((c) => (
        <div
          key={c}
          className="ambient absolute inset-0"
          style={{
            opacity: c === tone ? 1 : 0,
            background: `radial-gradient(42rem 26rem at 50% -6%, rgb(var(--${c}) / 0.16), transparent 70%)`,
          }}
        />
      ))}
      <div className="drift absolute -left-10 top-[30%] h-40 w-28 opacity-[0.07] blur-md">
        <svg viewBox="0 0 60 90" className="h-full w-full" aria-hidden="true">
          <path d="M8 84 L52 84 L30 6 Z" fill="rgb(var(--cream))" />
        </svg>
      </div>
      <div
        className="drift absolute -right-8 top-[58%] h-28 w-28 opacity-[0.06] blur-md"
        style={{ animationDelay: "-9s" }}
      >
        <div className="h-full w-full rotate-12 bg-[rgb(var(--gold))]" />
      </div>
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
