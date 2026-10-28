import { type ReactNode, useEffect, useState } from "react";
import { Crest, defaultCrest } from "../art/crest.js";
import { Emblem } from "../art/logo.js";
import { MasteryEmblem } from "../art/mastery.js";
import { fr } from "../i18n.js";
import { Badge, Label, Panel, Sheet, clock } from "../ui.js";
import type { GameProps } from "./Game.js";
import { MerchantName } from "./Name.js";
import { PlayerPalmares } from "./Palmares.js";
import { gameApi } from "./api.js";
import { d, whole } from "./format.js";
import { store } from "./store.js";
import type { PodiumRow, RankingRow, WeekRanking } from "./types.js";

type Period = "week" | "season";

/** The podium's metals (Lagune): gold, silver, bronze; never a role colour (lagoon, vermilion). */
const RANK_COLOR = ["text-gold", "text-[#C9D8EA]", "text-[#C08A5A]"];
const RANK_RING = ["rgb(var(--gold))", "#C9D8EA", "#C08A5A"];

/**
 * A merchant's crest; without one chosen, the default drawn from the account (as on the HUD and
 * the profile), so a merchant keeps the same arms whatever the rank.
 */
function crestOf(r: Pick<Who, "id" | "rank" | "pseudo" | "crest">) {
  return r.crest ?? defaultCrest(r.id ?? `${r.rank}-${r.pseudo ?? ""}`);
}

interface Who {
  id?: string;
  pass?: boolean;
  rank: number;
  pseudo: string | null;
  region: string;
  crest: RankingRow["crest"];
  bot: boolean;
  specialty?: string | null;
  /** Permanent level (honorary). */
  level?: number;
  /** The gilded name, bought with Influence. */
  gilded?: boolean;
}

function Line(props: {
  r: Who;
  game: GameProps;
  mine?: boolean;
  value: ReactNode;
  onOpen?: (id: string) => void;
}) {
  const { r, mine } = props;
  return (
    <button
      type="button"
      onClick={() => r.id && props.onOpen?.(r.id)}
      aria-label={fr.game.palmares.open}
      // Lagune: a rounded line; the merchant's own ringed in lapis.
      className={`mb-1.5 flex w-full items-center gap-3 rounded-2xl bg-night-3 px-3 py-2.5 text-left transition hover:bg-night-4 ${mine ? "ring-[1.5px] ring-inset ring-info" : ""}`}
    >
      <span
        className={`w-10 font-display text-xl font-extrabold tabular-nums ${RANK_COLOR[r.rank - 1] ?? "text-cream-dim"}`}
      >
        {r.rank}
      </span>
      <Crest crest={crestOf(r)} size={40} />
      <div className="min-w-0 flex-1">
        <p className={`flex font-display text-sm font-semibold ${r.gilded ? "text-gold" : ""}`}>
          <MerchantName pseudo={r.pseudo} bot={r.bot} />
        </p>
        <div className="mt-1 flex items-center gap-2">
          {mine && <Badge tone="info">{fr.game.you}</Badge>}
          {r.level !== undefined && (
            <Badge tone="ghost">{fr.game.merchantLevel.short(r.level)}</Badge>
          )}
          {r.pass && (
            <span title={fr.game.pass.seal} className="inline-flex">
              <Emblem size={16} className="rounded-[4px]" />
            </span>
          )}
          {r.specialty && (
            <span title={fr.game.mastery.names[r.specialty] ?? ""} className="inline-flex">
              <MasteryEmblem code={r.specialty} size={16} />
            </span>
          )}
          <span className="label">{props.game.names.region(r.region)}</span>
        </div>
      </div>
      <span className="font-display text-sm font-extrabold tabular-nums">{props.value}</span>
    </button>
  );
}

function Gain({ value }: { value: string }) {
  const n = BigInt(value);
  return (
    <span className={n > 0n ? "text-lagoon" : n < 0n ? "text-vermilion" : "text-cream-dim"}>
      {n > 0n ? "+" : ""}
      {whole(n)}
    </span>
  );
}

