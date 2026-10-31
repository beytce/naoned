import { useState } from "react";
import { GoodsMark } from "../art/goods.js";
import { d } from "../game/format.js";
import { fr } from "../i18n.js";
import { Sheet, Slab } from "../ui.js";
import { Court } from "./Identity.js";
import { Colleganze } from "./Sea.js";
import { Charroi, regionName } from "./World.js";
import { affordable, trendOf } from "./logic.js";
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
  const [post, setPost] = useState("home");
  if (!p.view) return null;
  const view = p.view;
  // The counter the purchases go to (the map that grows): its region's market, its own stock.
  const at = view.stores.find((x) => x.post === post) ?? view.stores[0];
  const region = at?.region ?? "veneto";
  const held = (good: string) => at?.goods[good] ?? 0;
  const nth = (i: number) =>
    view.stores.slice(1, i + 1).filter((x) => x.region === view.stores[i]?.region).length;
  const quotes = p.market
    .filter((q) => q.region === region)
    .sort(
      (a, b) =>
        Number(held(b.good) > 0) - Number(held(a.good) > 0) ||
        Number(BigInt(b.price) - BigInt(a.price)),
    );
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
                className={`min-h-9 rounded-full px-3 text-xs font-semibold transition active:scale-95 ${x.post === (at?.post ?? "home") ? "bg-gold/15 text-gold ring-1 ring-gold" : "text-cream-dim ring-1 ring-line"}`}
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
                    <span className="block text-xs text-cream-dim">
                      {n > 0 ? (post === "home" ? t.held(n) : t.heldAt(n)) : " "}
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
                <span data-market-buy={q.good}>
                  <Slab
                    size="sm"
                    tone="ghost"
                    busy={busy}
                    disabled={!affordable(p.cash, ten)}
                    onClick={() =>
                      void act({ type: "empireBuy", good: q.good, qty: 10, post: at?.post })
                    }
                  >
                    {t.buy(10, d(ten))}
                  </Slab>
                </span>
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
