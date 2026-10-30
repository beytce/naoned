import { useState } from "react";
import { GoodsMark } from "../art/goods.js";
import { d } from "../game/format.js";
import { fr } from "../i18n.js";
import { Sheet, Slab } from "../ui.js";
import { Term } from "./Term.js";
import { recipeOf } from "./logic.js";
import { keptOf } from "./next.js";
import type { EmpireAction, EmpirePayload } from "./types.js";

const t = fr.empire.resources;
const goodName = (p: EmpirePayload, code: string) =>
  fr.themeNames.resource[code] ?? p.goods[code] ?? code;

/**
 * The goods held, in a line under the header (lot A of the UX audit): each with its mark and its
 * quantity, the target the gains fly to; a touch opens what it fetches and how to sell it.
 */
export function ResourceBar({ p, onGood }: { p: EmpirePayload; onGood: (good: string) => void }) {
  const goods = Object.entries(p.stock).filter(([g, n]) => n > 0 && !g.includes(":"));
  return (
    <div className="mx-auto mt-2 w-full max-w-md" data-resources>
      {goods.length === 0 ? (
        <p className="text-xs text-cream-dim" data-goods-to="store">
          {t.empty}
        </p>
      ) : (
        <ul className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1" data-goods-to="store">
          {goods.map(([good, qty]) => (
            <li key={good}>
              <button
                type="button"
                data-goods-to={good}
                onClick={() => onGood(good)}
                className="flex min-h-9 items-center gap-1.5 rounded-full bg-night-2 py-1 pl-1.5 pr-3 text-sm tabular-nums text-cream ring-1 ring-inset ring-line active:scale-95"
                aria-label={`${qty} ${goodName(p, good)}`}
              >
                <GoodsMark code={good} size={22} />
                {qty}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/**
 * A good up close: what it fetches in Venice, what it serves (the Casa, a workshop), and the sale
 * in one gesture, keeping what the house needs.
 */
export function GoodSheet({
  p,
  good,
  busy,
  onClose,
  act,
}: {
  p: EmpirePayload;
  good: string | null;
  busy: boolean;
  onClose: () => void;
  act: (a: EmpireAction) => Promise<void>;
}) {
  const [qty, setQty] = useState<number | null>(null);
  const view = p.view;
  if (!view || !good) return null;
  const held = p.stock[good] ?? 0;
  const keep = Math.min(held, keptOf(p, good));
  const q = p.market.find((m) => m.region === "veneto" && m.good === good);
  const forCasa = view.nextCasa?.materials[good] ?? 0;
  const feeds = view.house.workshops
    .filter((w) => good in (recipeOf(p, w)?.inputs ?? {}))
    .map((w) => p.catalog.find((b) => b.type === w.type)?.name ?? w.type);
  const spare = Math.max(0, held - keep);
  const amount = Math.min(held, qty ?? (spare > 0 ? spare : held));
  const sellable = q ? (q.asked ? amount : Math.min(amount, q.depthLeft)) : 0;
  const close = () => {
    setQty(null);
    onClose();
  };
  return (
    <Sheet open onClose={close} kicker={t.kicker} title={goodName(p, good)} summary={t.held(held)}>
      <div className="space-y-2 text-sm text-cream" data-good-sheet={good}>
        <div className="flex items-center gap-3">
          <GoodsMark code={good} size={40} />
          <div>
            {q ? (
              <p>
                {t.price(d(q.price))}
                {q.asked && <span className="text-lagoon"> · {t.asked}</span>}
              </p>
            ) : (
              <p className="text-cream-dim">{t.notHere}</p>
            )}
            {forCasa > 0 && (
              <p className="text-xs text-cream-dim">
                {t.forCasa(forCasa, view.nextCasa?.level ?? 0)}
              </p>
            )}
            {feeds.length > 0 && (
              <p className="text-xs text-cream-dim">{t.feeds(feeds.join(", "))}</p>
            )}
          </div>
        </div>
        {q && held > 0 && (
          <>
            <label className="block">
              <span className="text-xs text-cream-dim">
                {t.qty(amount, held)}
                {keep > 0 ? ` · ${t.keep(keep)}` : ""}
              </span>
              <input
                type="range"
                min={1}
                max={Math.max(1, held)}
                value={Math.max(1, amount)}
                onChange={(e) => setQty(Number(e.target.value))}
                className="lagune-range mt-1 w-full"
              />
            </label>
            {q.asked && (
              <Slab
                className="w-full"
                busy={busy}
                disabled={amount <= 0}
                onClick={() => void act({ type: "empireDeliver", good, qty: amount }).then(close)}
              >
                {t.deliver(amount, d(BigInt(q.price) * BigInt(amount)))}
              </Slab>
            )}
            <Slab
              tone="ghost"
              className="w-full"
              busy={busy}
              disabled={sellable <= 0}
              onClick={() => void act({ type: "empireSell", good, qty: sellable }).then(close)}
            >
              <Term code="dogana">{t.sell(sellable, d(BigInt(q.price) * BigInt(sellable)))}</Term>
            </Slab>
          </>
        )}
      </div>
    </Sheet>
  );
}
