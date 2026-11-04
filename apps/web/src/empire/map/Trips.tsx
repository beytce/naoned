import { CartWheel } from "../../art/plateau/coins.js";
import { fr } from "../../i18n.js";
import type { EmpireAction, EmpirePayload } from "../types.js";

const t = fr.empire;

/** Minutes and seconds left, « 4:05 ». */
const clock = (ms: number) => {
  const s = Math.max(0, Math.ceil(ms / 1_000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

/**
 * The vehicles on their way (decision of the owner, 3 November 2026: no medal on the map, a token
 * each under the house's name): where each goes, the time left; touched, the camera comes over it.
 * A few seconds after it left, its token offers to call it back.
 */
export function Trips({
  p,
  now,
  busy,
  act,
  onFocus,
}: {
  p: EmpirePayload;
  now: number;
  busy: boolean;
  act: (a: EmpireAction) => Promise<void>;
  onFocus: (vehicleId: string) => void;
}) {
  const view = p.view;
  if (!view) return null;
  const recallMs = (view.moves.recallSeconds ?? 0) * 1_000;
  const away = view.vehicles.mine.filter((v) => v.legs.some((l) => l.arrivesAt > now));
  if (away.length === 0) return null;
  return (
    <ul
      className="pointer-events-none absolute left-3 top-[calc(max(0.75rem,env(safe-area-inset-top))+3.75rem)] z-20 grid gap-1.5"
      data-trips
    >
      {away.map((v) => {
        const leg = v.legs.find((l) => l.arrivesAt > now) ?? v.legs[0];
        if (!leg) return null;
        const home = !leg.to.startsWith("city:");
        const city = leg.to.slice(5);
        const where = home ? t.trips.home : (t.cityNames[city] ?? city);
        const first = v.legs[0];
        const recall = first && !first.from.startsWith("city:") && now - first.departAt < recallMs;
        const name = t.vehicleNames[v.type] ?? v.type;
        return (
          <li key={v.id} className="pointer-events-auto flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => onFocus(v.id)}
              className="flex min-h-11 items-center gap-2 rounded-full bg-night/85 py-1 pl-1.5 pr-3 shadow-lg shadow-black/40 active:scale-95"
              data-trip={v.id}
              aria-label={t.trips.label(name, where, clock(leg.arrivesAt - now))}
            >
              <span className="h-8 w-8">
                <CartWheel />
              </span>
              <span className="text-xs leading-tight text-cream">
                <span className="block font-semibold">{home ? t.trips.back : where}</span>
                <span className="block tabular-nums text-cream-dim">
                  {clock(leg.arrivesAt - now)}
                </span>
              </span>
            </button>
            {recall && (
              <button
                type="button"
                disabled={busy}
                onClick={() => void act({ type: "empireRecall", vehicleId: v.id })}
                className="min-h-11 rounded-full border border-gold/70 bg-night/85 px-3 text-xs font-semibold text-gold shadow-lg shadow-black/40 active:scale-95"
                data-recall={v.id}
              >
                {t.orders.recall}
              </button>
            )}
          </li>
        );
      })}
    </ul>
  );
}
