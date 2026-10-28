import { GoodsMark } from "../art/goods.js";
import { fr } from "../i18n.js";
import { Label, Panel, Slab, clock } from "../ui.js";
import type { GameProps } from "./Game.js";
import { d } from "./format.js";

/** Tasks of the day, the streak and the day's chest: a reason to come back every day. */
export function Daily(props: GameProps) {
  const t = fr.game.daily;
  const daily = props.view.daily;
  if (!daily || daily.tasks.length === 0) return null;
  const spend = props.view.houseSpend;
  const ready = daily.tasks.some((task) => task.done && !task.claimed);
  // The notary's son swaps one a day for free (R4).
  const free = (props.view.dynasty?.free.dailyRerolls ?? 0) > 0;
  const canReroll = !!spend && (free || (props.influence ?? 0) >= spend.dailyReroll);
  return (
    <Panel glow={ready ? "lagoon" : undefined}>
      {/* On a narrow phone the streak goes under the kicker, whole, rather than both cut in two. */}
      <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-1">
        <Label className="whitespace-nowrap text-gold">{t.title}</Label>
        <span className="meta whitespace-nowrap text-lagoon">
          {t.streak(daily.streak)}
          {daily.streak > 0 && daily.graceLeft > 0 ? ` · ${t.grace}` : ""}
        </span>
      </div>
      <ul className="mt-3 space-y-2">
        {daily.tasks.map((task) => (
          <li key={task.id} className="flex flex-wrap items-center gap-x-3 gap-y-1">
            {/* Lagune: the task as a small ring, its arc the progress, full and lagoon once done. */}
            <span className="relative flex h-11 w-11 shrink-0 items-center justify-center">
              <svg
                viewBox="-24 -24 48 48"
                className="absolute inset-0 -rotate-90"
                aria-hidden="true"
              >
                <circle r="19" fill="none" stroke="rgb(var(--night-4))" strokeWidth="3.5" />
                <circle
                  r="19"
                  fill="none"
                  stroke={task.done || task.claimed ? "rgb(var(--lagoon))" : "rgb(var(--info))"}
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  strokeDasharray={`${(119.4 * Math.max(0.02, task.claimed || task.done ? 1 : task.progress / Math.max(1, task.count))).toFixed(1)} 119.4`}
                />
              </svg>
              <span
                className={`relative font-display text-xs font-bold tabular-nums ${task.done || task.claimed ? "text-lagoon" : "text-cream"}`}
              >
                {task.claimed ? "✓" : `${task.progress}/${task.count}`.replace(/^(\d)\/1$/, "$1")}
              </span>
            </span>
            <div className="min-w-[9rem] flex-1">
              <p
                className={`text-sm [overflow-wrap:anywhere] ${task.claimed ? "text-cream-dim line-through" : ""}`}
              >
                {t.tasks[task.id] ?? task.id}
              </p>
              <span className="inline-flex flex-wrap items-center gap-2 text-xs text-cream-dim">
                {Object.entries(task.reward.goods).map(([r, q]) => (
                  <span key={r} className="inline-flex items-center gap-1">
                    <GoodsMark code={r} size={16} />
                    {q}
                  </span>
                ))}
                {BigInt(task.reward.ducats) > 0n && (
                  <span className="text-gold">{d(task.reward.ducats)}</span>
                )}
              </span>
            </div>
            {!task.done && !task.claimed && spend && canReroll && (
              // A short word, the whole action read aloud: the task's words keep the room.
              <Slab
                size="sm"
                tone="ghost"
                className="shrink-0"
                label={
                  free ? fr.game.dynasty.freeReroll : fr.game.house.spend.reroll(spend.dailyReroll)
                }
                disabled={props.busy}
                onClick={() => props.spend({ use: "daily", taskId: task.id })}
              >
                {free
                  ? fr.game.dynasty.freeShort
                  : fr.game.house.spend.rerollShort(spend.dailyReroll)}
              </Slab>
            )}
            {task.done && !task.claimed && (
              <Slab
                size="sm"
                className="shrink-0"
                disabled={props.busy}
                onClick={() => props.act({ type: "claimDaily", taskId: task.id })}
              >
                {t.claim}
              </Slab>
            )}
          </li>
        ))}
      </ul>
      {/* Without the Influence, no wall of greyed buttons: one line says what a change costs. */}
      {spend && !canReroll && daily.tasks.some((task) => !task.done && !task.claimed) && (
        <p className="meta mt-2">
          {fr.game.house.spend.rerollCost(spend.dailyReroll, props.influence ?? 0)}
        </p>
      )}
      <div className="mt-3 flex items-center justify-between gap-3 cut bg-night-2 px-3 py-2.5 ring-1 ring-inset ring-line/70">
        <div className="min-w-0">
          <p className="text-xs text-cream-dim">{t.chest}</p>
          <p className="text-xs text-muted">{daily.chestClaimed ? t.chestOpen : t.chestHint}</p>
        </div>
        <span
          className={`font-display text-base font-extrabold tabular-nums ${daily.chestClaimed ? "text-muted" : "text-gold"}`}
        >
          {d(daily.chest)}
        </span>
      </div>
      <p className="meta mt-2">{t.resetsIn(clock(daily.resetsAt - props.now))}</p>
    </Panel>
  );
}
