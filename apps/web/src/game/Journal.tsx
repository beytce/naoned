import { useEffect, useState } from "react";
import { fr } from "../i18n.js";
import { Label } from "../ui.js";
import type { GameProps } from "./Game.js";
import { gameApi } from "./api.js";
import { d } from "./format.js";
import type { JournalEntry } from "./types.js";

const t = fr.game.journal;

/** How long ago, in minutes then hours. */
function ago(ms: number): string {
  const minutes = Math.max(0, Math.round(ms / 60_000));
  return minutes < 60 ? t.minutes(minutes) : t.hours(Math.round(minutes / 60));
}

function line(props: GameProps, e: JournalEntry): string {
  const someone = t.someone;
  switch (e.kind) {
    case "trade":
      return t.trade(
        e.buyer ?? someone,
        e.seller ?? someone,
        e.quantity,
        props.names.resource(e.resource),
        d(e.value),
      );
    case "company":
      return t.company(props.names.city(e.city), e.merchants);
    case "conquest":
      return e.milan ? t.milan(e.cells) : t.conquest(e.who ?? someone, e.cells);
    case "terra_week":
      return e.signore ? t.signore(e.signore, e.conquest) : t.noSignore;
  }
}

/**
 * The Journal du Rialto: what the world did in the last day (the largest trades, the company
 * orders filled, the land taken), and the players' community when there is one.
 */
export function JournalSection(props: GameProps & { open: boolean }) {
  const [entries, setEntries] = useState<JournalEntry[] | null>(null);
  useEffect(() => {
    if (!props.open) return;
    gameApi
      .journal()
      .then((r) => setEntries(r.entries))
      .catch(() => setEntries([]));
  }, [props.open]);
  const community = props.catalog.community;
  return (
    <section className="space-y-2">
      <Label className="text-info">{t.title}</Label>
      {entries === null ? null : entries.length === 0 ? (
        <p className="note">{t.empty}</p>
      ) : (
        <ul className="space-y-1.5">
          {entries.slice(0, 8).map((e) => (
            <li key={`${e.kind}:${e.at}:${line(props, e)}`} className="flex gap-2 text-sm">
              <span className="w-12 shrink-0 font-mono text-xs text-muted">
                {ago(props.now - e.at)}
              </span>
              <span className="text-cream-dim">{line(props, e)}</span>
            </li>
          ))}
        </ul>
      )}
      {community && (
        <a
          href={community}
          target="_blank"
          rel="noreferrer"
          className="inline-block text-sm text-info underline underline-offset-2"
        >
          {t.community}
        </a>
      )}
    </section>
  );
}
