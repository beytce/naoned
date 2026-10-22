import { fr } from "../i18n.js";
import type { GameProps } from "./Game.js";
import { d } from "./format.js";

/**
 * The rival of the week in a few words: who, and how far. None while the merchant has sold
 * nothing this week: a gap to a stranger means nothing before the first sale.
 */
export function rivalLine(r: GameProps["rival"]): string | null {
  if (!r || BigInt(r.mine) === 0n) return null;
  const t = fr.game.rival;
  const who = r.pseudo ?? t.someone;
  const name = r.character ? `${who} ${t.characters[r.character] ?? ""}`.trim() : who;
  const gap = BigInt(r.gain) - BigInt(r.mine);
  const abs = gap < 0n ? -gap : gap;
  const shown = abs === 0n ? null : d(abs);
  return r.ahead ? t.chase(name, shown) : t.chased(name, shown);
}
