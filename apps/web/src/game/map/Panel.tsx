import type { ReactNode } from "react";
import { fr } from "../../i18n.js";
import { Icon } from "./icons.js";

/**
 * The selection's panel at the foot of the map, the only one the game shows: a title, one line of
 * state, a row of big square actions, arrows to the next object of the same kind, a cross to let
 * go. On a computer it floats at the bottom right.
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
  /** A line under the actions (escorts, a warning). */
  extra?: ReactNode;
}) {
  const edge =
    tone === "gold" ? "border-gold" : tone === "vermilion" ? "border-vermilion" : "border-lagoon";
  const ink =
    tone === "gold" ? "text-gold" : tone === "vermilion" ? "text-vermilion" : "text-lagoon";
  const bar = tone === "gold" ? "bg-gold" : tone === "vermilion" ? "bg-vermilion" : "bg-lagoon";
  return (
    <div
      data-panel
      className="pointer-events-none absolute inset-x-0 bottom-0 z-20 lg:inset-x-auto lg:bottom-5 lg:right-5 lg:w-[420px]"
    >
      <div
        className={`panel-rise pointer-events-auto relative border-t-2 ${edge} bg-night-2/95 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 shadow-[0_-10px_30px_rgb(0_0_0/0.45)] backdrop-blur-md lg:rounded-2xl lg:border-2 lg:pb-3`}
      >
        <button
          type="button"
          aria-label={fr.game.map.close}
          onClick={onClose}
          className={`absolute -top-[2px] right-0 flex h-9 w-12 items-center justify-center ${bar} text-night [clip-path:polygon(28%_0,100%_0,100%_100%,0_100%)] lg:right-3 lg:rounded-b-lg`}
        >
          <span className="scale-90">{Icon.cross()}</span>
        </button>
        <div className="flex items-center gap-2 pr-14">
          <h2 className="min-w-0 truncate font-display text-[15px] font-extrabold uppercase tracking-wide">
            {title}
          </h2>
          {chip && <span className="shrink-0">{chip}</span>}
        </div>
        {status && (
          <div className={`mt-1 flex min-h-5 items-center gap-2 text-[13px] ${ink}`}>
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
        <div className="mt-3 flex items-center gap-1.5">
          {onPrev ? (
            <ArrowButton label={fr.game.map.prev} onClick={onPrev}>
              {Icon.chevronLeft()}
            </ArrowButton>
          ) : (
            <span className="w-7" />
          )}
          <div className="flex min-w-0 flex-1 items-start justify-center gap-2">{actions}</div>
          {onNext ? (
            <ArrowButton label={fr.game.map.next} onClick={onNext}>
              {Icon.chevronRight()}
            </ArrowButton>
          ) : (
            <span className="w-7" />
          )}
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
      className="flex h-14 w-7 shrink-0 items-center justify-center text-cream-dim transition active:scale-90"
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
  tone?: "plain" | "gold" | "lagoon" | "vermilion";
  badge?: ReactNode;
  coach?: string;
}) {
  const face =
    tone === "gold"
      ? "bg-gold text-ink ring-gold"
      : tone === "lagoon"
        ? "bg-lagoon text-on-lagoon ring-lagoon"
        : tone === "vermilion"
          ? "bg-vermilion text-cream ring-vermilion"
          : "bg-night text-cream ring-lagoon/50";
  return (
    <button
      type="button"
      data-coach={coach}
      disabled={disabled}
      onClick={onClick}
      className="group flex w-[62px] shrink-0 flex-col items-center gap-1 disabled:opacity-35"
    >
      <span
        className={`relative flex h-14 w-14 items-center justify-center rounded-xl ring-[1.5px] transition group-active:scale-90 ${face}`}
      >
        {icon}
        {badge !== undefined && badge !== null && badge !== false && (
          <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-gold px-1 font-mono text-[10px] font-bold text-ink ring-2 ring-night-2">
            {badge}
          </span>
        )}
      </span>
      <span className="max-w-full truncate font-mono text-[9.5px] uppercase tracking-[0.06em] text-cream-dim">
        {label}
      </span>
    </button>
  );
}
