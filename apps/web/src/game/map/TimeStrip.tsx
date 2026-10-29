import { fr } from "../../i18n.js";
import { clock } from "../../ui.js";
import type { Upcoming } from "../timeline.js";

const DOT = {
  lagoon: "bg-lagoon",
  info: "bg-info",
  muted: "border-2 border-info bg-transparent",
  vermilion: "bg-vermilion",
};
const INK = {
  lagoon: "text-lagoon",
  info: "text-cream",
  muted: "text-cream-dim",
  vermilion: "text-vermilion",
};

/**
 * The strip of what comes next, above the doors: « now » at the left, then the next moments on one
 * thread of light (a delivery that pays, a batch, the cities' next orders), each with its time
 * left. It says when to come back without opening anything.
 */
export function TimeStrip({ items, now }: { items: Upcoming[]; now: number }) {
  if (items.length === 0) return null;
  const t = fr.game.map.timeline;
  return (
    <section
      data-hud="timeline"
      aria-label={t.label}
      className="pointer-events-none relative flex items-start gap-2 [text-shadow:0_1px_3px_rgb(0_0_0/0.9)]"
    >
      <span
        aria-hidden="true"
        className="absolute inset-x-1 top-[7px] h-0.5 rounded-full bg-gradient-to-r from-info/80 to-info/10"
      />
      <span className="relative flex shrink-0 flex-col items-start gap-1">
        <span className="h-4 w-4 rounded-full bg-cream shadow-[0_0_10px_rgb(var(--info))]" />
        <span className="text-[0.8125rem] text-cream-dim">{t.now}</span>
      </span>
      <ol className="relative flex min-w-0 flex-1 justify-around gap-2">
        {items.map((u) => (
          <li key={u.key} className="flex min-w-0 flex-col items-center gap-1">
            <span className={`mt-[3px] h-2.5 w-2.5 shrink-0 rounded-full ${DOT[u.tone]}`} />
            <span
              className={`max-w-full text-center text-[0.8125rem] font-semibold leading-tight ${u.plain ? "" : "truncate"} ${INK[u.tone]}`}
            >
              {u.label}
            </span>
            {!u.plain && (
              <span className="font-display text-[0.8125rem] font-bold tabular-nums text-cream-dim">
                {clock(u.at - now)}
              </span>
            )}
          </li>
        ))}
      </ol>
    </section>
  );
}
