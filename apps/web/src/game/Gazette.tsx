import { useState } from "react";
import { fr } from "../i18n.js";
import { clock } from "../ui.js";
import type { GameProps } from "./Game.js";
import { store } from "./store.js";

/** The gazette of the Rialto: the market event under way, or the next one, announced ahead. */
export function Gazette(props: GameProps) {
  const { current, next } = props.view.gazette;
  const event = current ?? next;
  const key = event ? `gazette:${event.code}:${event.startsAt}:${current ? "now" : "soon"}` : "";
  const [closed, setClosed] = useState(() => (key ? store.get(key) === "1" : true));
  if (!event || closed) return null;
  const [title, text] = fr.game.gazette.events[event.code] ?? [event.code, ""];
  const live = current !== null;
  return (
    <div className="mx-auto w-full max-w-md px-4">
      <div
        className={`slab relative mt-1 px-4 py-2.5 shadow-[4px_4px_0_0_#168A7E] ${
          live ? "bg-gold text-night" : "bg-night-3 text-cream ring-1 ring-gold/60"
        }`}
      >
        <div className="pr-6">
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.25em]">
            {live ? fr.game.gazette.now : fr.game.gazette.soon} ·{" "}
            {live
              ? `${fr.game.gazette.endsIn} ${clock(event.endsAt - props.now)}`
              : `${fr.game.gazette.startsIn} ${clock(event.startsAt - props.now)}`}
          </p>
          <p className="mt-0.5 font-display text-sm font-extrabold uppercase">{title}</p>
          <p className="text-sm leading-snug">{text}</p>
        </div>
        <button
          type="button"
          aria-label={fr.game.close}
          className="absolute right-3 top-2 text-lg"
          onClick={() => {
            store.set(key, "1");
            setClosed(true);
          }}
        >
          <span>×</span>
        </button>
      </div>
    </div>
  );
}
