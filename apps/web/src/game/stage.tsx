import { type ReactNode, type RefObject, useLayoutEffect, useRef, useState } from "react";
import { useWide } from "./useWide.js";

/**
 * The frame every section of the game shares, born on the Famille tab: a scene from edge to edge
 * (a map, the domain, a board) between the page's top bar and the bottom navigation, the state
 * of the moment over its head, the main gestures at its foot, and everything else in a drawer of
 * tabs folded over the foot of the screen. On a wide screen the drawer becomes a column beside
 * the scene. Details open in sheets.
 */

/**
 * Height left to the scene between the page's top bar and the bottom navigation (none on a wide
 * screen), so that the section holds on one screen without scrolling.
 */
export function useStageHeight(stage: RefObject<HTMLElement | null>): number | null {
  const [height, setHeight] = useState<number | null>(null);
  useLayoutEffect(() => {
    const fit = () => {
      const el = stage.current;
      if (!el) return;
      const top = el.getBoundingClientRect().top + window.scrollY;
      const nav = document.querySelector<HTMLElement>("[data-bottom-nav]");
      // A fixed bar has no offset parent: whether it shows is in its computed display.
      const shown = nav !== null && getComputedStyle(nav).display !== "none";
      const below = shown ? nav.getBoundingClientRect().height : 24;
      const next = Math.max(440, Math.round(window.innerHeight - top - below));
      setHeight((h) => (h === next ? h : next));
    };
    fit();
    // The top bar settles after the fonts and the season's frieze: measure again when it does.
    const observer = new ResizeObserver(fit);
    for (const el of document.querySelectorAll("header, [data-bottom-nav]")) observer.observe(el);
    // A banner above the section (the gazette, the act's card) moves it without resizing anything
    // observed: a light check of its place keeps the drawer clear of the navigation.
    const poll = setInterval(fit, 500);
    window.addEventListener("resize", fit);
    return () => {
      observer.disconnect();
      clearInterval(poll);
      window.removeEventListener("resize", fit);
    };
  }, [stage]);
  return height;
}

/**
 * The section's frame: the scene with its overlays, the drawer, and the sheets (children). The
 * page's own padding is undone so that the scene touches the edges of a phone.
 */
export function Stage({
  scene,
  top,
  bottom,
  drawer,
  children,
  label,
}: {
  scene: ReactNode;
  /** Over the scene's head (`Hud`). */
  top?: ReactNode;
  /** At the scene's foot (`Tray`). */
  bottom?: ReactNode;
  drawer: ReactNode;
  /** Sheets and anything outside the layout. */
  children?: ReactNode;
  label?: string;
}) {
  const stage = useRef<HTMLDivElement>(null);
  const height = useStageHeight(stage);
  return (
    <section aria-label={label} className="-mx-4 -mb-40 -mt-4 lg:mx-0 lg:-mb-16 lg:mt-0">
      <div
        ref={stage}
        style={height ? { height } : undefined}
        className="relative h-[calc(100svh-12rem)] lg:grid lg:grid-cols-[minmax(0,1fr)_400px] lg:gap-4"
      >
        <div className="absolute inset-x-0 bottom-[3.25rem] top-0 overflow-hidden bg-night-2 lg:relative lg:inset-auto lg:h-full lg:rounded-3xl lg:border lg:border-line">
          {scene}
          {top}
          {bottom}
        </div>
        {drawer}
        {children}
      </div>
    </section>
  );
}

/** The scene's head: a bar (`HudBar`) and a line of chips (`Chip`) under it. */
export function Hud({ children }: { children: ReactNode }) {
  return (
    <div className="pointer-events-none absolute inset-x-2 top-2 z-10 space-y-1.5">{children}</div>
  );
}

/** A translucent bar over the scene, its contents touchable. */
export function HudBar({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`pointer-events-auto flex items-stretch gap-1 rounded-2xl bg-night/85 p-1 shadow-lg shadow-black/30 ring-1 ring-line/60 backdrop-blur ${className}`}
    >
      {children}
    </div>
  );
}

