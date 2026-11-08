/**
 * The spotlight of the tutorials (the owner's decision of 8 November 2026): the screen veiled, one
 * thing lit and touchable, Lorenzo saying what to do beside it. Nothing else can be touched, no key
 * closes anything: the player is led to the end. What is lit is the first of `chain` in sight (it
 * follows the camera, the sheets that open); when nothing of it is in sight for a moment, the way
 * back (a sheet's close, the map) is lit instead. Without a chain (a wait), all is veiled.
 */
import { type ReactNode, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Lorenzo } from "../../art/scenes.js";
import { askFocus } from "./focus.js";

interface Hole {
  x: number;
  y: number;
  w: number;
  h: number;
}

const PAD = 6;
/** How long nothing of the chain may be out of sight before the way back is lit (ms). */
const GRACE = 1_200;

/** Whether an element can be seen and touched at its middle now. */
function reachable(el: Element): DOMRect | null {
  const r = el.getBoundingClientRect();
  if (r.width < 2 || r.height < 2) return null;
  if (r.bottom <= 0 || r.right <= 0 || r.top >= innerHeight || r.left >= innerWidth) return null;
  const cs = getComputedStyle(el);
  if (cs.visibility === "hidden" || cs.pointerEvents === "none" || Number(cs.opacity) < 0.2)
    return null;
  if ((el as HTMLButtonElement).disabled) return null;
  const cx = Math.min(innerWidth - 1, Math.max(0, r.left + r.width / 2));
  const cy = Math.min(innerHeight - 1, Math.max(0, r.top + r.height / 2));
  // What is on top at its middle, the spotlight's own panes aside, must be it (or in it).
  const top = document
    .elementsFromPoint(cx, cy)
    .find((e) => !(e as HTMLElement).closest?.("[data-tutor]"));
  if (top && top !== el && !el.contains(top) && !top.contains(el)) return null;
  return r;
}

/** The first pin of the map named by the chain that stands out of the screen: its place's id. */
function offScreenPlace(chain: string[]): string | null {
  for (const sel of chain) {
    if (!sel.startsWith(".pc-pin")) continue;
    let el: Element | null = null;
    try {
      el = document.querySelector(sel);
    } catch {
      continue;
    }
    const id = el?.getAttribute("data-place");
    if (el && id) return id;
  }
  return null;
}

/** Whether something matching stands on the screen (a place opened), touchable or not. */
export function onScreen(sel: string): boolean {
  let list: Element[] = [];
  try {
    list = [...document.querySelectorAll(sel)];
  } catch {
    return false;
  }
  return list.some((el) => {
    const r = el.getBoundingClientRect();
    return (
      r.width > 2 &&
      r.height > 2 &&
      r.bottom > 0 &&
      r.right > 0 &&
      r.top < innerHeight &&
      r.left < innerWidth &&
      getComputedStyle(el).visibility !== "hidden"
    );
  });
}

/** The first element of a chain in sight, and its box. */
export function firstInSight(chain: string[]): { el: Element; box: DOMRect } | null {
  for (const sel of chain) {
    let list: Element[] = [];
    try {
      list = [...document.querySelectorAll(sel)];
    } catch {
      continue;
    }
    for (const el of list) {
      const box = reachable(el);
      if (box) return { el, box };
    }
  }
  return null;
}

