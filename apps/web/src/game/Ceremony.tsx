import { Crest } from "../art/crest.js";
import { Medal } from "../art/icons.js";
import { Emblem } from "../art/logo.js";
import { fr } from "../i18n.js";
import { Big, Label, Slab } from "../ui.js";
import { shareChronicle } from "./chronicle.js";
import { d } from "./format.js";
import type { Ceremony as CeremonyData } from "./types.js";

/**
 * The end of a season, at the next visit: the final rank revealed, the podium, the rewards, then
 * on to the new season (everyone starts afresh).
 */
export function Ceremony({
  data,
  nextSeason,
  pseudo,
  onDone,
}: {
  data: CeremonyData;
  nextSeason: string;
  /** The merchant's name, written on the chronicle. */
  pseudo: string;
  onDone: () => void;
}) {
  const t = fr.game.season;
  const top = data.tier === "doge" || data.tier === "podium" || data.tier === "top10";
  const rewards = [
    data.award || null,
    data.passDays === "season"
      ? t.passSeason
      : data.passDays > 0
        ? t.passDays(data.passDays)
        : null,
    data.milestone.renown > 0 ? t.milestone(data.milestone.name, data.milestone.renown) : null,
    data.renown > 0 ? t.renown(data.renown) : null,
  ].filter((r): r is string => r !== null);
  // Podium order: second, first, third.
  const podium = [2, 1, 3]
    .map((rank) => data.podium.find((p) => p.rank === rank))
    .filter((p) => p !== undefined);
  return (
    <main className="mx-auto flex min-h-[100dvh] max-w-xl flex-col items-center px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(2rem,env(safe-area-inset-top))] text-center">
      <Emblem size={64} />
      <Label className="mt-4 text-cream-dim">{t.closed(data.season)}</Label>
      <div className="mt-6 animate-rise">
        <Medal earned={top} size={64} />
      </div>
      <Big className={`mt-3 text-5xl ${top ? "text-gold" : "text-cream"}`}>
        {data.rank}
        {data.rank === 1 ? "er" : "e"}
      </Big>
      <p className="mt-2 text-cream-dim">{t.rankOf(data.rank, data.players)}</p>
      <p className="label mt-1">
        {data.turnover === null ? fr.game.netWorth : t.worth} · {d(data.turnover ?? data.worth)}
      </p>

      {podium.length > 0 && (
        <section className="mt-8 w-full">
          <Label>{t.podium}</Label>
          <div className="mt-3 flex items-end justify-center gap-3">
            {podium.map((p) => (
              <div key={p.rank} className="flex w-1/3 flex-col items-center">
                {p.crest && <Crest crest={p.crest} size={p.rank === 1 ? 56 : 44} />}
                <p className="mt-1 w-full truncate text-sm font-semibold">{p.pseudo}</p>
                <div
                  className={`mt-2 flex w-full items-start justify-center rounded-t-xl pt-2 font-display text-xl font-extrabold ${p.rank === 1 ? "h-20 bg-gold text-ink" : p.rank === 2 ? "h-14 bg-night-4" : "h-10 bg-night-4"}`}
                >
                  {p.rank}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="mt-8 w-full cut border border-gold/60 bg-night-3 p-4 text-left">
        <Label className="text-gold">{t.rewards}</Label>
        {rewards.length > 0 ? (
          <ul className="mt-2 space-y-1.5">
            {rewards.map((r) => (
              <li key={r} className="flex gap-2 text-sm">
                <span className="text-gold">✦</span>
                {r}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-cream-dim">{t.nothing}</p>
        )}
        <p className="label mt-3">
          {t.renownTotal(data.totalRenown.current.name, data.totalRenown.points)}
        </p>
      </section>

      <Slab
        tone="ghost"
        size="md"
        className="mt-6 w-full"
        onClick={() => void shareChronicle(data, pseudo)}
      >
        {fr.game.chronicle.share}
      </Slab>

      <p className="mt-6 text-sm text-cream-dim">{t.newSeason(nextSeason)}</p>
      <Slab size="lg" className="mt-4 w-full" onClick={onDone}>
        {t.start}
      </Slab>
    </main>
  );
}
