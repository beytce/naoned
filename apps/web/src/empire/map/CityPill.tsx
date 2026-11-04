import { GoodsMark } from "../../art/goods.js";
import { fr } from "../../i18n.js";
import type { EmpirePayload } from "../types.js";
import { deliveryPlan } from "./logic.js";

const R = 11;
const ROUND = 2 * Math.PI * R;

/**
 * A town's orders over it on the 3D board (decision of the owner, 4 November 2026: clear, modern,
 * in place of the crates and the beams): a pill floating over the town, its arc filling with its
 * orders, the mark of its best paid good, « 2/3 »; in gold, breathing slowly, when « Livrer » would
 * go now. Always the same size on the screen, its height over the town following the zoom.
 */
export function CityPill({ p, code }: { p: EmpirePayload; code: string }) {
  const at = p.view?.orders.find((x) => x.city === code);
  if (!at) return null;
  const n = at.orders.length;
  const plan = deliveryPlan(p, code);
  const ready = plan.vehicle !== null;
  const full = n >= at.cap;
  const good = [...at.orders].sort((a, b) =>
    BigInt(b.pay) > BigInt(a.pay) ? 1 : BigInt(b.pay) < BigInt(a.pay) ? -1 : 0,
  )[0]?.good;
  const share = at.cap > 0 ? Math.min(1, n / at.cap) : 0;
  return (
    <span
      className={`city-pill pointer-events-auto absolute bottom-full left-1/2 flex items-center gap-1.5 whitespace-nowrap rounded-full py-1 pl-1 pr-2.5 shadow-lg shadow-black/50 ${
        ready ? "city-pill-ready bg-gold text-ink" : "bg-night/90 text-cream ring-1 ring-line"
      }`}
      data-city-pill={code}
      data-ready={ready ? "" : undefined}
      aria-label={fr.empire.orders.pill(n, at.cap, ready)}
    >
      <span className="relative flex h-7 w-7 items-center justify-center">
        <svg viewBox="0 0 28 28" className="absolute inset-0 -rotate-90" aria-hidden="true">
          <circle
            cx="14"
            cy="14"
            r={R}
            fill="none"
            stroke={ready ? "rgb(0 0 0 / 0.18)" : "rgb(var(--line))"}
            strokeWidth="3"
          />
          <circle
            cx="14"
            cy="14"
            r={R}
            fill="none"
            stroke={ready ? "#1B2A44" : full ? "rgb(var(--lagoon))" : "rgb(var(--lagoon) / 0.85)"}
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray={`${(ROUND * share).toFixed(1)} ${ROUND.toFixed(1)}`}
          />
        </svg>
        {good ? <GoodsMark code={good} size={16} /> : null}
      </span>
      <span className="font-display text-xs font-bold tabular-nums">
        {n}/{at.cap}
      </span>
    </span>
  );
}