/** A figure of the head bar: a big number, a small caption, an icon before. */
export function HudStat({
  icon,
  value,
  caption,
  onClick,
  active = false,
  label,
}: {
  icon?: ReactNode;
  value: ReactNode;
  caption: ReactNode;
  onClick?: () => void;
  /** The merchant's own (circled in gold). */
  active?: boolean;
  label?: string;
}) {
  const body = (
    <>
      {icon && <span className="shrink-0">{icon}</span>}
      <span className="min-w-0 text-left leading-none">
        <span className="block truncate font-display text-base font-extrabold tabular-nums">
          {value}
        </span>
        <span className="block truncate font-mono text-[8.5px] uppercase tracking-wide text-cream-dim">
          {caption}
        </span>
      </span>
    </>
  );
  const cls = `relative flex min-w-0 flex-1 items-center gap-1.5 overflow-hidden rounded-xl px-1.5 py-1 ${active ? "bg-gold/10 ring-1 ring-inset ring-gold/70" : ""}`;
  return onClick ? (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={`${cls} active:bg-night-3`}
    >
      {body}
    </button>
  ) : (
    <div className={cls} aria-label={label}>
      {body}
    </div>
  );
}

/** The « ? » at the end of the head bar: how the section is played. */
export function HelpButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="flex w-8 shrink-0 items-center justify-center rounded-xl font-display text-base font-extrabold text-cream-dim active:bg-night-3"
    >
      ?
    </button>
  );
}

const CHIP_TONES = {
  plain: "text-cream ring-line/60",
  lagoon: "text-lagoon ring-lagoon/50",
  gold: "text-gold ring-gold/60",
  vermilion: "text-vermilion ring-vermilion/60",
} as const;

/** A chip under the head bar: a clock, a warning. Touchable when given `onClick`. */
export function Chip({
  tone = "plain",
  children,
  onClick,
}: {
  tone?: keyof typeof CHIP_TONES;
  children: ReactNode;
  onClick?: () => void;
}) {
  const cls = `rounded-full bg-night/85 px-2.5 py-1 font-mono text-[10px] uppercase tracking-wide ring-1 backdrop-blur ${CHIP_TONES[tone]}`;
  return onClick ? (
    <button type="button" onClick={onClick} className={`pointer-events-auto ${cls}`}>
      {children}
    </button>
  ) : (
    <span className={cls}>{children}</span>
  );
}

