import { useEffect, useState } from "react";
import { CanalStrip } from "../art/canal.js";
import { Crest, type CrestData } from "../art/crest.js";
import { Medal } from "../art/icons.js";
import { fr } from "../i18n.js";
import { Badge, Label, Panel, Ribbon, Sheet, Slab, Stat } from "../ui.js";
import { useCanal } from "./Canal.js";
import type { GameProps } from "./Game.js";
import { MerchantName, merchantLabel } from "./Name.js";
import { TheirShares } from "./Shares.js";
import { gameApi } from "./api.js";
import { d, whole } from "./format.js";
import { playerKey } from "./politics.js";
import type { Palmares } from "./types.js";

const place = (rank: number) => `${rank}${rank === 1 ? "er" : "e"}`;

/** Tone of a season's result: gold for the top 10, lagoon for the top 25 %. */
function tierTone(tier: string): "gold" | "lagoon" | "ghost" {
  if (tier === "doge" || tier === "podium" || tier === "top10") return "gold";
  if (tier === "elite" || tier === "notable") return "lagoon";
  return "ghost";
}

/** Renown, seasons and weeks: the same block on one's own profile and on another player's. */
export function PalmaresView({ data }: { data: Palmares }) {
  const t = fr.game.palmares;
  const { renown, seasons, weekly } = data;
  return (
    <div className="space-y-4">
      <Panel glow="gold">
        <div className="flex items-start justify-between gap-3">
          <div>
            <Label className="text-gold">{t.renown}</Label>
            <p className="mt-1 font-display text-xl font-extrabold">{renown.current.name}</p>
          </div>
        </div>
        <p className="mt-3 text-xs text-cream-dim">{t.renownHelp}</p>
      </Panel>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat label={t.seasons} value={seasons.length} />
        <Stat label={t.bestWeek} value={weekly.best ? place(weekly.best) : "—"} tone="gold" />
        <Stat label={t.podiums} value={weekly.podiums} tone="lagoon" />
        <Stat label={t.wins} value={weekly.wins} tone="gold" />
      </div>

      {seasons.length === 0 ? (
        <p className="text-sm text-cream-dim">{t.noSeason}</p>
      ) : (
        <ul className="space-y-2">
          {seasons.map((s) => (
            <li
              key={s.endsAt}
              className="flex items-center gap-3 cut border border-line bg-night-3 p-3"
            >
              <Medal earned={tierTone(s.tier) === "gold"} size={30} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{s.season}</p>
                <p className="text-xs text-cream-dim">
                  {fr.game.season.rankOf(s.rank, s.players)} · {whole(s.turnover ?? s.worth)}
                  {s.milestone.renown > 0 && ` · ${s.milestone.name}`}
                </p>
                {s.titles.length > 0 && <p className="text-xs text-gold">{s.titles.join(" · ")}</p>}
              </div>
              {s.award && <Badge tone={tierTone(s.tier)}>{s.award}</Badge>}
            </li>
          ))}
        </ul>
      )}

      {weekly.latest.length > 0 && (
        <div className="space-y-2">
          <Label>{t.latestWeeks}</Label>
          <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
            {weekly.latest.map((w) => (
              <div
                key={`${w.season}-${w.week}`}
                className={`min-w-[7.5rem] cut p-2.5 ring-1 ring-inset ${w.award ? "bg-gold/15 ring-gold/60" : "bg-night-2 ring-line"}`}
              >
                <p className="font-mono text-xs uppercase tracking-wider text-muted">
                  {t.weekOf(w.week, w.season.replace(/^.*· /, ""))}
                </p>
                <p className="font-display text-lg font-extrabold">{place(w.rank)}</p>
                <p className={`text-xs ${BigInt(w.gain) >= 0n ? "text-lagoon" : "text-vermilion"}`}>
                  {BigInt(w.gain) > 0n ? "+" : ""}
                  {whole(w.gain)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * A player's sheet over the screen it was opened from (refonte UX lot 7, maquette `Fiche`): their
 * palace on the water, their name and title, three lines (the record, the shares, against you
 * when known), and the one gold the origin gives: challenge from the ranking, shares from the
 * Market, none from the palaces. « Retour » goes back to that screen.
 */
export function PlayerSheet(props: GameProps) {
  const key = playerKey(props.sheet);
  const id = key?.id ?? null;
  const t = fr.game.palmares;
  const canal = useCanal();
  const [shares, setShares] = useState(false);
  const [data, setData] = useState<{
    pseudo: string | null;
    crest: CrestData | null;
    bot: boolean;
    palmares: Palmares;
  } | null>(null);
  useEffect(() => {
    setData(null);
    setShares(false);
    if (!id) return;
    gameApi
      .palmares(id)
      .then(setData)
      .catch(() => setData(null));
  }, [id]);
  const back = () =>
    props.setSheet(
      key?.origin === "market" ? "shares" : key?.origin === "canal" ? "canal" : "ranking",
    );
  const name = data ? merchantLabel(data.pseudo, false) : "";
  const plot = data ? canal?.plots.find((p) => merchantLabel(p.pseudo, false) === name) : undefined;
  const places = data?.palmares.seasons.slice(0, 3).map((s) => place(s.rank)) ?? [];
  const self = id === props.account.id;
  return (
    <Sheet open={!!key} onClose={back}>
      {data && id ? (
        <div className="space-y-4">
          <button
            type="button"
            onClick={back}
            className="label -ml-1 flex h-11 items-center gap-1 text-gold"
          >
            ‹ {t.back}
          </button>
          {/* Their palace on the water, when they hold one of the forty. */}
          {plot && (
            <div className="flex justify-center">
              <CanalStrip
                facades={[
                  {
                    plot: 1,
                    color: plot.crest?.color ?? null,
                    generations: plot.generations,
                    atouts: plot.atouts,
                    cities: plot.cities,
                    doge: plot.doge,
                  },
                ]}
                count={1}
                label=""
                height={120}
              />
            </div>
          )}
          <div className="flex items-center gap-3">
            {data.crest && <Crest crest={data.crest} size={48} />}
            <div className="min-w-0">
              <h3 className="flex font-display text-xl font-extrabold">
                <MerchantName pseudo={data.pseudo} bot={data.bot} />
              </h3>
              <p className="meta">
                {data.palmares.renown.current.name}
                {plot ? ` · ${fr.game.canal.palace(plot.plot, "")}` : ""}
              </p>
            </div>
          </div>
          <div className="divide-y divide-line/60 rounded-2xl bg-night-3 px-3">
            <div className="flex min-h-12 items-center justify-between gap-3 py-2">
              <span className="flex items-center gap-2 text-sm font-semibold">
                {plot && (
                  <span className="flex gap-0.5" aria-hidden="true">
                    {Array.from({ length: Math.min(6, plot.generations) }, (_, i) => (
                      // biome-ignore lint/suspicious/noArrayIndexKey: a dot a generation.
                      <span key={i} className="h-2 w-2 rounded-full bg-gold" />
                    ))}
                  </span>
                )}
                {t.title}
              </span>
              <span className="text-right text-sm text-cream-dim">
                {places.length > 0 ? places.join(", ") : t.noPlace}
                {plot ? ` · ${t.generations(plot.generations)}` : ""}
              </span>
            </div>
            {!data.bot && (
              <button
                type="button"
                aria-expanded={shares}
                onClick={() => setShares((o) => !o)}
                className="flex min-h-12 w-full items-center justify-between gap-3 py-2 text-left"
              >
                <span className="text-sm font-semibold">{t.shares}</span>
                <span className="text-sm text-cream-dim">{t.sharesOpen} ›</span>
              </button>
            )}
          </div>
          {shares && !data.bot && <TheirShares accountId={id} />}
          <details>
            <summary className="flex min-h-11 cursor-pointer items-center text-sm font-semibold text-info">
              {t.all}
            </summary>
            <div className="mt-2">
              <PalmaresView data={data.palmares} />
            </div>
          </details>
          {/* The one gold, by the screen it was opened from (plan, open point 3). */}
          {!self && !data.bot && key?.origin === "ranking" && props.lustre && (
            <Slab
              size="lg"
              className="w-full"
              onClick={() =>
                props.setSheet(`challenge:${id}:${merchantLabel(data.pseudo, false, "")}`)
              }
            >
              {fr.game.lustre.challenge}
            </Slab>
          )}
          {!self && !data.bot && key?.origin === "market" && !shares && (
            <Slab size="lg" className="w-full" onClick={() => setShares(true)}>
              {t.buyShares}
            </Slab>
          )}
        </div>
      ) : (
        <p className="py-10 text-center text-muted">…</p>
      )}
    </Sheet>
  );
}
