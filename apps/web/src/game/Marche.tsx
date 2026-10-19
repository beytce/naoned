import { useState } from "react";
import { Crest } from "../art/crest.js";
import { ResourceIcon } from "../art/resources.js";
import { fr } from "../i18n.js";
import { Badge, Label, Qty, Segmented, Sheet, Slab, Sparkline, clock } from "../ui.js";
import { have } from "./Comptoir.js";
import { DecreeBanner } from "./Famille.js";
import type { GameProps } from "./Game.js";
import { d } from "./format.js";
import type { BookLine, MarketLine, OrderView } from "./types.js";

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
  if (value === 0) return null;
  const up = value > 0;
  return (
    <span className={`font-mono text-xs font-bold ${up ? "text-lagoon" : "text-vermilion"}`}>
      {up ? "▲" : "▼"} {Math.abs(value).toFixed(1)} %
    </span>
  );
}

function Row({
  line,
  props,
  selected = false,
}: { line: MarketLine; props: GameProps; selected?: boolean }) {
  const points = series(props, line.resource);
  return (
    <button
      type="button"
      data-coach={`row-${line.resource}`}
      onClick={() => props.setSheet(`trade:${line.resource}`)}
      className={`flex w-full items-center gap-3 border-b border-line/70 py-3 text-left transition lg:rounded-xl lg:border-transparent lg:px-3 lg:hover:bg-night-3 ${selected ? "lg:bg-night-3 lg:ring-1 lg:ring-info/70" : ""}`}
    >
      <ResourceIcon code={line.resource} size={36} />
      <div className="min-w-0 flex-1">
        <p className="font-display text-sm font-semibold uppercase">
          {props.names.resource(line.resource)}
        </p>
        <p className="label mt-0.5 flex items-center gap-2">
          <span>
            {fr.game.inStock} {have(props.view, line.resource)}
          </span>
          <ChangeTag value={change(points)} />
        </p>
      </div>
      <Sparkline points={points} width={64} height={26} />
      <div className="w-20 text-right">
        <p
          className="font-display text-sm font-semibold tabular-nums"
          aria-label={`${fr.game.buyAt} ${d(line.bestAsk)}`}
        >
          {d(line.bestAsk)}
        </p>
        <p
          className="font-display text-xs tabular-nums text-lagoon"
          aria-label={`${fr.game.sellAt} ${d(line.bestBid)}`}
        >
          {d(line.bestBid)}
        </p>
      </div>
    </button>
  );
}

/** "2,40" or "2.4" ducats → 240 deniers; null if not a price. */
export function parseDucats(text: string): bigint | null {
  const m = text.trim().match(/^(\d{1,9})(?:[.,](\d{0,2}))?$/);
  if (!m) return null;
  const cents = (m[2] ?? "").padEnd(2, "0");
  const value = BigInt(m[1] ?? "0") * 100n + BigInt(cents || "0");
  return value > 0n ? value : null;
}

const asDucats = (deniers: bigint) => (Number(deniers) / 100).toFixed(2).replace(".", ",");