/** The line of chips under the head bar. */
export function Chips({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap gap-1.5">{children}</div>;
}

/** The scene's foot: an invitation above (optional), the bar of the main gestures. */
export function Tray({ hint, children }: { hint?: ReactNode; children: ReactNode }) {
  return (
    <div className="pointer-events-none absolute inset-x-2 bottom-2 z-10 space-y-1.5">
      {hint && (
        <p className="text-center text-[11px] font-semibold text-gold [text-shadow:0_1px_2px_rgb(15_27_30),0_0_6px_rgb(15_27_30)]">
          {hint}
        </p>
      )}
      <div className="pointer-events-auto flex items-center gap-1.5 rounded-2xl bg-night/90 p-1.5 shadow-lg shadow-black/40 ring-1 ring-line/60 backdrop-blur">
        {children}
      </div>
    </div>
  );
}

/** A figure at the left of the foot bar: an icon, a number, a caption. */
export function TrayStat({
  icon,
  value,
  caption,
}: {
  icon: ReactNode;
  value: ReactNode;
  caption: ReactNode;
}) {
  return (
    <div className="flex shrink-0 items-center gap-1.5 pl-1.5 pr-1">
      <span aria-hidden="true" className="text-lg leading-none">
        {icon}
      </span>
      <span className="leading-none">
        <span className="block font-display text-lg font-extrabold tabular-nums">{value}</span>
        <span className="block font-mono text-[8.5px] uppercase tracking-wide text-cream-dim">
          {caption}
        </span>
      </span>
    </div>
  );
}

/** A small outlined button at the right of the foot bar (an icon and a count). */
export function TrayButton({
  children,
  onClick,
  label,
  coach,
}: {
  children: ReactNode;
  onClick: () => void;
  label: string;
  coach?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      data-coach={coach}
      className="flex shrink-0 items-center gap-1 rounded-xl px-2 py-1.5 font-mono text-[11px] tabular-nums ring-1 ring-inset ring-line/70 active:bg-night-3"
    >
      {children}
    </button>
  );
}

export interface DrawerTab<T extends string> {
  key: T;
  label: string;
  /** Something waits there (a threat, an unread message, a reward). */
  dot?: boolean;
  coach?: string;
}

/**
 * The secondary panels under the scene. On a phone a drawer, folded to its tabs over the foot of
 * the screen and pulled up (or touched) to read; on a wide screen a column beside the scene.
 */
export function Drawer<T extends string>({
  tabs,
  tab,
  open,
  onTab,
  onOpen,
  children,
}: {
  tabs: DrawerTab<T>[];
  tab: T;
  open: boolean;
  onTab: (tab: T) => void;
  onOpen: (open: boolean) => void;
  children: ReactNode;
}) {
  const drag = useRef<{ y: number; moved: boolean } | null>(null);
  return (
    <div
      className={`absolute inset-x-0 bottom-0 z-20 flex flex-col overflow-hidden rounded-t-3xl border-t border-line bg-night-2/95 shadow-[0_-12px_30px_rgb(0_0_0/0.35)] backdrop-blur transition-[height] duration-300 ease-out lg:static lg:h-full lg:rounded-3xl lg:border lg:shadow-none ${open ? "h-[68%]" : "h-[3.25rem]"}`}
    >
      <div
        className="shrink-0 touch-none select-none lg:touch-auto"
        onPointerDown={(e) => {
          drag.current = { y: e.clientY, moved: false };
        }}
        onPointerMove={(e) => {
          const start = drag.current;
          if (!start) return;
          const dy = e.clientY - start.y;
          if (Math.abs(dy) > 24 && !start.moved) {
            start.moved = true;
            onOpen(dy < 0);
          }
        }}
        onPointerUp={() => {
          setTimeout(() => {
            drag.current = null;
          }, 0);
        }}
      >
        <div className="mx-auto mt-1.5 h-1 w-10 rounded-full bg-line lg:hidden" />
        <div
          role="tablist"
          className="grid gap-1 px-2 pb-1.5 pt-1 lg:pt-2"
          style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }}
        >
          {tabs.map(({ key, label, dot, coach }) => {
            const on = tab === key && open;
            return (
              <button
                key={key}
                type="button"
                role="tab"
                data-coach={coach}
                aria-selected={tab === key}
                onClick={() => {
                  if (drag.current?.moved) return;
                  if (tab === key) onOpen(!open);
                  else {
                    onTab(key);
                    onOpen(true);
                  }
                }}
                className={`relative truncate rounded-xl px-1 py-1.5 font-mono text-[10.5px] uppercase tracking-[0.08em] transition-colors lg:py-2 ${tab === key ? "lg:bg-gold/15 lg:font-bold lg:text-gold" : ""} ${on ? "bg-gold/15 font-bold text-gold" : "text-cream-dim"}`}
              >
                {label}
                {dot && (
                  <span className="absolute right-1.5 top-1 h-2 w-2 rounded-full bg-vermilion" />
                )}
              </button>
            );
          })}
        </div>
      </div>
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-3 pb-6 pt-1">
        {children}
      </div>
    </div>
  );
}

/**
 * The drawer's state: which tab, folded or not. A wide screen shows it always (a column), so it
 * never covers the scene there.
 */
export function useDrawer<T extends string>(first: T) {
  const [tab, setTab] = useState<T>(first);
  const [open, setOpen] = useState(false);
  const wide = useWide();
  return {
    tab,
    open,
    setTab,
    setOpen,
    /** Opens the drawer on a tab. */
    show: (key: T) => {
      setTab(key);
      setOpen(true);
    },
    /** The drawer lies over the scene (a phone, unfolded). */
    covering: open && !wide,
    props: { tab, open, onTab: setTab, onOpen: setOpen },
  };
}
