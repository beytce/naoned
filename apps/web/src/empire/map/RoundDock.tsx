import { d } from "../../game/format.js";
import { fr } from "../../i18n.js";
import { Slab } from "../../ui.js";
import type { EmpirePayload } from "../types.js";
import type { RoundDraft } from "./RoundDraw.js";
import { planRound } from "./round.js";

const t = fr.empire.round;

/**
 * A round waiting (the finger lifted on a town, the gameplay audit P1): its towns in order with
 * their crates, what it pays, « Partir » in gold, and how to add a town (drag again from the
 * vehicle). Never a list to tick: the round is drawn on the map.
 */
export function RoundDock({
  p,
  round,
  busy,
  onGo,
  onCancel,
}: {
  p: EmpirePayload;
  round: RoundDraft;
  busy: boolean;
  onGo: () => void;
  onCancel: () => void;
}) {
  const plan = planRound(p, round.vehicleId, round.cities);
  const vehicle = plan.vehicle;
  const crates = plan.stops.reduce((n, s) => n + s.orderIds.length, 0);
  return (
    <section
      className="glass-thick pointer-events-auto mx-3 mb-2 flex w-[calc(100%-1.5rem)] max-w-md flex-col gap-2.5 rounded-[1.75rem] p-3"
      data-round-dock={round.cities.join(",")}
    >
      <div className="flex items-baseline justify-between gap-2">
        <span className="font-place text-lg font-black leading-tight text-cream">{t.title}</span>
        <span className="text-xs text-cream-dim">
          {vehicle ? (fr.empire.vehicleNames[vehicle.type] ?? vehicle.type) : ""} ·{" "}
          {t.crates(crates)}
        </span>
      </div>
      <ol className="flex flex-wrap items-center gap-1.5" data-round-stops>
        {plan.stops.map((s, i) => (
          <li
            key={s.city}
            className="glass-chip flex items-center gap-1.5 rounded-full py-1 pl-1 pr-2.5 text-xs font-semibold"
          >
            <span className="gold-face flex h-5 w-5 items-center justify-center rounded-full font-display text-[0.6875rem] font-extrabold">
              {i + 1}
            </span>
            {fr.empire.cityNames[s.city] ?? s.city}
            <span className="tabular-nums text-cream-dim">×{s.orderIds.length}</span>
          </li>
        ))}
      </ol>
      <p className="text-xs text-cream-dim">{plan.room > 0 ? t.more : t.full}</p>
      <div className="flex gap-2">
        <Slab tone="ghost" size="md" onClick={onCancel}>
          {t.cancel}
        </Slab>
        <Slab
          tone="gold"
          size="md"
          className="flex-1"
          busy={busy}
          disabled={plan.stops.length === 0}
          onClick={onGo}
        >
          {t.go(d(plan.pay.toString()))}
        </Slab>
      </div>
    </section>
  );
}
