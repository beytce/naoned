import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { goodsColour } from "../art/goods.js";
import { Coin } from "../art/icons.js";
import { chime } from "../sound.js";
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

/** How a gain flies: a word under its amount, and the element it starts from (a city). */
export interface FlyOptions {
  note?: string;
  from?: string;
}

/** Ducats came in: show them flying to the purse. */
export function flyCoins(gain: bigint, options: FlyOptions = {}): void {
  if (gain <= 0n || typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(EVENT, { detail: { gain, ...options } }));
}

/** The last button pressed, for a moment: the server's answer shows on it. */
let lastPress: { button: HTMLElement; at: number } | null = null;

/** A Slab was pressed (ui.tsx): remember it until the answer comes. */
export function pressed(button: HTMLElement): void {
  lastPress = { button, at: Date.now() };
}

/**
 * The server answered the action of the button just pressed: it is struck (a flash of light) or
 * refused (it shakes, edged in cinnabar). Only a gold button pressed less than three seconds ago
 * and still on screen; nothing for those who ask for less motion.
 */
export function pressResult(ok: boolean): void {
  const press = lastPress;
  lastPress = null;
  if (!press || Date.now() - press.at > 3_000 || !press.button.isConnected) return;
  if (press.button.dataset.slab !== "gold" || typeof window === "undefined" || reduced()) return;
  const face = press.button.querySelector<HTMLElement>(".slab-face");
  if (!face) return;
  const cls = ok ? "slab-stamp" : "slab-nope";
  face.classList.remove("slab-stamp", "slab-nope");
  void face.offsetWidth;
  face.classList.add(cls);
  face.addEventListener("animationend", () => face.classList.remove(cls), { once: true });
}

/** Where an element stands on screen: its middle. */
function middle(el: Element): { x: number; y: number } {
  const r = el.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}

/** An element the effects can see: on the page and drawn (not under display: none). */
function shown(selector: string): HTMLElement | null {
  const el = document.querySelector<HTMLElement>(selector);
  return el && el.getClientRects().length > 0 ? el : null;
}

/** A beat on what was reached (the store's chip, the purse): its class played once more. */
function beat(el: HTMLElement, cls: string): void {
  el.classList.remove(cls);
  void el.offsetWidth;
  el.classList.add(cls);
  el.addEventListener("animationend", () => el.classList.remove(cls), { once: true });
}

/**
 * A city paid by a delivery: a ring of its light grows from it and fades. Nothing if the city is
 * not on screen (a place open over the map, another layer), nor for those who ask for less motion.
 */
export function ringAt(selector: string): void {
  if (typeof window === "undefined" || reduced()) return;
  const layer = document.querySelector<HTMLElement>("[data-fx-layer]");
  const el = shown(selector);
  if (!layer || !el) return;
  const r = el.getBoundingClientRect();
  if (r.bottom < 0 || r.top > window.innerHeight || r.right < 0 || r.left > window.innerWidth)
    return;
  const c = middle(el);
  const size = Math.max(r.width, r.height);
  const ring = document.createElement("span");
  ring.className = "absolute rounded-full border-2 border-lagoon";
  ring.style.cssText = `left:${c.x - size / 2}px;top:${c.y - size / 2}px;width:${size}px;height:${size}px;box-shadow:0 0 18px rgb(var(--lagoon) / 0.6)`;
  layer.appendChild(ring);
  const wave = ring.animate(
    [
      { transform: "scale(0.7)", opacity: 0.95 },
      { transform: "scale(2.2)", opacity: 0 },
    ],
    { duration: 900, easing: "cubic-bezier(0.22, 1, 0.36, 1)" },
  );
  wave.onfinish = () => ring.remove();
  wave.oncancel = () => ring.remove();
}

/**
 * The harvest seen coming in: each good's mark leaves the star of the counter that made it and
 * flies in an arc to its chip of the store (or the store's door when the chips are hidden), which
 * beats as it lands, a note higher at each good. Nothing where there is no star to leave from
 * (the R key, the welcome back), nor for those who ask for less motion.
 */
export function flyGoods(harvested: Record<string, number>, label?: string): void {
  if (typeof window === "undefined" || reduced()) return;
  const layer = document.querySelector<HTMLElement>("[data-fx-layer]");
  if (!layer) return;
  // No star to leave from: harvested from the map's card, the goods fly to the Ateliers tab.
  if (!Object.keys(harvested).some((r) => shown(`[data-goods-from="${r}"]`))) {
    flyFromPlace(layer, harvested, label);
    return;
  }
  let step = 0;
  for (const [resource, quantity] of Object.entries(harvested)) {
    if (quantity <= 0) continue;
    const source = shown(`[data-goods-from="${resource}"]`);
    const target = shown(`[data-goods-to="${resource}"]`) ?? shown('[data-goods-to="store"]');
    if (!source || !target) continue;
    const from = middle(source);
    const to = middle(target);
    const lift = Math.min(from.y, to.y) - 60;
    const delay = step * 90;
    const note = step;
    step++;
    for (let copy = 0; copy < 2; copy++) {
      const mark = source.cloneNode(true) as HTMLElement;
      mark.removeAttribute("data-goods-from");
      mark.style.cssText = "position:absolute;left:0;top:0;";
      layer.appendChild(mark);
      const r = source.getBoundingClientRect();
      const half = { x: r.width / 2, y: r.height / 2 };
      const at = (x: number, y: number, scale: number) =>
        `translate(${x - half.x}px, ${y - half.y}px) scale(${scale})`;
      const flight = mark.animate(
        [
          { transform: at(from.x, from.y, 1), opacity: 0.9 },
          {
            transform: at((from.x + to.x) / 2 + (copy ? 18 : -18), lift, 1.2),
            opacity: 1,
            offset: 0.45,
          },
          { transform: at(to.x, to.y, 0.7), opacity: 0.85 },
        ],
        {
          duration: 760,
          delay: delay + copy * 60,
          easing: "cubic-bezier(0.5, 0, 0.2, 1)",
          fill: "both",
        },
      );
      flight.onfinish = () => {
        mark.remove();
        if (copy === 1) return;
        beat(target, "goods-beat");
        chime(note);
      };
      flight.oncancel = () => mark.remove();
    }
  }
}

