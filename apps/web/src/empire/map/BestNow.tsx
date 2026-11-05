import { d } from "../../game/format.js";
import { fr } from "../../i18n.js";
import { Slab } from "../../ui.js";
import type { EmpirePayload } from "../types.js";
import { deliveryPlan } from "./logic.js";

const t = fr.empire.best;

/** What the card says (pure, tested): a town to deliver now, the best order, or the next Casa. */
export type BestNow =
  | {
      kind: "deliver";
      city: string;
      crates: number;
      pay: bigint;
      picks: string[];
      vehicle: string;
    }
  | { kind: "order"; city: string; crates: number; pay: bigint }
  | { kind: "casa"; level: number; share: number }
  | null;

/**
 * The one thing best done now (the refonte claire, 5 November 2026), in place of Lorenzo past the
 * tutorial, the three milestones and the Carnet's pill: the town whose « Livrer » pays most right
 * now; else the town of the best order (to see what it lacks); else the way to the next Casa.
 */
export function bestNowOf(p: EmpirePayload): BestNow {
  const view = p.view;
  if (!view) return null;
  let ready: Extract<BestNow, { kind: "deliver" }> | null = null;
  let order: Extract<BestNow, { kind: "order" }> | null = null;
  for (const at of view.orders) {
    if (at.orders.length === 0) continue;
    const plan = deliveryPlan(p, at.city);
    if (plan.vehicle && plan.picks.length > 0 && (!ready || plan.pay > ready.pay))
      ready = {
        kind: "deliver",
        city: at.city,
        crates: plan.picks.length,
        pay: plan.pay,
        picks: plan.picks,
        vehicle: plan.vehicle.id,
      };
    const all = at.orders.reduce((n, o) => n + BigInt(o.pay), 0n);
    if (!order || all > order.pay)
      order = { kind: "order", city: at.city, crates: at.orders.length, pay: all };
  }
  if (ready) return ready;
  if (order) return order;
  const next = view.nextCasa;
  if (!next) return null;
  return {
    kind: "casa",
    level: view.house.casa + 1,
    share: Math.min(1, Number((BigInt(p.cash) * 1000n) / BigInt(next.cost || "1")) / 1000),
  };
}

/** The card itself: crates (or the Casa's ring), what and how much, one action. */
export function BestNowCard({
  p,
  busy,
  onCity,
  onCasa,
  onDeliver,
  drawn = false,
}: {
  p: EmpirePayload;
  busy: boolean;
  /** The round is drawn by finger (the 3D board): the card says the gesture, « Livrer » a ghost. */
  drawn?: boolean;
  onCity: (city: string) => void;
  onCasa: () => void;
  onDeliver: (city: string, orderIds: string[], vehicleId: string) => void;
}) {
  const best = bestNowOf(p);
  if (!best) return null;
  const cityName = (code: string) => fr.empire.cityNames[code] ?? code;
  const open = () => (best.kind === "casa" ? onCasa() : onCity(best.city));
  return (
    <div className="pointer-events-auto w-full max-w-md px-3 pb-2">
      <div
        className="glass-thick flex items-center gap-3 rounded-[1.5rem] p-2.5 pl-3"
        data-best-now={best.kind}
      >
        <button
          type="button"
          onClick={open}
          className="flex min-h-12 min-w-0 flex-1 items-center gap-3 text-left active:scale-[0.98]"
        >
          {best.kind === "casa" ? (
            <CasaRing level={best.level} share={best.share} />
          ) : (
            <Crates n={best.crates} gold={best.kind === "deliver"} />
          )}
          <span className="flex min-w-0 flex-col">
            <span className="truncate text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-cream-dim">
              {best.kind === "deliver" ? t.ready : best.kind === "order" ? t.waiting : t.casa}
            </span>
            {best.kind === "deliver" && drawn && (
              <span className="truncate text-xs font-semibold text-gold" data-best-hint>
                {fr.empire.round.hint(vehicleName(p, best.vehicle), cityName(best.city))}
              </span>
            )}
            <span className="truncate text-[0.9375rem] font-bold leading-tight text-cream">
              {best.kind === "casa"
                ? t.casaTo(best.level)
                : t.crates(cityName(best.city), best.crates)}
            </span>
            {best.kind !== "casa" && (
              <span className="font-display text-sm font-extrabold tabular-nums text-gold">
                + {d(best.pay.toString())}
              </span>
            )}
          </span>
        </button>
        {best.kind === "deliver" ? (
          <Slab
            tone={drawn ? "ghost" : "gold"}
            size="md"
            busy={busy}
            lead
            onClick={() => onDeliver(best.city, best.picks, best.vehicle)}
          >
            {t.deliver}
          </Slab>
        ) : (
          <Slab tone="ghost" size="md" onClick={open}>
            {t.see}
          </Slab>
        )}
      </div>
    </div>
  );
}

const vehicleName = (p: EmpirePayload, id: string) => {
  const v = p.view?.vehicles.mine.find((x) => x.id === id);
  return v ? (fr.empire.vehicleNames[v.type] ?? v.type) : "";
};

/** A town's orders as crates, two by two (at most six shown). */
function Crates({ n, gold }: { n: number; gold: boolean }) {
  const shown = Math.min(6, Math.max(1, n));
  return (
    <span
      className="grid h-12 w-12 shrink-0 grid-cols-2 content-center justify-items-center gap-1 rounded-xl bg-night-2 p-2 ring-1 ring-inset ring-line"
      aria-hidden="true"
    >
      {Array.from({ length: shown }, (_, i) => (
        <span
          // biome-ignore lint/suspicious/noArrayIndexKey: crates alike
          key={i}
          className={`h-3 w-3 rounded-[3px] ${gold ? "bg-gold" : "bg-lagoon"}`}
        />
      ))}
    </span>
  );
}

const R = 20;
const ROUND = 2 * Math.PI * R;

function CasaRing({ level, share }: { level: number; share: number }) {
  return (
    <span
      className="relative flex h-12 w-12 shrink-0 items-center justify-center"
      aria-hidden="true"
    >
      <svg viewBox="0 0 48 48" className="absolute inset-0 -rotate-90" aria-hidden="true">
        <circle cx="24" cy="24" r={R} fill="none" stroke="rgb(var(--line))" strokeWidth="3" />
        <circle
          cx="24"
          cy="24"
          r={R}
          fill="none"
          stroke="rgb(var(--gold))"
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={`${(ROUND * share).toFixed(1)} ${ROUND.toFixed(1)}`}
        />
      </svg>
      <span className="font-display text-base font-extrabold text-cream">{level}</span>
    </span>
  );
}
