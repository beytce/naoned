import { useState } from "react";
import { fr } from "../i18n.js";
import { clock } from "../ui.js";
import { actText, currentAct } from "./Acts.js";
import type { GameProps, Tab } from "./Game.js";
import { store } from "./store.js";

/** Where the gazette shows: the screens where its news changes what to do. */
const SHOWN_ON: Tab[] = ["comptoir", "routes", "marche"];

/** The guide is still leading the first steps: nothing else on top of it. */
function guiding(props: GameProps): boolean {
  if (store.get("guideDone") === "1" || store.get("guideHidden") === "1") return false;
  return !props.view.tutorial.includes("mission");
}

const DAY_MS = 86_400_000;
const ROMAN = ["I", "II", "III", "IV", "V", "VI"];

/**
 * The gazette of the Rialto: an act of the season on its first day, else the market event under
 * way or the next one announced ahead, else the act under way.
 * One folded line (title and countdown); a touch opens the details.
 */
export function Gazette(props: GameProps) {
  const { current, next } = props.view.gazette;
  const event = current ?? next;
  const act = currentAct(props.view, props.now);
  const actFirst = act !== null && act.index > 0 && props.now < act.startsAt + DAY_MS;
  const showAct = act !== null && (actFirst || !event);
  const key = showAct
    ? `gazette:act:${act.startsAt}:${actFirst ? "new" : "on"}`
    : event
      ? `gazette:${event.code}:${event.startsAt}:${current ? "now" : "soon"}`
      : "";
  const [closedKey, setClosedKey] = useState<string | null>(null);
  const closed = key === "" || closedKey === key || store.get(key) === "1";
  const [open, setOpen] = useState(false);
  if (closed || !SHOWN_ON.includes(props.tab) || guiding(props)) return null;
  const shown = showAct && act ? act : event;
  if (!shown) return null;
  const [title, text] =
    showAct && act
      ? (() => {
          const a = actText(act);
          return [a.title, a.text];
        })()
      : (fr.game.gazette.events[shown.code] ?? [shown.code, ""]);
  const live = showAct || current !== null;
  return (
    <div className="mx-auto w-full max-w-md px-4 lg:max-w-6xl lg:px-8">
      <div
        className={`cut relative mt-2 shadow-md shadow-black/20 ${
          live ? "bg-gold text-ink" : "bg-night-3 text-cream ring-1 ring-gold/60"
        }`}
      >
        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpen(!open)}
          className="flex w-full items-baseline gap-2 py-2 pl-3 pr-11 text-left"
        >
          <span className="shrink-0 font-mono text-[10px] font-bold uppercase tracking-[0.2em]">
            {showAct && act
              ? fr.game.acts.kicker(ROMAN[act.index] ?? String(act.index + 1))
              : live
                ? fr.game.gazette.now
                : fr.game.gazette.soon}
          </span>
          <span className="min-w-0 flex-1 truncate font-display text-xs font-extrabold uppercase">
            {title}
          </span>
          <span className="shrink-0 font-mono text-[10px] tabular-nums">
            {live
              ? `${fr.game.gazette.endsIn} ${clock(shown.endsAt - props.now)}`
              : `${fr.game.gazette.startsIn} ${clock(shown.startsAt - props.now)}`}
          </span>
        </button>
        {open && <p className="px-3 pb-2.5 text-sm leading-snug">{text}</p>}
        <button
          type="button"
          aria-label={fr.game.close}
          className="absolute right-0 top-0 flex h-9 w-10 items-center justify-center text-lg opacity-70 transition hover:opacity-100"
          onClick={() => {
            store.set(key, "1");
            setClosedKey(key);
          }}
        >
          <span>×</span>
        </button>
      </div>
    </div>
  );
}
