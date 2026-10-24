import { type ReactNode, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { P } from "./art/palette.js";
import { onBack } from "./game/back.js";
import { store } from "./game/store.js";
import { haptic } from "./haptics.js";
import { fr } from "./i18n.js";

type Tone = "gold" | "lagoon" | "vermilion" | "ghost";

/** Face and solid offset shadow of each tone. */
const TONES: Record<Tone, { face: string; shadow: string }> = {
  gold: { face: "bg-gold text-ink", shadow: "bg-gold-deep" },
  lagoon: { face: "bg-lagoon text-on-lagoon", shadow: "bg-lagoon-deep" },
  vermilion: { face: "bg-vermilion text-cream", shadow: "bg-vermilion-deep" },
  ghost: { face: "bg-night-4 text-cream", shadow: "bg-line" },
};

/**
 * Button: a slanted slab on a solid offset shadow, gold for the one action that matters on the
 * screen. Pressed, the face sinks onto its shadow.
 */
export function Slab(props: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  /** Gold for the one action that matters on the screen, ghost for the others; never lagoon. */
  tone?: Exclude<Tone, "lagoon">;
  size?: "sm" | "md" | "lg";
  className?: string;
  type?: "button" | "submit";
  coach?: string;
  /** The whole action, when the slab only shows a sign of it. */
  label?: string;
}) {
  const size = {
    // Drawn small, touched at 44 px: the hit area reaches 8 px above and below the slab.
    sm: "px-4 py-2 text-xs",
    md: "px-6 py-3 text-sm",
    lg: "px-7 py-4 text-base",
  }[props.size ?? "md"];
  const tone = TONES[props.tone ?? "gold"];
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
      className={`group relative isolate inline-flex pb-1 pr-1 font-display font-extrabold uppercase tracking-wide disabled:pointer-events-none disabled:opacity-35 ${props.size === "sm" ? "before:absolute before:inset-x-0 before:-inset-y-2 before:content-['']" : ""} ${props.className ?? ""}`}
    >
      <span
        aria-hidden="true"
        className={`bevel absolute inset-0 left-1 top-1 -z-10 ${tone.shadow}`}
      />
      <span
        className={`bevel flex w-full items-center justify-center text-center transition-transform duration-100 ease-out group-hover:brightness-105 group-active:translate-x-[3px] group-active:translate-y-[3px] ${size} ${tone.face}`}
      >
        <span>{unitsKept(props.children)}</span>
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
              className={`relative flex-1 pb-2.5 pt-1 font-display text-xs font-extrabold uppercase tracking-[0.12em] transition-colors before:absolute before:inset-x-0 before:-top-3.5 before:bottom-0 before:content-[''] ${on ? "text-cream" : "text-muted hover:text-cream-dim"}`}
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
            className={`slab min-h-11 flex-1 px-3 py-2.5 font-display text-xs font-extrabold uppercase tracking-wide transition ${on ? "bg-cream text-night" : "bg-night-3 text-cream-dim hover:text-cream"}`}
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
      className={`slab inline-block shrink-0 whitespace-nowrap px-2.5 py-0.5 font-mono text-xs font-bold uppercase tracking-wider ${look}`}
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
  return (
    <div className="relative h-6 overflow-hidden rounded-full bg-night ring-1 ring-line">
      <div
        className={`stripes h-full rounded-full ${tone === "gold" ? "bg-gold" : "bg-lagoon"} transition-all duration-500`}
        style={{ width: `${v * 100}%` }}
      />
      {label && (
        <span className="absolute inset-0 flex items-center justify-center font-mono text-xs font-bold tracking-widest text-cream [text-shadow:0_1px_2px_#000]">
          {label}
        </span>
      )}
    </div>
  );
}

export function Sparkline({
  points,
  width = 96,
  height = 28,
}: { points: number[]; width?: number; height?: number }) {
  if (points.length < 2) {
    return (
      <svg width={width} height={height} aria-hidden="true">
        <path
          d={`M2 ${height / 2} H${width - 2}`}
          stroke={P.line}
          strokeWidth="2"
          strokeDasharray="3 4"
        />
      </svg>
    );
  }
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
        aria-label="Quantité"
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
  children,
}: {
  open: boolean;
  onClose: () => void;
  kicker?: ReactNode;
  title?: ReactNode;
  summary?: ReactNode;
  children: ReactNode;
}) {
  const panel = useRef<HTMLDialogElement>(null);
  useOverlay(open, onClose);
  useEffect(() => {
    if (open) panel.current?.focus({ preventScroll: true });
  }, [open]);
  useDragToClose(panel, open, onClose);
  if (!open) return null;
  // On the body: a parent with a backdrop blur would otherwise trap the fixed window inside it.
  return createPortal(
    <div className="fixed inset-0 z-40 flex items-end justify-center lg:items-center">
      <button
        type="button"
        aria-label="Fermer"
        tabIndex={-1}
        className="absolute inset-0 animate-fade bg-black/60"
        onClick={onClose}
      />
      {/* Opened in place (not showModal): it stays under the guide's bubble. */}
      <dialog
        open
        ref={panel}
        aria-modal="true"
        tabIndex={-1}
        className="relative m-0 max-h-[92dvh] w-full max-w-md animate-sheet overflow-y-auto overscroll-contain rounded-t-3xl border-t border-line bg-night-2 px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-3 text-cream shadow-2xl shadow-black/50 focus:outline-none lg:max-w-lg lg:animate-pop lg:rounded-3xl lg:border lg:p-7"
      >
        {/* Sticky from the dialog's own edge, over its padding (a sticky box stops under it). */}
        <div
          data-sheet-head
          className={`sticky -top-3 z-10 -mx-5 -mt-3 bg-night-2/90 px-5 pt-3 backdrop-blur lg:-top-7 lg:-mx-7 lg:-mt-7 lg:px-7 lg:pt-7 ${title ? "mb-4 border-b border-line/60 pb-3" : "mb-4 lg:mb-0"}`}
        >
          <div
            className={`mx-auto h-1.5 w-12 rounded-full bg-line lg:hidden ${title ? "mb-3" : ""}`}
          />
          {title ? (
            <>
              <div className="flex items-start gap-3">
                <div className="min-w-0 flex-1 pt-1">
                  {kicker && <p className="label text-cream-dim">{kicker}</p>}
                  <h3 className="font-display text-xl font-extrabold uppercase">{title}</h3>
                </div>
                <CloseButton onClick={onClose} className="-mr-2 shrink-0" />
              </div>
              {summary && <p className="meta mt-1">{summary}</p>}
            </>
          ) : (
            <CloseButton onClick={onClose} className="absolute right-3 top-3 lg:right-4 lg:top-4" />
          )}
        </div>
        {children}
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
  if (d > 0) return `${d}\u00a0j\u00a0${h}\u00a0h`;
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
          className={`slab min-h-11 px-4 py-2.5 font-mono text-xs uppercase tracking-[0.06em] transition-colors ${value === o.value ? "bg-info/20 font-bold text-info" : "bg-night-3 text-cream-dim"}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
