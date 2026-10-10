import { useCallback, useEffect, useMemo, useState } from "react";
import { ApiError } from "../api.js";
import { fr } from "../i18n.js";
import { Advisor } from "./Advisor.js";
import { Chantiers } from "./Chantiers.js";
import { Classement } from "./Classement.js";
import { Comptoir } from "./Comptoir.js";
import { Join } from "./Join.js";
import { Marche } from "./Marche.js";
import { gameApi } from "./api.js";
import { d } from "./format.js";
import type { Action, Catalog, PlayerView } from "./types.js";

export type Tab = "comptoir" | "marche" | "chantiers" | "classement";

/** What every screen needs: data, names and a way to act. */
export interface GameProps {
  catalog: Catalog;
  view: PlayerView;
  /** Server time now, ticking every second. */
  now: number;
  act: (action: Action) => Promise<boolean>;
  busy: boolean;
  names: Names;
  goTo: (tab: Tab) => void;
}

export interface Names {
  resource: (code: string) => string;
  building: (type: string) => string;
  city: (code: string) => string;
  region: (code: string) => string;
}

const POLL_MS = 15_000;

export function Game({ onLogout }: { onLogout: () => void }) {
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [view, setView] = useState<PlayerView | null | undefined>(undefined);
  const [offset, setOffset] = useState(0);
  const [now, setNow] = useState(Date.now());
  const [tab, setTab] = useState<Tab>("comptoir");
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const apply = useCallback((serverTime: number, v: PlayerView | null) => {
    setOffset(serverTime - Date.now());
    setView(v);
  }, []);

  const refresh = useCallback(async () => {
    try {
      const res = await gameApi.view();
      apply(res.serverTime, res.view);
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
        if (res.error) {
          setToast(fr.game.errors[res.error] ?? fr.errors.unknown ?? null);
          return false;
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

  if (!catalog || view === undefined) return <p className="py-20 text-center opacity-70">…</p>;

  if (view === null) {
    return (
      <Join
        catalog={catalog}
        names={names}
        onJoin={async (region) => {
          try {
            const res = await gameApi.join(region);
            apply(res.serverTime, res.view);
          } catch (err) {
            const code = err instanceof ApiError ? err.code : "unknown";
            setToast(fr.game.errors[code] ?? fr.errors.unknown ?? null);
          }
        }}
        toast={toast}
      />
    );
  }

  const props: GameProps = { catalog, view, now: now + offset, act, busy, names, goTo: setTab };

  return (
    <div className="flex min-h-[100dvh] flex-col">
      <header className="sticky top-0 z-10 border-b border-ink/10 bg-parchment/95 px-4 pb-2 pt-[max(0.75rem,env(safe-area-inset-top))] backdrop-blur dark:border-ink-light/10 dark:bg-parchment-dark/95">
        <div className="mx-auto flex max-w-md items-baseline justify-between">
          <div>
            <p className="font-serif text-lg font-bold text-rust dark:text-gold">{fr.appName}</p>
            <p className="text-xs opacity-60">
              {fr.game.dayOf(view.day, catalog.world.seasonDays)} ·{" "}
              {names.region(view.player.region)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-lg font-semibold tabular-nums">{d(view.cash)}</p>
            <p className="text-xs opacity-60">{fr.game.upkeep(d(view.upkeepPerDay))}</p>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-md flex-1 space-y-4 px-4 pb-28 pt-4">
        {view.player.upkeepDefaultUntil > now + offset && (
          <p className="rounded-lg bg-red-100 p-3 text-sm text-red-900 dark:bg-red-950 dark:text-red-200">
            {fr.game.upkeepDefault}
          </p>
        )}
        {tab === "comptoir" && (
          <>
            <Advisor {...props} />
            <Comptoir {...props} />
          </>
        )}
        {tab === "marche" && <Marche {...props} />}
        {tab === "chantiers" && <Chantiers {...props} />}
        {tab === "classement" && <Classement {...props} onLogout={onLogout} />}
      </main>

      {toast && (
        <div className="fixed inset-x-4 bottom-24 z-20 mx-auto max-w-md rounded-lg bg-ink p-3 text-sm text-ink-light shadow-lg dark:bg-ink-light dark:text-ink">
          {toast}
        </div>
      )}

      <nav className="fixed inset-x-0 bottom-0 z-10 border-t border-ink/10 bg-parchment/95 pb-[env(safe-area-inset-bottom)] backdrop-blur dark:border-ink-light/10 dark:bg-parchment-dark/95">
        <div className="mx-auto grid max-w-md grid-cols-4">
          {(["comptoir", "marche", "chantiers", "classement"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`py-3 text-sm font-medium ${tab === t ? "text-rust dark:text-gold" : "opacity-60"}`}
            >
              {fr.game.tabs[t]}
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}
