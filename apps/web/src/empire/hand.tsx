import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import type { NextStep } from "./next.js";

/**
 * Lorenzo shows, he does not do (the gameplay audit, 5 November 2026, P4): where the next gesture
 * is made, by the object to touch, tried in order (in the domain the workshop itself, else the
 * place's tab that leads there). Pure, tested.
 */
export function handTargets(step: NextStep): string[] {
  switch (step.kind) {
    case "collect":
      return ["[data-workshop][data-ready]", "[data-place-tab=fondaco]"];
    case "relaunch":
      return ["[data-workshop][data-idle]", "[data-place-tab=fondaco]"];
    case "deliver":
      return ["[data-round-handle]", "[data-place-tab=map]"];
    case "casa":
      return ["[data-casa-road]", "[data-place-tab=fondaco]"];
    case "build":
      return ["[data-place^='free:']", "[data-fondaco-door=build]", "[data-place-tab=map]"];
    case "upgrade":
      return [`[data-workshop="${step.workshopId}"]`, "[data-place-tab=fondaco]"];
    case "sell":
      return ["[data-house-header]"];
    case "claim":
      return ["[data-place-tab=company]"];
    case "plot":
      return [`[data-place='sector:${step.cell}']`, "[data-place-tab=map]"];
    case "buy":
      return ["[data-house-header]"];
    case "wait":
      return [];
    // The welcome (lot 2): on the map, the object to touch.
    case "welcome":
      switch (step.phase) {
        case "build":
          return ["[data-place^='free:']", "[data-place-tab=map]"];
        case "launch":
        case "collect":
          return [`[data-place='workshop:${step.workshopId}']`, "[data-place-tab=map]"];
        case "deliver":
          return [`[data-place='city:${step.city}']`, "[data-place-tab=map]"];
        default:
          return [];
      }
  }
}

/** The gestures the house has made once: Lorenzo's button no longer does them (on the device). */
const LEARNT = "fondaco:learnt";
export function learnt(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(LEARNT) ?? "[]") as string[]);
  } catch {
    return new Set();
  }
}
export function learn(kind: string): void {
  try {
    const was = learnt();
    if (was.has(kind)) return;
    was.add(kind);
    localStorage.setItem(LEARNT, JSON.stringify([...was]));
  } catch {
    // A private window: Lorenzo keeps his button.
  }
}

/**
 * A hand that points at the object to touch, bobbing over it; found again as the screen changes
 * (the camera glides, a dock opens). Never in the way of the finger; still for less motion.
 */
export function PointingHand({ selectors }: { selectors: string[] }) {
  const [at, setAt] = useState<{ x: number; y: number } | null>(null);
  const key = selectors.join("|");
  // biome-ignore lint/correctness/useExhaustiveDependencies: the selectors by their key
  useEffect(() => {
    if (selectors.length === 0) {
      setAt(null);
      return;
    }
    const find = () => {
      for (const sel of selectors)
        for (const el of document.querySelectorAll<HTMLElement>(sel)) {
          const r = el.getBoundingClientRect();
          if (r.width === 0 || r.height === 0) continue;
          if (
            r.bottom < 0 ||
            r.top > window.innerHeight ||
            r.right < 0 ||
            r.left > window.innerWidth
          )
            continue;
          // Under a sheet or a veil, it is not the one to touch.
          const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
          if (top && !el.contains(top) && !top.contains(el)) continue;
          setAt({ x: r.left + r.width / 2, y: r.top + r.height / 2 });
          return;
        }
      setAt(null);
    };
    find();
    const id = window.setInterval(find, 400);
    return () => window.clearInterval(id);
  }, [key]);
  if (!at) return null;
  return createPortal(
    <div
      className="pointing-hand pointer-events-none fixed z-[60]"
      style={{ left: at.x, top: at.y }}
      aria-hidden="true"
      data-pointing-hand
    >
      <svg viewBox="0 0 40 48" width="40" height="48" aria-hidden="true">
        <path
          d="M14 4 a4 4 0 0 1 8 0 V20 a4 4 0 0 1 8 2 a4 4 0 0 1 7 4 V34 c0 7 -6 12 -13 12 h-2 c-6 0 -10 -3 -13 -8 L2 28 a4 4 0 0 1 7 -4 l5 6 Z"
          fill="#FFFCF4"
          stroke="#2E2619"
          strokeWidth="2.4"
          strokeLinejoin="round"
        />
      </svg>
    </div>,
    document.body,
  );
}
