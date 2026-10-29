import { fr } from "../i18n.js";

/**
 * A merchant's name, and « (ordinateur) » after it when the house is run by the computer (refonte
 * UX, lot 7: a word, not a seal): one sign, the same everywhere a name shows. The name truncates,
 * never the word.
 */
export function MerchantName({
  pseudo,
  bot,
  fallback = fr.game.anonymous,
  className = "",
}: {
  pseudo: string | null;
  bot: boolean;
  /** Shown for a merchant without a pseudo. */
  fallback?: string;
  className?: string;
}) {
  return (
    // Short of room, the word goes under the name rather than cutting it.
    <span
      className={`inline-flex min-w-0 max-w-full flex-wrap items-baseline gap-x-1.5 ${className}`}
    >
      <span className="min-w-0 max-w-full truncate">{pseudo ?? fallback}</span>
      {bot && <NpcSeal />}
    </span>
  );
}

/** The word alone, small and quiet, explained on hover. */
export function NpcSeal() {
  return (
    <span
      title={fr.game.npcHelp}
      className="shrink-0 whitespace-nowrap text-xs font-normal text-cream-dim"
    >
      {fr.game.npc}
    </span>
  );
}

/** The same in text, where only text fits (the map's SVG, a sentence): « Comm884 (ordinateur) ». */
export function merchantLabel(
  pseudo: string | null,
  bot: boolean,
  fallback: string = fr.game.anonymous,
): string {
  const name = pseudo ?? fallback;
  return bot ? `${name} ${fr.game.npc}` : name;
}