export function Spotlight({
  chain,
  fallback = [],
  children,
  foot,
  still = false,
}: {
  /** What to light, the deepest gesture first. */
  chain: string[];
  /** The way back, lit when nothing of the chain is in sight for a moment. */
  fallback?: string[];
  /** Lorenzo's words. */
  children: ReactNode;
  /** Under the words: a button of the bubble's own (« Suivant », « Continuer »), an arc. */
  foot?: ReactNode;
  /** Shown, not touched: the lit thing is veiled too, only the bubble's button goes on. */
  still?: boolean;
}) {
  const [hole, setHole] = useState<Hole | null>(null);
  const lost = useRef<number | null>(null);
  const key = chain.join("|");
  // biome-ignore lint/correctness/useExhaustiveDependencies: the chain by its key
  useEffect(() => {
    lost.current = null;
    const tick = () => {
      let hit = chain.length > 0 ? firstInSight(chain) : null;
      if (hit || chain.length === 0) lost.current = null;
      else {
        lost.current ??= performance.now();
        // A place of the map out of sight: the camera is asked to look at it.
        const away = offScreenPlace(chain);
        if (away) askFocus(away);
        if (performance.now() - lost.current > GRACE) hit = firstInSight(fallback);
      }
      setHole((was) => {
        if (!hit) return was === null ? was : null;
        const n = {
          x: Math.round(hit.box.left - PAD),
          y: Math.round(hit.box.top - PAD),
          w: Math.round(hit.box.width + PAD * 2),
          h: Math.round(hit.box.height + PAD * 2),
        };
        return was && was.x === n.x && was.y === n.y && was.w === n.w && was.h === n.h ? was : n;
      });
    };
    tick();
    const id = window.setInterval(tick, 120);
    return () => window.clearInterval(id);
  }, [key]);
  // No key closes or opens anything while led (the map's Escape, the shortcuts).
  useEffect(() => {
    const stop = (e: KeyboardEvent) => {
      if (e.key === "Tab") return;
      e.stopPropagation();
      if (e.key === "Escape") e.preventDefault();
    };
    window.addEventListener("keydown", stop, true);
    return () => window.removeEventListener("keydown", stop, true);
  }, []);

  const W = typeof window === "undefined" ? 1280 : window.innerWidth;
  const H = typeof window === "undefined" ? 800 : window.innerHeight;
  const panes: Hole[] = hole
    ? [
        { x: 0, y: 0, w: W, h: Math.max(0, hole.y) },
        { x: 0, y: hole.y + hole.h, w: W, h: Math.max(0, H - hole.y - hole.h) },
        { x: 0, y: hole.y, w: Math.max(0, hole.x), h: hole.h },
        { x: hole.x + hole.w, y: hole.y, w: Math.max(0, W - hole.x - hole.w), h: hole.h },
      ]
    : [{ x: 0, y: 0, w: W, h: H }];
  // The bubble on the other half of the screen from the hole, never over it: at the foot when the
  // gesture is high, under the top bar when it is low; at the foot without one.
  const low = hole ? hole.y + hole.h / 2 > H * 0.5 : false;
  const bubbleStyle = low ? { top: 96 } : { bottom: 24 };
  return createPortal(
    <div data-tutor className="pointer-events-none fixed inset-0 z-[90]">
      {panes.map((r, i) => (
        <div
          // biome-ignore lint/suspicious/noArrayIndexKey: four fixed panes
          key={i}
          data-tutor-pane
          className="pointer-events-auto absolute bg-[rgb(23_21_15/0.42)]"
          style={{ left: r.x, top: r.y, width: r.w, height: r.h }}
          onPointerDown={(e) => e.preventDefault()}
          onWheel={(e) => e.stopPropagation()}
        />
      ))}
      {hole && still && (
        <div
          data-tutor-pane
          className="pointer-events-auto absolute"
          style={{ left: hole.x, top: hole.y, width: hole.w, height: hole.h }}
          onPointerDown={(e) => e.preventDefault()}
        />
      )}
      {hole && (
        <div
          data-tutor-ring
          className="tutor-ring absolute rounded-2xl ring-4 ring-[#C23B2E]"
          style={{ left: hole.x, top: hole.y, width: hole.w, height: hole.h }}
        />
      )}
      <div
        data-tutor-bubble
        className="pointer-events-auto absolute left-1/2 flex w-[min(28rem,calc(100vw-2rem))] -translate-x-1/2 items-start gap-3 rounded-[1.5rem] bg-[#FBFAF7] p-3.5 shadow-[0_8px_30px_rgb(23_21_15/0.25)]"
        style={bubbleStyle}
      >
        <span className="shrink-0 rounded-full bg-[#ECE7DF] p-0.5">
          <Lorenzo size={44} />
        </span>
        <div className="min-w-0 flex-1 text-[#17150F]">
          {children}
          {foot}
        </div>
      </div>
    </div>,
    document.body,
  );
}