function BookSide({
  lines,
  title,
  tone,
  props,
}: { lines: BookLine[]; title: string; tone: string; props: GameProps }) {
  const t = fr.game.book;
  return (
    <div className="min-w-0">
      <Label className={tone}>{title}</Label>
      {lines.length === 0 ? (
        <p className="mt-2 text-xs text-muted">{t.empty}</p>
      ) : (
        <ul className="mt-2 space-y-1.5">
          {lines.map((l, i) => {
            const who =
              l.by === "market_maker"
                ? t.fondaco
                : l.mine
                  ? t.you
                  : (props.people[l.by] ?? fr.game.anonymous);
            return (
              <li key={`${l.by}-${l.price}-${i}`} className="text-xs leading-tight">
                <p className="flex items-center gap-1 truncate font-semibold">
                  <span className="truncate">{who}</span>
                  {props.bots.has(l.by) && <Badge tone="ghost">{fr.game.npc}</Badge>}
                </p>
                <p className="font-mono tabular-nums text-cream-dim">
                  {l.quantity} × {d(l.price)}
                </p>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function TradeSheet({
  line,
  props,
  inline = false,
}: { line: MarketLine; props: GameProps; inline?: boolean }) {
  const t = fr.game.book;
  const [mode, setMode] = useState<"now" | "price">("now");
  const [qty, setQty] = useState(5);
  const book = props.view.book[line.resource];
  const stock = have(props.view, line.resource);
  const slippage = 10_000 + props.catalog.rules.instantOrderSlippageBps;
  const ask = line.bestAsk ? BigInt(line.bestAsk) : null;
  const bid = line.bestBid ? BigInt(line.bestBid) : null;
  const [priceText, setPriceText] = useState(
    asDucats(ask ?? bid ?? BigInt(props.catalog.referencePrices[line.resource] ?? "100")),
  );
  const price = parseDucats(priceText);
  // An instant buy reserves up to the best ask plus the price protection.
  const worstAsk = ask ? (ask * BigInt(slippage)) / 10_000n : null;
  const cash = BigInt(props.view.cash);
  const maxBuy =
    mode === "now"
      ? worstAsk && worstAsk > 0n
        ? Number(cash / worstAsk)
        : 0
      : price
        ? Number(cash / price)
        : 0;
  const max = Math.max(1, maxBuy, stock);
  const q = Math.min(qty, max);
  const points = series(props, line.resource);
  const mine = props.view.openOrders.filter((o) => o.resource === line.resource);
  // In the computer's side panel the sheet stays open on the same resource; in the Rialto's sheet,
  // a trade made goes back to the board.
  const done = () => (inline ? undefined : props.setSheet("rialto"));
  const quota = book?.quota;
  const muda = props.view.muda;
  return (
    <div className="space-y-5">
      {/* Room on the right for the window's close button. */}
      <div className={`flex items-center gap-4 ${inline ? "" : "pr-12"}`}>
        <div className="shrink-0 rounded-xl bg-night-3 p-2 ring-1 ring-inset ring-line">
          <ResourceIcon code={line.resource} size={56} />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-display text-xl font-extrabold uppercase">
            {props.names.resource(line.resource)}
          </h3>
          <p className="label mt-1">
            {fr.game.inStock} {stock}
          </p>
        </div>
        <Sparkline points={points} width={90} height={36} />
      </div>

      <div className="grid grid-cols-2 gap-4 rounded-2xl bg-night-3 p-3 ring-1 ring-inset ring-line">
        <BookSide lines={book?.asks ?? []} title={t.sellers} tone="text-gold" props={props} />
        <BookSide lines={book?.bids ?? []} title={t.buyers} tone="text-lagoon" props={props} />
      </div>
      {!muda?.goods.includes(line.resource) && line.doganaBps !== 10_000 && (
        <p className="text-xs text-cream-dim">
          {t.dogana(Math.round(line.doganaBps / 100))}{" "}
          <ChangeTag value={(line.doganaBps - 10_000) / 100} />
        </p>
      )}
      {muda?.goods.includes(line.resource) ? (
        <p className="text-xs text-cream-dim">
          {fr.game.market.muda.quota(
            muda.left[line.resource] ?? 0,
            muda.stock[line.resource] ?? 0,
            muda.nextAt !== null ? clock(muda.nextAt - props.now) : "—",
          )}
        </p>
      ) : (
        quota &&
        quota.buy !== null && (
          <p className="text-xs text-cream-dim">
            {t.quota(String(quota.buy), String(quota.sell ?? "—"))}
          </p>
        )
      )}

      <Segmented<"now" | "price">
        value={mode}
        onChange={setMode}
        options={[
          { value: "now", label: t.now },
          { value: "price", label: t.myPrice },
        ]}
      />

      {mode === "price" && (
        <label className="block">
          <Label>{t.price}</Label>
          <input
            inputMode="decimal"
            value={priceText}
            onChange={(e) => setPriceText(e.target.value)}
            className={`mt-2 w-full bg-night-3 p-3 font-display text-xl tabular-nums ring-1 ${price ? "ring-line" : "ring-vermilion"}`}
          />
        </label>
      )}

      <Qty value={q} max={max} onChange={setQty} />
      {mode === "now" && worstAsk !== null && (
        <p className="text-xs text-muted">{fr.game.maxCost(d(worstAsk * BigInt(q)))}</p>
      )}
      {mode === "price" && price !== null && (
        <p className="text-xs text-muted">{t.reserved(d(price * BigInt(q)))}</p>
      )}

      {mode === "now" ? (
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
                done();
            }}
          >
            {fr.game.buy}
          </Slab>
          <Slab
            size="lg"
            tone="ghost"
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
                done();
            }}
          >
            {fr.game.sell}
          </Slab>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          <Slab
            size="md"
            disabled={props.busy || !price || price * BigInt(q) > cash}
            onClick={async () => {
              if (
                price &&
                (await props.act({
                  type: "limitOrder",
                  resource: line.resource,
                  side: "buy",
                  price: price.toString(),
                  quantity: q,
                }))
              )
                done();
            }}
          >
            {t.postBuy}
          </Slab>
          <Slab
            size="md"
            tone="ghost"
            disabled={props.busy || !price || q > stock}
            onClick={async () => {
              if (
                price &&
                (await props.act({
                  type: "limitOrder",
                  resource: line.resource,
                  side: "sell",
                  price: price.toString(),
                  quantity: q,
                }))
              )
                done();
            }}
          >
            {t.postSell}
          </Slab>
        </div>
      )}

      {mine.length > 0 && <MyOffers orders={mine} props={props} />}

      {props.catalog.previousDoge?.pseudo && (
        <div className="flex items-center gap-3 rounded-2xl border border-gold/50 bg-night-3 p-3">
          {props.catalog.previousDoge.crest && (
            <Crest crest={props.catalog.previousDoge.crest} size={36} />
          )}
          <p className="text-sm text-cream-dim">
            {fr.game.season.honoured(
              props.catalog.previousDoge.pseudo,
              props.catalog.previousDoge.season.replace(/^.*· /, ""),
            )}
          </p>
        </div>
      )}

      <p className="text-xs text-muted">
        {fr.game.marketHelp(
          props.catalog.rules.instantOrderSlippageBps / 100,
          props.catalog.rules.marketTaxBps / 100,
        )}{" "}
        {t.fondacoHelp}
      </p>
    </div>
  );
}

function MyOffers({ orders, props }: { orders: OrderView[]; props: GameProps }) {
  const t = fr.game.book;
  return (
    <section className="space-y-2">
      <Label>{t.myOffers}</Label>
      {orders.map((o) => (
        <div key={o.id} className="flex items-center gap-3 border-b border-line/70 py-2">
          <ResourceIcon code={o.resource} size={28} />
          <div className="min-w-0 flex-1 text-sm">
            <p className={o.side === "sell" ? "text-lagoon" : "text-gold"}>
              {t.offerLine(o.side, o.remaining, props.names.resource(o.resource), d(o.price))}
            </p>
            <p className="label">{t.expires(clock(o.expiresAt - props.now))}</p>
          </div>
          <Slab
            size="sm"
            tone="ghost"
            disabled={props.busy}
            onClick={() => props.act({ type: "cancelOrder", orderId: o.id })}
          >
            {t.cancel}
          </Slab>
        </div>
      ))}
    </section>
  );
}

type Filter = "all" | "stock" | "rising";

/**
 * The Rialto, opened from Venice on the map: one sheet. The board first (sorts, the tax, the
 * decrees, the merchant's offers), then a touched good's trade in the same sheet, a back arrow to
 * the board. Keys: `rialto`, `trade:<resource>`, `offers`.
 */
/**
 * The galleys of the Muda, on top of the Rialto: what they brought is on the quay, sold by the
 * Dogana dearer as it runs out, a few units per merchant until the next galleys.
 */
function MudaPanel({ props }: { props: GameProps }) {
  const muda = props.view.muda;
  if (!muda) return null;
  const t = fr.game.market.muda;
  const next = muda.nextAt !== null ? clock(muda.nextAt - props.now) : null;
  const goods = muda.goods.filter((r) => (muda.stock[r] ?? 0) > 0);
  return (
    <section className="cut border border-gold/50 bg-gold/5 p-3">
      <div className="flex items-baseline justify-between gap-3">
        <p className="font-display text-sm font-extrabold uppercase text-gold">{t.title}</p>
        {next && <p className="label shrink-0">{t.next(next)}</p>}
      </div>
      <p className="mt-1 text-xs text-cream-dim">
        {muda.arrivedAt === null ? t.first : goods.length > 0 ? t.help : t.empty}
      </p>
      {goods.length > 0 && (
        <div className="mt-2 divide-y divide-line/60">
          {goods.map((r) => {
            const left = muda.left[r] ?? 0;
            return (
              <button
                key={r}
                type="button"
                onClick={() => props.setSheet(`trade:${r}`)}
                className="flex w-full items-center gap-2.5 py-1.5 text-left"
              >
                <ResourceIcon code={r} size={26} />
                <span className="min-w-0 flex-1 truncate font-display text-xs font-semibold uppercase">
                  {props.names.resource(r)}
                </span>
                <span className="whitespace-nowrap text-[11px] text-cream-dim">
                  {t.stock(muda.stock[r] ?? 0)}
                </span>
                <span
                  className={`whitespace-nowrap text-right text-[11px] ${left > 0 ? "text-lagoon" : "text-muted"}`}
                >
                  {t.left(left)}
                </span>
                <span className="w-16 shrink-0 whitespace-nowrap text-right font-display text-sm font-semibold tabular-nums">
                  {d(muda.price[r] ?? "0")}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}

export function RialtoSheet(props: GameProps) {
  const [kind, id] = (props.sheet ?? "").split(":");
  const open = kind === "rialto" || kind === "offers" || (kind === "trade" && !!id);
  const [filter, setFilter] = useState<Filter>("all");
  const [decreesOpen, setDecreesOpen] = useState(false);
  const lines = props.view.market;
  const line = kind === "trade" ? lines.find((l) => l.resource === id) : undefined;
  const offers = props.view.openOrders;
  const decrees = props.view.families?.decrees;
  const ours = decrees && props.view.families?.mine === decrees.family;
  const m = fr.game.market;
  const r = fr.game.map.rialto;
  const back = (
    <button
      type="button"
      onClick={() => props.setSheet("rialto")}
      className="label -ml-1 mb-3 flex h-9 items-center gap-1 text-gold"
    >
      ← {fr.game.map.buttons.rialto}
    </button>
  );
  const shown = lines
    .filter((l) =>
      filter === "stock"
        ? have(props.view, l.resource) > 0
        : filter === "rising"
          ? change(series(props, l.resource)) > 0
          : true,
    )
    .sort((a, b) =>
      filter === "rising"
        ? change(series(props, b.resource)) - change(series(props, a.resource))
        : 0,
    );
  return (
    <Sheet open={open} onClose={() => props.setSheet(null)}>
      {line ? (
        <div>
          {back}
          <TradeSheet key={line.resource} line={line} props={props} />
        </div>
      ) : kind === "offers" ? (
        <div>
          {back}
          {offers.length > 0 ? (
            <MyOffers orders={offers} props={props} />
          ) : (
            <p className="text-sm text-cream-dim">{m.noOffers}</p>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <div className="pr-12">
            <h3 className="font-display text-2xl font-extrabold uppercase">
              {fr.game.map.buttons.rialto}
            </h3>
            <p className="label mt-1 text-cream-dim">{r.kicker}</p>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <Segmented<Filter>
              value={filter}
              onChange={setFilter}
              options={[
                { value: "all", label: r.filters.all },
                { value: "stock", label: r.filters.stock },
                { value: "rising", label: r.filters.rising },
              ]}
            />
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {/* A fact, not a filter: plain text. */}
            <span className="mr-1 text-xs text-cream-dim">
              {m.tax(props.catalog.rules.marketTaxBps / 100)}
            </span>
            <button
              type="button"
              onClick={() => props.setSheet("offers")}
              className={`slab px-2.5 py-1 font-mono text-xs uppercase tracking-[0.06em] ${offers.length > 0 ? "bg-info/20 text-info" : "bg-night-3 text-cream-dim"}`}
            >
              {r.offers(offers.length)}
            </button>
            {decrees && decrees.items.length > 0 && (
              <button
                type="button"
                aria-expanded={decreesOpen}
                onClick={() => setDecreesOpen(!decreesOpen)}
                className={`rounded-full px-2.5 py-1 font-mono text-[10.5px] uppercase tracking-[0.08em] ring-1 ring-inset ${ours ? "bg-lagoon/15 text-lagoon ring-lagoon/60" : "bg-vermilion/15 text-vermilion ring-vermilion/60"}`}
              >
                ⚑ {m.decrees(decrees.items.length)}
              </button>
            )}
          </div>
          {decreesOpen && <DecreeBanner props={props} />}
          <MudaPanel props={props} />
          <div className="flex items-end justify-between gap-3 border-b border-line/70 pb-2">
            <p className="label">{m.goods}</p>
            <div className="w-20 text-right">
              <p className="label">{fr.game.buyAt}</p>
              <p className="label text-lagoon">{fr.game.sellAt}</p>
            </div>
          </div>
          <div>
            {shown.length === 0 ? (
              <p className="py-6 text-center text-sm text-cream-dim">{r.none}</p>
            ) : (
              shown.map((l) => <Row key={l.resource} line={l} props={props} />)
            )}
          </div>
        </div>
      )}
    </Sheet>
  );
}
