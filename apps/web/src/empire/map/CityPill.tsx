import { GoodsMark } from "../../art/goods.js";
import { fr } from "../../i18n.js";
import type { EmpirePayload } from "../types.js";
import { deliveryPlan } from "./logic.js";

/**
 * A town's orders over it on the 3D board (the refonte claire, 5 November 2026, after the « 10/3 »
 * nobody could read): a pill floating over the town, the mark of its best paid good, then its
 * orders as crates, one a crate (full when the stock covers it, hollow when not); in gold with
 * « Livrer », breathing slowly, when « Livrer » would go now. Always the same size on the screen,
 * its height over the town following the zoom.
 */
export function CityPill({ p, code }: { p: EmpirePayload; code: string }) {
  const at = p.view?.orders.find((x) => x.city === code);
  if (!at) return null;
  const n = at.orders.length;
  // A town served with nothing to ask: no pill (the gameplay audit, P2a).
  if (n === 0) return null;
  const plan = deliveryPlan(p, code);
  const ready = plan.vehicle !== null && plan.picks.length > 0;
  const covered = new Set(plan.orders.filter((x) => x.covered).map((x) => x.o.id));
  const sorted = [...at.orders].sort((a, b) =>
    BigInt(b.pay) > BigInt(a.pay) ? 1 : BigInt(b.pay) < BigInt(a.pay) ? -1 : 0,
  );
  const good = sorted[0]?.good;
  const shown = sorted.slice(0, 5);
  return (
    <span
      className={`city-pill pointer-events-auto absolute bottom-full left-1/2 flex items-center gap-1.5 whitespace-nowrap rounded-full py-1 pl-1 pr-2.5 ${
        ready ? "city-pill-ready gold-face" : "glass text-cream"
      }`}
      data-city-pill={code}
      data-ready={ready ? "" : undefined}
      aria-label={fr.empire.orders.pill(n, at.cap, ready)}
    >
      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-night-3/80">
        {good ? <GoodsMark code={good} size={18} /> : null}
      </span>
      <span className="flex items-center gap-[3px]" aria-hidden="true" data-crates={n}>
        {shown.map((o) => (
          <span
            key={o.id}
            className={`h-2.5 w-2.5 rounded-[2px] ${
              covered.has(o.id)
                ? ready
                  ? "bg-[rgb(var(--face-ink,var(--ink)))]"
                  : "bg-lagoon"
                : "border-[1.5px] border-current opacity-60"
            }`}
          />
        ))}
        {n > shown.length && (
          <span className="pl-0.5 font-display text-xs font-bold">+{n - shown.length}</span>
        )}
      </span>
      {ready && <span className="font-display text-xs font-bold">{fr.empire.best.deliver}</span>}
    </span>
  );
}
