import { useState } from "react";
import { fr } from "../i18n.js";
import type { GameProps } from "./Game.js";
import { d } from "./format.js";
import type { MarketLine } from "./types.js";
import { Btn, Card, Qty } from "./ui.js";

function Row({ line, props }: { line: MarketLine; props: GameProps }) {
  const [qty, setQty] = useState(10);
  const { view, catalog, names } = props;
  const stock = view.inventory.find((i) => i.resource === line.resource)?.available ?? 0;
  const slippage = 1 + catalog.rules.instantOrderSlippageBps / 10_000;
  const ask = line.bestAsk ? BigInt(line.bestAsk) : null;
  const bid = line.bestBid ? BigInt(line.bestBid) : null;
  // An instant buy reserves up to the best ask + slippage per unit.
  const worstAsk = ask ? (ask * BigInt(Math.round(slippage * 10_000))) / 10_000n : null;
  const maxBuy = worstAsk && worstAsk > 0n ? Number(BigInt(view.cash) / worstAsk) : 0;
  const city = view.cityQuotes
    .filter((q) => q.resource === line.resource)
    .sort((a, b) => (BigInt(b.unitPrice) > BigInt(a.unitPrice) ? 1 : -1))[0];
  const maxQty = Math.max(1, maxBuy, stock);
  const q = Math.min(qty, maxQty);

  return (
    <Card className="space-y-3">
      <div className="flex items-baseline justify-between">
        <h3 className="font-serif text-lg font-semibold">{names.resource(line.resource)}</h3>
        <span className="text-sm opacity-70">{fr.game.inStock(stock)}</span>
      </div>
      <div className="grid grid-cols-2 gap-2 text-sm">
        <p>
          <span className="opacity-60">{fr.game.buyAt} </span>
          <span className="font-semibold tabular-nums">{d(line.bestAsk)}</span>
        </p>
        <p className="text-right">
          <span className="opacity-60">{fr.game.sellAt} </span>
          <span className="font-semibold tabular-nums">{d(line.bestBid)}</span>
        </p>
      </div>
      <Qty value={q} max={maxQty} onChange={setQty} />
      <div className="grid grid-cols-2 gap-2">
        <Btn
          disabled={props.busy || !ask || q > maxBuy}
          onClick={() =>
            props.act({ type: "instantOrder", resource: line.resource, side: "buy", quantity: q })
          }
        >
          {fr.game.buy}
        </Btn>
        <Btn
          variant="secondary"
          disabled={props.busy || !bid || q > stock}
          onClick={() =>
            props.act({ type: "instantOrder", resource: line.resource, side: "sell", quantity: q })
          }
        >
          {fr.game.sell}
        </Btn>
      </div>
      {city && (
        <div className="flex items-center justify-between gap-2 border-t border-ink/10 pt-3 text-sm dark:border-ink-light/10">
          <span>{fr.game.cityPays(names.city(city.city), d(city.unitPrice))}</span>
          <Btn
            variant="secondary"
            disabled={props.busy || stock < 1}
            onClick={() =>
              props.act({
                type: "sellToCity",
                city: city.city,
                resource: line.resource,
                quantity: Math.min(q, stock),
              })
            }
          >
            {fr.game.sellToCity}
          </Btn>
        </div>
      )}
    </Card>
  );
}

export function Marche(props: GameProps) {
  const pct = props.catalog.rules.instantOrderSlippageBps / 100;
  return (
    <div className="space-y-4">
      <p className="text-sm opacity-70">
        {fr.game.marketHelp(pct, props.catalog.rules.marketTaxBps / 100)}
      </p>
      {props.view.market.map((line) => (
        <Row key={line.resource} line={line} props={props} />
      ))}
    </div>
  );
}
