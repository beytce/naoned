import type { Layer, Tab } from "./Game.js";

/**
 * Where an address opens the game: the installed app's shortcuts (`/?ouvrir=cargaisons`,
 * `rialto`, `classement`) and the pushes' links (`/?open=cargo&src=push&kind=…`, E3-1 of the
 * experts). Only the places of these lists: anything else opens the game as it is.
 */
export type Place = { tab: Tab } | { sheet: string } | { layer: Layer };

const SHORTCUTS: Record<string, Place> = {
  cargaisons: { tab: "routes" },
  rialto: { tab: "marche" },
  classement: { tab: "top" },
};

const OPENS: Record<string, Place> = {
  cargo: { tab: "routes" },
  rialto: { tab: "marche" },
  ranking: { tab: "top" },
  workshops: { sheet: "workshops" },
  notices: { sheet: "notices" },
  terra: { layer: "terra" },
  sfida: { sheet: "sfida" },
  sera: { sheet: "sera" },
  letter: { sheet: "letter" },
  senate: { sheet: "senate" },
};

export function placeFrom(search: string): Place | null {
  const params = new URLSearchParams(search);
  const shortcut = params.get("ouvrir");
  const open = params.get("open");
  return (shortcut ? (SHORTCUTS[shortcut] ?? null) : null) ?? (open ? (OPENS[open] ?? null) : null);
}

/** The kind of push the game was opened from (for the measures), or null. */
export function pushOpened(search: string): string | null {
  const params = new URLSearchParams(search);
  const kind = params.get("kind");
  return params.get("src") === "push" && kind && /^[a-z_]{1,20}$/.test(kind) ? kind : null;
}

/** The address without what only served to open a place (a reload must not open it again). */
export function withoutPlace(url: URL): string {
  for (const p of ["ouvrir", "open", "src", "kind"]) url.searchParams.delete(p);
  return url.pathname + url.search + url.hash;
}
