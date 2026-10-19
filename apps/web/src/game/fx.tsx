import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Coin } from "../art/icons.js";
import { amount } from "./format.js";

/**
 * The ducats seen coming in: the gain rises where the player last touched (or the middle of the
 * screen) and a few coins fly from there to the purse of the HUD. Nothing for those who ask for
 * less motion.
 */

const EVENT = "fx:coins";
const COINS = 6;

/** Where the last touch landed: the coins start from there. */
let lastTouch: { x: number; y: number } | null = null;
if (typeof window !== "undefined") {
  window.addEventListener(
    "pointerdown",
    (e) => {
      lastTouch = { x: e.clientX, y: e.clientY };
    },
    { capture: true, passive: true },
  );
}

/** Ducats came in: show them flying to the purse. */
export function flyCoins(gain: bigint): void {
  if (gain <= 0n || typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(EVENT, { detail: gain }));
}

function reduced(): boolean {
  return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
}

/** The layer the coins fly in, over everything; mounted once by the game. */
export function FxLayer() {
  const layer = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onCoins = (e: Event) => {
      const root = layer.current;
      const purse = document.querySelector<HTMLElement>('[data-fx="purse"]');
      if (!root || !purse || reduced()) return;
      const to = purse.getBoundingClientRect();
      const end = { x: to.left + to.width / 2, y: to.top + to.height / 2 };
      const from = lastTouch ?? { x: window.innerWidth / 2, y: window.innerHeight / 2 };
      for (let i = 0; i < COINS; i++) {
        const coin = root.querySelector<HTMLElement>(`[data-coin="${i}"]`);
        if (!coin) continue;
        const spread = { x: (Math.random() - 0.5) * 70, y: (Math.random() - 0.5) * 50 - 30 };
        coin.animate(
          [
            { transform: `translate(${from.x}px, ${from.y}px) scale(0.6)`, opacity: 0 },
            {
              transform: `translate(${from.x + spread.x}px, ${from.y + spread.y}px) scale(1)`,
              opacity: 1,
              offset: 0.3,
            },
            { transform: `translate(${end.x}px, ${end.y}px) scale(0.7)`, opacity: 0.9 },
          ],
          { duration: 720, delay: i * 60, easing: "cubic-bezier(0.5, 0, 0.2, 1)", fill: "both" },
        ).onfinish = () => {
          coin.style.opacity = "0";
        };
      }
      const label = root.querySelector<HTMLElement>("[data-gain]");
      if (label) {
        label.textContent = `+${amount((e as CustomEvent<bigint>).detail)}`;
        // The gain rises where it was made, clear of the HUD's figures.
        const x = Math.min(Math.max(from.x - 55, 8), window.innerWidth - 118);
        label.animate(
          [
            { transform: `translate(${x}px, ${from.y - 20}px)`, opacity: 0 },
            { transform: `translate(${x}px, ${from.y - 40}px)`, opacity: 1, offset: 0.2 },
            { transform: `translate(${x}px, ${from.y - 80}px)`, opacity: 0 },
          ],
          { duration: 1_400, easing: "ease-out", fill: "both" },
        );
      }
    };
    window.addEventListener(EVENT, onCoins);
    return () => window.removeEventListener(EVENT, onCoins);
  }, []);
  return createPortal(
    <div ref={layer} className="pointer-events-none fixed inset-0 z-[60]" aria-hidden="true">
      {Array.from({ length: COINS }, (_, i) => (
        <span
          // biome-ignore lint/suspicious/noArrayIndexKey: a fixed set of coins.
          key={i}
          data-coin={i}
          className="absolute left-0 top-0 -ml-3 -mt-3 opacity-0"
        >
          <Coin size={24} />
        </span>
      ))}
      <span
        data-gain
        className="absolute left-0 top-0 w-[110px] text-center font-display text-xl font-extrabold text-gold opacity-0 [text-shadow:0_1px_4px_rgb(0_0_0/0.9)]"
      />
    </div>,
    document.body,
  );
}
