import type React from "react";
import { useEffect, useRef, useState } from "react";
import { CanalStrip, type Facade } from "../art/canal.js";
import { Crest } from "../art/crest.js";
import { Portrait } from "../art/portrait.js";
import { fr } from "../i18n.js";
import { Sheet } from "../ui.js";
import type { GameProps } from "./Game.js";
import { merchantLabel } from "./Name.js";
import { gameApi } from "./api.js";
import { whole } from "./format.js";
import { palaceGap } from "./politics.js";
import type { CanalView, RankingRow } from "./types.js";

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

/**
 * The forty palaces (R5, refonte UX lot 6, maquette `Canal`): a quay that scrolls, a palace a
 * house of the month's top 40, its rank and its name under it; the palace touched said below; how
 * far the merchant stands from the 40th, and the way to their own quay.
 */
export function CanalSheet(props: GameProps) {
  const open = props.sheet === "canal";
  const view = useCanal();
  const [rows, setRows] = useState<RankingRow[]>([]);
  const [picked, setPicked] = useState<number | null>(null);
  const quay = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    gameApi
      .ranking()
      .then((r) => setRows(r.rows))
      .catch(() => setRows([]));
  }, [open]);
  const where = palaceGap(rows);
  const plots = view?.plots ?? [];
  const chosen = plots.find((p) => p.plot === picked) ?? plots[0] ?? null;
  const own = merchantLabel(props.account.pseudo, false);
  const mine = plots.find((p) => merchantLabel(p.pseudo, false) === own);
  const toQuay = () =>
    quay.current
      ?.querySelector("[data-mine]")
      ?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  return (
    <Sheet open={open} onClose={() => props.setSheet(null)} title={t().title} summary={t().summary}>
      {open && view && (
        <div className="space-y-4">
          {/* The quay: it scrolls sideways; a shadow at its edge says there is more. */}
          <div className="relative -mx-5">
            <div ref={quay} className="flex gap-1 overflow-x-auto px-5 pb-2 [scrollbar-width:none]">
              {plots.map((p) => (
                <button
                  key={p.plot}
                  data-mine={p === mine ? true : undefined}
                  type="button"
                  aria-pressed={chosen?.plot === p.plot}
                  aria-label={`${t().rank(p.plot)} · ${merchantLabel(p.pseudo, false)}`}
                  onClick={() => setPicked(p.plot)}
                  className={`flex w-[84px] shrink-0 flex-col items-center gap-1 rounded-xl pb-1 transition active:scale-95 ${chosen?.plot === p.plot ? "bg-info/15 ring-[1.5px] ring-inset ring-info" : ""}`}
                >
                  <CanalStrip
                    facades={[
                      {
                        plot: 1,
                        color: p.crest?.color ?? null,
                        generations: p.generations,
                        atouts: p.atouts,
                        cities: p.cities,
                        doge: p.doge,
                      },
                    ]}
                    count={1}
                    label=""
                    height={96}
                  />
                  <span className="font-display text-sm font-extrabold text-gold">
                    {t().rank(p.plot)}
                  </span>
                  <span className="w-full truncate px-1 text-center text-xs text-cream-dim">
                    {merchantLabel(p.pseudo, false).replace(/^Casa\s+/, "")}
                  </span>
                </button>
              ))}
              {where && !where.inside && (
                <span
                  data-mine
                  className="flex w-[84px] shrink-0 flex-col items-center justify-end gap-1 rounded-xl pb-1 text-center text-xs text-info ring-1 ring-inset ring-info/60"
                >
                  {t().quay}
                  <b className="font-display text-sm">{t().rank(where.rank)}</b>
                </span>
              )}
            </div>
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-night-2 to-transparent"
            />
          </div>
          {plots.length === 0 && <p className="text-sm text-cream-dim">{t().empty}</p>}
          {chosen && (
            <div className="flex items-center gap-3 rounded-2xl bg-night-3 px-3 py-2.5">
              {chosen.crest ? <Crest crest={chosen.crest} size={32} /> : null}
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold">
                  {merchantLabel(chosen.pseudo, false)}
                  {chosen.doge ? " · Doge" : ""}
                </span>
                <span className="meta block truncate">
                  {t().palace(
                    chosen.plot,
                    t().facade(chosen.generations, chosen.atouts, chosen.cities),
                  )}
                </span>
              </span>
              <button
                type="button"
                onClick={() => props.setSheet("ranking")}
                className="min-h-11 shrink-0 rounded-full px-3 text-xs font-semibold text-cream ring-1 ring-inset ring-edge"
              >
                {t().seeRanking}
              </button>
            </div>
          )}
          {where && (
            <div className="space-y-1">
              <p className="text-sm">
                {where.inside ? t().inside(where.rank) : t().outside(where.rank, whole(where.gap))}
              </p>
              {(!where.inside || mine) && (
                <button
                  type="button"
                  onClick={toQuay}
                  className="flex min-h-12 items-center text-sm font-semibold text-info"
                >
                  {t().toQuay} ›
                </button>
              )}
            </div>
          )}
          <p className="text-sm text-cream-dim">{t().help}</p>
        </div>
      )}
    </Sheet>
  );
}
