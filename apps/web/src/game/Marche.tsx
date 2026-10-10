import { useState } from "react";
import { ResourceIcon } from "../art/resources.js";
import { fr } from "../i18n.js";
import { Big, Label, Panel, Qty, Sheet, Slab, Sparkline, Tabs } from "../ui.js";
import { have } from "./Comptoir.js";
import type { GameProps, MarketTab } from "./Game.js";
import { d } from "./format.js";
import type { MarketLine } from "./types.js";

function series(props: GameProps, resource: string): number[] {
  return (props.prices[resource] ?? []).map((p) => Number(p.price));
}

/** Change over the visible history, in percent. */
function change(points: number[]): number {
  const first = points[0];
  const last = points.at(-1);
  if (!first || !last || points.length < 2) return 0;
  return ((last - first) / first) * 100;
}

function ChangeTag({ value }: { value: number }) {
  if (value === 0) return <span className="label">—</span>;
  const up = value > 0;
  return (
    <span className={`font-mono text-xs font-bold ${up ? "text-lagoon" : "text-vermilion"}`}>
      {up ? "▲" : "▼"} {Math.abs(value).toFixed(1)} %
    </span>
  );
}

function Featured({ line, props }: { line: MarketLine; props: GameProps }) {
  const points = series(props, line.resource);
  return (
    <button
      type="button"
      className="block w-full text-center"
      onClick={() => props.setSheet(`trade:${line.resource}`)}
    >
      <div className="relative mx-auto w-44">
        <div className="holo absolute -inset-1 rounded-2xl blur-md" />
        <div className="relative rounded-2xl bg-night-3 p-5 ring-2 ring-gold/60">
          <div className="holo flex h-28 items-center justify-center rounded-xl">
            <ResourceIcon code={line.resource} size={88} />
          </div>
          <p className="mt-3 font-display text-sm font-extrabold uppercase">
            {props.names.resource(line.resource)}
          </p>
          <div className="mt-2 flex justify-center">
            <Sparkline points={points} width={120} height={30} />
          </div>
        </div>
      </div>
      <Label className="mt-4 text-gold">☆ {fr.game.featured}</Label>
      <div className="mt-2 flex items-end justify-center gap-6">
        <div>
          <Label>{fr.game.buyAt}</Label>
          <Big className="mt-1 text-3xl">{d(line.bestAsk)}</Big>
        </div>
        <div>
          <Label>{fr.game.sellAt}</Label>
          <Big className="mt-1 text-3xl text-lagoon">{d(line.bestBid)}</Big>
        </div>
      </div>
      <div className="mt-2">
        <ChangeTag value={change(points)} />
      </div>
    </button>
  );
}

function Row({ line, props }: { line: MarketLine; props: GameProps }) {
  const points = series(props, line.resource);
  return (
    <button
      type="button"
      data-coach={`row-${line.resource}`}
      onClick={() => props.setSheet(`trade:${line.resource}`)}
      className="flex w-full items-center gap-3 border-b border-line/70 py-3 text-left"
    >
      <ResourceIcon code={line.resource} size={36} />
      <div className="min-w-0 flex-1">
        <p className="font-display text-sm font-semibold uppercase">
          {props.names.resource(line.resource)}
        </p>
        <p className="label mt-0.5">
          {fr.game.inStock} {have(props.view, line.resource)}
        </p>
      </div>
      <Sparkline points={points} width={64} height={26} />
      <div className="w-20 text-right">
        <p className="font-display text-sm font-semibold tabular-nums">{d(line.bestAsk)}</p>
        <p className="font-display text-xs tabular-nums text-lagoon">{d(line.bestBid)}</p>
      </div>
    </button>
  );
}

function TradeSheet({ line, props }: { line: MarketLine; props: GameProps }) {
  const [qty, setQty] = useState(5);
  const stock = have(props.view, line.resource);
  const slippage = 10_000 + props.catalog.rules.instantOrderSlippageBps;
  const ask = line.bestAsk ? BigInt(line.bestAsk) : null;
  const bid = line.bestBid ? BigInt(line.bestBid) : null;
  // An instant buy reserves up to the best ask plus the price protection.
  const worstAsk = ask ? (ask * BigInt(slippage)) / 10_000n : null;
  const maxBuy = worstAsk && worstAsk > 0n ? Number(BigInt(props.view.cash) / worstAsk) : 0;
  const max = Math.max(1, maxBuy, stock);
  const q = Math.min(qty, max);
  const points = series(props, line.resource);
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-4">
        <div className="holo rounded-xl p-2">
          <ResourceIcon code={line.resource} size={56} />
        </div>
        <div className="flex-1">
          <h3 className="font-display text-xl font-extrabold uppercase">
            {props.names.resource(line.resource)}
          </h3>
          <p className="label mt-1">
            {fr.game.inStock} {stock}
          </p>
        </div>
        <Sparkline points={points} width={90} height={36} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-night-3 p-3 ring-1 ring-line">
          <Label>{fr.game.buyAt}</Label>
          <Big className="mt-1 text-2xl">{line.bestAsk ? d(line.bestAsk) : fr.game.noOffer}</Big>
        </div>
        <div className="bg-night-3 p-3 ring-1 ring-line">
          <Label>{fr.game.sellAt}</Label>
          <Big className="mt-1 text-2xl text-lagoon">
            {line.bestBid ? d(line.bestBid) : fr.game.noOffer}
          </Big>
        </div>
      </div>
      <Qty value={q} max={max} onChange={setQty} />
      {worstAsk !== null && (
        <p className="text-xs text-muted">{fr.game.maxCost(d(worstAsk * BigInt(q)))}</p>
      )}
      <div className="grid grid-cols-2 gap-4">
        <Slab
          size="lg"
          coach="sheet-buy"
          disabled={props.busy || !ask || q > maxBuy}
          onClick={async () => {
            if (
              await props.act({
                type: "instantOrder",
                resource: line.resource,
                side: "buy",
                quantity: q,
              })
            )
              props.setSheet(null);
          }}
        >
          {fr.game.buy}
        </Slab>
        <Slab
          size="lg"
          tone="lagoon"
          disabled={props.busy || !bid || q > stock}
          onClick={async () => {
            if (
              await props.act({
                type: "instantOrder",
                resource: line.resource,
                side: "sell",
                quantity: q,
              })
            )
              props.setSheet(null);
          }}
        >
          {fr.game.sell}
        </Slab>
      </div>
      <p className="text-xs text-muted">
        {fr.game.marketHelp(
          props.catalog.rules.instantOrderSlippageBps / 100,
          props.catalog.rules.marketTaxBps / 100,
        )}
      </p>
    </div>
  );
}

