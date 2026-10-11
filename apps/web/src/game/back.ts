/**
 * The phone's back button (and the browser's): it closes the open window first, then goes back
 * to the counter, and only then leaves the game.
 *
 * One spare history entry is kept on top while something can be undone. A back press lands on
 * the entry below it; the newest handler that can act does so and the spare entry is put back.
 * When nothing can act, the press goes on to wherever the player came from.
 */

type Handler = () => boolean;

const handlers: Handler[] = [];
const MARK = "fondaco-back";
let listening = false;

function armed(): boolean {
  return (window.history.state as Record<string, unknown> | null)?.[MARK] === true;
}

/** Puts the spare entry on top, once. */
export function armBack(): void {
  if (typeof window === "undefined" || armed()) return;
  window.history.pushState({ [MARK]: true }, "");
}

function onPop(): void {
  if (armed()) return; // Forward button: back on the spare entry, nothing to do.
  for (let i = handlers.length - 1; i >= 0; i--) {
    if (handlers[i]?.()) {
      armBack();
      return;
    }
  }
  window.history.back();
}

/** Registers what a back press should undo while it is mounted; the newest one acts first. */
export function onBack(handler: Handler): () => void {
  if (!listening) {
    // The spare entries are not pages: the browser must not scroll when stepping over them.
    window.history.scrollRestoration = "manual";
    window.addEventListener("popstate", onPop);
    listening = true;
  }
  handlers.push(handler);
  armBack();
  return () => {
    const i = handlers.lastIndexOf(handler);
    if (i >= 0) handlers.splice(i, 1);
  };
}
