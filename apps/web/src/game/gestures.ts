import { type PointerEvent as ReactPointerEvent, useRef } from "react";

/** The element (or one of its ancestors) under a point that carries `attribute`. */
export function underPoint(x: number, y: number, attribute: string): Element | null {
  return document.elementFromPoint(x, y)?.closest(`[${attribute}]`) ?? null;
}

/**
 * A horizontal swipe on an element whose vertical scroll stays the browser's (`touch-action:
 * pan-y`): decided by 50 px or a quick flick, never when the gesture went mostly up or down.
 * Gestures that start on an element marked `data-no-swipe` (a map, a row that scrolls sideways)
 * are left alone.
 */
export function useSwipe(onLeft: () => void, onRight: () => void) {
  const start = useRef<{ x: number; y: number; t: number; id: number } | null>(null);
  const end = (e: ReactPointerEvent) => {
    const s = start.current;
    start.current = null;
    if (!s || s.id !== e.pointerId) return;
    const dx = e.clientX - s.x;
    const dy = e.clientY - s.y;
    const fast = Math.abs(dx) / Math.max(1, performance.now() - s.t) > 0.5;
    if (Math.abs(dx) < Math.abs(dy) * 1.5 || (Math.abs(dx) < 50 && !(fast && Math.abs(dx) > 24)))
      return;
    if (dx < 0) onLeft();
    else onRight();
  };
  return {
    style: { touchAction: "pan-y" } as const,
    onPointerDown: (e: ReactPointerEvent) => {
      const target = e.target as Element;
      if (e.pointerType === "mouse" || target.closest("[data-no-swipe], input, select, textarea"))
        return;
      start.current = { x: e.clientX, y: e.clientY, t: performance.now(), id: e.pointerId };
    },
    onPointerUp: end,
    onPointerCancel: () => {
      start.current = null;
    },
  };
}
