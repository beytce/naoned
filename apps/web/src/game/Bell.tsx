import { useEffect, useState } from "react";
import { NavIcon } from "../art/icons.js";
import { fr } from "../i18n.js";
import { locale } from "../lang.js";
import { familyName, landName } from "./Famille.js";
import type { GameProps } from "./Game.js";
import { gameApi } from "./api.js";
import { d, hourOf } from "./format.js";
import type { Notice } from "./types.js";

const ICON = {
  harvest: NavIcon.comptoir,
  order: NavIcon.marche,
  event: NavIcon.bell,
  act: NavIcon.bell,
  week: NavIcon.top,
  season: NavIcon.top,
  criee: NavIcon.marche,
  deal: NavIcon.marche,
  family: NavIcon.famille,
  siege: NavIcon.famille,
  delivery: NavIcon.routes,
  muda: NavIcon.marche,
  morning: NavIcon.bell,
  skirmish_call: NavIcon.famille,
  wave: NavIcon.routes,
  streak: NavIcon.bell,
  signoria: NavIcon.routes,
  sfida: NavIcon.top,
  sera: NavIcon.marche,
  letter: NavIcon.bell,
  doge: NavIcon.top,
  broglio: NavIcon.bell,
} as const;
const TONE: Record<string, string> = {
  harvest: "text-lagoon",
  order: "text-gold",
  event: "text-gold",
  act: "text-gold",
  week: "text-gold",
  season: "text-gold",
  criee: "text-gold",
  deal: "text-lagoon",
  family: "text-gold",
  siege: "text-vermilion",
  delivery: "text-lagoon",
  muda: "text-gold",
  morning: "text-gold",
  skirmish_call: "text-vermilion",
  wave: "text-lagoon",
  streak: "text-gold",
  signoria: "text-gold",
  sfida: "text-info",
  sera: "text-gold",
  letter: "text-gold",
  doge: "text-gold",
  broglio: "text-info",
};

