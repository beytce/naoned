import { GoodsMark } from "../../art/goods.js";
import { whole } from "../../game/format.js";
import { fr } from "../../i18n.js";
import type { EmpirePayload } from "../types.js";
import { deliveryPlan } from "./logic.js";

const t = fr.empire.milestones;

/** The three milestones of a house past its tutorial (pure, tested): what to aim at next. */
export function milestonesOf(p: EmpirePayload) {
  const view = p.view;
  if (!view) return null;
  // The next Casa: its share of the purse.
  const next = view.nextCasa;
  const casa = next
    ? {
        level: view.house.casa + 1,
        share: Math.min(1, Number((BigInt(p.cash) * 1000n) / BigInt(next.cost || "1")) / 1000),
      }
    : null;
  // The best order: one « Livrer » would send now first, else the best paid of all.
  let order: { city: string; good: string; pay: string; ready: boolean } | null = null;
  for (const at of view.orders) {
    const plan = deliveryPlan(p, at.city);
    for (const o of at.orders) {
      const ready = plan.picks.includes(o.id);
      if (
        !order ||
        (ready && !order.ready) ||
        (ready === order.ready && BigInt(o.pay) > BigInt(order.pay))
      )
        order = { city: at.city, good: o.good, pay: o.pay, ready };
    }
  }
  // The Carnet's nearest objective not yet claimed.
  const goals = [...view.carnet.objectives, ...view.carnet.carried].filter((o) => !o.claimed);
  const goal =
    goals.sort(
      (a, b) => b.progress / Math.max(1, b.target) - a.progress / Math.max(1, a.target),
    )[0] ?? null;
  const done = view.carnet.objectives.filter((o) => o.progress >= o.target).length;
  return {
    casa,
    order,
    carnet: goal
      ? {
          kind: goal.kind,
          target: goal.target,
          share: Math.min(1, goal.progress / Math.max(1, goal.target)),
          done,
          of: view.carnet.objectives.length,
        }
      : null,
  };
}

/**
 * Past the tutorial (Casa 2 on, audit of 4 November, UX B2): the three milestones always in sight
 * at the map's foot, the next Casa, the best order, the Carnet's nearest goal. Each opens its place
 * at a touch; none plays for the player (no gold: decision of the owner).
 */
export function Milestones({
  p,
  onCasa,
  onCity,
  onCarnet,
}: {
  p: EmpirePayload;
  onCasa: () => void;
  onCity: (city: string) => void;
  onCarnet: () => void;
}) {
  const m = milestonesOf(p);
  if (!m) return null;
  return (
    <nav
      className="pointer-events-auto flex w-full max-w-md gap-1.5 px-3 pb-2"
      aria-label={t.label}
      data-milestones
    >
      {m.casa && (
        <Chip onClick={onCasa} share={m.casa.share} id="casa" label={t.casa(m.casa.level)}>
          <span className="font-display text-sm font-extrabold">{m.casa.level}</span>
        </Chip>
      )}
      {m.order && (
        <Chip
          onClick={() => m.order && onCity(m.order.city)}
          share={m.order.ready ? 1 : 0}
          id="order"
          ready={m.order.ready}
          label={t.order(fr.empire.cityNames[m.order.city] ?? m.order.city, whole(m.order.pay))}
        >
          <GoodsMark code={m.order.good} size={18} />
        </Chip>
      )}
      {m.carnet && (
        <Chip
          onClick={onCarnet}
          share={m.carnet.share}
          id="carnet"
          label={t.carnet(m.carnet.done, m.carnet.of)}
        >
          <span className="font-display text-xs font-extrabold tabular-nums">
            {m.carnet.done}/{m.carnet.of}
          </span>
        </Chip>
      )}
    </nav>
  );
}

const R = 15;
const ROUND = 2 * Math.PI * R;

function Chip({
  id,
  label,
  share,
  ready = false,
  onClick,
  children,
}: {
  id: string;
  label: string;
  share: number;
  ready?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      data-milestone={id}
      className="flex min-h-11 min-w-0 flex-1 items-center gap-2 rounded-full bg-night/90 py-1 pl-1 pr-3 text-left shadow-lg shadow-black/40 ring-1 ring-line backdrop-blur active:scale-95"
    >
      <span className="relative flex h-9 w-9 shrink-0 items-center justify-center text-cream">
        <svg viewBox="0 0 36 36" className="absolute inset-0 -rotate-90" aria-hidden="true">
          <circle cx="18" cy="18" r={R} fill="none" stroke="rgb(var(--line))" strokeWidth="2.5" />
          <circle
            cx="18"
            cy="18"
            r={R}
            fill="none"
            stroke={ready ? "rgb(var(--lagoon))" : "rgb(var(--info))"}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeDasharray={`${(ROUND * share).toFixed(1)} ${ROUND.toFixed(1)}`}
          />
        </svg>
        <span className="relative">{children}</span>
      </span>
      <span className="min-w-0 truncate text-xs font-semibold leading-tight text-cream">
        {label}
      </span>
    </button>
  );
}