function CityCard({ resource, props }: { resource: string; props: GameProps }) {
  const quotes = props.view.cityQuotes
    .filter((q) => q.resource === resource)
    .sort((a, b) => (BigInt(b.unitPrice) > BigInt(a.unitPrice) ? 1 : -1));
  const best = quotes[0];
  const stock = have(props.view, resource);
  const [qty, setQty] = useState(Math.max(1, stock));
  if (!best) return null;
  const q = Math.min(qty, Math.max(1, stock));
  return (
    <Panel glow={stock > 0 ? "gold" : undefined}>
      <div className="flex items-center gap-3">
        <ResourceIcon code={resource} size={48} />
        <div className="flex-1">
          <h3 className="font-display text-base font-extrabold uppercase">
            {props.names.resource(resource)}
          </h3>
          <p className="label mt-1">
            {fr.game.inStock} {stock}
          </p>
        </div>
        <div className="text-right">
          <Label>{fr.game.cityPays}</Label>
          <Big className="mt-1 text-2xl text-gold">{d(best.unitPrice)}</Big>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2">
        {quotes.map((c) => (
          <div
            key={c.city}
            className={`p-2 text-center ring-1 ${c === best ? "bg-gold/10 ring-gold/60" : "bg-night-2 ring-line"}`}
          >
            <p className="font-mono text-[10px] uppercase tracking-wider text-muted">
              {props.names.city(c.city)}
            </p>
            <p className="font-display text-sm font-semibold tabular-nums">{d(c.unitPrice)}</p>
          </div>
        ))}
      </div>
      {stock > 0 && (
        <div className="mt-4 flex items-center justify-between gap-2">
          <Qty value={q} max={stock} onChange={setQty} />
          <Slab
            coach={`city-sell-${resource}`}
            disabled={props.busy}
            onClick={() =>
              props.act({ type: "sellToCity", city: best.city, resource, quantity: q })
            }
          >
            {fr.game.sellToCity}
          </Slab>
        </div>
      )}
    </Panel>
  );
}

export function Marche(props: GameProps) {
  const lines = props.view.market;
  const featured = [...lines].sort(
    (a, b) => change(series(props, b.resource)) - change(series(props, a.resource)),
  )[0];
  const cityGoods = [...new Set(props.view.cityQuotes.map((q) => q.resource))];
  const sheetResource = props.sheet?.startsWith("trade:") ? props.sheet.slice(6) : null;
  const sheetLine = lines.find((l) => l.resource === sheetResource);

  return (
    <div className="space-y-6">
      <Tabs<MarketTab>
        value={props.marketTab}
        onChange={props.setMarketTab}
        coach="mtab"
        options={[
          { value: "joueurs", label: fr.game.marketTabs.joueurs },
          { value: "villes", label: fr.game.marketTabs.villes },
        ]}
      />
      {props.marketTab === "joueurs" ? (
        <>
          {featured && <Featured line={featured} props={props} />}
          <div>
            {lines.map((l) => (
              <Row key={l.resource} line={l} props={props} />
            ))}
          </div>
        </>
      ) : (
        <div className="space-y-4">
          <div>
            <h2 className="font-display text-2xl font-extrabold uppercase leading-tight">
              {fr.game.cityTitle}
            </h2>
            <p className="mt-2 text-sm text-cream-dim">{fr.game.cityHelp}</p>
          </div>
          {cityGoods.map((r) => (
            <CityCard key={r} resource={r} props={props} />
          ))}
        </div>
      )}
      <Sheet open={!!sheetLine} onClose={() => props.setSheet(null)}>
        {sheetLine && <TradeSheet key={sheetLine.resource} line={sheetLine} props={props} />}
      </Sheet>
    </div>
  );
}
