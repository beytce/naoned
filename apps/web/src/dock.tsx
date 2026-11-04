import { type ReactNode, useEffect, useRef } from "react";
import { GoodsMark } from "./art/goods.js";
import { Coin } from "./art/icons.js";
import { onBack } from "./game/back.js";
import { d } from "./game/format.js";
import { Icon } from "./game/map/icons.js";
import { haptic } from "./haptics.js";
import { CloseButton, useDragToClose } from "./ui.js";

/*
 * The dock (docs/plan-dock.md; design of the owner, 4 November 2026): one scene, one dock, one
 * decision. The place stays in sight above (the 3D board, the Porta, the Remise); the dock at the
 * foot carries one decision at a time, its choices are objects to touch (cards, sockets), every
 * raise shows what it brings before what it costs, the neighbours are a gesture away, and one gold
 * action ends it.
 */

// ---------------------------------------------------------------------------------------------
// Pure helpers
// ---------------------------------------------------------------------------------------------

/** The neighbour of `id` in `ids`, round the ring (‹ ›); the first when `id` is not there. */
export function siblingOf(ids: readonly string[], id: string, dir: 1 | -1): string | null {
  if (ids.length === 0) return null;
  const i = ids.indexOf(id);
  if (i < 0) return ids[0] ?? null;
  return ids[(i + dir + ids.length) % ids.length] ?? null;
}

export type CostChip =
  | { kind: "ducats"; need: string; ok: boolean }
  | { kind: "good"; code: string; have: number; need: number; ok: boolean }
  | { kind: "time"; minutes: number; ok: true };

/** A cost as chips « have / need »: the ducats, each good (never more than needed), the time. */
export function costChips(c: {
  cash: string;
  cost?: string | null;
  materials?: Record<string, number>;
  stock?: Record<string, number>;
  minutes?: number | null;
}): CostChip[] {
  const out: CostChip[] = [];
  if (c.cost && BigInt(c.cost) > 0n)
    out.push({ kind: "ducats", need: c.cost, ok: BigInt(c.cash) >= BigInt(c.cost) });
  for (const [code, need] of Object.entries(c.materials ?? {})) {
    const have = Math.min(need, c.stock?.[code] ?? 0);
    out.push({ kind: "good", code, have, need, ok: have >= need });
  }
  if (c.minutes && c.minutes > 0) out.push({ kind: "time", minutes: c.minutes, ok: true });
  return out;
}

/** Whether a change reads as a gain (`lower`: less is better, as a time). */
export function compareTone(
  before: number,
  after: number,
  lower = false,
): "better" | "worse" | "same" {
  if (after === before) return "same";
  return after > before !== lower ? "better" : "worse";
}

/** Each step of a rail: done before the current one, now, next after. */
export function stepStates(current: number, n: number): ("done" | "now" | "next")[] {
  return Array.from({ length: n }, (_, i) =>
    i < current ? "done" : i === current ? "now" : "next",
  );
}

/** Minutes as « 45 min », « 2 h 05 ». */
export function minutesText(m: number): string {
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r === 0 ? `${h} h` : `${h} h ${String(r).padStart(2, "0")}`;
}

// ---------------------------------------------------------------------------------------------
// The pieces
// ---------------------------------------------------------------------------------------------

/**
 * The dock: rounded at the top, its handle, at most 55 % of the screen; pulled down it closes, as
 * Escape and the phone's back button do. It is no window: the scene above keeps its touches.
 */
export function Dock({
  children,
  onClose,
  label,
  attrs,
  className = "",
}: {
  children: ReactNode;
  /** Closed by a pull down, Escape or the back button (none: it stays). */
  onClose?: () => void;
  label?: string;
  /** Data attributes for the tests and the guide. */
  attrs?: Record<`data-${string}`, string | undefined>;
  className?: string;
}) {
  const panel = useRef<HTMLElement>(null);
  const close = useRef(onClose);
  close.current = onClose;
  const closable = onClose !== undefined;
  useDragToClose(panel, closable, () => close.current?.());
  useEffect(() => {
    if (!closable) return;
    const esc = (e: KeyboardEvent) => e.key === "Escape" && close.current?.();
    window.addEventListener("keydown", esc);
    const stop = onBack(() => {
      close.current?.();
      return true;
    });
    return () => {
      window.removeEventListener("keydown", esc);
      stop();
    };
  }, [closable]);
  return (
    <section
      ref={panel}
      aria-label={label}
      data-dock=""
      {...attrs}
      className={`dock-in pointer-events-auto relative mx-auto flex max-h-[55dvh] w-full max-w-md flex-col gap-3 overflow-y-auto overscroll-contain rounded-t-[1.75rem] border-t border-line bg-night-2 px-4 pb-[max(0.875rem,env(safe-area-inset-bottom))] pt-2 text-cream shadow-[0_-12px_40px_rgb(0_0_0/0.45)] lg:mb-4 lg:rounded-3xl lg:border ${className}`}
    >
      <span aria-hidden="true" className="mx-auto h-1 w-10 shrink-0 rounded-full bg-line" />
      {children}
    </section>
  );
}

