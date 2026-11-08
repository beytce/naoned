import { useEffect, useState } from "react";
import { GoodsMark } from "../art/goods.js";
import { d } from "../game/format.js";
import { fr } from "../i18n.js";
import { Sheet, Slab } from "../ui.js";
import { Court } from "./Identity.js";
import { regionName } from "./World.js";
import { affordable, trendOf } from "./logic.js";
import type { EmpireAction, EmpirePayload } from "./types.js";

const t = fr.empire.market;
const goodName = (p: EmpirePayload, code: string) =>
  fr.themeNames.resource[code] ?? p.goods[code] ?? code;
const CONFIRM_MS = 4000;
/** A purchase that takes more than a quarter of the purse is confirmed. */
export const weighty = (cash: string, cost: string) => BigInt(cost) * 4n > BigInt(cash);
const ARROW = { up: "▲", down: "▼", flat: "=" } as const;
const TONE = { up: "text-lagoon", down: "text-vermilion", flat: "text-cream-dim" } as const;

/**
 * The Marché tab (lot C of the UX audit): each good of Venice, the store first, with its price
 * and how it stands against its rate; a touch opens the good to sell or deliver. Then the court,
 * and the colleganze. The vehicles are bought at the Remise only (1 November).
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
  act: (a: EmpireAction) => Promise<unknown>;
}) {
  const [post, setPost] = useState("home");
  // A purchase of more than a quarter of the purse asks a second touch (audit of 4 November,
  // UX B1): the first arms it for a few seconds, the second buys.
  const [armed, setArmed] = useState<string | null>(null);
  useEffect(() => {
    if (!armed) return;
    const id = setTimeout(() => setArmed(null), CONFIRM_MS);
    return () => clearTimeout(id);
  }, [armed]);
  if (!p.view) return null;
  const view = p.view;
  // The counter the purchases go to (the map that grows): its region's market, its own stock.
  const at = view.stores.find((x) => x.post === post) ?? view.stores[0];
  const region = at?.region ?? "veneto";
  const held = (good: string) => at?.goods[good] ?? 0;
  const nth = (i: number) =>
    view.stores.slice(1, i + 1).filter((x) => x.region === view.stores[i]?.region).length;
  // A stable order, the goods' own (the players' audit, P1-07): a line never moves under the
  // finger after a purchase changes its price or its stock.
  const order = Object.keys(p.goods);
  const quotes = p.market
    .filter((q) => q.region === region)
    .sort((a, b) => order.indexOf(a.good) - order.indexOf(b.good));
  return (
    <Sheet open={open} onClose={onClose} kicker={t.kicker} title={t.title} summary={t.summary}>
      {view.stores.length > 1 && (
        <div className="mb-3" data-market-posts>
          <p className="mb-1 text-xs text-cream-dim">{t.to}</p>
          <div className="flex flex-wrap gap-2">
            {view.stores.map((x, i) => (
              <button
                key={x.post}
                type="button"
                onClick={() => setPost(x.post)}
                aria-pressed={x.post === (at?.post ?? "home")}
                data-market-post={x.post}
                className={`min-h-9 rounded-full px-3 text-xs font-semibold transition active:scale-95 ${x.post === (at?.post ?? "home") ? "bg-info/10 text-cream ring-1 ring-info" : "text-cream-dim ring-1 ring-line"}`}
              >
                {x.post === "home" ? t.venice : t.post(regionName(x.region), nth(i))}
              </button>
            ))}
          </div>
        </div>
      )}
      {quotes.length === 0 ? (
        <p className="text-sm text-cream-dim">{t.none}</p>
      ) : (
        <ul data-market>
          {quotes.map((q) => {
            const n = held(q.good);
            const trend = trendOf(q);
            const ten = (BigInt(q.price) * 10n).toString();
            return (
              <li key={q.good} className="flex items-center gap-2 border-b border-line/60">
                <button
                  type="button"
                  onClick={() => onGood(q.good)}
                  data-market-good={q.good}
                  className="flex min-h-12 min-w-0 flex-1 items-center gap-3 py-2 text-left active:scale-[0.99]"
                >
                  <GoodsMark code={q.good} size={28} covered={n > 0} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm text-cream">{goodName(p, q.good)}</span>
                    <span className="block truncate text-xs text-cream-dim">
                      {n > 0 ? (post === "home" ? t.held(n) : t.heldAt(n)) : t.trend[trend]}
                    </span>
                  </span>
                  {/* The price and its arrow only: the good's name keeps its room at 320 px. */}
                  <span className="shrink-0 text-right">
                    <span className="block font-display font-bold tabular-nums text-cream">
                      {d(q.price)}
                    </span>
                    <span
                      className={`block text-xs ${TONE[trend]}`}
                      data-trend={trend}
                      title={t.trend[trend]}
                    >
                      {ARROW[trend]}
                    </span>
                  </span>
                </button>
                <span data-market-buy={q.good} data-confirm={armed === q.good || undefined}>
                  <Slab
                    size="sm"
                    tone="ghost"
                    busy={busy}
                    disabled={!affordable(p.cash, ten)}
                    className={armed === q.good ? "rounded-full ring-2 ring-vermilion" : ""}
                    onClick={() => {
                      if (armed !== q.good && weighty(p.cash, ten)) {
                        setArmed(q.good);
                        return;
                      }
                      setArmed(null);
                      void act({ type: "empireBuy", good: q.good, qty: 10, post: at?.post });
                    }}
                  >
                    {/* The verb above, the price below: the good's name keeps its room at 320 px. */}
                    <span className="flex flex-col items-center leading-tight">
                      <span>{armed === q.good ? t.confirm : t.buy(10)}</span>
                      <span className="text-xs font-semibold tabular-nums opacity-80">
                        {d(ten)}
                      </span>
                    </span>
                  </Slab>
                </span>
              </li>
            );
          })}
        </ul>
      )}
      <Court p={p} busy={busy} act={act} />
    </Sheet>
  );
}
