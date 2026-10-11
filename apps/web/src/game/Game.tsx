import { useCallback, useEffect, useMemo, useState } from "react";
import { type Account, ApiError } from "../api.js";
import { Crest, defaultCrest } from "../art/crest.js";
import { Coin, NavIcon } from "../art/icons.js";
import { Logotype } from "../art/logo.js";
import { Lorenzo } from "../art/scenes.js";
import { fr } from "../i18n.js";
import { Bell } from "./Bell.js";
import { Coach } from "./Coach.js";
import { Comptoir } from "./Comptoir.js";
import { Contrats } from "./Contrats.js";
import { Gazette } from "./Gazette.js";
import { Help } from "./Help.js";
import { Intro } from "./Intro.js";
import { Marche } from "./Marche.js";
import { Port, portOpensAt } from "./Port.js";
import { Profil } from "./Profil.js";
import { Region } from "./Region.js";
import { Top } from "./Top.js";
import { Welcome } from "./Welcome.js";
import { gameApi } from "./api.js";
import { d } from "./format.js";
import { store } from "./store.js";
import type { Action, Catalog, PlayerView, PriceSeries, Welcome as WelcomeData } from "./types.js";

export type Tab = "comptoir" | "marche" | "contrats" | "port" | "top" | "profil";
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
}

const POLL_MS = 15_000;
/** Bottom bar; the profile opens from the coat of arms in the header. */
const TABS: Tab[] = ["comptoir", "marche", "contrats", "port", "top"];

