import type { ReactNode } from "react";
import { fr } from "../i18n.js";
import { Big, Label, Sheet, Slab } from "../ui.js";
import type { GameProps } from "./Game.js";
import { d } from "./format.js";
import { harvestAndRestart } from "./harvest.js";
import type { Welcome as WelcomeData } from "./types.js";

function hoursAway(ms: number): string {
  const h = Math.round(ms / 3_600_000);
  if (h < 1) return `${Math.max(1, Math.round(ms / 60_000))} min`;
  return h >= 48 ? `${Math.round(h / 24)} jours` : `${h} h`;
}

/** One line of the report: a mark, what happened, in its colour. */
function Line({
  mark,
  tone = "text-cream",
  children,
}: { mark: string; tone?: string; children: ReactNode }) {
  return (
    <li className="flex items-center gap-2.5 rounded-lg bg-night-2/70 px-3 py-2 text-sm">
      <span className="w-5 text-center text-base leading-none">{mark}</span>
      <span className={tone}>{children}</span>
    </li>
  );
}

/** "While you were away": shown once when the player comes back after a while. */
export function Welcome(props: GameProps & { data: WelcomeData; onClose: () => void }) {
  const t = fr.game.welcome;
  const { data } = props;
  const income = Object.entries(data.income).filter(([, v]) => BigInt(v) > 0n);
  const total = income.reduce((s, [, v]) => s + BigInt(v), 0n);
  const notices = Object.entries(data.notices).filter(([, n]) => n > 0);
  return (
    <Sheet open onClose={props.onClose}>
      <div className="space-y-4">
        <div>
          <div className="flex flex-wrap items-baseline gap-x-2">
            <Label className="text-gold">{t.kicker}</Label>
            <span className="meta">{hoursAway(props.now - data.since)}</span>
          </div>
          <h3 className="mt-1 font-display text-2xl font-extrabold uppercase">{t.title}</h3>
        </div>
        {/* The week closed while away: its ceremony comes first. */}
        {data.week && (
          <section className="space-y-1 cut border border-gold/60 bg-gold/10 p-3">
            <p className="text-sm font-semibold text-gold">{t.week.title(data.week.week)}</p>
            <p className="font-display text-lg font-extrabold">
              {t.week.rank(
                data.week.rank,
                data.week.award ? (fr.game.week.awards[data.week.award] ?? null) : null,
              )}
            </p>
            <p className="text-sm text-cream-dim">{t.week.gain(d(data.week.gain))}</p>
            {data.week.award && <p className="text-sm text-gold">{t.week.award}</p>}
          </section>
        )}
        {data.slept && <p className="text-sm text-lagoon">{t.slept}</p>}
        {/* The commerce: what the counting house earned, by source. */}
        <section className="space-y-2 cut bg-night-3 p-3 ring-1 ring-inset ring-line">
          <div className="flex items-baseline justify-between">
            <Label>{t.commerce}</Label>
            <Big className="text-2xl text-lagoon">+{d(total)}</Big>
          </div>
          {income.length > 0 ||
          (data.road && data.road.arrived > 0) ||
          (data.fattore?.length ?? 0) > 0 ? (
            <ul className="space-y-1.5">
              {income.map(([reason, v]) => (
                <Line key={reason} mark="◎" tone="text-cream">
                  <span className="font-semibold text-gold">+{d(v)}</span>{" "}
                  {t.sources[reason] ?? reason}
                </Line>
              ))}
              {data.road && data.road.arrived > 0 && (
                <Line mark="➜">{t.road.arrived(data.road.arrived)}</Line>
              )}
              {data.fattore?.map((f) => (
                <Line key={f.id} mark="⚑" tone="text-cream-dim">
                  {t.fattore(
                    f.quantity,
                    props.names.resource(f.resource),
                    props.names.city(f.city),
                    f.paid !== null ? d(f.paid) : null,
                    f.commissionBps / 100,
                  )}
                </Line>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-cream-dim">{t.nothing}</p>
          )}
        </section>
        {/* The Terraferma: the land taken and lost, the fronts come home, where it stands. */}
        {data.terra && (
          <section className="space-y-2 cut bg-night-3 p-3 ring-1 ring-inset ring-line">
            <div className="flex items-baseline justify-between">
              <Label>{t.terra.title}</Label>
              <span className="font-display text-sm font-extrabold text-gold">
                {t.terra.glory(data.terra.glory, data.terra.rank)}
              </span>
            </div>
            <ul className="space-y-1.5">
              {data.terra.eliminated && (
                <Line mark="✕" tone="text-vermilion">
                  {t.terra.eliminated}
                </Line>
              )}
              {data.terra.gained > 0 && (
                <Line mark="▲" tone="text-lagoon">
                  {t.terra.gained(data.terra.gained)}
                </Line>
              )}
              {data.terra.lost > 0 && (
                <Line mark="▼" tone="text-vermilion">
                  {t.terra.lost(data.terra.lost)}
                </Line>
              )}
              {data.terra.fronts > 0 && (
                <Line mark="⚑">{t.terra.fronts(data.terra.fronts, data.terra.spent)}</Line>
              )}
              {!data.terra.eliminated && (
                <Line mark="⚔">
                  {t.terra.troops(
                    data.terra.troops,
                    data.terra.cap,
                    data.terra.perHour,
                    data.terra.cells,
                  )}
                </Line>
              )}
            </ul>
          </section>
        )}
        {notices.length > 0 && (
          <ul className="space-y-1 text-sm text-cream-dim">
            {notices.map(([kind, n]) => (
              <li key={kind}>· {t.notices(kind, n)}</li>
            ))}
          </ul>
        )}
        <Slab
          size="lg"
          className="w-full"
          disabled={props.busy}
          onClick={async () => {
            await harvestAndRestart(props);
            props.onClose();
          }}
        >
          {data.readyBatches > 0 ? t.collect(data.readyBatches) : t.restart}
        </Slab>
      </div>
    </Sheet>
  );
}
