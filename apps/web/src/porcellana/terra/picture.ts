/**
 * What the Terraferma's board draws, from the server's view (the game) or from the engine's state
 * (the laboratory): the cells' holders as indices, each holder's style by the rule « Encres », the
 * towns, the camps and their flags.
 */
import { type TerraState, alliesOf, isNation } from "@comptoirs/engine";
import type { TerraView } from "../../game/types.js";
import type { TerraSceneProps } from "./TerraBoard.js";
import { type HolderLike, holderStyle } from "./glaze.js";

export type BoardPicture = TerraSceneProps["pic"];

/** The flag of a holder: the merchant's red, the allies' lagoon, the nations' biscuit, ink. */
export function flagOf(h: HolderLike): string {
  if (h.me) return "#C23B2E";
  if (h.ally) return "#16897A";
  if (h.nation) return "#9A7A52";
  return "#2A2725";
}

/** The board's picture of a view of the server. */
export function pictureOfView(v: TerraView): BoardPicture {
  const styles = v.holders.map((h, i) => holderStyle(h, i));
  return {
    width: v.map.width,
    height: v.map.height,
    grid: v.map.grid ?? "hex",
    terrain: v.map.terrain,
    owner: v.owner,
    styles,
    me: v.holders.findIndex((h) => h.me),
    cities: v.map.cities,
    buildings: v.buildings.map((b) => ({ cell: b.cell, kind: b.kind, owner: b.owner })),
    fronts: v.fronts.map((f) => ({
      id: f.id,
      owner: f.owner,
      troops: f.troops,
      mine: f.mine,
      threat: f.threat,
      aim: f.aim,
      next: f.takes.map((x) => x.cell),
    })),
    camps: v.holders.flatMap((h, holder) =>
      h.capital === null ? [] : [{ cell: h.capital, holder, flag: flagOf(h) }],
    ),
  };
}

const LETTER: Record<string, string> = {
  plain: "p",
  hill: "h",
  marsh: "m",
  mountain: "M",
  water: "w",
};

/**
 * The board's picture of an engine's state, seen by `me` (the laboratory); `next` the cells each
 * front takes next (the engine's forecast).
 */
export function pictureOfState(
  s: TerraState,
  me: string,
  next: Record<string, number[]> = {},
): BoardPicture & { ids: string[] } {
  const ids = [...new Set(s.owner.filter((o): o is string => o !== null))].sort();
  for (const id of Object.keys(s.players)) if (!ids.includes(id)) ids.push(id);
  const index = new Map(ids.map((id, i) => [id, i]));
  const allies = new Set(s.players[me] ? alliesOf(s, me) : []);
  const like = (id: string): HolderLike => ({
    me: id === me,
    ally: allies.has(id),
    nation: isNation(id) ? id : null,
  });
  return {
    ids,
    width: s.map.width,
    height: s.map.height,
    grid: s.map.grid ?? "hex",
    terrain: s.map.terrain.map((k) => LETTER[k] ?? "p").join(""),
    owner: s.owner.map((o) => (o === null ? -1 : (index.get(o) ?? -1))),
    styles: ids.map((id, i) => holderStyle(like(id), i)),
    me: index.get(me) ?? -1,
    cities: s.map.cityCode.flatMap((code, cell) => (code ? [{ cell, code }] : [])),
    buildings: Object.entries(s.buildings ?? {}).map(([cell, b]) => ({
      cell: Number(cell),
      kind: b.kind,
      owner: index.get(b.owner) ?? -1,
    })),
    fronts: s.fronts.map((f) => ({
      id: f.id,
      owner: index.get(f.owner) ?? -1,
      troops: f.troops,
      mine: f.owner === me,
      threat: f.against === me,
      aim: f.aim,
      next: next[f.id] ?? [],
    })),
    camps: ids.flatMap((id) => {
      const c = s.players[id]?.capital;
      return c === undefined
        ? []
        : [{ cell: c, holder: index.get(id) ?? -1, flag: flagOf(like(id)) }];
    }),
  };
}
