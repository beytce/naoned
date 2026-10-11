import { store } from "./game/store.js";

export type HapticKind = "tap" | "success" | "warn" | "alarm";

/** Vibration patterns, in ms: a tick, a double tap, a long buzz, an alarm. */
const PATTERNS: Record<HapticKind, number | number[]> = {
  tap: 10,
  success: [14, 50, 22],
  warn: [40, 60, 40],
  alarm: [70, 50, 70, 50, 120],
};

export function hapticsEnabled(): boolean {
  return store.get("haptics") !== "0";
}

export function setHapticsEnabled(on: boolean): void {
  store.set("haptics", on ? "1" : "0");
  if (on) haptic("success");
}

let iosSwitch: HTMLLabelElement | null = null;

/**
 * Safari on the iPhone has no vibration for web pages, but toggling a native switch gives a
 * light tick (iOS 18): a hidden one stands in for the patterns.
 */
function iosTick(): void {
  if (typeof document === "undefined") return;
  if (!iosSwitch) {
    const label = document.createElement("label");
    label.setAttribute("aria-hidden", "true");
    label.style.cssText = "position:fixed;left:-9999px;width:1px;height:1px;overflow:hidden";
    const input = document.createElement("input");
    input.type = "checkbox";
    input.setAttribute("switch", "");
    input.tabIndex = -1;
    label.appendChild(input);
    document.body.appendChild(label);
    iosSwitch = label;
  }
  iosSwitch.click();
}

/** A short physical cue for what just happened; silent where the device cannot do it. */
export function haptic(kind: HapticKind): void {
  if (!hapticsEnabled()) return;
  try {
    if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
      navigator.vibrate(PATTERNS[kind]);
    } else {
      iosTick();
    }
  } catch {
    // Never let a cue break the game.
  }
}
