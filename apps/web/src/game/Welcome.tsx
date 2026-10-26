import type { ReactNode } from "react";
import { fr } from "../i18n.js";
import { Big, Label, Sheet, Slab } from "../ui.js";
import type { GameProps } from "./Game.js";
import { d, whole } from "./format.js";
import { harvestAndRestart } from "./harvest.js";
import type { Welcome as WelcomeData } from "./types.js";

function hoursAway(ms: number): string {
  const h = Math.round(ms / 3_600_000);
  if (h < 1) return `${Math.max(1, Math.round(ms / 60_000))} min`;
  return h >= 48 ? `${Math.round(h / 24)} jours` : `${h} h`;
}

/** The dot of a line, by its role (Lagune): a gain, a fact, a loss. */
const DOT = {
  gain: "bg-lagoon shadow-[0_0_8px_rgb(var(--lagoon))]",
  fact: "bg-info",
  loss: "bg-vermilion",
  quiet: "ring-2 ring-inset ring-info",
} as const;

/** One line of the report, on the thread of what happened: its dot, then what, in its colour. */
function Line({
  dot,
  tone = "text-cream",
  children,
}: { dot: keyof typeof DOT; tone?: string; children: ReactNode }) {
  return (
    <li className="flex items-center gap-3 py-1.5 text-sm">
      <span aria-hidden="true" className={`h-3 w-3 shrink-0 rounded-full ${DOT[dot]}`} />
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
        {/* Lagune: the place's name, the time away, and what came in, rising like the sun. */}
        <div className="flex flex-col items-center gap-1 text-center">
          <h3 className="text-balance px-12 font-place text-lg font-bold uppercase tracking-[0.2em] text-cream-dim">
            {t.title}
          </h3>
          <span className="meta">
            {t.kicker} {hoursAway(props.now - data.since)}
          </span>
          <Big className="mt-2 text-5xl text-gold [text-shadow:0_0_30px_rgb(var(--gold)/0.4)]">
            +{whole(total)}
          </Big>
          <Label className="text-cream-dim">{t.commerce}</Label>
        </div>
        {/* The week closed while away: its ceremony comes first. */}
        {data.week && (
          <section className="space-y-1 rounded-2xl bg-night-3 p-3 ring-1 ring-inset ring-gold/50">
            <p className="text-sm font-semibold text-gold">{t.week.title(data.week.week)}</p>
            <p className="font-display text-lg font-extrabold">
              {t.week.rank(
                data.week.rank,
                data.week.award ? (fr.game.week.awards[data.week.award] ?? null) : null,
              )}
            </p>
            <p className="text-sm text-cream-dim">{t.week.gain(whole(data.week.gain))}</p>
            {data.week.award && <p className="text-sm text-gold">{t.week.award}</p>}
          </section>
        )}
        {data.slept && <p className="text-sm text-lagoon">{t.slept}</p>}
        {/* The commerce: what the counting house earned, by source. */}
        <section className="space-y-1 rounded-2xl bg-night-3 p-3">
          {income.length > 0 ||
          (data.road && data.road.arrived > 0) ||
          (data.fattore?.length ?? 0) > 0 ? (
            <ul className="space-y-1.5">
              {income.map(([reason, v]) => (
                <Line key={reason} dot="gain" tone="text-cream">
                  <span className="font-semibold text-gold">+{whole(v)}</span>{" "}
                  {t.sources[reason] ?? reason}
                </Line>
              ))}
              {data.road && data.road.arrived > 0 && (
                <Line dot="gain">{t.road.arrived(data.road.arrived)}</Line>
              )}
              {data.fattore?.map((f) => (
                <Line key={f.id} dot="fact" tone="text-cream-dim">
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
          <section className="space-y-1 rounded-2xl bg-night-3 p-3">
            <div className="flex items-baseline justify-between">
              <Label>{t.terra.title}</Label>
              <span className="font-display text-sm font-extrabold text-gold">
                {t.terra.glory(data.terra.glory, data.terra.rank)}
              </span>
            </div>
            <ul className="space-y-1.5">
              {data.terra.eliminated && (
                <Line dot="loss" tone="text-vermilion">
                  {t.terra.eliminated}
                </Line>
              )}
              {data.terra.gained > 0 && (
                <Line dot="gain" tone="text-lagoon">
                  {t.terra.gained(data.terra.gained)}
                </Line>
              )}
              {data.terra.lost > 0 && (
                <Line dot="loss" tone="text-vermilion">
                  {t.terra.lost(data.terra.lost)}
                </Line>
              )}
              {data.terra.fronts > 0 && (
                <Line dot="fact">{t.terra.fronts(data.terra.fronts, data.terra.spent)}</Line>
              )}
              {!data.terra.eliminated && (
                <Line dot="quiet">
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
