import { type ReactNode, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { P } from "./art/palette.js";
import { onBack } from "./game/back.js";
import { pressed } from "./game/fx.js";
import { store } from "./game/store.js";
import { haptic } from "./haptics.js";
import { fr } from "./i18n.js";

type Tone = "gold" | "lagoon" | "vermilion" | "ghost";

/** Face of each tone; gold is a struck coin (index.css, .gold-face). */
const TONES: Record<Tone, { face: string }> = {
  gold: { face: "gold-face" },
  lagoon: { face: "bg-lagoon text-on-lagoon" },
  vermilion: { face: "bg-vermilion text-cream" },
  ghost: {
    face: "bg-transparent text-cream ring-1 ring-inset ring-line group-hover:ring-cream/40 group-active:bg-night-3",
  },
};

/**
 * Button, in the Lagune direction: a pill, gold for the one action that matters on the screen
 * (a struck coin, its light cast under it), ghost (a fine line) for the others. Pressed, it sinks
 * at once; let go, it springs back; the server's answer strikes it or shakes it (fx.tsx).
 */
export function Slab(props: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  /**
   * Gold for the one action that matters on the screen, ghost for the others, text for a quiet
   * one (« Lire le guide »: the third level, never underlined); never lagoon.
   */
  tone?: Exclude<Tone, "lagoon"> | "text";
  size?: "sm" | "md" | "lg";
  className?: string;
  type?: "button" | "submit";
  coach?: string;
  /** The whole action, when the slab only shows a sign of it. */
  label?: string;
  /** Waiting for the server: a light turns around the pill, which stays bright but untouchable. */
  busy?: boolean;
  /** Something to take (lots ready): a light runs across the gold now and then. */
  shine?: boolean;
}) {
  const size = {
    // Drawn small, touched at 44 px: the hit area reaches 8 px above and below the pill.
    sm: "min-h-9 px-4 py-1.5 text-[0.8125rem]",
    md: "min-h-11 px-6 py-2.5 text-sm",
    lg: "min-h-[3.25rem] px-7 py-3 text-[0.9375rem]",
  }[props.size ?? "md"];
  if (props.tone === "text")
    return (
      <button
        type={props.type ?? "button"}
        onClick={() => {
          haptic("tap");
          props.onClick?.();
        }}
        disabled={props.disabled}
        data-coach={props.coach}
        aria-label={props.label}
        className={`inline-flex min-h-11 items-center justify-center px-2 font-display font-bold text-info transition hover:brightness-110 active:opacity-70 disabled:pointer-events-none disabled:opacity-35 ${props.size === "lg" ? "text-base" : "text-sm"} ${props.className ?? ""}`}
      >
        {props.children}
      </button>
    );
  const tone = TONES[props.tone ?? "gold"];
  const gold = (props.tone ?? "gold") === "gold";
  return (
    <button
      type={props.type ?? "button"}
      onClick={(e) => {
        if (props.busy) return;
        haptic("tap");
        pressed(e.currentTarget);
        props.onClick?.();
      }}
      disabled={props.disabled}
      aria-busy={props.busy || undefined}
      data-coach={props.coach}
      data-slab={props.tone ?? "gold"}
      aria-label={props.label}
      className={`group relative isolate inline-flex font-display font-extrabold disabled:pointer-events-none disabled:opacity-35 ${props.size === "sm" ? "before:absolute before:inset-x-0 before:-inset-y-2 before:content-['']" : ""} ${props.className ?? ""}`}
    >
      <span
        className={`slab-face press relative flex w-full items-center justify-center overflow-hidden rounded-full text-center leading-tight group-hover:brightness-105 ${props.busy ? "slab-busy" : gold && props.shine ? "slab-shine" : ""} ${size} ${tone.face}`}
      >
        <span className="relative inline-flex items-center justify-center gap-2">
          {unitsKept(props.children)}
        </span>
      </span>
    </button>
  );
}

/**
 * The slab writes in capitals, but an amount's unit stays a small « d »: « ACHETER · 150 d », never
 * « 150 D ». The unit follows the no-break space of format.ts.
 */
