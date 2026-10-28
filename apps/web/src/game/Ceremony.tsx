import { useState } from "react";
import { Crest } from "../art/crest.js";
import { fr } from "../i18n.js";
import { Label, Slab } from "../ui.js";
import { HeirChoice, traitName, useDynasty } from "./Dynasty.js";
import { gameApi } from "./api.js";
import { shareChronicle } from "./chronicle.js";
import { d } from "./format.js";
import type { Ceremony as CeremonyData } from "./types.js";

/** The podium's rings: gold, silver, bronze (as on the Classement). */
const RING = ["rgb(var(--gold))", "#C9D8EA", "#C08A5A"];

/**
 * The final rank rising like a star over the lagoon (Lagune): a gold sun for the top ten, a
 * lapis star otherwise, two waves of water under it.
 */
function RankStar({ rank, top, label }: { rank: number; top: boolean; label: string }) {
  return (
    <svg viewBox="0 0 300 220" className="w-full max-w-[18rem]" role="img" aria-label={label}>
      <defs>
        <radialGradient id="ceremony-sun" cx="0.5" cy="0.4" r="0.6">
          <stop offset="0" stopColor={top ? "#FFE7A3" : "#D4EEFC"} />
          <stop offset="0.6" stopColor={top ? "rgb(var(--gold))" : "rgb(var(--info))"} />
          <stop offset="1" stopColor={top ? "#B9842A" : "rgb(var(--info-deep))"} />
        </radialGradient>
      </defs>
      <circle
        cx="150"
        cy="105"
        r="100"
        fill={top ? "rgb(var(--gold))" : "rgb(var(--info))"}
        fillOpacity="0.07"
      />
      <circle
        cx="150"
        cy="105"
        r="80"
        fill="none"
        stroke={top ? "rgb(var(--gold))" : "rgb(var(--info))"}
        strokeOpacity="0.3"
        strokeDasharray="2 6"
      />
      <circle cx="150" cy="105" r="60" fill="url(#ceremony-sun)" className="animate-rise" />
      <text
        x="150"
        y="121"
        textAnchor="middle"
        className="font-display"
        fontWeight="800"
        fontSize="44"
        fill={top ? "#3B2A08" : "#0B1A2E"}
      >
        {rank}
        {rank === 1 ? "er" : "e"}
      </text>
      <path
        d="M0 200 Q75 186 150 200 T300 200"
        fill="none"
        stroke="rgb(var(--info))"
        strokeOpacity="0.4"
        strokeWidth="2"
      />
      <path
        d="M0 212 Q75 198 150 212 T300 212"
        fill="none"
        stroke="rgb(var(--info))"
        strokeOpacity="0.2"
        strokeWidth="2"
      />
    </svg>
  );
}

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
  // The heir to name (R4): the traits the month earned, the first picked until another is.
  const [dynasty] = useDynasty();
  const heir = dynasty?.heir ?? null;
  const [picked, setPicked] = useState<string | null>(null);
  const trait = picked ?? heir?.chosen ?? heir?.earned[0] ?? null;
  const [leaving, setLeaving] = useState(false);
  const top = data.tier === "doge" || data.tier === "podium" || data.tier === "top10";
  const rewards = [
    data.award || null,
    ...data.titles,
    data.milestone.renown > 0 ? t.milestone(data.milestone.name, data.milestone.renown) : null,
    data.renown > 0 ? t.renown(data.renown) : null,
  ].filter((r): r is string => r !== null);
  // Podium order: second, first, third.
  const podium = [2, 1, 3]
    .map((rank) => data.podium.find((p) => p.rank === rank))
    .filter((p) => p !== undefined);
  return (
    <main
      className="mx-auto flex min-h-[100dvh] max-w-xl flex-col items-center px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(2rem,env(safe-area-inset-top))] text-center"
      style={{
        backgroundImage: `radial-gradient(ellipse at 50% 22%, ${top ? "rgb(var(--gold) / 0.16)" : "rgb(var(--info) / 0.12)"}, transparent 55%)`,
      }}
    >
      <h1 className="font-place text-base font-bold uppercase tracking-[0.3em] text-gold">
        {t.closed(data.season)}
      </h1>
      <div className="mt-3 flex w-full justify-center">
        <RankStar rank={data.rank} top={top} label={t.rankOf(data.rank, data.players)} />
      </div>
      <p className="mt-1 text-cream-dim">{t.rankOf(data.rank, data.players)}</p>
      <p className="meta mt-1">
        {data.turnover === null ? fr.game.netWorth : t.worth} · {d(data.turnover ?? data.worth)}
      </p>

      {podium.length > 0 && (
        <section className="mt-8 w-full">
          <Label>{t.podium}</Label>
          <div className="mt-3 flex items-end justify-center gap-3">
            {podium.map((p) => (
              <div key={p.rank} className="flex w-1/3 flex-col items-center">
                <span
                  className="grid place-items-center rounded-full bg-night-2"
                  style={{
                    width: p.rank === 1 ? 72 : 58,
                    height: p.rank === 1 ? 72 : 58,
                    boxShadow: `0 0 0 3px ${RING[p.rank - 1] ?? "rgb(var(--line))"}${p.rank === 1 ? ", 0 0 26px rgb(var(--gold) / 0.35)" : ""}`,
                  }}
                >
                  {p.crest ? (
                    <Crest crest={p.crest} size={p.rank === 1 ? 46 : 36} />
                  ) : (
                    // No crest chosen: the house's initial, in its ring's colour.
                    <span
                      className="font-place text-2xl font-bold"
                      style={{ color: RING[p.rank - 1] }}
                      aria-hidden="true"
                    >
                      {(p.pseudo ?? "?")
                        .replace(/^Casa\s+/i, "")
                        .charAt(0)
                        .toUpperCase()}
                    </span>
                  )}
                </span>
                <p className="mt-2 w-full truncate text-sm font-semibold">{p.pseudo}</p>
                <span
                  className="font-display text-lg font-extrabold"
                  style={{ color: RING[p.rank - 1] }}
                >
                  {p.rank}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="mt-8 w-full rounded-3xl bg-night-3 p-4 text-left ring-1 ring-inset ring-gold/50">
        <Label className="text-gold">{t.rewards}</Label>
        {rewards.length > 0 ? (
          <ul className="mt-3 space-y-2">
            {rewards.map((r) => (
              <li
                key={r}
                className="flex items-center gap-2.5 rounded-2xl bg-night-2 px-3 py-2 text-sm"
              >
                <svg viewBox="-8 -8 16 16" className="h-4 w-4 shrink-0" aria-hidden="true">
                  <path d="M0-7L2-2L7 0L2 2L0 7L-2 2L-7 0L-2-2Z" fill="rgb(var(--gold))" />
                </svg>
                {r}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-cream-dim">{t.nothing}</p>
        )}
        <p className="meta mt-3">
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

      {heir && (
        <div className="mt-8 w-full">
          <HeirChoice earned={heir.earned} picked={trait} onPick={setPicked} />
        </div>
      )}

      <p className="mt-6 text-sm text-cream-dim">{t.newSeason(nextSeason)}</p>
      {/* One gold action: leave the trait to the heir and begin, or only begin. */}
      <Slab
        size="lg"
        className="mt-4 w-full"
        disabled={leaving}
        onClick={async () => {
          if (heir && trait) {
            setLeaving(true);
            await gameApi.heir(trait).catch(() => undefined);
          }
          onDone();
        }}
      >
        {heir && trait ? fr.game.dynasty.bequeath(traitName(trait)[0]) : t.start}
      </Slab>
    </main>
  );
}