/** The head of a dock: back, the place's name in capitals, its line, its neighbours, close. */
export function PlaceHeader({
  title,
  sub,
  onBack: back,
  siblings,
  onClose,
}: {
  title: ReactNode;
  sub?: ReactNode;
  onBack?: () => void;
  /** ‹ n/N ›, to the neighbour of the same kind. */
  siblings?: { index: number; count: number; onPrev: () => void; onNext: () => void };
  onClose?: () => void;
}) {
  return (
    <div className="flex items-center gap-2" data-place-header>
      {back && (
        <button
          type="button"
          aria-label="Retour"
          onClick={() => {
            haptic("tap");
            back();
          }}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full ring-1 ring-inset ring-edge text-cream active:scale-95 [&_svg]:h-5 [&_svg]:w-5"
          data-dock-back
        >
          {Icon.chevronLeft()}
        </button>
      )}
      <div className="min-w-0 flex-1">
        <h3 className="line-clamp-2 font-place text-sm font-bold uppercase leading-tight tracking-[0.12em] text-cream">
          {title}
        </h3>
        {sub && <p className="truncate text-xs text-cream-dim">{sub}</p>}
      </div>
      {siblings && siblings.count > 1 && (
        <div className="flex shrink-0 items-center gap-1" data-siblings>
          <button
            type="button"
            aria-label="Précédent"
            onClick={() => {
              haptic("tap");
              siblings.onPrev();
            }}
            className="flex h-11 w-11 items-center justify-center rounded-full bg-night-3 text-info active:scale-95 [&_svg]:h-5 [&_svg]:w-5"
            data-sibling="prev"
          >
            {Icon.chevronLeft()}
          </button>
          <span className="w-9 text-center font-display text-xs tabular-nums text-cream-dim">
            {siblings.index + 1}/{siblings.count}
          </span>
          <button
            type="button"
            aria-label="Suivant"
            onClick={() => {
              haptic("tap");
              siblings.onNext();
            }}
            className="flex h-11 w-11 items-center justify-center rounded-full bg-night-3 text-info active:scale-95 [&_svg]:h-5 [&_svg]:w-5"
            data-sibling="next"
          >
            {Icon.chevronRight()}
          </button>
        </div>
      )}
      {onClose && <CloseButton onClick={onClose} className="shrink-0" />}
    </div>
  );
}

