import type { Tab } from "./Game.js";

/**
 * The installed app's shortcuts (the manifest's, a long press on its icon) open a place of the
 * game by the address: `/?ouvrir=cargaisons`, `rialto` or `classement`. Anything else: nothing.
 */
const SHORTCUTS: Record<string, Tab> = {
  cargaisons: "routes",
  rialto: "marche",
  classement: "top",
};

export function shortcutTab(search: string): Tab | null {
  const name = new URLSearchParams(search).get("ouvrir");
  return (name && SHORTCUTS[name]) || null;
}