function Podium({
  rows,
  title,
}: {
  rows: (Pick<PodiumRow, "rank" | "pseudo" | "crest" | "bot" | "award"> & { id?: string })[];
  title: string;
}) {
  // Second, first, third (Lagune): three stars, the winner the largest, higher, in its gold ring.
  const places = [
    { slot: "second", r: rows[1], size: 46, lift: "mt-6" },
    { slot: "first", r: rows[0], size: 60, lift: "" },
    { slot: "third", r: rows[2], size: 42, lift: "mt-8" },
  ];
  return (
    <Panel>
      <Label className="text-gold">{title}</Label>
      <div className="mt-4 grid grid-cols-3 items-start gap-2">
        {places.map(({ slot, r, size, lift }) =>
          r ? (
            <div
              key={slot}
              className={`flex min-w-0 flex-col items-center gap-1 px-1 text-center ${lift}`}
            >
              <span
                className="flex items-center justify-center rounded-full bg-night-2"
                style={{
                  width: size + 18,
                  height: size + 18,
                  boxShadow: `0 0 0 3px ${RANK_RING[r.rank - 1] ?? "rgb(var(--line))"}${r.rank === 1 ? ", 0 0 28px rgb(var(--gold) / 0.35)" : ""}`,
                }}
              >
                <Crest crest={crestOf(r)} size={size} />
              </span>
              {/* A third of the width: the seal under the name, which keeps its letters. */}
              <MerchantName
                pseudo={r.pseudo}
                bot={r.bot}
                className="w-full flex-col font-display text-xs font-semibold"
              />
              {r.award && (
                <span className="text-xs font-semibold text-gold">
                  {fr.game.week.awards[r.award]}
                </span>
              )}
              <span
                className={`font-display text-lg font-extrabold ${RANK_COLOR[r.rank - 1] ?? "text-cream"}`}
              >
                {r.rank}
              </span>
            </div>
          ) : (
            <div key={slot} />
          ),
        )}
      </div>
    </Panel>
  );
}

/** The period's rows, with their value: the week's or the season's net sales. */
function rowsOf(
  period: Period,
  week: WeekRanking | null,
  season: RankingRow[] | null,
): (Who & { value: ReactNode })[] | null {
  return period === "week"
    ? (week?.rows.map((r) => ({
        ...r,
        value: <Gain value={r.gain} />,
      })) ?? null)
    : (season?.map((r) => ({ ...r, value: <Gain value={r.turnover} /> })) ?? null);
}

type View = "board" | "last" | "rules";

/**
 * The ranking, a sheet over the map (from the trophy at its foot, or the merchant's rank in the
 * HUD): week or season, the podium, everyone, the merchant's own line pinned at the foot; last
 * week's podium and the rules one touch away in the same sheet.
 */
