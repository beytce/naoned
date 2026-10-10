import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { NavIcon } from "../art/icons.js";
import { fr } from "../i18n.js";
import { Label, Sheet } from "../ui.js";
import type { GameProps } from "./Game.js";
import { gameApi } from "./api.js";
import { d } from "./format.js";
import type { Notice } from "./types.js";

const ICON = {
  harvest: NavIcon.comptoir,
  galley: NavIcon.port,
  event: NavIcon.bell,
  week: NavIcon.top,
} as const;
const TONE = {
  harvest: "text-lagoon",
  galley: "text-lagoon",
  event: "text-gold",
  week: "text-gold",
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
    case "event": {
      const e = fr.game.gazette.events[String(n.data.code)];
      return e ? `${e[0]} : ${e[1]}` : t.event;
    }
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
        className="relative text-cream-dim"
        onClick={() => setOpen(true)}
      >
        {NavIcon.bell()}
        {props.unread > 0 && (
          <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-vermilion px-1 font-mono text-[10px] font-bold text-cream">
            {props.unread > 9 ? "9+" : props.unread}
          </span>
        )}
      </button>
      {/* Out of the header: its backdrop blur would trap a fixed sheet inside it. */}
      {createPortal(
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
        </Sheet>,
        document.body,
      )}
    </>
  );
}
