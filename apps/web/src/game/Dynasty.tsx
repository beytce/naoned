import { useEffect, useState } from "react";
import type { CrestData } from "../art/crest.js";
import { Portrait } from "../art/portrait.js";
import { fr } from "../i18n.js";
import { Label } from "../ui.js";
import { gameApi } from "./api.js";
import type { DynastyView, Generation } from "./types.js";

const t = () => fr.game.dynasty;

/** A trait's name and its line. */
export function traitName(code: string): [string, string] {
  return t().traits[code] ?? [code, ""];
}

/** The house's line, fetched once (null: off, or not yet there). */
export function useDynasty(): [DynastyView | null, (v: DynastyView | null) => void] {
  const [view, setView] = useState<DynastyView | null>(null);
  useEffect(() => {
    gameApi
      .dynasty()
      .then(setView)
      .catch(() => setView(null));
  }, []);
  return [view, setView];
}

/** A generation as one line: its name, epithet and year. */
export function memberLine(g: Generation, house: string): string {
  const epithet = g.epithet ? ` ${t().epithets[g.epithet] ?? ""}` : "";
  return t().member(`${g.given}${epithet}`, house, g.year);
}

/**
 * The heir to name, at the month's close (R4): the traits earned as cards, the one picked ringed
 * in lapis. The ceremony's one gold button leaves it (`onPick` gives the choice up).
 */
export function HeirChoice({
  earned,
  picked,
  onPick,
}: {
  earned: string[];
  picked: string | null;
  onPick: (code: string) => void;
}) {
  return (
    <section className="w-full space-y-2 text-left">
      <Label className="text-gold">{t().heirKicker}</Label>
      <p className="text-sm text-cream-dim">{earned.length > 0 ? t().heirHelp : t().heirNone}</p>
      {earned.map((code) => {
        const [name, line] = traitName(code);
        const on = picked === code;
        return (
          <button
            key={code}
            type="button"
            aria-pressed={on}
            onClick={() => onPick(code)}
            className={`w-full rounded-2xl bg-night-3 px-3 py-2.5 text-left ${on ? "ring-[1.5px] ring-inset ring-info" : "ring-1 ring-inset ring-line"}`}
          >
            <span className="block font-place text-sm font-bold uppercase tracking-[0.12em]">
              {name}
            </span>
            <span className="mt-0.5 block text-sm text-lagoon">{line}</span>
            <span className="meta mt-0.5 block">{t().earnedBy[code]}</span>
          </button>
        );
      })}
    </section>
  );
}

/** The month's member of the house, named before settling: three names as pills. */
export function NamePicker({
  names,
  picked,
  onPick,
}: {
  names: string[];
  picked: string | null;
  onPick: (name: string) => void;
}) {
  if (names.length === 0) return null;
  return (
    <section className="mt-5 space-y-2 text-center">
      <Label className="text-gold">{t().nameKicker}</Label>
      <p className="text-sm text-cream-dim">{t().nameHelp}</p>
      <div className="flex flex-wrap justify-center gap-2">
        {names.map((n) => (
          <button
            key={n}
            type="button"
            aria-pressed={picked === n}
            onClick={() => onPick(n)}
            className={`min-h-11 rounded-full px-4 text-sm font-semibold ${picked === n ? "bg-info/15 text-cream ring-[1.5px] ring-inset ring-info" : "text-cream-dim ring-1 ring-inset ring-line"}`}
          >
            {n}
          </button>
        ))}
      </div>
    </section>
  );
}

/** The gallery of the house, in the profile: each generation's portrait, the latest first. */
export function Gallery({
  view,
  house,
  crest,
}: {
  view: DynastyView | null;
  house: string;
  crest: CrestData | null;
}) {
  if (!view || view.generations.length === 0) return null;
  const line = [...view.generations].reverse();
  return (
    <section className="space-y-3">
      <h2 className="font-display text-2xl font-extrabold">{t().gallery}</h2>
      <p className="text-sm text-cream-dim">{t().galleryHelp}</p>
      <ol className="space-y-2">
        {line.map((g, i) => (
          <li key={g.worldId} className="flex items-center gap-3 rounded-2xl bg-night-3 px-3 py-2">
            <Portrait given={g.given} crest={crest} size={i === 0 ? 56 : 44} faded={i > 0} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{memberLine(g, house)}</p>
              <p className="meta truncate">
                {g.season.replace(/^.*· /, "")}
                {g.rank ? ` · ${t().rank(g.rank)}` : ""}
              </p>
              {g.traitIn && <p className="text-xs text-lagoon">{traitName(g.traitIn)[0]}</p>}
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
