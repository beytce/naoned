/**
 * The interface's language (E3-8 of the experts): French or English, chosen once at start-up from
 * the address (`?lang=en`, kept), the choice kept on this device, or the browser's language. The
 * game reloads to change it. Outside a browser (tests, build), French.
 */
export type Lang = "fr" | "en";

export const LANGS: readonly Lang[] = ["fr", "en"];
const KEY = "fondaco.lang";

const isLang = (v: unknown): v is Lang => v === "fr" || v === "en";

/** The browser, when there is one (read without the DOM's types: the server compiles this too). */
const browser = globalThis as {
  window?: { location: { search: string } };
  navigator?: { language?: string };
  localStorage?: { getItem(k: string): string | null; setItem(k: string, v: string): void };
};

/** The language of this visit: the address's, then the device's choice, then the browser's. */
export function chosenLang(): Lang {
  if (!browser.window) return "fr";
  try {
    const asked = new URLSearchParams(browser.window.location.search).get("lang");
    if (isLang(asked)) {
      browser.localStorage?.setItem(KEY, asked);
      return asked;
    }
    const kept = browser.localStorage?.getItem(KEY);
    if (isLang(kept)) return kept;
  } catch {
    // No storage: the browser's language decides.
  }
  const nav = browser.navigator?.language ?? "fr";
  return nav.toLowerCase().startsWith("fr") ? "fr" : "en";
}

/** Keeps the language for the next start (the caller reloads the page). */
export function keepLang(lang: Lang): void {
  try {
    browser.localStorage?.setItem(KEY, lang);
  } catch {
    // No storage: the browser's language will decide again.
  }
}

export const LANG: Lang = chosenLang();
/** The locale numbers and dates are written in. */
export const locale = LANG === "en" ? "en-GB" : "fr-FR";
