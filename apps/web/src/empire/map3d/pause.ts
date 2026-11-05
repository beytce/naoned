import { useEffect, useSyncExternalStore } from "react";

/**
 * The map's board put to sleep while a scene in 3D covers the whole screen (the Porta, the arms,
 * the battle: audit of 4 November, 3D B3): no frame of its own under them, a single context at
 * work. Each covering scene says so while it is open; the board wakes when the last one closes.
 */
const covering = new Set<symbol>();
const listeners = new Set<() => void>();
const tell = () => {
  for (const f of listeners) f();
};

export const boardPaused = () => covering.size > 0;

/** The board, asleep or not (re-read when a covering scene opens or closes). */
export function useBoardPaused() {
  return useSyncExternalStore(
    (f) => {
      listeners.add(f);
      return () => listeners.delete(f);
    },
    boardPaused,
    () => false,
  );
}

/** This scene covers the map while `on`. */
export function useCoverBoard(on: boolean) {
  useEffect(() => {
    if (!on) return;
    const me = Symbol("cover");
    covering.add(me);
    tell();
    return () => {
      covering.delete(me);
      tell();
    };
  }, [on]);
}