export function RankingSheet(props: GameProps) {
  const open = props.sheet === "ranking";
  const [view, setView] = useState<View>("board");
  const [opened, setOpened] = useState<string | null>(null);
  const [period, setPeriod] = useState<Period>(() =>
    store.get("topPeriod") === "season" ? "season" : "week",
  );
  const [week, setWeek] = useState<WeekRanking | null>(null);
  const [season, setSeason] = useState<RankingRow[] | null>(null);
  useEffect(() => {
    if (!open) return;
    setView("board");
    gameApi
      .weekRanking()
      .then(setWeek)
      .catch(() => setWeek(null));
    gameApi
      .ranking()
      .then((r) => setSeason(r.rows))
      .catch(() => setSeason([]));
  }, [open]);
  const choose = (p: Period) => {
    store.set("topPeriod", p);
    setPeriod(p);
  };
  const me: (Who & { value: ReactNode }) | undefined =
    period === "week"
      ? week?.me
        ? { ...week.me, value: <Gain value={week.me.gain} /> }
        : undefined
      : (() => {
          const r = season?.find((x) => x.me);
          return r ? { ...r, value: <Gain value={r.turnover} /> } : undefined;
        })();
  const rows = rowsOf(period, week, season);
  const tp = fr.game.top;
  const back = (
    <button
      type="button"
      onClick={() => setView("board")}
      className="label -ml-1 mb-3 flex h-11 items-center gap-1 text-gold"
    >
      ← {fr.game.tabs.top}
    </button>
  );
  const tab = (p: Period, label: string, ends: number) => (
    <button
      type="button"
      aria-pressed={period === p}
      onClick={() => choose(p)}
      // Lagune: a rounded choice, lit in lapis when chosen.
      className={`flex-1 rounded-2xl px-3 py-2 text-left ring-inset transition ${period === p ? "bg-info/15 ring-[1.5px] ring-info" : "bg-night-3 ring-1 ring-line/70"}`}
    >
      <span
        className={`block text-xs font-semibold ${period === p ? "text-info" : "text-cream-dim"}`}
      >
        {label}
      </span>
      <span className="block font-display text-sm font-extrabold tabular-nums">
        {fr.game.closesIn} {clock(ends - props.now)}
      </span>
    </button>
  );
  return (
    <>
      <Sheet
        open={open}
        onClose={() => props.setSheet(null)}
        title={view === "board" ? fr.game.tabs.top : undefined}
      >
        {view === "last" ? (
          <div>
            {back}
            {week && week.lastWeek.length > 0 ? (
              <Podium rows={week.lastWeek} title={fr.game.week.lastWeek} />
            ) : (
              <p className="text-sm text-cream-dim">{tp.noLastWeek}</p>
            )}
          </div>
        ) : view === "rules" ? (
          <div className="space-y-3">
            {back}
            <p className="text-sm text-cream-dim">{fr.game.week.help}</p>
            <p className="text-sm text-cream-dim">{fr.game.rankingHelp}</p>
            <p className="text-sm text-cream-dim">{fr.game.npcHelp}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* The week before and the rules first, as ghost pills: never under the own line. */}
            <span className="flex flex-wrap gap-2">
              <button
                type="button"
                className="label inline-flex min-h-11 items-center rounded-full px-3.5 text-info ring-1 ring-inset ring-line transition active:scale-95"
                onClick={() => setView("last")}
              >
                {tp.tabs.passee}
              </button>
              <button
                type="button"
                className="label inline-flex min-h-11 items-center rounded-full px-3.5 text-info ring-1 ring-inset ring-line transition active:scale-95"
                onClick={() => setView("rules")}
              >
                {tp.tabs.regles}
              </button>
            </span>
            <div className="flex gap-2">
              {tab(
                "week",
                week ? fr.game.week.kicker(week.week) : fr.game.week.tab,
                week?.endsAt ?? props.now,
              )}
              {tab("season", fr.game.week.seasonTab, props.catalog.world.endsAt)}
            </div>
            {rows === null ? (
              <p className="text-muted">…</p>
            ) : (
              <>
                <Podium
                  rows={rows.slice(0, 3).map((r) => ({ ...r, award: null }))}
                  title={period === "week" ? fr.game.week.title : fr.game.topTitle}
                />
                <div>
                  {rows.map((r) => (
                    <Line key={r.rank} r={r} game={props} value={r.value} onOpen={setOpened} />
                  ))}
                </div>
              </>
            )}
            {me && (
              // The merchant's own line stays in sight at the foot of the sheet.
              <div className="sticky bottom-0 -mx-5 bg-gradient-to-t from-night-2 via-night-2/95 to-night-2/0 px-5 pb-1 pt-4 lg:-mx-7 lg:px-7">
                <button
                  type="button"
                  onClick={() => me.id && setOpened(me.id)}
                  className="flex w-full items-center gap-2.5 rounded-2xl bg-night-4 px-3 py-2 text-left ring-[1.5px] ring-inset ring-gold"
                >
                  <span
                    className={`w-9 shrink-0 text-center font-display text-xl font-extrabold tabular-nums ${RANK_COLOR[me.rank - 1] ?? "text-gold"}`}
                  >
                    {me.rank}
                  </span>
                  <Crest crest={crestOf(me)} size={30} />
                  <span className="min-w-0 flex-1 leading-tight">
                    <span className="block truncate font-display text-sm font-extrabold">
                      {me.pseudo ?? fr.game.anonymous}
                    </span>
                    <span className="label block text-gold">{fr.game.myRank}</span>
                  </span>
                  <span className="shrink-0 font-display text-sm font-extrabold tabular-nums">
                    {me.value}
                  </span>
                </button>
              </div>
            )}
          </div>
        )}
      </Sheet>
      <PlayerPalmares
        accountId={opened}
        onClose={() => setOpened(null)}
        // The Lustre (R6): another person may be challenged for next week.
        onChallenge={
          props.lustre && opened !== props.account.id
            ? (id, pseudo) => {
                setOpened(null);
                props.setSheet(`challenge:${id}:${pseudo}`);
              }
            : undefined
        }
      />
    </>
  );
}
