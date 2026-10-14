import { type ReactNode, useEffect, useState } from "react";
import { Crest, defaultCrest } from "../art/crest.js";
import { Sign } from "../art/logo.js";
import { MasteryEmblem } from "../art/mastery.js";
import { fr } from "../i18n.js";
import { Badge, Label, Panel, clock } from "../ui.js";
import type { GameProps } from "./Game.js";
import { PlayerPalmares } from "./Palmares.js";
import { gameApi } from "./api.js";
import { d } from "./format.js";
import {
  Chip,
  Chips,
  Drawer,
  HelpButton,
  Hud,
  HudBar,
  HudStat,
  Stage,
  Tray,
  useDrawer,
} from "./stage.js";
import { store } from "./store.js";
import type { PodiumRow, RankingRow, WeekRanking } from "./types.js";

type Period = "week" | "season";

const RANK_COLOR = ["text-gold", "text-lagoon", "text-vermilion"];

interface Who {
  id?: string;
  pass?: boolean;
  rank: number;
  pseudo: string | null;
  region: string;
  crest: RankingRow["crest"];
  bot: boolean;
  specialty?: string | null;
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
      className={`flex w-full items-center gap-3 py-3 text-left transition hover:bg-night-3/60 ${mine ? "rounded-r-xl border-l-4 border-gold bg-gold/10 px-3" : "border-b border-line/70"}`}
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
          {r.pass && (
            <span title={fr.game.pass.seal} className="inline-flex">
              <Sign size={14} />
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
      {d(n)}
    </span>
  );
}

function Podium({
  rows,
  title,
}: { rows: Pick<PodiumRow, "rank" | "pseudo" | "crest" | "bot" | "award">[]; title: string }) {
  // Second, first, third: the winner stands in the middle, higher.
  const places = [
    { slot: "second", r: rows[1], height: "h-14" },
    { slot: "first", r: rows[0], height: "h-20" },
    { slot: "third", r: rows[2], height: "h-10" },
  ];
  return (
    <Panel>
      <Label className="text-gold">{title}</Label>
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
                className={`slab flex w-full items-start justify-center pt-1 ${height} ${slot === "first" ? "bg-gold text-ink" : "bg-night-4 text-cream"}`}
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

/**
 * The ranking as a scene: the period's top three on their podium, then everyone, scrolling under
 * the head bar; the merchant's own line pinned at the foot.
 */
function Board({
  game,
  period,
  week,
  season,
  onOpen,
}: {
  game: GameProps;
  period: Period;
  week: WeekRanking | null;
  season: RankingRow[] | null;
  onOpen: (id: string) => void;
}) {
  const rows: (Who & { value: ReactNode })[] | null =
    period === "week"
      ? (week?.rows.map((r) => ({ ...r, value: <Gain value={r.gain} /> })) ?? null)
      : (season?.map((r) => ({ ...r, value: d(r.netWorth) })) ?? null);
  return (
    <div className="h-full overflow-y-auto overscroll-contain bg-night-2 px-3 pb-24 pt-[6.5rem]">
      {rows === null ? (
        <p className="text-muted">…</p>
      ) : (
        <>
          <Podium
            rows={rows.slice(0, 3).map((r) => ({ ...r, award: null }))}
            title={period === "week" ? fr.game.week.title : fr.game.topTitle}
          />
          <div className="mt-4">
            {rows.map((r) => (
              <Line key={r.rank} r={r} game={game} value={r.value} onOpen={onOpen} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

type TopDrawer = "passee" | "regles";

export function Top(props: GameProps) {
  const [opened, setOpened] = useState<string | null>(null);
  const [period, setPeriod] = useState<Period>(() =>
    store.get("topPeriod") === "season" ? "season" : "week",
  );
  const [week, setWeek] = useState<WeekRanking | null>(null);
  const [season, setSeason] = useState<RankingRow[] | null>(null);
  const drawer = useDrawer<TopDrawer>("passee");
  useEffect(() => {
    gameApi
      .weekRanking()
      .then(setWeek)
      .catch(() => setWeek(null));
    gameApi
      .ranking()
      .then((r) => setSeason(r.rows))
      .catch(() => setSeason([]));
  }, []);
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
          return r ? { ...r, value: d(r.netWorth) } : undefined;
        })();
  const endsAt = period === "week" ? (week?.endsAt ?? props.now) : props.catalog.world.endsAt;
  const tp = fr.game.top;
  return (
    <Stage
      label={fr.game.tabs.top}
      scene={<Board game={props} period={period} week={week} season={season} onOpen={setOpened} />}
      top={
        <Hud>
          <HudBar>
            <HudStat
              value={week ? clock(week.endsAt - props.now) : "…"}
              caption={fr.game.week.tab}
              active={period === "week"}
              onClick={() => choose("week")}
              label={fr.game.week.tab}
            />
            <HudStat
              value={clock(props.catalog.world.endsAt - props.now)}
              caption={fr.game.week.seasonTab}
              active={period === "season"}
              onClick={() => choose("season")}
              label={fr.game.week.seasonTab}
            />
            <HelpButton onClick={() => drawer.show("regles")} label={fr.game.stage.help} />
          </HudBar>
          <Chips>
            <Chip>
              {fr.game.closesIn} {clock(endsAt - props.now)}
            </Chip>
            {period === "week" && week && <Chip tone="gold">{fr.game.week.kicker(week.week)}</Chip>}
          </Chips>
        </Hud>
      }
      bottom={
        me ? (
          <Tray>
            <button
              type="button"
              onClick={() => me.id && setOpened(me.id)}
              className="flex min-w-0 flex-1 items-center gap-2.5 rounded-xl px-1 text-left"
            >
              <span
                className={`w-9 shrink-0 text-center font-display text-xl font-extrabold tabular-nums ${RANK_COLOR[me.rank - 1] ?? "text-gold"}`}
              >
                {me.rank}
              </span>
              <Crest crest={me.crest ?? defaultCrest(`${me.rank}-${me.pseudo ?? ""}`)} size={30} />
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
          </Tray>
        ) : undefined
      }
      drawer={
        <Drawer<TopDrawer>
          {...drawer.props}
          tabs={[
            { key: "passee", label: tp.tabs.passee },
            { key: "regles", label: tp.tabs.regles },
          ]}
        >
          {drawer.tab === "passee" &&
            (week && week.lastWeek.length > 0 ? (
              <Podium rows={week.lastWeek} title={fr.game.week.lastWeek} />
            ) : (
              <p className="text-sm text-cream-dim">{tp.noLastWeek}</p>
            ))}
          {drawer.tab === "regles" && (
            <div className="space-y-3">
              <p className="text-sm text-cream-dim">{fr.game.week.help}</p>
              <p className="text-sm text-cream-dim">{fr.game.rankingHelp}</p>
              <p className="text-sm text-cream-dim">{fr.game.npcHelp}</p>
            </div>
          )}
        </Drawer>
      }
    >
      <PlayerPalmares accountId={opened} onClose={() => setOpened(null)} />
    </Stage>
  );
}
