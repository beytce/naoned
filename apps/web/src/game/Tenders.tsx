import { useState } from "react";
import { ResourceIcon } from "../art/resources.js";
import { fr } from "../i18n.js";
import { Qty, Rules, Sheet, Slab, clock } from "../ui.js";
import type { GameProps } from "./Game.js";
import { d } from "./format.js";
import type { TenderView } from "./types.js";

const t = fr.game.tenders;

const stockOf = (props: GameProps, resource: string) =>
  props.view.inventory.find((i) => i.resource === resource)?.available ?? 0;

/** On the Comptoir: the Doge's tenders of the moment, and a door to them. */
export function TendersTile(props: GameProps) {
  const list = props.view.tenders;
  if (list.length === 0) return null;
  const toDeliver = list.filter((x) => x.won && !x.won.delivered).length;
  return (
    <button
      type="button"
      onClick={() => props.setSheet("tenders")}
      className={`flex w-full items-center gap-3 cut border px-3 py-2 text-left text-sm transition active:scale-[0.99] ${toDeliver > 0 ? "border-gold/60 bg-gold/10 text-gold" : "border-line bg-night-3 text-cream-dim"}`}
    >
      <span className="min-w-0 flex-1">
        <span className="block font-semibold text-cream">{t.title}</span>
        <span className="meta block">
          {toDeliver > 0 ? t.toDeliver(toDeliver) : t.open(list.filter((x) => x.open).length)}
        </span>
      </span>
      <span aria-hidden="true">→</span>
    </button>
  );
}

/** The tenders: bid on those open (sealed, a caution locked), deliver those won. */
export function TendersSheet(props: GameProps) {
  return (
    <Sheet
      open={props.sheet === "tenders"}
      onClose={() => props.setSheet(null)}
      title={t.title}
      summary={t.line(props.catalog.rules.tenderCautionPct ?? 0)}
    >
      <div className="space-y-4">
        {props.view.tenders.length === 0 && <p className="meta">{t.none}</p>}
        <ul className="space-y-3">
          {props.view.tenders.map((x) => (
            <Tender key={x.id} props={props} x={x} />
          ))}
        </ul>
        <Rules id="tenders">{t.help(props.catalog.rules.tenderCautionPct ?? 0)}</Rules>
      </div>
    </Sheet>
  );
}

function Tender({ props, x }: { props: GameProps; x: TenderView }) {
  const ceiling = Number(BigInt(x.ceiling));
  const floor = Math.max(1, Math.floor(ceiling / 2));
  const [price, setPrice] = useState(() =>
    x.mine ? Number(BigInt(x.mine.price)) : Math.round(ceiling * 0.85),
  );
  const [quantity, setQuantity] = useState(() => x.mine?.quantity ?? x.quantity);
  const cautionPct = props.catalog.rules.tenderCautionPct ?? 0;
  const caution = Math.floor((price * quantity * cautionPct) / 100);
  const name = props.names.resource(x.resource);
  const have = stockOf(props, x.resource);
  return (
    <li className="space-y-3 cut bg-night-3 px-3 py-3 ring-1 ring-inset ring-line">
      <div className="flex items-center gap-2">
        <ResourceIcon code={x.resource} size={32} />
        <span className="min-w-0 flex-1">
          <span className="block font-semibold">{t.asks(x.quantity, name)}</span>
          <span className="meta block">
            {x.open
              ? t.closesIn(clock(x.closeAt - props.now), x.bidders)
              : t.deliverBefore(clock(x.deadline - props.now))}
          </span>
        </span>
        <span className="text-right text-xs text-cream-dim">
          {t.ceiling}
          <br />
          <span className="font-sans text-cream">{d(x.ceiling)}</span>
        </span>
      </div>
      {x.won ? (
        <div className="space-y-2">
          <p className="text-sm text-gold">
            {t.won(x.won.quantity, d(x.won.price), d(BigInt(x.won.price) * BigInt(x.won.quantity)))}
          </p>
          <p className="meta">{t.stock(have, x.won.quantity, d(x.won.caution))}</p>
          <Slab
            className="w-full"
            disabled={props.busy || have < x.won.quantity}
            onClick={() => props.act({ type: "tenderDeliver", tenderId: x.id })}
          >
            {t.deliver}
          </Slab>
        </div>
      ) : (
        x.open && (
          <div className="space-y-2">
            {x.mine && (
              <p className="text-sm text-info">
                {t.mine(x.mine.quantity, d(x.mine.price), d(x.mine.caution))}
              </p>
            )}
            <label className="block text-sm">
              <span className="flex justify-between">
                <span>{t.price}</span>
                <span className="font-sans">{d(BigInt(price))}</span>
              </span>
              <input
                type="range"
                min={floor}
                max={ceiling}
                value={price}
                onChange={(e) => setPrice(Number(e.target.value))}
                className="mt-1 w-full accent-[rgb(var(--gold))]"
              />
            </label>
            <div className="flex items-center justify-between text-sm">
              <span>{t.quantity}</span>
              <Qty value={quantity} max={x.quantity} onChange={setQuantity} />
            </div>
            <p className="meta">
              {t.summary(d(BigInt(price * quantity)), d(BigInt(caution)), have)}
            </p>
            <Slab
              className="w-full"
              disabled={props.busy}
              onClick={() =>
                props.act({ type: "tenderBid", tenderId: x.id, price: String(price), quantity })
              }
            >
              {x.mine ? t.rebid : t.bid}
            </Slab>
          </div>
        )
      )}
    </li>
  );
}