function text(n: Notice, props: GameProps): string {
  const t = fr.game.notices;
  switch (n.kind) {
    case "harvest":
      return t.harvest;
    case "order": {
      const who = n.data.counterpartyName ? String(n.data.counterpartyName) : fr.game.book.fondaco;
      return t.order(
        who,
        n.data.side === "sell",
        Number(n.data.quantity),
        props.names.resource(String(n.data.resource)),
      );
    }
    case "event": {
      const e = fr.game.gazette.events[String(n.data.code)];
      return e ? `${e[0]} : ${e[1]}` : t.event;
    }
    case "act": {
      const a = fr.game.acts;
      const [title, text] = a.variants[String(n.data.variant ?? "")] ??
        a.acts[String(n.data.code)] ?? [String(n.data.code), ""];
      return `${a.kicker(String(Number(n.data.index) + 1))} · ${title} : ${text}`;
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
    case "siege":
      return t.siege(
        landName(String(n.data.land ?? "")),
        n.data.by === "milan" ? "de Milan" : `des ${familyName(String(n.data.by ?? ""))}`,
        Number(n.data.lances ?? 0),
        new Date(Number(n.data.arriveAt)).toLocaleTimeString(locale, {
          hour: "2-digit",
          minute: "2-digit",
          timeZone: "Europe/Paris",
        }),
      );
    case "family": {
      const decrees = (Array.isArray(n.data.decrees) ? n.data.decrees : [])
        .map((p) => fr.game.families.decrees.names[String((p as { code?: string }).code)] ?? "")
        .filter(Boolean)
        .join(", ");
      return t.family(String(n.data.event ?? ""), {
        land: landName(String(n.data.land ?? "")),
        by: n.data.by === "milan" ? "Milan" : `les ${familyName(String(n.data.by ?? ""))}`,
        amount: d(String(n.data.amount ?? "0")),
        won: n.data.won ? "1" : "",
        winner: n.data.winner ? familyName(String(n.data.winner)) : "",
        decrees,
      });
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
    case "delivery":
      return t.delivery(
        Number(n.data.quantity),
        props.names.resource(String(n.data.resource)).toLowerCase(),
        roadCity(n.data.route, props),
        d(String(n.data.amount ?? "0")),
      );
    case "muda": {
      const goods = Object.entries((n.data.stock ?? {}) as Record<string, number>)
        .filter(([, q]) => q > 0)
        .map(([r]) => props.names.resource(r).toLowerCase());
      return t.muda(goods.join(", "));
    }
    case "morning":
      return t.morning(
        Number(n.data.deliveries ?? 0),
        d(String(n.data.paid ?? "0")),
        Number(n.data.harvests ?? 0) > 0,
        Number(n.data.offers ?? 0),
      );
    case "skirmish_call":
      return t.skirmishCall(hourOf(Number(n.data.at ?? 0)));
    case "wave":
      return t.wave(hourOf(Number(n.data.at ?? 0)), Number(n.data.covered ?? 0));
    case "streak":
      return t.streak(Number(n.data.streak ?? 0));
    case "sfida":
      return t.sfida(
        String(n.data.event ?? ""),
        n.data.byName ? String(n.data.byName) : null,
        n.data.ghost === true,
      );
    case "broglio":
      return t.broglio(String(n.data.event ?? ""), d(String(n.data.price ?? "0")));
    case "doge":
      return t.doge(
        String(n.data.event ?? ""),
        n.data.byName ? String(n.data.byName) : null,
        n.data.candidate === true,
      );
    case "letter": {
      const words = fr.game.letters;
      const [name] = words.senders[String(n.data.sender ?? "")] ?? [""];
      const [came, missed] = words.followups[String(n.data.id ?? "")] ?? ["", ""];
      return t.letter(name, n.data.came ? came : missed);
    }
    case "sera":
      return t.sera(String(n.data.event ?? ""), Number(n.data.lots ?? 0));
    case "signoria":
      return t.signoria(
        String(n.data.event ?? ""),
        props.names.city(String(n.data.city ?? "")),
        n.data.byName ? String(n.data.byName) : null,
      );
    default:
      return "";
  }
}

/** The city at the end of a road "region:city". */
function roadCity(route: unknown, props: GameProps): string {
  return props.names.city(String(route ?? "").split(":")[1] ?? "");
}

function ago(ms: number): string {
  const min = Math.floor(ms / 60_000);
  if (min < 1) return fr.game.notices.now;
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h} h`;
  return `${Math.floor(h / 24)} ${fr.misc.dayUnit}`;
}

/** The bell in the header: unread count, and the latest notices in a sheet. */
/** The merchant's news, read when shown (marks them read). */
export function NoticeList(props: GameProps & { onRead: () => void }) {
  const [items, setItems] = useState<Notice[] | null>(null);
  const { onRead } = props;

  useEffect(() => {
    gameApi
      .notifications()
      .then((r) => {
        setItems(r.items);
        if (r.unread > 0) return gameApi.markRead().then(onRead);
      })
      .catch(() => setItems([]));
  }, [onRead]);

  if (items === null) return <p className="text-muted">…</p>;
  if (items.length === 0) return <p className="text-sm text-cream-dim">{fr.game.notices.empty}</p>;
  return (
    <ul className="space-y-1">
      {items.map((n) => (
        <li
          key={n.id}
          // Lagune: a rounded line; unread, a lapis ring around it.
          className={`flex gap-3 rounded-2xl bg-night-3 px-3 py-3 ${n.read ? "" : "ring-1 ring-inset ring-info/60"}`}
        >
          <span className={TONE[n.kind] ?? "text-cream-dim"}>{ICON[n.kind]?.()}</span>
          <p className="flex-1 text-sm leading-snug">{text(n, props)}</p>
          <span className="meta whitespace-nowrap">{ago(props.now - n.createdAt)}</span>
        </li>
      ))}
    </ul>
  );
}