/**
 * The harvest of the map's card (refonte UX, maquette `Main`): small marks of the goods leave the
 * counter in a curve for the Ateliers tab, whose icon bounces as each lands, and « +8 farine »
 * rises over the counter.
 */
function flyFromPlace(layer: HTMLElement, harvested: Record<string, number>, label?: string) {
  const source = shown('[data-goods-from="place"]');
  const target = shown('[data-goods-to="workshops"]');
  if (!source || !target) return;
  const from = middle(source);
  const to = middle(target);
  const goods = Object.entries(harvested).filter(([, q]) => q > 0);
  if (goods.length === 0) return;
  const MARKS = 7;
  for (let i = 0; i < MARKS; i++) {
    const [resource] = goods[i % goods.length] ?? ["", 0];
    const mark = document.createElement("span");
    mark.style.cssText = `position:absolute;left:0;top:0;width:12px;height:12px;margin:-6px 0 0 -6px;border-radius:${i % 2 ? "50%" : "3px"};background:${goodsColour(resource)}`;
    layer.appendChild(mark);
    const jitter = { x: (Math.random() - 0.5) * 14, y: (Math.random() - 0.5) * 14 };
    const flight = mark.animate(
      [
        {
          transform: `translate(${from.x + jitter.x}px, ${from.y + jitter.y}px) scale(1)`,
          opacity: 1,
        },
        { transform: `translate(${to.x}px, ${to.y}px) scale(0.6)`, opacity: 0.2 },
      ],
      { duration: 550, delay: 80 + i * 50, easing: "cubic-bezier(0.5, 0, 0.8, 0.4)", fill: "both" },
    );
    flight.onfinish = () => {
      mark.remove();
      beat(target, "tab-bounce");
    };
    flight.oncancel = () => mark.remove();
  }
  if (!label) return;
  const rise = document.createElement("span");
  rise.textContent = label;
  rise.className =
    "absolute left-0 top-0 whitespace-nowrap font-display text-base font-extrabold text-lagoon [text-shadow:0_1px_3px_rgb(0_0_0/0.9)]";
  layer.appendChild(rise);
  const at = (y: number) => `translate(${from.x}px, ${y}px) translate(-50%, 0)`;
  const up = rise.animate(
    [
      { transform: at(from.y - 64), opacity: 0 },
      { transform: at(from.y - 70), opacity: 1, offset: 0.2 },
      { transform: at(from.y - 94), opacity: 0 },
    ],
    { duration: 900, easing: "ease-out", fill: "both" },
  );
  up.onfinish = () => rise.remove();
  up.oncancel = () => rise.remove();
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
      const { gain, note, from: origin } = (e as CustomEvent<FlyOptions & { gain: bigint }>).detail;
      const to = purse.getBoundingClientRect();
      const end = { x: to.left + to.width / 2, y: to.top + to.height / 2 };
      // From the place that paid when it is drawn (a city hidden by another layer has no box).
      const start = origin ? shown(origin)?.getBoundingClientRect() : undefined;
      const from = start
        ? { x: start.left + start.width / 2, y: start.top + start.height / 2 }
        : (lastTouch ?? { x: window.innerWidth / 2, y: window.innerHeight / 2 });
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
          // Held before its start only (its delay): once landed, the coin goes back to its
          // hidden style, instead of the last frame staying over the purse and what lies above.
          {
            duration: 720,
            delay: i * 60,
            easing: "cubic-bezier(0.5, 0, 0.2, 1)",
            fill: "backwards",
          },
        );
      }
      // The purse beats as the first coins land in it.
      window.setTimeout(() => beat(purse, "purse-bump"), 720);
      const label = root.querySelector<HTMLElement>("[data-gain]");
      const amountEl = root.querySelector<HTMLElement>("[data-gain-amount]");
      const noteEl = root.querySelector<HTMLElement>("[data-gain-note]");
      if (label && amountEl && noteEl) {
        amountEl.textContent = `+${amount(gain)}`;
        noteEl.textContent = note ?? "";
        // The gain rises where it was made, clear of the HUD's figures.
        const x = Math.min(Math.max(from.x - 55, 8), window.innerWidth - 118);
        label.animate(
          [
            { transform: `translate(${x}px, ${from.y - 20}px)`, opacity: 0 },
            { transform: `translate(${x}px, ${from.y - 40}px)`, opacity: 1, offset: 0.2 },
            { transform: `translate(${x}px, ${from.y - 80}px)`, opacity: 0 },
          ],
          { duration: 1_400, easing: "ease-out", fill: "backwards" },
        );
      }
    };
    window.addEventListener(EVENT, onCoins);
    return () => window.removeEventListener(EVENT, onCoins);
  }, []);
  return createPortal(
    <div
      ref={layer}
      data-fx-layer
      className="pointer-events-none fixed inset-0 z-[60]"
      aria-hidden="true"
    >
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
        className="absolute left-0 top-0 w-[110px] text-center font-display text-gold opacity-0 [text-shadow:0_1px_4px_rgb(0_0_0/0.9)]"
      >
        <span data-gain-amount className="block text-xl font-extrabold" />
        <span data-gain-note className="block text-sm font-semibold empty:hidden" />
      </span>
    </div>,
    document.body,
  );
}
