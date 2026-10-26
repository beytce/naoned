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

/** The four doors at the foot of the map, at the same places on every layer. */
export const HUD_DOORS = [
  { id: "workshops", label: m.workshops },
  { id: "ranking", label: m.ranking },
  // The Terraferma's door on the trade's map (« Commerce » back from it).
  { id: "layer", label: fr.game.terra.door },
  { id: "help", label: m.help },
] as const;

export type HudDoor = (typeof HUD_DOORS)[number]["id"];

/** A door's word, from the one list. */
export function doorLabel(id: HudDoor): string {
  return HUD_DOORS.find((d) => d.id === id)?.label ?? id;
}
