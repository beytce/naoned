import { useEffect, useState } from "react";
import { Crest, type CrestData } from "../art/crest.js";
import { Medal } from "../art/icons.js";
import { fr } from "../i18n.js";
import { Badge, Label, Panel, Ribbon, Sheet, Stat } from "../ui.js";
import { MerchantName } from "./Name.js";
import { gameApi } from "./api.js";
import { d, whole } from "./format.js";
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
  const span = renown.next ? renown.next.from - renown.current.from : 1;
  return (
    <div className="space-y-4">
      <Panel glow="gold">
        <div className="flex items-start justify-between gap-3">
          <div>
            <Label className="text-gold">{t.renown}</Label>
            <p className="mt-1 font-display text-xl font-extrabold">{renown.current.name}</p>
          </div>
          <span className="font-display text-2xl font-extrabold tabular-nums text-gold">
            {renown.points}
          </span>
        </div>
        {renown.next && (
          <div className="mt-3 space-y-1">
            <Ribbon value={(renown.points - renown.current.from) / span} />
            <p className="meta">
              {t.nextRenown(renown.next.name, renown.next.from - renown.points)}
            </p>
          </div>
        )}
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

/** Another merchant's palmarès, opened from the rankings. */
export function PlayerPalmares({
  accountId,
  onClose,
}: {
  accountId: string | null;
  onClose: () => void;
}) {
  const [data, setData] = useState<{
    pseudo: string | null;
    crest: CrestData | null;
    bot: boolean;
    palmares: Palmares;
  } | null>(null);
  useEffect(() => {
    setData(null);
    if (!accountId) return;
    gameApi
      .palmares(accountId)
      .then(setData)
      .catch(() => setData(null));
  }, [accountId]);
  return (
    <Sheet open={accountId !== null} onClose={onClose}>
      {data ? (
        <div className="space-y-4">
          <div className="flex items-center gap-3 pr-10">
            {data.crest && <Crest crest={data.crest} size={52} />}
            <div className="min-w-0">
              <Label>{fr.game.palmares.title}</Label>
              <h3 className="flex font-display text-xl font-extrabold">
                <MerchantName pseudo={data.pseudo} bot={data.bot} />
              </h3>
            </div>
          </div>
          <PalmaresView data={data.palmares} />
        </div>
      ) : (
        <p className="py-10 text-center text-muted">…</p>
      )}
    </Sheet>
  );
}
