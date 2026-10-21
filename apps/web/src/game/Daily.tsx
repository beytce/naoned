import { ResourceIcon } from "../art/resources.js";
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
  return (
    <Panel glow={ready ? "gold" : undefined}>
      {/* On a narrow phone the streak goes under the kicker, whole, rather than both cut in two. */}
      <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-1">
        <Label className="whitespace-nowrap text-gold">{t.title}</Label>
        <span className="meta whitespace-nowrap text-lagoon">{t.streak(daily.streak)}</span>
      </div>
      <ul className="mt-3 space-y-2">
        {daily.tasks.map((task) => (
          <li key={task.id} className="flex items-center gap-3">
            <span
              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${task.claimed ? "bg-lagoon text-on-lagoon" : task.done ? "bg-gold text-ink" : "bg-night-4 text-cream-dim ring-1 ring-inset ring-line"}`}
            >
              {task.claimed ? "✓" : `${task.progress}/${task.count}`.replace(/^(\d)\/1$/, "$1")}
            </span>
            <div className="min-w-0 flex-1">
              <p
                className={`text-sm [overflow-wrap:anywhere] ${task.claimed ? "text-cream-dim line-through" : ""}`}
              >
                {t.tasks[task.id] ?? task.id}
              </p>
              <span className="inline-flex flex-wrap items-center gap-2 text-xs text-cream-dim">
                {Object.entries(task.reward.goods).map(([r, q]) => (
                  <span key={r} className="inline-flex items-center gap-1">
                    <ResourceIcon code={r} size={16} />
                    {q}
                  </span>
                ))}
                {BigInt(task.reward.ducats) > 0n && (
                  <span className="text-gold">{d(task.reward.ducats)}</span>
                )}
              </span>
            </div>
            {!task.done && !task.claimed && spend && (
              // A short sign, the whole action read aloud: the task's words keep the room.
              <Slab
                size="sm"
                tone="ghost"
                className="shrink-0"
                label={fr.game.house.spend.reroll(spend.dailyReroll)}
                disabled={props.busy || (props.influence ?? 0) < spend.dailyReroll}
                onClick={() => props.spend({ use: "daily", taskId: task.id })}
              >
                {fr.game.house.spend.rerollShort(spend.dailyReroll)}
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
