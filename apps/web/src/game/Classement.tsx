import { useEffect, useState } from "react";
import { fr } from "../i18n.js";
import type { GameProps } from "./Game.js";
import { gameApi } from "./api.js";
import { d } from "./format.js";
import type { RankingRow } from "./types.js";
import { Card } from "./ui.js";

export function Classement(props: GameProps & { onLogout: () => void }) {
  const [rows, setRows] = useState<RankingRow[] | null>(null);
  const nw = props.view.netWorth;

  useEffect(() => {
    gameApi
      .ranking()
      .then((r) => setRows(r.rows))
      .catch(() => setRows([]));
  }, []);

  return (
    <div className="space-y-4">
      <Card className="space-y-1 text-sm">
        <p className="font-serif text-lg">{fr.game.myNetWorth(d(nw.total))}</p>
        <p className="opacity-70">
          {fr.game.netWorthParts(d(nw.cash), d(nw.stock), d(nw.buildings))}
        </p>
      </Card>
      <Card>
        {rows === null ? (
          <p className="opacity-60">…</p>
        ) : (
          <ol className="divide-y divide-ink/10 dark:divide-ink-light/10">
            {rows.map((r) => (
              <li
                key={r.rank}
                className={`flex justify-between py-2 text-sm ${r.me ? "font-semibold text-rust dark:text-gold" : ""}`}
              >
                <span>
                  {r.rank}. {r.pseudo ?? fr.game.anonymous}{" "}
                  <span className="opacity-50">· {props.names.region(r.region)}</span>
                </span>
                <span className="tabular-nums">{d(r.netWorth)}</span>
              </li>
            ))}
          </ol>
        )}
      </Card>
      <p className="text-xs opacity-60">{fr.game.rankingHelp}</p>
      <button type="button" onClick={props.onLogout} className="text-sm underline opacity-70">
        {fr.logout}
      </button>
    </div>
  );
}