export function Game(props: {
  account: Account;
  onAccount: (a: Account) => void;
  onLogout: () => void;
}) {
  const { onLogout } = props;
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [view, setView] = useState<PlayerView | null | undefined>(undefined);
  const [offset, setOffset] = useState(0);
  const [now, setNow] = useState(Date.now());
  const [tab, setTab] = useState<Tab>("comptoir");
  const [marketTab, setMarketTab] = useState<MarketTab>("joueurs");
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [prices, setPrices] = useState<PriceSeries>({});
  const [sheet, setSheet] = useState<string | null>(null);
  const [help, setHelp] = useState(false);
  const [introSeen, setIntroSeen] = useState(() => store.get("introSeen") === "1");
  const [guideKey, setGuideKey] = useState(0);
  const [unread, setUnread] = useState(0);
  const [welcome, setWelcome] = useState<WelcomeData | null>(null);
  const [people, setPeople] = useState<Record<string, string | null>>({});
  const [bots, setBots] = useState<Set<string>>(new Set());
  const clearUnread = useCallback(() => setUnread(0), []);

  const apply = useCallback((serverTime: number, v: PlayerView | null) => {
    setOffset(serverTime - Date.now());
    setView(v);
  }, []);

  const refresh = useCallback(async () => {
    try {
      const res = await gameApi.view();
      apply(res.serverTime, res.view);
      setUnread(res.unread ?? 0);
      if (res.welcome) setWelcome(res.welcome);
      setPeople(res.names ?? {});
      setBots(new Set(res.bots ?? []));
      if (res.view) setPrices((await gameApi.prices()).series);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) onLogout();
    }
  }, [apply, onLogout]);

  useEffect(() => {
    gameApi
      .catalog()
      .then(setCatalog)
      .catch(() => setToast(fr.errors.network ?? null));
    refresh();
    const poll = setInterval(refresh, POLL_MS);
    const clock = setInterval(() => setNow(Date.now()), 1000);
    return () => {
      clearInterval(poll);
      clearInterval(clock);
    };
  }, [refresh]);

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
      setBusy(true);
      try {
        const res = await gameApi.act(action);
        apply(res.serverTime, res.view);
        if (res.names) setPeople(res.names);
        if (res.bots) setBots(new Set(res.bots));
        if (res.error) {
          setToast(fr.game.errors[res.error] ?? fr.errors.unknown ?? null);
          return false;
        }
        if (action.type === "instantOrder" || action.type === "sellToCity") {
          gameApi
            .prices()
            .then((p) => setPrices(p.series))
            .catch(() => undefined);
        }
        return true;
      } catch (err) {
        const code = err instanceof ApiError ? err.code : "unknown";
        setToast(fr.game.errors[code] ?? fr.errors[code] ?? fr.errors.unknown ?? null);
        return false;
      } finally {
        setBusy(false);
      }
    },
    [apply],
  );

  // Computer: keys 1 to 5 switch sections (not while typing).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const next = TABS[Number(e.key) - 1];
      if (next) {
        setSheet(null);
        setTab(next);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (!catalog || view === undefined) {
    return <p className="py-32 text-center font-display text-muted">…</p>;
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
    bots,
    tab,
    goTo: (t) => {
      setSheet(null);
      setTab(t);
      window.scrollTo({ top: 0 });
    },
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
  const contractsLeft = view.contracts.some((c) => !c.done);
  const portLocked = portOpensAt(view) > gp.now;
  const galleyBack =
    view.expeditions.some((e) => e.outcome === "pending" && e.returnAt <= gp.now) ||
    view.raids.some((r) => r.outcome === "cruising" && r.endAt <= gp.now) ||
    view.ships.some((s) => s.status === "damaged");

  const dayProgress = Math.min(1, view.day / catalog.world.seasonDays);
  const badge = (t: Tab) => (t === "contrats" && contractsLeft) || (t === "port" && galleyBack);
  const resumeGuide = guidePaused && (
    <button
      type="button"
      aria-label={fr.game.coach.resume}
      className="rounded-full ring-2 ring-gold"
      onClick={() => {
        store.set("guideHidden", "0");
        setTab("comptoir");
        setGuideKey((k) => k + 1);
      }}
    >
      <Lorenzo size={28} />
    </button>
  );
  const purse = (
    <div className="flex items-center gap-1.5 rounded-full bg-night-3 py-1 pl-1 pr-3 ring-1 ring-line">
      <Coin size={24} />
      <span className="whitespace-nowrap font-display text-sm font-extrabold tabular-nums">
        {d(view.cash)}
      </span>
    </div>
  );
  const crestButton = (
    <button
      type="button"
      aria-label={fr.game.tabs.profil}
      className="rounded-full bg-night-3 p-0.5 ring-2 ring-gold/70"
      onClick={() => gp.goTo("profil")}
    >
      <Crest crest={crest} size={30} />
    </button>
  );

  return (
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
                onClick={() => gp.goTo(t)}
                className={`relative flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition ${on ? "bg-night-4 text-gold" : "text-cream-dim hover:bg-night-3 hover:text-cream"} ${t === "port" && portLocked ? "opacity-40" : ""}`}
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
          <Logotype size={22} className="lg:hidden" />
          <div className="hidden min-w-0 flex-1 lg:block">
            <p className="label text-lagoon">{fr.game.dayOf(view.day, catalog.world.seasonDays)}</p>
            <div className="mt-1.5 h-1 w-64 overflow-hidden rounded-full bg-night-4">
              <div
                className="h-full rounded-full bg-lagoon"
                style={{ width: `${dayProgress * 100}%` }}
              />
            </div>
          </div>
          <div className="ml-auto flex items-center gap-2 lg:gap-3">
            {purse}
            {resumeGuide}
            <Bell {...gp} unread={unread} onRead={clearUnread} />
            <span className="lg:hidden">{crestButton}</span>
          </div>
        </div>
        {/* Phone: the season's day, as a line under the header. */}
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
      </header>

      <Gazette {...gp} />

      {view.player.upkeepDefaultUntil > gp.now && (
        <div className="mx-auto mt-3 w-full max-w-md px-4 lg:max-w-6xl lg:px-8">
          <p className="rounded-xl bg-vermilion/15 p-3 text-sm text-vermilion ring-1 ring-vermilion/60">
            {fr.game.upkeepDefault}
          </p>
        </div>
      )}

      <main className="mx-auto w-full max-w-md flex-1 px-4 pb-40 pt-4 lg:max-w-6xl lg:px-8 lg:pb-16 lg:pt-6">
        {tab === "comptoir" && <Comptoir {...gp} />}
        {tab === "marche" && <Marche {...gp} />}
        {tab === "contrats" && <Contrats {...gp} />}
        {tab === "port" && <Port {...gp} />}
        {tab === "top" && <Top {...gp} />}
        {tab === "profil" && <Profil {...gp} />}
      </main>

      <Coach key={guideKey} {...gp} />

      {toast && (
        <div className="fixed inset-x-4 bottom-28 z-50 mx-auto max-w-md animate-rise rounded-xl bg-vermilion p-3 text-sm font-semibold text-cream shadow-lg lg:bottom-8">
          {toast}
        </div>
      )}

      {help && <Help {...gp} onClose={() => setHelp(false)} />}
      {welcome && <Welcome {...gp} data={welcome} onClose={() => setWelcome(null)} />}

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-night-2/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
        <div className="mx-auto grid max-w-md grid-cols-5">
          {TABS.map((t) => {
            const on = tab === t;
            const Icon = NavIcon[t];
            return (
              <button
                key={t}
                type="button"
                data-coach={`tab-${t}`}
                onClick={() => gp.goTo(t)}
                className={`relative flex flex-col items-center gap-1 py-2.5 ${on ? "text-gold" : "text-muted"} ${t === "port" && portLocked ? "opacity-40" : ""}`}
              >
                {on && <span className="absolute inset-x-6 top-0 h-0.5 rounded-full bg-gold" />}
                <Icon />
                <span className="text-[11px] font-semibold">{fr.game.tabs[t]}</span>
                {badge(t) && !on && (
                  <span className="absolute right-[30%] top-2 h-2 w-2 rounded-full bg-vermilion" />
                )}
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
