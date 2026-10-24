import { type ReactNode, useEffect, useState } from "react";
import { fr } from "../../i18n.js";
import { Slab } from "../../ui.js";
import { onBack } from "../back.js";

/**
 * The cards of the HUD's counters: touched, a counter unfolds a card beside it (a band of its
 * colour, an arrow to its icon, what it is and where it stands, a way to act); touched again, or
 * the map touched, the card fades away. One at a time.
 */

export type TipKey = "cash" | "influence" | "bread";
export type TipTone = "gold" | "gold-soft" | "cream" | "lagoon";

export interface TipContent {
  title: string;
  tone: TipTone;
  /** What the counter is, in a sentence or two. */
  text: ReactNode;
  /** Label → value lines, under the text. */
  lines?: { label: string; value: ReactNode; tone?: "gold" | "vermilion" }[];
  /** A warning, between the lines and the action. */
  alert?: { text: string; tone: "gold" | "vermilion" };
  action?: { label: string; onClick: () => void };
}

const BAND: Record<TipTone, string> = {
  gold: "bg-gold text-ink",
  "gold-soft": "bg-gold-soft text-ink",
  cream: "bg-cream text-ink",
  lagoon: "bg-lagoon text-on-lagoon",
};
const ARROW: Record<TipTone, string> = {
  gold: "bg-gold",
  "gold-soft": "bg-gold-soft",
  cream: "bg-cream",
  lagoon: "bg-lagoon",
};
const SLAB: Record<TipTone, "gold" | "ghost"> = {
  gold: "gold",
  "gold-soft": "gold",
  cream: "gold",
  lagoon: "ghost",
};

/**
 * Keeps the last value on screen while it leaves: `leaving` is set for `ms`, long enough for the
 * exit animation, then the value is gone.
 */
