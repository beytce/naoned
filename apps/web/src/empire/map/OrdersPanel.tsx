import { GoodsMark } from "../../art/goods.js";
import { d, hourOf } from "../../game/format.js";
import { fr } from "../../i18n.js";
import { CloseButton, Slab } from "../../ui.js";
import { regionName } from "../World.js";
import type { EmpirePayload } from "../types.js";

const t = fr.empire.orders;
const goodName = (p: EmpirePayload, code: string) =>
  fr.themeNames.resource[code] ?? p.goods[code] ?? code;

/**
 * A city touched (after Hades' Star's planets, 1 November 2026), at the foot of the map: its open
 * orders by good, how full it is of waves, when the next comes; « Y envoyer un véhicule » sends the
 * vehicle chosen (or the first free one) there, as a drag would.
 */
export function OrdersPanel({
  p,
  busy,
  city,
  onSend,
  onClose,
}: {
  p: EmpirePayload;
  busy: boolean;
  city: string;
  /** Sends a vehicle there; absent when none may go. */
  onSend?: () => void;
  onClose: () => void;
}) {
  const view = p.view;
  if (!view) return null;
  const at = view.orders.find((x) => x.city === city);
  const name = fr.empire.cityNames[city] ?? city;
  // The cap of the waves, as the ring reckons it (six in Venice's world).
  const max = at && at.fillBps > 0 ? Math.round((at.waves * 10_000) / at.fillBps) : 6;
  const open = (at?.orders ?? []).filter((o) => o.filled < o.qty);
  return (
    <section
      className="pointer-events-auto w-full border-t border-line bg-night-2 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 shadow-xl shadow-black/50 lg:mb-4 lg:w-[30rem] lg:rounded-2xl lg:border"
      data-orders-panel={city}
    >
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <h3 className="font-place text-sm font-bold uppercase tracking-[0.12em] text-cream">
            {name}
          </h3>
          <p className="text-xs text-cream-dim">
            {at ? t.cityLine(regionName(at.region), at.size, at.waves, max) : t.outOfReach}
          </p>
        </div>
        <CloseButton onClick={onClose} />
      </div>
      {at && (
        <>
          {open.length === 0 ? (
            <p className="mt-2 text-sm text-cream-dim">{t.none}</p>
          ) : (
            <ul className="mt-2 space-y-1.5" data-city-orders={city}>
              {open.map((o) => (
                <li
                  key={o.good}
                  className="flex items-center gap-2 text-sm text-cream"
                  data-order={`${city}:${o.good}`}
                >
                  <GoodsMark code={o.good} size={22} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate">{goodName(p, o.good)}</span>
                    <span className="block text-xs text-cream-dim">
                      {t.filled(o.filled, o.qty)} · {t.unit(d(o.unit))}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-2 text-xs text-cream-dim" data-renews>
            {at.fillBps >= 10_000 ? t.full : t.renews(hourOf(at.renewsAt))}
          </p>
          {onSend && open.length > 0 && (
            <div className="mt-2" data-send-here>
              <Slab size="md" tone="gold" className="w-full" busy={busy} onClick={onSend}>
                {t.send}
              </Slab>
            </div>
          )}
        </>
      )}
    </section>
  );
}
