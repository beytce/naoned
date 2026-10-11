import { useEffect, useState } from "react";
import { NavIcon } from "../art/icons.js";
import { fr } from "../i18n.js";
import { Label, Sheet } from "../ui.js";
import type { GameProps } from "./Game.js";
import { gameApi } from "./api.js";
import { d } from "./format.js";
import type { Notice } from "./types.js";

const ICON = {
  harvest: NavIcon.comptoir,
  order: NavIcon.marche,
  galley: NavIcon.port,
  raid: NavIcon.port,
  corsairs: NavIcon.port,
  event: NavIcon.bell,
  week: NavIcon.top,
  season: NavIcon.top,
  criee: NavIcon.marche,
  deal: NavIcon.marche,
} as const;
const TONE: Record<string, string> = {
  harvest: "text-lagoon",
  order: "text-gold",
  galley: "text-lagoon",
  raid: "text-vermilion",
  corsairs: "text-vermilion",
  event: "text-gold",
  week: "text-gold",
  season: "text-gold",
  criee: "text-gold",
  deal: "text-lagoon",
};

function text(n: Notice, props: GameProps): string {
  const t = fr.game.notices;
  switch (n.kind) {
    case "harvest":
      return t.harvest;
    case "galley": {
      const port = props.catalog.ports.find((p) => p.code === n.data.destination)?.name ?? "";
      return t.galley(port);
    }
    case "order": {
      const who = n.data.counterpartyName ? String(n.data.counterpartyName) : fr.game.book.fondaco;
      return t.order(
        who,
        n.data.side === "sell",
        Number(n.data.quantity),
        props.names.resource(String(n.data.resource)),
      );
    }
    case "raid": {
      const route = props.catalog.ports.find((p) => p.code === n.data.route)?.name ?? "";
      const ok = n.data.success === true;
      return n.data.role === "victim"
        ? t.raidVictim(String(n.data.raiderName ?? fr.game.anonymous), ok, route)
        : t.raidCorsair(String(n.data.victimName ?? fr.game.anonymous), ok);
    }
    case "corsairs":
      return t.corsairs(props.catalog.ports.find((p) => p.code === n.data.route)?.name ?? "");
    case "event": {
      const e = fr.game.gazette.events[String(n.data.code)];
      return e ? `${e[0]} : ${e[1]}` : t.event;
    }
    case "season":
      return n.data.phase === "ending" ? t.seasonEnding : t.seasonOpened(String(n.data.name ?? ""));
    case "criee":
      return t.criee(
        props.names.city(String(n.data.city)),
        props.names.resource(String(n.data.resource)).toLowerCase(),
        Math.round(Number(n.data.premiumBps) / 100),
      );
    case "deal":
      return t.deal(
        props.names.resource(String(n.data.resource)).toLowerCase(),
        d(String(n.data.price)),
      );
    case "week": {
      const gain = BigInt(String(n.data.gain ?? "0"));
      const award = n.data.award ? fr.game.week.awards[String(n.data.award)] : null;
      return t.week(
        Number(n.data.week) + 1,
        Number(n.data.rank),
        `${gain > 0n ? "+" : ""}${d(gain)}`,
        award ?? null,
      );
    }
    default:
      return "";
  }
}

function ago(ms: number): string {
  const min = Math.floor(ms / 60_000);
  if (min < 1) return fr.game.notices.now;
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h} h`;
  return `${Math.floor(h / 24)} j`;
}

/** The bell in the header: unread count, and the latest notices in a sheet. */
export function Bell(props: GameProps & { unread: number; onRead: () => void }) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notice[] | null>(null);
  const { onRead } = props;

  useEffect(() => {
    if (!open) return;
    gameApi
      .notifications()
      .then((r) => {
        setItems(r.items);
        if (r.unread > 0) return gameApi.markRead().then(onRead);
      })
      .catch(() => setItems([]));
  }, [open, onRead]);

  return (
    <>
      <button
        type="button"
        aria-label={fr.game.notices.title}
        className="relative flex h-11 w-10 items-center justify-center rounded-full text-cream-dim transition hover:text-cream active:scale-95"
        onClick={() => setOpen(true)}
      >
        {NavIcon.bell()}
        {props.unread > 0 && (
          <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-vermilion px-1 font-mono text-[10px] font-bold text-cream">
            {props.unread > 9 ? "9+" : props.unread}
          </span>
        )}
      </button>
      <Sheet open={open} onClose={() => setOpen(false)}>
        <div className="space-y-4">
          <Label className="text-gold">{fr.game.notices.title}</Label>
          {items === null ? (
            <p className="text-muted">…</p>
          ) : items.length === 0 ? (
            <p className="text-sm text-cream-dim">{fr.game.notices.empty}</p>
          ) : (
            <ul className="max-h-[60vh] space-y-1 overflow-y-auto pr-1">
              {items.map((n) => (
                <li
                  key={n.id}
                  className={`flex gap-3 border-b border-line/70 py-3 ${n.read ? "" : "border-l-4 border-l-gold pl-3"}`}
                >
                  <span className={TONE[n.kind] ?? "text-cream-dim"}>{ICON[n.kind]?.()}</span>
                  <p className="flex-1 text-sm leading-snug">{text(n, props)}</p>
                  <span className="label whitespace-nowrap">{ago(props.now - n.createdAt)}</span>
                </li>
              ))}
            </ul>
          )}
          <button
            type="button"
            className="label w-full pt-1 text-center text-lagoon"
            onClick={() => {
              setOpen(false);
              props.goTo("profil");
            }}
          >
            {fr.game.notices.settings}
          </button>
        </div>
      </Sheet>
    </>
  );
}
