import { useEffect, useState } from "react";
import { Crest, defaultCrest } from "../art/crest.js";
import { fr } from "../i18n.js";
import { Badge, Big, Label, clock } from "../ui.js";
import type { GameProps } from "./Game.js";
import { gameApi } from "./api.js";
import { d } from "./format.js";
import type { RankingRow } from "./types.js";

const RANK_COLOR = ["text-gold", "text-lagoon", "text-vermilion"];

function Line({ r, props, mine }: { r: RankingRow; props: GameProps; mine?: boolean }) {
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
          <span className="label">{props.names.region(r.region)}</span>
        </div>
      </div>
      <span className="font-display text-sm font-extrabold tabular-nums">{d(r.netWorth)}</span>
    </div>
  );
}

export function Top(props: GameProps) {
  const [rows, setRows] = useState<RankingRow[] | null>(null);
  useEffect(() => {
    gameApi
      .ranking()
      .then((r) => setRows(r.rows))
      .catch(() => setRows([]));
  }, []);
  const end = props.catalog.world.startsAt + props.catalog.world.seasonDays * 86_400_000;
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
          <Big className="text-4xl">{clock(end - props.now)}</Big>
        </div>
      </header>
      {me && (
        <div>
          <Label className="mb-2">{fr.game.myRank}</Label>
          <Line r={me} props={props} mine />
        </div>
      )}
      <div>
        {rows === null ? (
          <p className="text-muted">…</p>
        ) : (
          rows.map((r) => <Line key={r.rank} r={r} props={props} />)
        )}
      </div>
      <p className="text-xs text-muted">{fr.game.rankingHelp}</p>
    </div>
  );
}
