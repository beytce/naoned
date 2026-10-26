/**
 * What Lorenzo's guide sees of the page: whether the element it points at can be touched, and
 * how it brings one into view. Written against the few calls it makes of the DOM, so the tests
 * can play them with plain objects.
 */

export interface Rect {
  top: number;
  bottom: number;
  left: number;
  right: number;
  width: number;
  height: number;
}

/** A window over the page (a sheet, the help, the bales): `aria-modal`, scrolling its content. */
export interface Modal {
  contains(other: unknown): boolean;
  getBoundingClientRect(): Rect;
  scrollTop: number;
  scrollTo(options: { top: number; behavior: "smooth" }): void;
  /** Its own animations (a sheet sliding in): measured only once they are over. */
  getAnimations?(): { playState: string }[];
  /** Its sticky head (`[data-sheet-head]`), over what scrolls under it. */
  querySelector?(selector: string): { getBoundingClientRect(): Rect } | null;
}

/** The element pointed at, as the guide reads it. */
export interface Target {
  contains(other: unknown): boolean;
  getBoundingClientRect(): Rect;
  closest(selector: string): unknown;
}

/** What lies at a point of the screen: the element hit, and whether it is the guide's bubble. */
export interface Hit {
  contains(other: unknown): boolean;
  closest(selector: string): unknown;
}

export interface Page {
  width: number;
  height: number;
  /** The topmost element under a point (`document.elementFromPoint`). */
  at(x: number, y: number): Hit | null;
  /** The windows open over the page (`[aria-modal="true"]`). */
  modals(): Modal[];
  /**
   * The places open full screen over the map (`[data-place]`: the counter up close). They cover
   * the map, never the windows opened over them.
   */
  places?(): { contains(other: unknown): boolean }[];
}

export const MODAL = '[aria-modal="true"]';
export const PLACE = "[data-place]";

/** Where a window's visible part begins: below the screen's top, and below its sticky head. */
function sheetTop(sheet: Modal): number {
  const head = sheet.querySelector?.("[data-sheet-head]");
  return Math.max(0, sheet.getBoundingClientRect().top, head?.getBoundingClientRect().bottom ?? 0);
}

/** The browser's page, for the guide. */
export function browserPage(): Page {
  return {
    width: window.innerWidth,
    height: window.innerHeight,
    at: (x, y) => document.elementFromPoint(x, y),
    modals: () => [...document.querySelectorAll<HTMLElement>(MODAL)],
    places: () => [...document.querySelectorAll<HTMLElement>(PLACE)],
  };
}

/**
 * Something lies over the target: a window open over the page that does not hold it (as soon as
 * it opens, while it still slides in), a place open over the map that does not hold it, or, under
 * its centre, an element that is neither the
 * target, inside it, nor the guide's own bubble. Off screen, it is not covered (it scrolls).
 */
export function isCovered(el: Target, box: Rect, page: Page): boolean {
  const modals = page.modals();
  if (modals.some((m) => !m.contains(el))) return true;
  // A place covers the map; a window over the place (holding the target) is above it.
  if (modals.length === 0 && (page.places?.() ?? []).some((p) => !p.contains(el))) return true;
  const x = box.left + box.width / 2;
  const y = box.top + box.height / 2;
  if (x < 0 || y < 0 || x > page.width || y > page.height) return false;
  const top = page.at(x, y);
  if (!top) return false;
  return !el.contains(top) && !top.contains(el) && !top.closest("[data-coach-bubble]");
}

/**
 * Brings a target out of sight in its window into view, by scrolling that window alone (never
 * the page, nor the map): a list still filling when the step came, a reward under the fold.
 * Returns whether it scrolled. A target outside a window (on the map, in a place's panel) stays
 * where it is.
 */
export function bringIntoSheet(el: Target, viewHeight: number): boolean {
  const sheet = el.closest(MODAL) as Modal | null;
  if (!sheet) return false;
  const s = sheet.getBoundingClientRect();
  const b = el.getBoundingClientRect();
  const top = sheetTop(sheet);
  const bottom = Math.min(viewHeight, s.bottom);
  if (b.top >= top && b.bottom <= bottom) return false;
  sheet.scrollTo({
    top: Math.max(0, sheet.scrollTop + (b.top + b.height / 2) - (top + bottom) / 2),
    behavior: "smooth",
  });
  return true;
}

/**
 * Once per step: the guide brings its target into view the first time it finds it out of
 * sight, then leaves the scroll to the player (who may read further down). A new step, or a new
 * element pointed at within it, may be brought once again.
 */
export function bringOnce(): (step: string, el: Target, viewHeight: number) => void {
  let done: string | null = null;
  return (step, el, viewHeight) => {
    if (done === step) return;
    // A sheet still sliding in: where things are is not yet where they will be.
    if (sliding(el)) return;
    const b = el.getBoundingClientRect();
    if (b.top >= 0 && b.bottom <= viewHeight && !outOfSheet(el, viewHeight)) return;
    done = step;
    bringIntoSheet(el, viewHeight);
  };
}

function sliding(el: Target): boolean {
  const sheet = el.closest(MODAL) as Modal | null;
  return !!sheet?.getAnimations?.().some((a) => a.playState === "running");
}

/**
 * Out of its window's visible part (scrolled past its top, under its sticky head, or under its
 * foot), though maybe on the screen: no ring there, a finger would touch what lies around it.
 */
export function outOfSheet(el: Target, viewHeight: number): boolean {
  const sheet = el.closest(MODAL) as Modal | null;
  if (!sheet) return false;
  const s = sheet.getBoundingClientRect();
  const b = el.getBoundingClientRect();
  const y = b.top + b.height / 2;
  return y < sheetTop(sheet) || y > Math.min(viewHeight, s.bottom);
}

/**
 * The ring around a target and what goes with it (`data-coach-with`: the counter's name under its
 * medallion): one box holding them all.
 */
export function unionBox(boxes: Rect[]): Rect | null {
  if (boxes.length === 0) return null;
  const left = Math.min(...boxes.map((b) => b.left));
  const top = Math.min(...boxes.map((b) => b.top));
  const right = Math.max(...boxes.map((b) => b.right));
  const bottom = Math.max(...boxes.map((b) => b.bottom));
  return { left, top, right, bottom, width: right - left, height: bottom - top };
}
