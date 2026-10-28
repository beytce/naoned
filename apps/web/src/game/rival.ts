import { fr } from "../i18n.js";
import type { GameProps } from "./Game.js";
import { whole } from "./format.js";

/** The rival's line, in pieces so that the name truncates and never its seal nor the gap. */
export interface RivalLine {
  /** « Rival : » or « Talonné par ». */
  lead: string;
  name: string;
  /** A house of the computer: the name carries the « PNJ » seal. */
  bot: boolean;
  /** « , +120 D », « , à égalité ». */
  gap: string;
}

/**
 * The rival of the week in a few words: who, and how far. None while the merchant has sold
 * nothing this week: a gap to a stranger means nothing before the first sale.
 */
export function rivalLine(r: GameProps["rival"]): RivalLine | null {
  // A Sfida shows from its first hour; a ranking's neighbour only after a first sale.
  if (!r || (!r.sfida && BigInt(r.mine) === 0n)) return null;
  const t = fr.game.rival;
  const who = r.pseudo ?? t.someone;
  // The Sfida's opponent (R6): its ghost said as such.
  const name = r.ghost
    ? fr.game.lustre.ghostOf(who)
    : r.character
      ? `${who} ${t.characters[r.character] ?? ""}`.trim()
      : who;
  const gap = BigInt(r.gain) - BigInt(r.mine);
  const abs = gap < 0n ? -gap : gap;
  const shown = abs === 0n ? null : whole(abs);
  return {
    lead: r.sfida ? fr.game.lustre.lead : r.ahead ? t.chase : t.chased,
    name,
    bot: r.bot,
    gap: t.gap(r.ahead, shown),
  };
}