/** 1 · 2 · 3: the steps of a decision; a step done leads back to it, the next never ahead. */
export function StepRail({
  steps,
  current,
  onStep,
}: {
  steps: string[];
  current: number;
  onStep?: (i: number) => void;
}) {
  const states = stepStates(current, steps.length);
  return (
    <ol className="flex items-center gap-1.5" data-step-rail={current}>
      {steps.map((s, i) => {
        const state = states[i];
        const dot = (
          <span
            className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full font-display text-xs font-extrabold [&_svg]:h-3.5 [&_svg]:w-3.5 ${
              state === "done"
                ? "bg-lagoon text-on-lagoon"
                : state === "now"
                  ? "bg-info text-night"
                  : "ring-1 ring-inset ring-edge text-cream-dim"
            }`}
          >
            {state === "done" ? Icon.check() : i + 1}
          </span>
        );
        const body = (
          <>
            {dot}
            <span className={state === "now" ? "" : "max-[359px]:sr-only"}>{s}</span>
          </>
        );
        const look = `flex min-h-9 items-center gap-1.5 rounded-full pl-1 pr-3 text-[0.8125rem] font-semibold ${
          state === "done"
            ? "bg-lagoon/15 text-lagoon"
            : state === "now"
              ? "bg-night-3 text-cream ring-[1.5px] ring-inset ring-info"
              : "text-cream-dim"
        }`;
        return (
          <li key={s} className="flex min-w-0 items-center gap-1.5 [&:not(:last-child)]:flex-1">
            {state === "done" && onStep ? (
              <button
                type="button"
                className={`${look} relative before:absolute before:-inset-y-1 before:inset-x-0 before:content-['']`}
                onClick={() => onStep(i)}
              >
                {body}
              </button>
            ) : (
              <span className={look} aria-current={state === "now" ? "step" : undefined}>
                {body}
              </span>
            )}
            {i < steps.length - 1 && (
              <span
                aria-hidden="true"
                className={`h-0.5 min-w-2 flex-1 rounded-full ${state === "done" ? "bg-lagoon/50" : "bg-line"}`}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}

/** A choice to touch: a lapis ring and a tick when chosen; a locked one says why. */
export function ChoiceCard({
  selected = false,
  locked,
  danger = false,
  disabled = false,
  onClick,
  children,
  className = "",
  attrs,
  label,
}: {
  selected?: boolean;
  /** Why it is closed (« Casa 11 »): a padlock and that line, untouchable. */
  locked?: ReactNode;
  /** The Porta noire: cinnabar, chosen knowingly. */
  danger?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
  className?: string;
  attrs?: Record<`data-${string}`, string | undefined>;
  label?: string;
}) {
  const ring = selected
    ? danger
      ? "bg-vermilion/10 ring-2 ring-vermilion"
      : "bg-night-3 ring-2 ring-info"
    : danger
      ? "bg-vermilion/5 ring-[1.5px] ring-vermilion/60"
      : "bg-night ring-1 ring-line";
  return (
    <button
      type="button"
      aria-pressed={selected}
      aria-label={label}
      disabled={disabled || locked !== undefined}
      onClick={() => {
        haptic("tap");
        onClick();
      }}
      {...attrs}
      className={`relative flex min-h-11 rounded-2xl text-left text-cream ring-inset transition active:scale-[0.98] disabled:active:scale-100 ${ring} ${locked !== undefined ? "opacity-55" : disabled ? "opacity-45" : ""} ${className}`}
    >
      {selected && (
        <span
          aria-hidden="true"
          className={`absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full text-night [&_svg]:h-3 [&_svg]:w-3 [&_svg]:stroke-[3] ${danger ? "bg-vermilion" : "bg-info"}`}
        >
          {Icon.check()}
        </span>
      )}
      {locked !== undefined ? (
        <span className="flex w-full flex-col items-center justify-center gap-1 p-2 text-center">
          <span className="text-cream-dim [&_svg]:h-5 [&_svg]:w-5">{Icon.lock()}</span>
          <span className="text-xs text-cream-dim">{locked}</span>
          <span className="sr-only">{children}</span>
        </span>
      ) : (
        children
      )}
    </button>
  );
}

/** A cost in chips « have / need »: what lacks in cinnabar, at a glance. */
export function CostChips({
  chips,
  goodName,
}: {
  chips: CostChip[];
  goodName: (code: string) => string;
}) {
  return (
    <ul className="flex flex-wrap gap-2" data-cost-chips>
      {chips.map((c) => {
        const key = c.kind === "good" ? c.code : c.kind;
        const look = c.ok
          ? "bg-night-3"
          : "bg-vermilion/10 ring-[1.5px] ring-inset ring-vermilion text-vermilion";
        return (
          <li
            key={key}
            data-cost-chip={key}
            data-lacking={c.ok ? undefined : ""}
            className={`flex h-10 items-center gap-2 rounded-full px-3 font-display text-sm font-bold tabular-nums ${look}`}
          >
            {c.kind === "ducats" ? (
              <>
                <Coin size={16} />
                <span className={c.ok ? "text-gold" : ""}>{d(c.need)}</span>
              </>
            ) : c.kind === "good" ? (
              <>
                <GoodsMark code={c.code} size={22} covered={c.ok} title={goodName(c.code)} />
                <span>
                  {c.have}/{c.need}
                </span>
                <span className="sr-only">{goodName(c.code)}</span>
              </>
            ) : (
              <>
                <svg
                  viewBox="0 0 24 24"
                  className="h-4 w-4 text-cream-dim"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  aria-hidden="true"
                >
                  <circle cx="12" cy="13" r="8" />
                  <path d="M12 9v4l3 2M9 2h6" />
                </svg>
                <span>{minutesText(c.minutes)}</span>
              </>
            )}
          </li>
        );
      })}
    </ul>
  );
}

export interface CompareRow {
  label: ReactNode;
  before: number;
  after: number;
  /** The number as shown (« 8 /h »); its value is what is compared. */
  show?: (n: number) => ReactNode;
  unit?: string;
  /** Less is better (a duration). */
  lower?: boolean;
}

/** Before → after, the gain in lagoon: a raise shows what it brings before what it costs. */
export function CompareRows({ rows }: { rows: CompareRow[] }) {
  return (
    <dl className="rounded-2xl bg-night px-3.5 py-1" data-compare>
      {rows.map((r, i) => {
        const tone = compareTone(r.before, r.after, r.lower);
        const show = (n: number) =>
          r.show ? r.show(n) : `${n.toLocaleString("fr-FR")}${r.unit ? ` ${r.unit}` : ""}`;
        return (
          <div
            // biome-ignore lint/suspicious/noArrayIndexKey: rows are fixed for a dock
            key={i}
            className="flex min-h-11 items-center gap-2 border-line/60 [&:not(:last-child)]:border-b"
          >
            <dt className="min-w-0 flex-1 text-sm">{r.label}</dt>
            <dd className="font-display text-sm tabular-nums text-cream-dim">{show(r.before)}</dd>
            <dd aria-hidden="true" className="w-4 text-center text-line">
              ›
            </dd>
            <dd
              className={`min-w-[4.5rem] font-display text-base font-extrabold tabular-nums ${
                tone === "better"
                  ? "text-lagoon"
                  : tone === "worse"
                    ? "text-vermilion"
                    : "text-cream"
              }`}
            >
              {show(r.after)}
            </dd>
          </div>
        );
      })}
    </dl>
  );
}

/** A ring of time: full and lagoon when ready, lapis while it runs. */
export function TimeRing({
  progress,
  size = 44,
  tone = "info",
  children,
}: {
  progress: number;
  size?: number;
  tone?: "info" | "gold" | "lagoon";
  children?: ReactNode;
}) {
  const r = 18;
  const c = 2 * Math.PI * r;
  const p = Math.max(0.02, Math.min(1, progress));
  const colour = { info: "var(--info)", gold: "var(--gold)", lagoon: "var(--lagoon)" }[tone];
  return (
    <span
      className="relative inline-flex shrink-0 items-center justify-center"
      style={{ width: size, height: size }}
    >
      <svg viewBox="0 0 44 44" className="absolute inset-0 -rotate-90" aria-hidden="true">
        <circle cx="22" cy="22" r={r} fill="none" stroke={`rgb(${colour} / 0.2)`} strokeWidth="4" />
        <circle
          cx="22"
          cy="22"
          r={r}
          fill="none"
          stroke={`rgb(${colour})`}
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={`${(c * p).toFixed(1)} ${c.toFixed(1)}`}
          className="transition-[stroke-dasharray] duration-700 ease-out"
        />
      </svg>
      {children && <span className="relative">{children}</span>}
    </span>
  );
}

/** A door of a dock (Améliorer, Modules, Maître): a big square with its sign and a badge. */
export function DockDoor({
  icon,
  label,
  badge,
  badgeTone = "ghost",
  onClick,
  disabled,
  attrs,
}: {
  icon: ReactNode;
  label: ReactNode;
  badge?: ReactNode;
  badgeTone?: "ghost" | "lagoon" | "gold";
  onClick: () => void;
  disabled?: boolean;
  attrs?: Record<`data-${string}`, string | undefined>;
}) {
  return (
    <button
      type="button"
      onClick={() => {
        haptic("tap");
        onClick();
      }}
      disabled={disabled}
      {...attrs}
      className="relative flex h-24 flex-col items-center justify-center gap-1.5 rounded-2xl bg-night-3 text-cream transition active:scale-[0.97] disabled:opacity-40 [&>svg]:h-7 [&>svg]:w-7"
    >
      {badge !== undefined && (
        <span
          className={`absolute right-2 top-2 rounded-full px-1.5 py-0.5 font-display text-[0.6875rem] font-extrabold tabular-nums ${
            badgeTone === "lagoon"
              ? "bg-lagoon/20 text-lagoon"
              : badgeTone === "gold"
                ? "bg-gold/20 text-gold"
                : "bg-night-4 text-cream-dim"
          }`}
        >
          {badge}
        </span>
      )}
      <span className="[&_svg]:h-7 [&_svg]:w-7">{icon}</span>
      <span className="text-sm font-semibold">{label}</span>
    </button>
  );
}
