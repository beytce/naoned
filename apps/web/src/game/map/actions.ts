import { fr } from "../../i18n.js";
import { Icon } from "./icons.js";

const m = fr.game.map.buttons;

/**
 * The actions of the map's panels and doors, one icon and one word each: on a small screen the
 * icon is the label, so no icon stands for two words (the store's crates are not the city's
 * warehouse, the trophy is the ranking's alone). The Help draws its table of icons from here.
 */
export const ACTION_ICONS = {
  harvest: { icon: Icon.harvest, label: m.harvest },
  restart: { icon: Icon.restart, label: m.restart },
  workshops: { icon: Icon.workshops, label: m.workshops },
  store: { icon: Icon.crates, label: m.store },
  build: { icon: Icon.build, label: m.build },
  cargo: { icon: Icon.cargo, label: m.cargo },
  send: { icon: Icon.send, label: m.send },
  sell: { icon: Icon.sell, label: fr.game.sellToCity },
  criee: { icon: Icon.criee, label: m.criee },
  warehouse: { icon: Icon.vault, label: m.warehouse },
  fondaco: { icon: Icon.fondaco, label: m.fondaco },
  suppliers: { icon: Icon.banner, label: m.suppliers },
  rialto: { icon: Icon.rialto, label: m.rialto },
  ranking: { icon: Icon.trophy, label: m.ranking },
  decree: { icon: Icon.decree, label: fr.game.terra.mine.decree },
} as const;

const n = fr.game.map.nav;

/**
 * The five tabs at the foot of the screen, the same on each of their destinations (refonte UX,
 * 28 October 2026): the map, the workshops, Venice, the ranking and the conquest.
 */
export const TABS = [
  { id: "map", label: n.map, icon: Icon.map },
  { id: "workshops", label: n.workshops, icon: Icon.workshops },
  { id: "venice", label: n.venice, icon: Icon.venice },
  { id: "ranking", label: n.ranking, icon: Icon.trophy },
  { id: "conquest", label: n.conquest, icon: Icon.family },
] as const;

export type TabId = (typeof TABS)[number]["id"];

/** A tab's word, from the one list. */
export function tabLabel(id: TabId): string {
  return TABS.find((t) => t.id === id)?.label ?? id;
}
