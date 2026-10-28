import type React from "react";
import { useEffect, useState } from "react";
import { CanalStrip, type Facade } from "../art/canal.js";
import { Crest } from "../art/crest.js";
import { Portrait } from "../art/portrait.js";
import { fr } from "../i18n.js";
import { merchantLabel } from "./Name.js";
import { gameApi } from "./api.js";
import type { CanalView } from "./types.js";

const t = () => fr.game.canal;

/** The forty palaces of the Grand Canal (R5). */
export const CANAL_PLOTS = 40;

/** Where a house lives off the Canal: its sestiere, fixed by its account. */
export function sestiereOf(accountId: string): string {
  let h = 0;
  for (const c of accountId) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const list = t().sestieri;
  return list[h % list.length] ?? "San Polo";
}

/** The Canal, fetched once (public: also before signing in). */
export function useCanal(): CanalView | null {
  const [view, setView] = useState<CanalView | null>(null);
  useEffect(() => {
    gameApi
      .canal()
      .then(setView)
      .catch(() => setView(null));
  }, []);
  return view;
}

function facades(view: CanalView): Facade[] {
  return view.plots.map((p) => ({
    plot: p.plot,
    color: p.crest?.color ?? null,
    generations: p.generations,
    atouts: p.atouts,
    cities: p.cities,
    doge: p.doge,
  }));
}

/**
 * The sign-in's window on Venice (R5, R7): the first palaces of the Canal over the water, and
 * the Doge of the month in its medallion.
 */
export function CanalHero({
  className = "",
  fallback,
}: { className?: string; fallback: React.ReactNode }) {
  const view = useCanal();
  if (!view) return <>{fallback}</>;
  return (
    <div className={className}>
      <CanalStrip facades={facades(view)} count={6} label={t().label} className="w-full" />
      {view.doge && (
        <p className="mt-1 flex items-center justify-center gap-2 text-sm text-gold">
          <Portrait
            given={merchantLabel(view.doge.pseudo, false)}
            crest={view.doge.crest}
            size={28}
            doge
          />
          {t().doge(merchantLabel(view.doge.pseudo, false))}
        </p>
      )}
    </div>
  );
}

/** The Canal in the ranking: the whole strip to scroll, then each palace and its house. */
export function CanalBoard({ me }: { me: { id: string; pseudo: string | null } }) {
  const view = useCanal();
  if (!view) return <p className="text-muted">…</p>;
  const own = merchantLabel(me.pseudo, false);
  const mine = me.pseudo
    ? view.plots.find((p) => merchantLabel(p.pseudo, false) === own)
    : undefined;
  return (
    <div className="space-y-4">
      <div className="-mx-5 overflow-x-auto px-5">
        <CanalStrip
          facades={facades(view)}
          count={CANAL_PLOTS}
          label={t().label}
          height={144}
          className="max-w-none"
        />
      </div>
      <p className="text-sm text-gold">
        {mine ? t().yours(mine.plot) : t().none(sestiereOf(me.id))}
      </p>
      {view.plots.length === 0 ? (
        <p className="text-sm text-cream-dim">{t().empty}</p>
      ) : (
        <ol className="space-y-1.5">
          {view.plots.map((p) => (
            <li
              key={p.plot}
              className={`flex items-center gap-3 rounded-2xl bg-night-3 px-3 py-2 ${p === mine ? "ring-[1.5px] ring-inset ring-gold" : ""}`}
            >
              <span className="w-8 shrink-0 text-center font-display text-lg font-extrabold text-gold">
                {p.plot}
              </span>
              {p.crest ? <Crest crest={p.crest} size={28} /> : null}
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold">
                  {merchantLabel(p.pseudo, false)}
                  {p.doge ? " · Doge" : ""}
                </span>
                <span className="meta block truncate">
                  {t().facade(p.generations, p.atouts, p.cities)}
                </span>
              </span>
            </li>
          ))}
        </ol>
      )}
      <p className="text-sm text-cream-dim">{t().help}</p>
    </div>
  );
}
