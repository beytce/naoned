import { GoodsMark } from "../art/goods.js";
import { d } from "../game/format.js";
import { fr } from "../i18n.js";
import { Sheet } from "../ui.js";
import { Court } from "./Identity.js";
import { Colleganze } from "./Sea.js";
import { Charroi } from "./World.js";
import { trendOf } from "./logic.js";
import type { EmpireAction, EmpirePayload } from "./types.js";

const t = fr.empire.market;
const goodName = (p: EmpirePayload, code: string) =>
  fr.themeNames.resource[code] ?? p.goods[code] ?? code;
const ARROW = { up: "▲", down: "▼", flat: "=" } as const;
const TONE = { up: "text-lagoon", down: "text-vermilion", flat: "text-cream-dim" } as const;

/**
 * The Marché tab (lot C of the UX audit): each good of Venice, the store first, with its price
 * and how it stands against its rate; a touch opens the good to sell or deliver. Then the court,
 * the carts of the Charroi and the colleganze: what is bought and sold, in one place.
 */
export function MarketSheet({
  p,
  now,
  open,
  busy,
  onClose,
  onGood,
  act,
}: {
  p: EmpirePayload;
  now: number;
  open: boolean;
  busy: boolean;
  onClose: () => void;
  onGood: (good: string) => void;
  act: (a: EmpireAction) => Promise<void>;
}) {
  if (!p.view) return null;
  const quotes = p.market
    .filter((q) => q.region === "veneto")
    .sort(
      (a, b) =>
        Number((p.stock[b.good] ?? 0) > 0) - Number((p.stock[a.good] ?? 0) > 0) ||
        Number(BigInt(b.price) - BigInt(a.price)),
    );
  return (
    <Sheet
      open={open}
      onClose={onClose}
      docked
      kicker={t.kicker}
      title={t.title}
      summary={t.summary}
    >
      {quotes.length === 0 ? (
        <p className="text-sm text-cream-dim">{t.none}</p>
      ) : (
        <ul data-market>
          {quotes.map((q) => {
            const held = p.stock[q.good] ?? 0;
            const trend = trendOf(q);
            return (
              <li key={q.good} className="border-b border-line/60">
                <button
                  type="button"
                  onClick={() => onGood(q.good)}
                  data-market-good={q.good}
                  className="flex min-h-12 w-full items-center gap-3 py-2 text-left active:scale-[0.99]"
                >
                  <GoodsMark code={q.good} size={28} covered={held > 0} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm text-cream">{goodName(p, q.good)}</span>
                    <span className="block text-xs text-cream-dim">
                      {held > 0 ? t.held(held) : " "}
                    </span>
                  </span>
                  <span className="text-right">
                    <span className="block font-display font-bold tabular-nums text-cream">
                      {d(q.price)}
                    </span>
                    <span className={`block text-xs ${TONE[trend]}`} data-trend={trend}>
                      {ARROW[trend]} {t.trend[trend]}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
      <Court p={p} busy={busy} act={act} />
      <Charroi p={p} now={now} busy={busy} act={act} />
      <Colleganze p={p} busy={busy} act={act} />
    </Sheet>
  );
}
