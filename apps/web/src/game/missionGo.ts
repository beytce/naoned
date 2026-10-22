import { fr } from "../i18n.js";
import type { GameProps, Tab } from "./Game.js";
import { ACTION_ICONS, HUD_DOORS } from "./map/actions.js";

/** Where a mission is done: a sheet opened over the map, or a place of the trade (a free cart). */
type Go = { sheet: string } | { tab: Extract<Tab, "routes" | "marche"> };

/** Each mission of the Livre de compte and where « Y aller » leads. */
export const MISSION_GO: Record<string, Go> = {
  first_delivery: { tab: "routes" },
  three_deliveries: { tab: "routes" },
  first_contract: { tab: "routes" },
  five_contracts: { tab: "routes" },
  first_offer: { tab: "marche" },
  offer_taken: { sheet: "offers" },
  first_upgrade: { sheet: "workshops" },
  three_upgrades: { sheet: "workshops" },
  first_vehicle: { sheet: "buildHere" },
  new_workshop: { sheet: "buildHere" },
  first_palace: { sheet: "buildHere" },
};

/** The tap of « Y aller » for a mission, or null when it leads nowhere. */
export function missionGo(props: GameProps, id: string): (() => void) | null {
  const go = MISSION_GO[id];
  if (!go) return null;
  return "sheet" in go ? () => props.setSheet(go.sheet) : () => props.goTo(go.tab);
}

/**
 * The words of the screen each mission's text cites between « », as written there: a test holds
 * them to the text and to the game's own words (its doors, its panels' actions, the screens').
 */
export const MISSION_REFS: Record<string, string[]> = {
  first_delivery: [fr.game.map.buttons.cargo, fr.game.map.buttons.go],
  first_contract: [fr.game.map.buttons.cargo, fr.game.road.kinds.doge ?? "Doge"],
  five_contracts: [fr.game.map.buttons.cargo],
  first_offer: [fr.game.map.buttons.rialto, fr.game.book.myPrice],
  offer_taken: [fr.game.map.rialto.offers(0), fr.game.map.buttons.rialto],
  first_upgrade: [fr.game.map.buttons.workshops, fr.game.map.buttons.upgrade],
  three_upgrades: [fr.game.map.buttons.workshops],
  first_vehicle: [fr.game.map.buttons.build, fr.game.catalog.tabs.vehicles],
  new_workshop: [fr.game.map.buttons.build],
  first_palace: [fr.game.map.buttons.build],
};

/** The game's own words a mission may cite: its doors, its panels' actions, its screens'. */
export const SCREEN_WORDS = new Set<string>([
  ...HUD_DOORS.map((d) => d.label),
  ...Object.values(ACTION_ICONS).map((a) => a.label),
  fr.game.map.buttons.go,
  fr.game.map.buttons.upgrade,
  fr.game.road.kinds.doge ?? "Doge",
  fr.game.book.myPrice,
  fr.game.map.rialto.offers(0),
  fr.game.catalog.tabs.vehicles,
]);
