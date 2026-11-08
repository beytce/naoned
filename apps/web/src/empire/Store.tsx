import { GoodsMark } from "../art/goods.js";
import { fr } from "../i18n.js";
import { Sheet } from "../ui.js";
import type { EmpirePayload } from "./types.js";

const t = () => fr.empire.store;
const goodName = (p: EmpirePayload, code: string) =>
  fr.themeNames.resource[code] ?? p.goods[code] ?? code;

/**
 * The Warehouse (the players' audit of 7 November 2026, P1 « no screen shows the stock »): every
 * good the Fondaco holds, its gauge on the cap (golden rule 3), what the next level asks of it, the
 * better pieces counted with it. A touch opens the good.
 */
export function StoreSheet({
  p,
  open,
  onClose,
  onGood,
}: {
  p: EmpirePayload;
  open: boolean;
  onClose: () => void;
  onGood: (good: string) => void;
}) {
  const view = p.view;
  if (!view) return null;
  const cap = view.storeCap ?? null;
  const need = view.nextCasa?.materials ?? {};
  const held = (g: string) =>
    (p.stock[g] ?? 0) + (p.stock[`${g}:fine`] ?? 0) + (p.stock[`${g}:exquisite`] ?? 0);
  const goods = [
    ...new Set([
      ...Object.keys(p.stock)
        .filter((g) => !g.includes(":"))
        .filter((g) => held(g) > 0),
      ...Object.keys(need),
    ]),
  ].sort((a, b) => Number(b in need) - Number(a in need) || held(b) - held(a));
  return (
    <Sheet
      open={open}
      onClose={onClose}
      kicker={t().kicker}
      title={t().title}
      summary={cap !== null ? t().cap(cap) : undefined}
    >
      {goods.length === 0 ? (
        <p className="text-sm text-cream-dim">{t().empty}</p>
      ) : (
        <ul className="space-y-2" data-store>
          {goods.map((g) => {
            const n = held(g);
            const share = cap ? Math.min(1, n / cap) : 0;
            const full = cap !== null && n >= cap;
            const want = need[g] ?? 0;
            return (
              <li key={g}>
                <button
                  type="button"
                  onClick={() => onGood(g)}
                  className="flex min-h-14 w-full items-center gap-3 rounded-2xl bg-night-4 px-3 py-2 text-left active:scale-[0.99]"
                  data-store-good={g}
                >
                  <GoodsMark code={g} size={28} />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline justify-between gap-2">
                      <span className="truncate font-display font-bold text-cream">
                        {goodName(p, g)}
                      </span>
                      <span
                        className={`shrink-0 text-sm font-bold tabular-nums ${full ? "text-vermilion" : "text-cream"}`}
                      >
                        {cap !== null ? `${n} / ${cap}` : n}
                      </span>
                    </span>
                    {cap !== null && (
                      <span className="mt-1.5 block h-1.5 overflow-hidden rounded-full bg-line">
                        <span
                          className={`block h-full rounded-full ${full ? "bg-vermilion" : "bg-cream"}`}
                          style={{ width: `${(share * 100).toFixed(1)}%` }}
                        />
                      </span>
                    )}
                    <span className="mt-1 block text-xs text-cream-dim">
                      {full
                        ? t().full
                        : want > 0
                          ? t().forLevel(want, view.nextCasa?.level ?? 0)
                          : ""}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </Sheet>
  );
}
