import { fr } from "../i18n.js";
import { Big, Label, Sheet, Slab } from "../ui.js";
import type { GameProps } from "./Game.js";
import { d } from "./format.js";
import type { Welcome as WelcomeData } from "./types.js";

function hoursAway(ms: number): string {
  const h = Math.round(ms / 3_600_000);
  return h >= 48 ? `${Math.round(h / 24)} jours` : `${h} h`;
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
          <Label className="text-gold">{t.kicker(hoursAway(props.now - data.since))}</Label>
          <h3 className="mt-1 font-display text-2xl font-extrabold uppercase">{t.title}</h3>
        </div>
        {data.slept && <p className="text-sm text-lagoon">{t.slept}</p>}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-night-3 p-3 ring-1 ring-inset ring-line">
            <Label>{t.earned}</Label>
            <Big className="mt-1 text-2xl text-lagoon">+{d(total)}</Big>
          </div>
          <div className="rounded-xl bg-night-3 p-3 ring-1 ring-inset ring-line">
            <Label>{t.upkeep}</Label>
            <Big className="mt-1 text-2xl text-vermilion">−{d(data.upkeep)}</Big>
          </div>
        </div>
        {income.length > 0 && (
          <ul className="space-y-1 text-sm">
            {income.map(([reason, v]) => (
              <li key={reason} className="flex justify-between">
                <span className="text-cream-dim">{t.sources[reason] ?? reason}</span>
                <span className="font-semibold">+{d(v)}</span>
              </li>
            ))}
          </ul>
        )}
        {data.road && data.road.arrived > 0 && (
          <ul className="space-y-1 text-sm">
            <li>· {t.road.arrived(data.road.arrived)}</li>
          </ul>
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
            await props.act({ type: "collectAndRestart" });
            props.onClose();
          }}
        >
          {data.readyBatches > 0 ? t.collect(data.readyBatches) : t.restart}
        </Slab>
      </div>
    </Sheet>
  );
}