export function usePresence<T>(value: T | null, ms: number): { shown: T | null; leaving: boolean } {
  const [last, setLast] = useState<T | null>(value);
  useEffect(() => {
    if (value !== null) {
      setLast(value);
      return;
    }
    const t = setTimeout(() => setLast(null), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return { shown: value ?? last, leaving: value === null && last !== null };
}

/** The open card: closes on the phone's back button too. */
export function useTip() {
  const [tip, setTip] = useState<TipKey | null>(null);
  useEffect(() => {
    if (!tip) return;
    return onBack(() => {
      setTip(null);
      return true;
    });
  }, [tip]);
  return [tip, setTip] as const;
}

export function HudTip({
  content,
  leaving,
  onClose,
}: {
  content: TipContent;
  leaving: boolean;
  onClose: () => void;
}) {
  return (
    <section
      aria-label={content.title}
      data-leaving={leaving ? "" : undefined}
      className="hud-tip pointer-events-auto absolute right-12 top-0 z-10 w-[min(17rem,calc(100vw-5rem))] text-left"
    >
      <div className={`relative flex h-9 items-center justify-center ${BAND[content.tone]}`}>
        <span className="font-display text-sm font-extrabold uppercase tracking-wide">
          {content.title}
        </span>
        <span
          aria-hidden="true"
          className={`absolute -right-[7px] top-1/2 h-3.5 w-3.5 -translate-y-1/2 rotate-45 ${ARROW[content.tone]}`}
        />
      </div>
      <div className="space-y-2.5 bg-night-2 p-3 text-[13px] leading-snug text-cream shadow-[0_10px_30px_rgb(0_0_0/0.5)] ring-1 ring-inset ring-line backdrop-blur">
        <p>{content.text}</p>
        {content.lines && content.lines.length > 0 && (
          <dl className="space-y-0.5 border-t border-line pt-2">
            {content.lines.map((l) => (
              <div key={l.label} className="flex items-baseline justify-between gap-3">
                <dt className="min-w-0 font-mono text-xs uppercase tracking-[0.06em] text-cream-dim">
                  {l.label}
                </dt>
                <dd
                  className={`shrink-0 whitespace-nowrap font-mono text-xs tabular-nums ${
                    l.tone === "vermilion"
                      ? "text-vermilion"
                      : l.tone === "gold"
                        ? "text-gold"
                        : "text-cream"
                  }`}
                >
                  {l.value}
                </dd>
              </div>
            ))}
          </dl>
        )}
        {content.alert && (
          <p className={content.alert.tone === "vermilion" ? "text-vermilion" : "text-gold"}>
            {content.alert.text}
          </p>
        )}
        {content.action && (
          <Slab
            size="sm"
            tone={content.alert?.tone === "vermilion" ? "vermilion" : SLAB[content.tone]}
            className="w-full"
            onClick={() => {
              onClose();
              content.action?.onClick();
            }}
          >
            <span className="w-full text-center">{content.action.label}</span>
          </Slab>
        )}
      </div>
    </section>
  );
}

/**
 * A counter of the HUD's right column: its value, its round icon, and the card it unfolds. The
 * icon breathes a ring while the counter is in trouble.
 */
export function HudCounter({
  label,
  value,
  valueClass,
  side,
  icon,
  iconClass = "",
  alert,
  open,
  onToggle,
  tip,
  leaving,
  fx,
}: {
  label: string;
  /** A name the effects aim at (the coins fly to "purse"). */
  fx?: string;
  value: ReactNode;
  valueClass: string;
  /** Small text before the value (what is eaten a day). */
  side?: ReactNode;
  icon: ReactNode;
  iconClass?: string;
  alert?: "gold" | "vermilion";
  open: boolean;
  onToggle: () => void;
  tip: TipContent | null;
  leaving: boolean;
}) {
  return (
    <span className="relative flex justify-end">
      <button
        type="button"
        onClick={onToggle}
        aria-label={label}
        aria-expanded={open}
        data-hud="counter"
        className="pointer-events-auto flex min-h-11 items-center gap-1.5 transition active:scale-95 min-[360px]:gap-2"
      >
        <span className="flex items-baseline gap-1.5 [text-shadow:0_1px_4px_rgb(0_0_0/0.9)]">
          {side}
          <span className={`font-display font-extrabold tabular-nums ${valueClass}`}>{value}</span>
        </span>
        <span
          data-tone={alert}
          data-fx={fx}
          className={`hud-orb flex h-8 w-8 shrink-0 items-center justify-center rounded-full min-[360px]:h-9 min-[360px]:w-9 ${iconClass} ${
            alert ? "hud-alert" : ""
          } ${open ? "ring-2 ring-cream/70" : ""}`}
        >
          {icon}
        </span>
      </button>
      {tip && (
        <HudTip
          key={tip.title}
          content={tip}
          leaving={leaving}
          onClose={() => open && onToggle()}
        />
      )}
    </span>
  );
}

export interface FleetLine {
  id: string;
  name: string;
  status: string;
  /** On the road (out or back). */
  away: boolean;
  capacity: number;
}

/**
 * Every vehicle of the merchant, in a drawer sliding in from the right edge: where each one is,
 * touched to select it on the map; the way to buy another.
 */
export function FleetDrawer({
  lines,
  open,
  leaving,
  canBuy,
  onPick,
  onBuy,
  onClose,
}: {
  lines: FleetLine[];
  open: boolean;
  leaving: boolean;
  canBuy: boolean;
  onPick: (id: string) => void;
  onBuy: () => void;
  onClose: () => void;
}) {
  const t = fr.game.map.fleet;
  useEffect(() => {
    if (!open) return;
    return onBack(() => {
      onClose();
      return true;
    });
  }, [open, onClose]);
  return (
    <section
      aria-label={t.title}
      data-leaving={leaving ? "" : undefined}
      className="hud-drawer pointer-events-auto absolute -right-3 top-full z-20 mt-2 w-[min(15rem,70vw)] lg:-right-5"
    >
      <div className="flex items-center justify-between bg-night-2/95 pl-3 ring-1 ring-inset ring-line backdrop-blur">
        <span className="font-mono text-xs uppercase tracking-[0.1em] text-cream-dim">
          {t.title}
        </span>
        <button
          type="button"
          aria-label={fr.game.map.close}
          onClick={onClose}
          className="flex h-8 w-8 items-center justify-center bg-lagoon font-bold text-on-lagoon"
        >
          ✕
        </button>
      </div>
      <ul className="max-h-[50vh] overflow-y-auto border-r-2 border-lagoon bg-night/90 py-1 shadow-[0_10px_30px_rgb(0_0_0/0.5)] backdrop-blur">
        {lines.map((l) => (
          <li key={l.id}>
            <button
              type="button"
              onClick={() => onPick(l.id)}
              className="flex w-full items-center gap-2.5 px-3 py-2 text-left transition active:bg-night-3"
            >
              <span
                aria-hidden="true"
                className={`h-2 w-2 shrink-0 rounded-full ${l.away ? "bg-gold" : "bg-lagoon"}`}
              />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-display text-sm font-semibold">{l.name}</span>
                <span className="block truncate text-xs text-cream-dim">{l.status}</span>
              </span>
              <span className="shrink-0 font-mono text-xs text-cream-dim">
                {t.capacity(l.capacity)}
              </span>
            </button>
          </li>
        ))}
        {canBuy && (
          <li className="px-3 pb-2 pt-1">
            <Slab size="sm" tone="ghost" className="w-full" onClick={onBuy}>
              <span className="w-full text-center">{fr.game.map.buyCart}</span>
            </Slab>
          </li>
        )}
      </ul>
    </section>
  );
}
