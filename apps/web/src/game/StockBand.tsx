import { useEffect, useRef, useState } from "react";
import { ResourceIcon } from "../art/resources.js";
import type { GameProps } from "./Game.js";

/**
 * The stock laid along the foot of a scene: each good held, its quantity pulsing gold when it
 * changes. A tap opens the store.
 */
export function StockBand({
  props,
  label,
  title,
  inline = false,
}: { props: GameProps; label: string; title: string; inline?: boolean }) {
  const held = props.view.inventory.filter((i) => i.available > 0);
  // A quantity that changed since the last view pulses: its key moves on.
  const last = useRef(new Map<string, number>());
  const [beats, setBeats] = useState<Record<string, number>>({});
  useEffect(() => {
    const moved: string[] = [];
    for (const i of props.view.inventory) {
      const before = last.current.get(i.resource);
      if (before !== undefined && before !== i.available) moved.push(i.resource);
      last.current.set(i.resource, i.available);
    }
    if (moved.length)
      setBeats((b) => {
        const next = { ...b };
        for (const r of moved) next[r] = (next[r] ?? 0) + 1;
        return next;
      });
  }, [props.view.inventory]);
  if (!held.length) return null;
  return (
    <div
      className={
        inline
          ? ""
          : "pointer-events-none absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-night/90 via-night/55 to-transparent px-3 pb-2 pt-8"
      }
    >
      <button
        type="button"
        aria-label={label}
        data-stock-band
        onClick={() => props.setSheet("store")}
        className="pointer-events-auto flex max-w-full gap-1.5 overflow-x-auto pb-0.5 [scrollbar-width:none]"
      >
        <span className="flex shrink-0 items-center pr-0.5 font-mono text-[10px] tracking-[0.2em] text-cream-dim">
          {title}
        </span>
        {held.map((i) => (
          <span
            key={`${i.resource}:${beats[i.resource] ?? 0}`}
            className={`flex shrink-0 items-center gap-1 rounded-full bg-night/75 py-0.5 pl-0.5 pr-2.5 ring-1 ring-inset ring-line ${beats[i.resource] ? "stock-beat" : ""}`}
          >
            <ResourceIcon code={i.resource} size={22} />
            <span className="font-display text-sm font-semibold tabular-nums text-cream">
              {i.available}
            </span>
          </span>
        ))}
      </button>
    </div>
  );
}