export function unitsKept(children: ReactNode): ReactNode {
  const keep = (text: string, key: number | string) => {
    const parts = text.split(/(\u00a0(?:d|ducats)\b)/);
    if (parts.length === 1) return text;
    return parts.map((part, i) =>
      i % 2 === 1 ? (
        // biome-ignore lint/suspicious/noArrayIndexKey: the pieces of one fixed text
        <span key={`${key}:${i}`} className="normal-case">
          {part}
        </span>
      ) : (
        part
      ),
    );
  };
  if (typeof children === "string") return keep(children, 0);
  if (Array.isArray(children))
    return children.map((c, i) => (typeof c === "string" ? keep(c, i) : c));
  return children;
}

/**
 * Lorenzo speaking, the same card wherever he does (the guide, the Terraferma's first visit): a
 * thin lapis frame, his portrait sealed with red wax, his name in cream, his words, then the
 * card's own foot.
 */
export function LorenzoCard({
  portrait,
  name,
  aside,
  children,
  foot,
  bubble,
}: {
  portrait: ReactNode;
  name: ReactNode;
  /** At the top right: the step, « 1/3 ». */
  aside?: ReactNode;
  children: ReactNode;
  foot?: ReactNode;
  /** Marks the guide's own bubble (data-coach-bubble). */
  bubble?: boolean;
}) {
  return (
    <div
      className="cut bg-info/60 p-0.5 shadow-xl shadow-black/40"
      data-coach-bubble={bubble ? "" : undefined}
    >
      <div className="cut bg-night-2 px-3.5 pb-2.5 pt-3">
        <div className="flex gap-3">
          <span className="relative h-fit shrink-0">
            {portrait}
            {/* His seal: red wax, an L pressed in. */}
            <span
              aria-hidden="true"
              className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-vermilion-deep font-display text-[0.5625rem] font-extrabold text-cream ring-1 ring-vermilion"
            >
              L
            </span>
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <Label className="text-cream">{name}</Label>
              {aside && <span className="meta shrink-0 whitespace-nowrap">{aside}</span>}
            </div>
            {children}
          </div>
        </div>
        {foot}
      </div>
    </div>
  );
}

/**
 * A chip of the map's HUD: a sign and a short word, 44 px high, for an action at hand (« Escarmouche
 * », « Semaine ») or a state worth a glance. Lapis (info) by default, vermilion when it presses.
 */
export function HudChip(props: {
  icon: ReactNode;
  children: ReactNode;
  onClick?: () => void;
  tone?: "info" | "vermilion" | "plain";
  /** The whole action, when the chip says it short. */
  label?: string;
  hud?: string;
  disabled?: boolean;
}) {
  const tone = {
    info: "text-info ring-info/45",
    vermilion: "text-vermilion ring-vermilion/60",
    plain: "text-cream ring-line",
  }[props.tone ?? "info"];
  return (
    <button
      type="button"
      data-hud={props.hud}
      aria-label={props.label}
      disabled={props.disabled}
      onClick={() => {
        haptic("tap");
        props.onClick?.();
      }}
      className={`pointer-events-auto flex min-h-11 items-center gap-1.5 whitespace-nowrap rounded-full bg-night/85 px-3.5 font-display text-sm font-bold shadow-[0_4px_14px_rgb(0_0_0/0.45)] ring-1 ring-inset backdrop-blur transition active:scale-95 disabled:opacity-35 ${tone}`}
    >
      <span className="shrink-0">{props.icon}</span>
      <span>{props.children}</span>
    </button>
  );
}

/**
 * Tabs. `pills` (default) for a choice of value; `underline` for the parts of a screen: capitals
 * over a two-tone line that slides from one to the other.
 */
