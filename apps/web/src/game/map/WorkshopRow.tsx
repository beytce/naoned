import { GoodsMark } from "../../art/goods.js";
import { fr } from "../../i18n.js";
import { clock } from "../../ui.js";
import type { GameProps } from "../Game.js";
import { readyOf, recipeOf } from "../workshops.js";

const R = 21;
const C = 2 * Math.PI * R;

/**
 * The counter's workshops in its panel, each a small star of its own: the mark of what it makes,
 * the arc of its batch (lapis), full and lagoon when it is ready, a dotted ring when it waits
 * (cream: for work; grey: for its matter, never an alarm). Touching one opens its production.
 */
export function WorkshopRow({ props }: { props: GameProps }) {
  const { view, now } = props;
  const t = fr.game.map.workshopRow;
  if (view.buildings.length === 0) return null;
  return (
    <ol data-workshop-row className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1">
      {view.buildings.map((b) => {
        const done = readyOf(b, now);
        const running = !!b.job && done < b.job.batches;
        const share =
          b.job && running ? (now - (b.job.startedAt + done * b.job.batchMs)) / b.job.batchMs : 0;
        const left = b.job && running ? b.job.startedAt + (done + 1) * b.job.batchMs - now : null;
        const output = Object.keys(recipeOf(props, b.type)?.outputs ?? {})[0];
        const state =
          done > 0 ? "ready" : running ? "running" : b.canStart > 0 ? "idle" : "starved";
        const name = props.names.building(b.type);
        const line =
          state === "ready"
            ? t.ready(done)
            : state === "running" && left !== null
              ? clock(left)
              : state === "idle"
                ? t.idle
                : t.starved;
        return (
          <li key={b.id} className="shrink-0">
            <button
              type="button"
              aria-label={`${name} · ${line}`}
              onClick={() => props.setSheet(`produce:${b.id}`)}
              className="flex w-[4.5rem] flex-col items-center gap-0.5 py-1 transition active:scale-95"
            >
              <span className="relative flex h-12 w-12 items-center justify-center">
                <svg
                  viewBox="-24 -24 48 48"
                  className="absolute inset-0 -rotate-90"
                  aria-hidden="true"
                >
                  {state === "idle" || state === "starved" ? (
                    <circle
                      r={R}
                      fill="none"
                      stroke={state === "idle" ? "rgb(var(--cream) / 0.6)" : "rgb(var(--muted))"}
                      strokeWidth="2"
                      strokeDasharray="4 4"
                    />
                  ) : (
                    <>
                      <circle
                        r={R}
                        fill="none"
                        stroke="rgb(var(--info) / 0.18)"
                        strokeWidth="3.5"
                      />
                      <circle
                        r={R}
                        fill="none"
                        stroke={state === "ready" ? "rgb(var(--lagoon))" : "rgb(var(--info))"}
                        strokeWidth="3.5"
                        strokeLinecap="round"
                        strokeDasharray={`${(C * (state === "ready" ? 1 : Math.max(0.03, Math.min(1, share)))).toFixed(1)} ${C.toFixed(1)}`}
                      />
                    </>
                  )}
                </svg>
                <span
                  className={`flex h-9 w-9 items-center justify-center rounded-full bg-night-3 ${state === "ready" ? "shadow-[0_0_14px_rgb(var(--lagoon)/0.55)]" : ""}`}
                >
                  {output ? (
                    <GoodsMark code={output} size={24} />
                  ) : (
                    <span className="h-3 w-3 rotate-45 bg-gold-soft" />
                  )}
                </span>
                {b.level > 1 && (
                  <span className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-night-4 px-1 font-display text-xs font-bold text-cream ring-1 ring-night">
                    {b.level}
                  </span>
                )}
              </span>
              <span className="max-w-full truncate text-xs font-semibold text-cream">{name}</span>
              <span
                className={`max-w-full truncate text-xs tabular-nums ${state === "ready" ? "text-lagoon" : "text-cream-dim"}`}
              >
                {line}
              </span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}
