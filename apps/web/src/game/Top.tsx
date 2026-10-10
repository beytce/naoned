import { type ReactNode, useEffect, useState } from "react";
import { Crest, defaultCrest } from "../art/crest.js";
import { fr } from "../i18n.js";
import { Badge, Big, Label, Panel, Tabs, clock } from "../ui.js";
import type { GameProps } from "./Game.js";
import { gameApi } from "./api.js";
import { d } from "./format.js";
import { store } from "./store.js";
import type { PodiumRow, RankingRow, WeekRanking, WeekRow } from "./types.js";

type Period = "week" | "season";

const RANK_COLOR = ["text-gold", "text-lagoon", "text-vermilion"];

interface Who {
  rank: number;
  pseudo: string | null;
  region: string;
  crest: RankingRow["crest"];
  bot: boolean;
}

function Line(props: { r: Who; game: GameProps; mine?: boolean; value: ReactNode }) {
  const { r, mine } = props;
  return (
    <div
      className={`flex items-center gap-3 py-3 ${mine ? "border-l-4 border-gold bg-gold/10 px-3" : "border-b border-line/70"}`}
    >
      <span
        className={`w-10 font-display text-xl font-extrabold tabular-nums ${RANK_COLOR[r.rank - 1] ?? "text-cream-dim"}`}
      >
        {r.rank}
      </span>
      <Crest crest={r.crest ?? defaultCrest(`${r.rank}-${r.pseudo ?? ""}`)} size={40} />
      <div className="min-w-0 flex-1">
        <p className="truncate font-display text-sm font-semibold">
          {r.pseudo ?? fr.game.anonymous}
        </p>
        <div className="mt-1 flex items-center gap-2">
          {mine && <Badge>{fr.game.you}</Badge>}
          {r.bot && <Badge tone="ghost">{fr.game.npc}</Badge>}
          <span className="label">{props.game.names.region(r.region)}</span>
        </div>
      </div>
      <span className="font-display text-sm font-extrabold tabular-nums">{props.value}</span>
    </div>
  );
}

function Gain({ value }: { value: string }) {
  const n = BigInt(value);
  return (
    <span className={n > 0n ? "text-lagoon" : n < 0n ? "text-vermilion" : "text-cream-dim"}>
      {n > 0n ? "+" : ""}
      {d(n)}
    </span>
  );
}

function Podium({ rows }: { rows: PodiumRow[] }) {
  // Second, first, third: the winner stands in the middle, higher.
  const places = [
    { slot: "second", r: rows[1], height: "h-14" },
    { slot: "first", r: rows[0], height: "h-20" },
    { slot: "third", r: rows[2], height: "h-10" },
  ];
  return (
    <Panel>
      <Label className="text-gold">{fr.game.week.lastWeek}</Label>
      <div className="mt-4 grid grid-cols-3 items-end gap-2">
        {places.map(({ slot, r, height }) =>
          r ? (
            <div key={slot} className="flex flex-col items-center gap-1 text-center">
              <Crest crest={r.crest ?? defaultCrest(`${r.rank}-${r.pseudo ?? ""}`)} size={40} />
              <p className="w-full truncate font-display text-xs font-semibold">
                {r.pseudo ?? fr.game.anonymous}
              </p>
              {r.award && (
                <span className="font-mono text-[10px] uppercase tracking-wider text-gold">
                  {fr.game.week.awards[r.award]}
                </span>
              )}
              {r.bot && <Badge tone="ghost">{fr.game.npc}</Badge>}
              <div
                className={`slab flex w-full items-start justify-center pt-1 ${height} ${slot === "first" ? "bg-gold text-night" : "bg-night-4 text-cream"}`}
              >
                <span className="font-display text-lg font-extrabold">{r.rank}</span>
              </div>
            </div>
          ) : (
            <div key={slot} />
          ),
        )}
      </div>
    </Panel>
  );
}

function Week({ game }: { game: GameProps }) {
  const [data, setData] = useState<WeekRanking | null>(null);
  useEffect(() => {
    gameApi
      .weekRanking()
      .then(setData)
      .catch(() => setData(null));
  }, []);
  if (!data) return <p className="text-muted">…</p>;
  const line = (r: WeekRow, mine?: boolean) => (
    <Line key={r.rank} r={r} game={game} mine={mine} value={<Gain value={r.gain} />} />
  );
  return (
    <div className="space-y-6">
      <header>
        <Label>{fr.game.week.kicker(data.week)}</Label>
        <h1 className="mt-2 font-display text-[2rem] font-extrabold uppercase leading-[1.05]">
          {fr.game.week.title}
        </h1>
        <div className="mt-4 flex items-baseline gap-4">
          <Label>{fr.game.closesIn}</Label>
          <Big className="text-4xl">{clock(data.endsAt - game.now)}</Big>
        </div>
      </header>
      {data.lastWeek.length > 0 && <Podium rows={data.lastWeek} />}
      {data.me && (
        <div>
          <Label className="mb-2">{fr.game.myRank}</Label>
          {line(data.me, true)}
        </div>
      )}
      <div>{data.rows.map((r) => line(r))}</div>
      <p className="text-xs text-muted">{fr.game.week.help}</p>
      {data.rows.some((r) => r.bot) && <p className="text-xs text-muted">{fr.game.npcHelp}</p>}
    </div>
  );
}

function Season({ game }: { game: GameProps }) {
  const [rows, setRows] = useState<RankingRow[] | null>(null);
  useEffect(() => {
    gameApi
      .ranking()
      .then((r) => setRows(r.rows))
      .catch(() => setRows([]));
  }, []);
  const end = game.catalog.world.startsAt + game.catalog.world.seasonDays * 86_400_000;
  const me = rows?.find((r) => r.me);
  return (
    <div className="space-y-6">
      <header>
        <Label>{fr.game.topKicker}</Label>
        <h1 className="mt-2 font-display text-[2rem] font-extrabold uppercase leading-[1.05]">
          {fr.game.topTitle}
        </h1>
        <div className="mt-4 flex items-baseline gap-4">
          <Label>{fr.game.closesIn}</Label>
          <Big className="text-4xl">{clock(end - game.now)}</Big>
        </div>
      </header>
      {me && (
        <div>
          <Label className="mb-2">{fr.game.myRank}</Label>
          <Line r={me} game={game} mine value={d(me.netWorth)} />
        </div>
      )}
      <div>
        {rows === null ? (
          <p className="text-muted">…</p>
        ) : (
          rows.map((r) => <Line key={r.rank} r={r} game={game} value={d(r.netWorth)} />)
        )}
      </div>
      <p className="text-xs text-muted">{fr.game.rankingHelp}</p>
      {rows?.some((r) => r.bot) && <p className="text-xs text-muted">{fr.game.npcHelp}</p>}
    </div>
  );
}

export function Top(props: GameProps) {
  const [period, setPeriod] = useState<Period>(() =>
    store.get("topPeriod") === "season" ? "season" : "week",
  );
  return (
    <div className="space-y-6">
      <Tabs<Period>
        value={period}
        onChange={(p) => {
          store.set("topPeriod", p);
          setPeriod(p);
        }}
        options={[
          { value: "week", label: fr.game.week.tab },
          { value: "season", label: fr.game.week.seasonTab },
        ]}
      />
      {period === "week" ? <Week game={props} /> : <Season game={props} />}
    </div>
  );
}