export function Tabs<T extends string>(props: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  coach?: string;
  variant?: "pills" | "underline";
}) {
  if (props.variant === "underline") {
    const n = Math.max(1, props.options.length);
    const index = Math.max(
      0,
      props.options.findIndex((o) => o.value === props.value),
    );
    return (
      <div className="relative flex" role="tablist">
        {props.options.map((o) => {
          const on = o.value === props.value;
          return (
            <button
              key={o.value}
              type="button"
              role="tab"
              aria-selected={on}
              data-coach={props.coach ? `${props.coach}-${o.value}` : undefined}
              onClick={() => {
                if (!on) haptic("tap");
                props.onChange(o.value);
              }}
              // The hit area climbs 14 px above the word: 44 px under the thumb.
              className={`relative flex-1 pb-2.5 pt-1 font-display text-sm font-bold transition-colors before:absolute before:inset-x-0 before:-top-3.5 before:bottom-0 before:content-[''] ${on ? "text-cream" : "text-muted hover:text-cream-dim"}`}
            >
              {o.label}
            </button>
          );
        })}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute bottom-0 h-1.5 transition-[left] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
          style={{ left: `${(index * 100) / n}%`, width: `${100 / n}%` }}
        >
          <span className="absolute left-[30%] right-[30%] top-0 h-[3px] bg-cream" />
          <span className="absolute left-[44%] right-[22%] top-[3px] h-[3px] bg-info" />
        </span>
      </div>
    );
  }
  return (
    <div className="flex gap-1">
      {props.options.map((o) => {
        const on = o.value === props.value;
        return (
          <button
            key={o.value}
            type="button"
            data-coach={props.coach ? `${props.coach}-${o.value}` : undefined}
            onClick={() => props.onChange(o.value)}
            className={`slab min-h-11 flex-1 px-3 py-2.5 font-display text-sm font-bold transition ${on ? "bg-cream text-night" : "bg-night-3 text-cream-dim hover:text-cream"}`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/**
 * Card with cut corners: deep water within a thin line; a coloured line and a glow from within
 * draw the eye when it matters.
 */
export function Panel({
  children,
  className = "",
  glow,
}: { children: ReactNode; className?: string; glow?: Tone }) {
  const line =
    glow === "gold"
      ? "bg-gold/70"
      : glow === "lagoon"
        ? "bg-lagoon/60"
        : glow === "vermilion"
          ? "bg-vermilion/70"
          : "bg-line";
  const inner =
    glow === "gold"
      ? "shadow-[inset_0_0_32px_rgb(var(--gold)/0.12)]"
      : glow === "lagoon"
        ? "shadow-[inset_0_0_32px_rgb(var(--lagoon)/0.12)]"
        : glow === "vermilion"
          ? "shadow-[inset_0_0_32px_rgb(var(--vermilion)/0.14)]"
          : "";
  return (
    <div className={`cut p-px ${line}`}>
      <div className={`cut h-full bg-night-3 p-4 ${inner} ${className}`}>{children}</div>
    </div>
  );
}

/**
 * A number that runs to its new value (money, counts): 400 ms, decelerating. `format` writes it.
 */
export function CountUp({ value, format }: { value: number; format: (v: number) => string }) {
  const [shown, setShown] = useState(value);
  const from = useRef(value);
  useEffect(() => {
    const start = from.current;
    if (start === value) return;
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      from.current = value;
      setShown(value);
      return;
    }
    const t0 = performance.now();
    let raf = 0;
    const step = (t: number) => {
      const k = Math.min(1, (t - t0) / 400);
      const v = start + (value - start) * (1 - (1 - k) ** 3);
      from.current = v;
      setShown(v);
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return <>{format(shown)}</>;
}

/**
 * A number on mechanical wheels (the purse): each digit a column of 0 to 9 that rolls to its new
 * figure, the rightmost first; separators stay still. A hidden digit in the flow keeps the width
 * and the baseline, the wheel is clipped to it: the line around it never moves. Read whole by
 * screen readers.
 */
export function Odometer({ text }: { text: string }) {
  const chars = [...text];
  return (
    <span className="whitespace-nowrap">
      <span className="sr-only">{text}</span>
      <span aria-hidden="true">
        {chars.map((ch, i) => {
          // Keyed from the right: a new leading digit leaves the others' wheels in place.
          const key = chars.length - i;
          if (!/\d/.test(ch)) return <span key={key}>{ch}</span>;
          return (
            <span key={key} className="odo-digit">
              <span className="invisible">{ch}</span>
              <span
                className="odo-wheel"
                style={{
                  transform: `translateY(-${Number(ch) * 10}%)`,
                  transitionDelay: `${(key - 1) * 50}ms`,
                }}
              >
                {DIGITS.map((d) => (
                  <span key={d}>{d}</span>
                ))}
              </span>
            </span>
          );
        })}
      </span>
    </span>
  );
}
const DIGITS = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"];

/** On/off switch (vellum knob), instead of a bare checkbox. */
export function Switch(props: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: ReactNode;
  hint?: ReactNode;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={props.checked}
      onClick={() => props.onChange(!props.checked)}
      className="flex w-full items-center gap-3 cut border border-line bg-night-3 p-3 text-left"
    >
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold">{props.label}</span>
        {props.hint && <span className="block text-xs text-cream-dim">{props.hint}</span>}
      </span>
      <span
        className={`relative h-7 w-12 shrink-0 rounded-full transition ${props.checked ? "bg-lagoon" : "bg-night-4 ring-1 ring-inset ring-line"}`}
      >
        <span
          className={`absolute top-1 h-5 w-5 rounded-full bg-cream transition-all ${props.checked ? "left-6" : "left-1"}`}
        />
      </span>
    </button>
  );
}

/** Small figure tile: a label and a value, side by side with others. */
export function Stat({
  label,
  value,
  tone,
}: { label: ReactNode; value: ReactNode; tone?: "gold" | "lagoon" | "vermilion" }) {
  const color =
    tone === "gold"
      ? "text-gold"
      : tone === "lagoon"
        ? "text-lagoon"
        : tone === "vermilion"
          ? "text-vermilion"
          : "text-cream";
  return (
    <div className="cut bg-night-2 px-3 py-2.5 ring-1 ring-inset ring-line/70">
      <p className="text-xs text-cream-dim">{label}</p>
      <p className={`mt-0.5 font-display text-base font-extrabold tabular-nums ${color}`}>
        {value}
      </p>
    </div>
  );
}

export function Label({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <p className={`label ${className}`}>{children}</p>;
}

/** Big display number, for money and countdowns. */
export function Big({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <p className={`font-display font-extrabold tabular-nums leading-none ${className}`}>
      {children}
    </p>
  );
}

/** A small tag. Neutral by default: gold is for money, not for a label. */
export function Badge({ children, tone = "ghost" }: { children: ReactNode; tone?: Tone | "info" }) {
  const look = {
    gold: "bg-gold text-ink",
    lagoon: "bg-lagoon text-on-lagoon",
    vermilion: "bg-vermilion text-cream",
    ghost: "bg-night-4 text-cream",
    info: "bg-info text-night",
  }[tone];
  return (
    <span
      className={`slab inline-block shrink-0 whitespace-nowrap px-2.5 py-0.5 font-display text-xs font-bold ${look}`}
    >
      <span>{children}</span>
    </span>
  );
}

/** Striped progress bar, like a guild ledger's ribbon. */
export function Ribbon({
  value,
  label,
  tone = "gold",
}: { value: number; label?: string; tone?: "gold" | "lagoon" }) {
  const v = Math.max(0, Math.min(1, value));
  // Lagune: a thread of light, its figures above it; progress in lapis (gold stays for money),
  // lagoon for what is ready or gained.
  return (
    <div className="space-y-1">
      {label && (
        <span className="block text-right font-display text-xs font-semibold tabular-nums text-cream-dim">
          {label}
        </span>
      )}
      <div className="relative h-2 overflow-hidden rounded-full bg-night-4">
        <div
          className={`h-full rounded-full ${tone === "gold" ? "bg-gradient-to-r from-info/70 to-info" : "bg-lagoon"} shadow-[0_0_10px_rgb(var(--info)/0.5)] transition-all duration-500`}
          style={{ width: `${v * 100}%` }}
        />
      </div>
    </div>
  );
}

export function Sparkline({
  points,
  width = 96,
  height = 28,
}: { points: number[]; width?: number; height?: number }) {
  // Nothing drawn without two prices: an empty dashed line read as a broken chart. Its room kept.
  if (points.length < 2)
    return <span aria-hidden="true" style={{ width, height }} className="block" />;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const span = max - min || 1;
  const xy = points.map(
    (p, i) =>
      [
        2 + (i * (width - 4)) / (points.length - 1),
        height - 3 - ((p - min) / span) * (height - 6),
      ] as const,
  );
  const d = xy.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");
  const up = (points.at(-1) ?? 0) >= (points[0] ?? 0);
  const color = up ? P.lagoon : P.vermilion;
  const last = xy.at(-1) ?? [0, 0];
  return (
    <svg width={width} height={height} aria-hidden="true">
      <path d={`${d} L${last[0]} ${height} L2 ${height} Z`} fill={color} opacity="0.12" />
      <path d={d} stroke={color} strokeWidth="2" fill="none" strokeLinejoin="round" />
      <circle cx={last[0]} cy={last[1]} r="2.5" fill={color} />
    </svg>
  );
}

export function Donut({
  parts,
  size = 120,
}: { parts: { value: number; color: string }[]; size?: number }) {
  const total = parts.reduce((a, p) => a + p.value, 0) || 1;
  const r = 40;
  const c = 2 * Math.PI * r;
  let offset = 0;
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} aria-hidden="true">
      <circle cx="50" cy="50" r={r} fill="none" stroke={P.night} strokeWidth="14" />
      {parts.map((p) => {
        const len = (p.value / total) * c;
        const el = (
          <circle
            key={p.color}
            cx="50"
            cy="50"
            r={r}
            fill="none"
            stroke={p.color}
            strokeWidth="14"
            strokeDasharray={`${Math.max(0, len - 1.5)} ${c}`}
            strokeDashoffset={-offset}
            transform="rotate(-90 50 50)"
          />
        );
        offset += len;
        return el;
      })}
    </svg>
  );
}

export function Qty(props: {
  value: number;
  max: number;
  onChange: (v: number) => void;
  /** Off where presets already offer the most possible. */
  maxButton?: boolean;
}) {
  const set = (v: number) =>
    props.onChange(Math.max(1, Math.min(Math.max(1, props.max), Math.round(v))));
  // The slab is drawn inside: its slant would cut 3 px off each side of a 44 px button's touch.
  const btn =
    "group grid h-11 w-11 place-items-center font-display text-lg transition active:scale-95 disabled:opacity-35";
  const face =
    "slab col-start-1 row-start-1 h-full w-full bg-night-4 ring-1 ring-inset ring-line group-hover:ring-cream-dim/40";
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        aria-label="Moins"
        className={btn}
        disabled={props.value <= 1}
        onClick={() => set(props.value - 1)}
      >
        <span aria-hidden="true" className={face} />
        <span className="relative col-start-1 row-start-1">−</span>
      </button>
      <input
        type="number"
        inputMode="numeric"
        min={1}
        value={props.value}
        onChange={(e) => set(Number(e.target.value) || 1)}
        aria-label={fr.misc.quantity}
        className="h-11 w-16 rounded-md bg-night text-center font-display text-base ring-1 ring-line focus:outline-none focus:ring-info"
      />
      <button
        type="button"
        aria-label="Plus"
        className={btn}
        disabled={props.value >= props.max}
        onClick={() => set(props.value + 1)}
      >
        <span aria-hidden="true" className={face} />
        <span className="relative col-start-1 row-start-1">+</span>
      </button>
      {props.maxButton !== false && (
        <button
          type="button"
          className="label h-11 slab bg-night-4 px-3 text-cream transition hover:bg-night-3 active:scale-95"
          onClick={() => set(props.max)}
        >
          max
        </button>
      )}
    </div>
  );
}

let scrollLocks = 0;

/** Keeps the page still behind a window; nested windows share the lock. */
function useScrollLock(on: boolean) {
  useEffect(() => {
    if (!on) return;
    scrollLocks++;
    const body = document.body;
    const previous = body.style.overflow;
    body.style.overflow = "hidden";
    return () => {
      scrollLocks--;
      if (scrollLocks === 0) body.style.overflow = previous;
    };
  }, [on]);
}

/**
 * While open: Escape and the phone's back button close it, the page behind stays still, and
 * focus goes into it and comes back to where it was.
 */
export function useOverlay(open: boolean, onClose: () => void) {
  const close = useRef(onClose);
  close.current = onClose;
  useScrollLock(open);
  useEffect(() => {
    if (!open) return;
    const esc = (e: KeyboardEvent) => e.key === "Escape" && close.current();
    window.addEventListener("keydown", esc);
    const stopBack = onBack(() => {
      close.current();
      return true;
    });
    const before = document.activeElement as HTMLElement | null;
    return () => {
      window.removeEventListener("keydown", esc);
      stopBack();
      before?.focus?.({ preventScroll: true });
    };
  }, [open]);
}

/** Round close button, the same in every window. */
export function CloseButton({
  onClick,
  className = "",
}: { onClick: () => void; className?: string }) {
  return (
    <button
      type="button"
      aria-label="Fermer"
      onClick={onClick}
      className={`flex h-11 w-11 items-center justify-center rounded-full text-cream-dim ring-1 ring-inset ring-line transition hover:text-cream active:scale-95 ${className}`}
    >
      <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
        <path
          d="M3 3l10 10M13 3L3 13"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    </button>
  );
}

/**
 * A window closed stays a moment on screen to leave (its exit, shorter than its entrance): true
 * from the render that closes it, for `ms`. Set during the render, so that no frame shows it gone
 * then back. Never for those who ask for less motion.
 */
export function useLeaving(open: boolean, ms: number): boolean {
  const [was, setWas] = useState(open);
  const [leaving, setLeaving] = useState(false);
  if (was !== open) {
    setWas(open);
    setLeaving(
      !open &&
        typeof window !== "undefined" &&
        !window.matchMedia?.("(prefers-reduced-motion: reduce)").matches,
    );
  }
  useEffect(() => {
    if (!leaving) return;
    const t = setTimeout(() => setLeaving(false), ms);
    return () => clearTimeout(t);
  }, [leaving, ms]);
  return leaving && !open;
}

/**
 * A sheet pulled down by the finger: it follows (resisting a little), then closes past a third of
 * its height or on a quick flick, or springs back. Only from the top of its scroll, on a phone.
 */
function useDragToClose(
  panel: { current: HTMLDialogElement | null },
  open: boolean,
  onClose: () => void,
) {
  const close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    const el = panel.current;
    if (!open || !el || window.matchMedia("(min-width: 1024px)").matches) return;
    let startY = 0;
    let startT = 0;
    let dy = 0;
    let dragging = false;
    const set = (y: number, animate: boolean) => {
      el.style.transition = animate ? "transform 0.22s cubic-bezier(0.22, 1, 0.36, 1)" : "none";
      el.style.transform = y > 0 ? `translateY(${y}px)` : "";
    };
    const start = (e: TouchEvent) => {
      const t = e.touches[0];
      if (!t || e.touches.length > 1) return;
      startY = t.clientY;
      startT = performance.now();
      dy = 0;
      dragging = false;
    };
    const move = (e: TouchEvent) => {
      const t = e.touches[0];
      if (!t) return;
      const d = t.clientY - startY;
      if (!dragging) {
        // Only a pull down from the top of the sheet's own scroll.
        if (d <= 6 || el.scrollTop > 0) return;
        dragging = true;
        startY = t.clientY;
        // The opening animation would hold the transform: let the finger have it.
        el.style.animation = "none";
      }
      e.preventDefault();
      dy = Math.max(0, t.clientY - startY);
      set(dy < 120 ? dy : 120 + (dy - 120) * 0.6, false);
    };
    const end = () => {
      if (!dragging) return;
      dragging = false;
      const speed = dy / Math.max(1, performance.now() - startT);
      if (dy > el.offsetHeight * 0.3 || (speed > 0.6 && dy > 40)) {
        el.style.transition = "transform 0.2s ease-in";
        el.style.transform = "translateY(100%)";
        // Gone down already: its exit starts from there, not from the top again.
        el.dataset.dragged = "1";
        setTimeout(() => close.current(), 180);
      } else {
        set(0, true);
      }
    };
    el.addEventListener("touchstart", start, { passive: true });
    el.addEventListener("touchmove", move, { passive: false });
    el.addEventListener("touchend", end);
    el.addEventListener("touchcancel", end);
    return () => {
      el.removeEventListener("touchstart", start);
      el.removeEventListener("touchmove", move);
      el.removeEventListener("touchend", end);
      el.removeEventListener("touchcancel", end);
      if (el.dataset.dragged) return;
      el.style.transform = "";
      el.style.transition = "";
    };
  }, [panel, open]);
}

/**
 * Bottom sheet on a phone, centred window on a computer, for focused actions. Its head stays in
 * sight while the content scrolls under it: the handle and the cross, and with a `title` the
 * sheet's kicker, title and one-line summary, then its state and action, then its `Rules`.
 */
export function Sheet({
  open,
  onClose,
  kicker,
  title,
  summary,
  size,
  children,
}: {
  open: boolean;
  onClose: () => void;
  kicker?: ReactNode;
  title?: ReactNode;
  summary?: ReactNode;
  /** « wide »: twice the room on a computer (the workshops in two columns). */
  size?: "wide";
  children: ReactNode;
}) {
  const panel = useRef<HTMLDialogElement>(null);
  // More below: a fade at the foot says so, until the end is reached.
  const [more, setMore] = useState(false);
  useEffect(() => {
    const el = panel.current;
    if (!open || !el) return;
    const look = () => setMore(el.scrollHeight - el.scrollTop - el.clientHeight > 8);
    look();
    el.addEventListener("scroll", look, { passive: true });
    const sizes = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(look);
    sizes?.observe(el);
    if (el.firstElementChild) sizes?.observe(el.firstElementChild);
    return () => {
      el.removeEventListener("scroll", look);
      sizes?.disconnect();
    };
  }, [open]);
  useOverlay(open, onClose);
  useEffect(() => {
    const el = panel.current;
    if (!open || !el) return;
    // Opened again while it was leaving after a pull down: it comes back up.
    if (el.dataset.dragged) {
      delete el.dataset.dragged;
      el.style.animation = "";
      el.style.transform = "";
      el.style.transition = "";
    }
    el.focus({ preventScroll: true });
  }, [open]);
  useDragToClose(panel, open, onClose);
  // Closed, it leaves (index.css, .sheet-out) with what it showed last: its caller may already
  // have dropped the content.
  const leaving = useLeaving(open, 170);
  const shown = useRef({ title, summary, children });
  if (open) shown.current = { title, summary, children };
  if (!open && !leaving) return null;
  const head = shown.current;
  // On the body: a parent with a backdrop blur would otherwise trap the fixed window inside it.
  return createPortal(
    <div
      className={`fixed inset-0 z-40 flex items-end justify-center lg:items-center ${leaving ? "pointer-events-none" : ""}`}
      aria-hidden={leaving || undefined}
    >
      <button
        type="button"
        aria-label="Fermer"
        tabIndex={-1}
        className={`absolute inset-0 bg-black/60 ${leaving ? "veil-out" : "animate-fade"}`}
        onClick={onClose}
      />
      {/* Opened in place (not showModal): it stays under the guide's bubble. */}
      <dialog
        open
        ref={panel}
        aria-modal="true"
        tabIndex={-1}
        className={`relative m-0 max-h-[92dvh] w-full max-w-md ${leaving ? "sheet-out" : "animate-sheet lg:animate-pop"} overflow-y-auto overscroll-contain rounded-t-3xl border-t border-line bg-night-2 px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-3 text-cream shadow-2xl shadow-black/50 focus:outline-none lg:rounded-3xl lg:border lg:p-7 ${size === "wide" ? "lg:max-w-3xl" : "lg:max-w-lg"}`}
      >
        {/* Sticky from the dialog's own edge, over its padding (a sticky box stops under it). */}
        <div
          data-sheet-head
          className={`sticky -top-3 z-10 -mx-5 -mt-3 bg-night-2/90 px-5 pt-3 backdrop-blur lg:-top-7 lg:-mx-7 lg:-mt-7 lg:px-7 lg:pt-7 ${head.title ? "mb-4 border-b border-line/60 pb-3" : "mb-4 lg:mb-0"}`}
        >
          <div
            className={`mx-auto h-1.5 w-12 rounded-full bg-line lg:hidden ${head.title ? "mb-3" : ""}`}
          />
          {head.title ? (
            <>
              <div className="flex items-start gap-3">
                <div className="min-w-0 flex-1 pt-1">
                  {kicker && <p className="label text-cream-dim">{kicker}</p>}
                  <h3 className="font-place text-xl font-bold uppercase">{head.title}</h3>
                </div>
                <CloseButton onClick={onClose} className="-mr-2 shrink-0" />
              </div>
              {head.summary && <p className="meta mt-1">{head.summary}</p>}
            </>
          ) : (
            <CloseButton onClick={onClose} className="absolute right-3 top-3 lg:right-4 lg:top-4" />
          )}
        </div>
        {head.children}
        {more && (
          <div
            aria-hidden="true"
            className="pointer-events-none sticky -bottom-[max(1.5rem,env(safe-area-inset-bottom))] -mx-5 -mb-[max(1.5rem,env(safe-area-inset-bottom))] h-6 bg-gradient-to-t from-night-2 to-transparent lg:-bottom-7 lg:-mx-7 lg:-mb-7"
          />
        )}
      </dialog>
    </div>,
    document.body,
  );
}

/**
 * How a sheet works, folded under its action: open the first time the sheet is seen, folded
 * after; the merchant's own choice (opened or folded) is kept, sheet by sheet.
 */
export function Rules({ id, children }: { id: string; children: ReactNode }) {
  const key = `rules:${id}`;
  const [open] = useState(() => (store.get(key) ?? "first") !== "closed");
  // The state last kept: the toggle the browser fires as it draws an open fold is not a choice.
  const kept = useRef(open);
  useEffect(() => {
    if (store.get(key) === null) store.set(key, "closed");
  }, [key]);
  return (
    <details
      open={open}
      onToggle={(e) => {
        if (e.currentTarget.open === kept.current) return;
        kept.current = e.currentTarget.open;
        store.set(key, kept.current ? "open" : "closed");
      }}
      className="group cut bg-night-3/60 ring-1 ring-inset ring-line"
    >
      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 px-3 text-sm text-cream-dim [&::-webkit-details-marker]:hidden">
        {fr.game.ui.howItWorks}
        <svg
          width="12"
          height="12"
          viewBox="0 0 12 12"
          aria-hidden="true"
          className="shrink-0 transition-transform group-open:rotate-180"
        >
          <path d="M2 4l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.75" />
        </svg>
      </summary>
      <div className="px-3 pb-3 text-sm leading-snug text-cream-dim">{children}</div>
    </details>
  );
}

/** "05:12" or "3 h 05" or "2 j 4 h". */
export function clock(ms: number): string {
  const s = Math.max(0, Math.ceil(ms / 1000));
  const d = Math.floor(s / 86_400);
  const h = Math.floor((s % 86_400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  // Non-breaking spaces: a time left never ends a line on « 21 » with its « h » on the next.
  if (d > 0) return `${d}\u00a0${fr.misc.dayUnit}\u00a0${h}\u00a0h`;
  if (h > 0) return `${h}\u00a0h\u00a0${m.toString().padStart(2, "0")}`;
  return `${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
}

/** A choice among a few, inside a sheet: a row of small pills (sorts, periods). */
export function Segmented<T extends string>({
  value,
  options,
  onChange,
  coach,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
  coach?: string;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={value === o.value}
          data-coach={coach ? `${coach}-${o.value}` : undefined}
          onClick={() => onChange(o.value)}
          // Lagune: a pill, the chosen one lit in lapis.
          className={`min-h-11 rounded-full px-4 py-2.5 font-display text-sm font-semibold transition-colors ${value === o.value ? "bg-info font-bold text-ink" : "text-cream-dim ring-1 ring-inset ring-line"}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
