/**
 * The interface's language (E3-8 of the experts): French or English, chosen once at start-up from
 * the address (`?lang=en`, kept), the choice kept on this device, or the browser's language. The
 * game reloads to change it. Outside a browser (tests, build), French.
 */
export type Lang = "fr" | "en";

export const LANGS: readonly Lang[] = ["fr", "en"];
const KEY = "fondaco.lang";

const isLang = (v: unknown): v is Lang => v === "fr" || v === "en";

/** The language of this visit: the address's, then the device's choice, then the browser's. */
export function chosenLang(): Lang {
  if (typeof window === "undefined") return "fr";
  try {
    const asked = new URLSearchParams(window.location.search).get("lang");
    if (isLang(asked)) {
      localStorage.setItem(KEY, asked);
      return asked;
    }
    const kept = localStorage.getItem(KEY);
    if (isLang(kept)) return kept;
  } catch {
    // No storage: the browser's language decides.
  }
  const nav = typeof navigator === "undefined" ? "fr" : (navigator.language ?? "fr");
  return nav.toLowerCase().startsWith("fr") ? "fr" : "en";
}

/** Keeps the language for the next start (the caller reloads the page). */
export function keepLang(lang: Lang): void {
  try {
    localStorage.setItem(KEY, lang);
  } catch {
    // No storage: the browser's language will decide again.
  }
}

export const LANG: Lang = chosenLang();
/** The locale numbers and dates are written in. */
export const locale = LANG === "en" ? "en-GB" : "fr-FR";
