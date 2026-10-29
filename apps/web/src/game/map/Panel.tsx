import type { ReactNode } from "react";
import { haptic } from "../../haptics.js";
import { fr } from "../../i18n.js";
import { Icon } from "./icons.js";

/**
 * The selection's panel at the foot of the map, the only one the game shows: a title, one line of
 * state, a row of big square actions, arrows to the next object of the same kind beside the title,
 * a cross to let go. On a computer it floats at the bottom right.
 */
export function ContextPanel({
  title,
  chip,
  status,
  tone = "lagoon",
  progress,
  actions,
  onPrev,
  onNext,
  onClose,
  extra,
  above,
}: {
  title: ReactNode;
  chip?: ReactNode;
  status?: ReactNode;
  tone?: "lagoon" | "gold" | "vermilion";
  /** A bar under the state line, 0 to 1. */
  progress?: number | null;
  actions: ReactNode;
  onPrev?: () => void;
  onNext?: () => void;
  onClose: () => void;
  /** A line under the actions (a hint, a warning). */
  extra?: ReactNode;
  /** What the place holds, between its state and its actions (the counter's workshops). */
  above?: ReactNode;
}) {
  const ink =
    tone === "gold" ? "text-gold" : tone === "vermilion" ? "text-vermilion" : "text-lagoon";
  const bar = tone === "gold" ? "bg-gold" : tone === "vermilion" ? "bg-vermilion" : "bg-lagoon";
  return (
    <div
      data-panel
      className="pointer-events-none absolute inset-x-0 bottom-[var(--tabbar)] z-20 lg:inset-x-auto lg:bottom-[calc(var(--tabbar)+1rem)] lg:right-[calc(var(--side,0px)+1.25rem)] lg:w-[420px]"
    >
      <div className="panel-rise pointer-events-auto relative rounded-t-3xl border-t border-line bg-night-2/95 px-3 pb-3 pt-3 shadow-[0_-10px_30px_rgb(0_0_0/0.45)] backdrop-blur-md lg:rounded-3xl lg:border lg:pb-3">
        {/* A ghost round, like the places' way back: never a coloured tab. */}
        <button
          type="button"
          aria-label={fr.game.map.close}
          onClick={onClose}
          className="absolute right-1.5 top-1.5 z-10 flex h-11 w-11 items-center justify-center rounded-full lg:right-3 lg:top-3"
        >
          <span className="hud-orb press flex h-9 w-9 items-center justify-center rounded-full text-cream">
            <span className="scale-90">{Icon.cross()}</span>
          </span>
        </button>
        <div className="flex items-center gap-2 pr-14">
          <h2 className="min-w-0 truncate font-display text-[0.9375rem] font-extrabold uppercase tracking-wide">
            {title}
          </h2>
          {chip && <span className="shrink-0">{chip}</span>}
          {(onPrev || onNext) && (
            <span className="ml-auto flex shrink-0 gap-1">
              {onPrev && (
                <ArrowButton label={fr.game.map.prev} onClick={onPrev}>
                  {Icon.chevronLeft()}
                </ArrowButton>
              )}
              {onNext && (
                <ArrowButton label={fr.game.map.next} onClick={onNext}>
                  {Icon.chevronRight()}
                </ArrowButton>
              )}
            </span>
          )}
        </div>
        {status && (
          <div className={`mt-1 flex min-h-5 items-center gap-2 text-[0.8125rem] ${ink}`}>
            <span className="min-w-0 truncate">{status}</span>
            {progress !== undefined && progress !== null && (
              <span className="relative h-1.5 min-w-16 flex-1 overflow-hidden rounded-full bg-night ring-1 ring-line">
                <span
                  className={`absolute inset-y-0 left-0 rounded-full ${bar} transition-[width] duration-700 ease-linear`}
                  style={{ width: `${Math.min(100, Math.max(0, progress * 100))}%` }}
                />
              </span>
            )}
          </div>
        )}
        {above && <div className="mt-2">{above}</div>}
        {/*
          The whole width for the actions: four of them side by side on a 320 px phone, more
          scrolled sideways, never under the arrows. Its top margin is padding, for the badges.
        */}
        <div className="-mx-3 mt-1 flex justify-[safe_center] gap-0.5 overflow-x-auto px-3 pt-2 [scrollbar-width:none] min-[360px]:gap-2">
          {actions}
        </div>
        {extra && <div className="mt-2">{extra}</div>}
      </div>
    </div>
  );
}

function ArrowButton({
  children,
  label,
  onClick,
}: { children: ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      // 44 × 44 px of touch on the title's line, which keeps its height: above it the panel's
      // margin, below it the line of state, under the button.
      className="relative z-10 -my-3 flex h-11 w-11 shrink-0 items-center justify-center text-cream-dim transition active:scale-90"
    >
      {children}
    </button>
  );
}

/** A big square action of the panel: an icon, a short caption under it, a badge. */
export function ActionButton({
  icon,
  label,
  onClick,
  disabled,
  tone = "plain",
  badge,
  coach,
}: {
  icon: ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  /** Gold for the panel's one main action; never lagoon (a gain, not a button). */
  tone?: "plain" | "gold" | "vermilion";
  badge?: ReactNode;
  coach?: string;
}) {
  // Rounds, like every place of the Lagune; gold is a struck coin (index.css, .gold-face).
  const face =
    tone === "gold"
      ? "gold-face"
      : tone === "vermilion"
        ? "bg-vermilion text-cream ring-[1.5px] ring-vermilion"
        : "bg-night text-cream ring-[1.5px] ring-cream/30 group-hover:ring-cream/50 group-active:bg-night-3";
  return (
    <button
      type="button"
      data-coach={coach}
      disabled={disabled}
      onClick={() => {
        haptic("tap");
        onClick();
      }}
      className="group flex w-[72px] shrink-0 flex-col items-center gap-1 disabled:opacity-35"
    >
      <span
        className={`press relative flex h-14 w-14 items-center justify-center rounded-full ${face}`}
      >
        {icon}
        {badge !== undefined && badge !== null && badge !== false && (
          <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-gold px-1 font-display text-xs font-bold text-ink ring-2 ring-night-2">
            {badge}
          </span>
        )}
      </span>
      {/* Two short lines at most, never written over its neighbour's. */}
      <span className="line-clamp-2 max-w-full text-center text-xs font-semibold leading-tight text-cream-dim">
        {label}
      </span>
    </button>
  );
}
