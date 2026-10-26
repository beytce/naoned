import { useState } from "react";
import { Crest } from "../art/crest.js";
import { CHAIN_COLOUR, CHAIN_ORDER, GoodsMark, goodsChain } from "../art/goods.js";
import { fr } from "../i18n.js";
import { locale } from "../lang.js";
import { Badge, Label, Qty, Segmented, Sheet, Slab, Sparkline, clock } from "../ui.js";
import { have } from "./Comptoir.js";
import { DecreeBanner } from "./Famille.js";
import type { GameProps } from "./Game.js";
import { MerchantName } from "./Name.js";
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

const percent = new Intl.NumberFormat(locale, {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

function ChangeTag({ value }: { value: number }) {
  if (value === 0) return null;
  const up = value > 0;
  // One piece: « ▼ 3,9 % » never breaks over two lines.
  return (
    <span
      className={`whitespace-nowrap font-sans text-xs font-bold ${up ? "text-lagoon" : "text-vermilion"}`}
    >
      {`${up ? "▲" : "▼"}\u00a0${percent.format(Math.abs(value))}\u00a0%`}
    </span>
  );
}

/** What buying `q` units costs from these asks, best first (the merchant's own left out). */
export function costOf(asks: BookLine[], q: number): bigint {
  let left = q;
  let cost = 0n;
  for (const l of asks) {
    if (left <= 0) break;
    if (l.mine) continue;
    const n = Math.min(left, l.quantity);
    cost += BigInt(l.price) * BigInt(n);
    left -= n;
  }
  return cost;
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
      // Lagune: a rounded line on the night, the good by its mark.
      className={`mb-1.5 flex min-h-[3.5rem] w-full items-center gap-3 rounded-2xl bg-night-3 px-3 py-2 text-left transition active:scale-[0.99] lg:hover:bg-night-4 ${selected ? "ring-1 ring-inset ring-info/70" : ""}`}
    >
      <GoodsMark code={line.resource} size={34} />
      <div className="min-w-0 flex-1">
        <p className="font-display text-sm font-semibold">{props.names.resource(line.resource)}</p>
        <p className="meta mt-0.5 flex items-center gap-2">
          <span className="whitespace-nowrap">
            {fr.game.inStock(have(props.view, line.resource))}
          </span>
          <ChangeTag value={change(points)} />
        </p>
      </div>
      {/* Under 360 px the curve gives way to the stock: the trade sheet draws it bigger. */}
      <span className="hidden shrink-0 min-[360px]:block">
        <Sparkline points={points} width={64} height={26} />
      </span>
      {/* Two columns, as their heads: buying, selling. */}
      <div className="flex shrink-0 gap-2 text-right">
        <p
          className="w-14 font-display text-sm font-semibold tabular-nums"
          aria-label={`${fr.game.buyAt} ${d(line.bestAsk)}`}
        >
          {d(line.bestAsk)}
        </p>
        <p
          className="w-14 font-display text-sm tabular-nums text-lagoon"
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
            const own = l.by === "market_maker" ? t.fondaco : l.mine ? t.you : null;
            return (
              <li key={`${l.by}-${l.price}-${i}`} className="text-xs leading-tight">
                <p className="flex font-semibold">
                  {own !== null ? (
                    <span className="truncate">{own}</span>
                  ) : (
                    <MerchantName pseudo={props.people[l.by] ?? null} bot={props.bots.has(l.by)} />
                  )}
                </p>
                <p className="font-sans tabular-nums text-cream-dim">
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
  const ask = line.bestAsk ? BigInt(line.bestAsk) : null;
  const bid = line.bestBid ? BigInt(line.bestBid) : null;
  const [priceText, setPriceText] = useState(
    asDucats(ask ?? bid ?? BigInt(props.catalog.referencePrices[line.resource] ?? "100")),
  );
  const price = parseDucats(priceText);
  const cash = BigInt(props.view.cash);
  // Right away: as many as the book holds within the price protection (the Dogana's to its
  // quota), as the cash pays at the price reserved, or as the stock holds.
  const instant = book?.instant;
  const buyLimit = instant?.buy ? BigInt(instant.buy.price) : null;
  const sellLimit = instant?.sell ? BigInt(instant.sell.price) : null;
  const buyNow =
    instant?.buy && buyLimit && buyLimit > 0n
      ? Math.min(Number(cash / buyLimit), instant.buy.units)
      : 0;
  const sellNow = instant?.sell ? Math.min(stock, instant.sell.units) : 0;
  const maxBuy = mode === "now" ? buyNow : price ? Number(cash / price) : 0;
  const maxSell = mode === "now" ? sellNow : stock;
  const max = Math.max(1, maxBuy, maxSell);
  const q = Math.min(qty, max);
  const tax = props.catalog.rules.marketTaxBps;
  // What a purchase takes off the net sales: the book's asks, or the offer's price.
  const purchase =
    mode === "now" ? costOf(book?.asks ?? [], Math.min(q, buyNow)) : price ? price * BigInt(q) : 0n;
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
        <GoodsMark code={line.resource} size={56} />
        <div className="min-w-0 flex-1">
          <h3 className="font-place text-xl font-bold uppercase tracking-[0.14em]">
            {props.names.resource(line.resource)}
          </h3>
          <p className="meta mt-1 whitespace-nowrap">{fr.game.inStock(stock)}</p>
        </div>
        {/* Under 360 px the chart below says it all: the name and its stock keep the room. */}
        <div className="hidden shrink-0 min-[360px]:block">
          <Sparkline points={points} width={90} height={36} />
        </div>
      </div>

      <PriceChart props={props} resource={line.resource} reference={line.reference} />

      <div className="grid grid-cols-2 gap-4 cut bg-night-3 p-3 ring-1 ring-inset ring-line">
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
      {mode === "now" && (instant?.buy || instant?.sell) && (
        <p className="text-xs text-muted">
          {t.bounds(
            buyLimit ? d(buyLimit * BigInt(q)) : null,
            sellLimit ? d((sellLimit * BigInt(q) * BigInt(10_000 - tax)) / 10_000n) : null,
            tax / 100,
          )}
        </p>
      )}
      {mode === "now" && <p className="text-xs text-muted">{t.nowMax(buyNow, sellNow)}</p>}
      {mode === "price" && price !== null && (
        <p className="text-xs text-muted">{t.reserved(d(price * BigInt(q)))}</p>
      )}
      {purchase > 0n && <p className="text-xs text-muted">{t.rankCost(d(purchase))}</p>}

      {mode === "now" ? (
        <div className="grid grid-cols-2 gap-4">
          <Slab
            size="lg"
            coach="sheet-buy"
            disabled={props.busy || !instant?.buy || q > buyNow}
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
            disabled={props.busy || !instant?.sell || q > sellNow}
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
        <div className={`grid grid-cols-2 gap-4 ${stock > 0 ? "[&>*:first-child]:order-2" : ""}`}>
          <Slab
            size="md"
            tone={stock > 0 ? "ghost" : undefined}
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
            tone={stock > 0 ? undefined : "ghost"}
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
        <div className="flex items-center gap-3 cut border border-gold/50 bg-night-3 p-3">
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

      <div className="text-xs text-muted">
        <p>{t.rules}</p>
        <details className="mt-1">
          <summary className="cursor-pointer text-cream-dim">{t.more}</summary>
          <p className="mt-1">
            {fr.game.marketHelp(
              props.catalog.rules.instantOrderSlippageBps / 100,
              props.catalog.rules.marketTaxBps / 100,
            )}{" "}
            {t.fondacoHelp}
          </p>
        </details>
      </div>
    </div>
  );
}

function MyOffers({ orders, props }: { orders: OrderView[]; props: GameProps }) {
  const t = fr.game.book;
  return (
    <section className="space-y-2">
      <Label>{t.myOffers}</Label>
      {orders.map((o) => (
        <div key={o.id} className="flex items-center gap-3 rounded-2xl bg-night-3 px-3 py-2">
          <GoodsMark code={o.resource} size={28} />
          <div className="min-w-0 flex-1 text-sm">
            <p className={o.side === "sell" ? "text-lagoon" : "text-gold"}>
              {t.offerLine(o.side, o.remaining, props.names.resource(o.resource), d(o.price))}
            </p>
            <p className="meta">{t.expires(clock(o.expiresAt - props.now))}</p>
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
    // Lagune: the galleys bring the overseas goods, in their purple; gold stays for money.
    <section className="rounded-2xl border border-[#B48BE6]/50 bg-[#B48BE6]/10 p-3">
      <div className="flex items-baseline justify-between gap-3">
        <p className="font-place text-sm font-bold uppercase tracking-[0.14em] text-cream">
          {t.title}
        </p>
        {next && <p className="meta shrink-0">{t.next(next)}</p>}
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
                <GoodsMark code={r} size={26} />
                <span className="min-w-0 flex-1 truncate font-display text-xs font-semibold">
                  {props.names.resource(r)}
                </span>
                <span className="whitespace-nowrap text-xs text-cream-dim">
                  {t.stock(muda.stock[r] ?? 0)}
                </span>
                <span
                  className={`whitespace-nowrap text-right text-xs ${left > 0 ? "text-lagoon" : "text-muted"}`}
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

/** The heads of the price columns, side by side over their figures. */
function PriceHeads() {
  return (
    <div className="flex shrink-0 gap-2 text-right">
      <p className="label w-14">{fr.game.buyAt}</p>
      <p className="label w-14 text-lagoon">{fr.game.sellAt}</p>
    </div>
  );
}

/**
 * The goods with a price first, grouped by chain under a head in the chain's colour (Lagune);
 * those nobody has traded yet after, under their own head.
 */
function PricedRows({
  lines,
  props,
  grouped = true,
}: { lines: MarketLine[]; props: GameProps; grouped?: boolean }) {
  const priced = lines.filter((l) => l.bestAsk !== null || l.bestBid !== null);
  const unpriced = lines.filter((l) => l.bestAsk === null && l.bestBid === null);
  const chains = grouped
    ? CHAIN_ORDER.map((c) => ({ c, lines: priced.filter((l) => goodsChain(l.resource) === c) }))
        .concat([
          {
            c: "other",
            lines: priced.filter((l) => !CHAIN_ORDER.includes(goodsChain(l.resource))),
          },
        ])
        .filter((g) => g.lines.length > 0)
    : [{ c: "", lines: priced }];
  return (
    <>
      {chains.map((g) => (
        <div key={g.c}>
          {g.c && fr.game.chains[g.c] && (
            <p
              className="pb-1.5 pt-2 font-display text-xs font-bold"
              style={{ color: CHAIN_COLOUR[g.c] }}
            >
              {fr.game.chains[g.c]}
            </p>
          )}
          {g.lines.map((l) => (
            <Row key={l.resource} line={l} props={props} />
          ))}
        </div>
      ))}
      {unpriced.length > 0 && (
        <>
          <p className="pb-1 pt-4 font-display text-sm font-semibold text-cream-dim">
            {fr.game.market.unpriced(unpriced.length)}
          </p>
          {unpriced.map((l) => (
            <Row key={l.resource} line={l} props={props} />
          ))}
        </>
      )}
    </>
  );
}

/** The prices of the Rialto, one line a good: the side column on a computer. */
export function MarketBoard(props: GameProps) {
  return (
    <div>
      <div className="flex items-end justify-between gap-3 border-b border-line/70 pb-2">
        <p className="label">{fr.game.market.goods}</p>
        <PriceHeads />
      </div>
      <PricedRows lines={props.view.market} props={props} />
    </div>
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
      className="label -ml-1 mb-3 flex h-11 items-center gap-1 text-gold"
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
    <Sheet
      open={open}
      onClose={() => props.setSheet(null)}
      title={!line && kind !== "offers" ? fr.game.map.buttons.rialto : undefined}
      summary={!line && kind !== "offers" ? r.kicker : undefined}
    >
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
          {/* Rows 20 px apart when they wrap: the chips' 44 px of touch do not meet. */}
          <div className="flex flex-wrap items-center gap-x-1.5 gap-y-5">
            {/* A fact, not a filter: plain text. */}
            <span className="mr-1 text-xs text-cream-dim">
              {m.tax(props.catalog.rules.marketTaxBps / 100)}
            </span>
            <button type="button" onClick={() => props.setSheet("offers")} className="hit">
              <span
                className={`slab block px-3 py-1 font-display text-xs font-semibold ${offers.length > 0 ? "bg-info/20 text-info" : "text-cream-dim ring-1 ring-inset ring-line"}`}
              >
                {r.offers(offers.length)}
              </span>
            </button>
            {decrees && decrees.items.length > 0 && (
              <button
                type="button"
                aria-expanded={decreesOpen}
                onClick={() => setDecreesOpen(!decreesOpen)}
                className={`hit rounded-full px-3 py-1 font-display text-xs font-semibold ring-1 ring-inset ${ours ? "bg-lagoon/15 text-lagoon ring-lagoon/60" : "bg-vermilion/15 text-vermilion ring-vermilion/60"}`}
              >
                ⚑ {m.decrees(decrees.items.length)}
              </button>
            )}
          </div>
          {decreesOpen && <DecreeBanner props={props} />}
          <MudaPanel props={props} />
          <div className="flex items-end justify-between gap-3 border-b border-line/70 pb-2">
            <p className="label">{m.goods}</p>
            <PriceHeads />
          </div>
          <div>
            {shown.length === 0 ? (
              <p className="py-6 text-center text-sm text-cream-dim">{r.none}</p>
            ) : (
              <PricedRows lines={shown} props={props} grouped={filter !== "rising"} />
            )}
          </div>
        </div>
      )}
    </Sheet>
  );
}

/**
 * The days of the Rialto's price for a good the server sends (seven, thirty with the Pass), hour
 * by hour, against its reference: where it stands now, its low and its high, to buy low and sell
 * high.
 */
function PriceChart({
  props,
  resource,
  reference,
}: { props: GameProps; resource: string; reference: string }) {
  const c = fr.game.market.chart;
  const raw = props.prices[resource] ?? [];
  const W = 320;
  const H = 110;
  if (raw.length < 2) return <p className="meta">{c.empty(props.priceDays)}</p>;
  const ref = Number(reference);
  const values = raw.map((p) => Number(p.price));
  const lo = Math.min(...values, ref);
  const hi = Math.max(...values, ref);
  const span = hi - lo || 1;
  const t0 = raw[0]?.t ?? 0;
  const t1 = props.now;
  const x = (t: number) => 4 + ((t - t0) / Math.max(1, t1 - t0)) * (W - 8);
  const y = (v: number) => H - 14 - ((v - lo) / span) * (H - 28);
  const path = raw
    .map((p, i) => `${i ? "L" : "M"}${x(p.t).toFixed(1)} ${y(Number(p.price)).toFixed(1)}`)
    .join(" ");
  const last = values.at(-1) ?? ref;
  const vsRef = Math.round(((last - ref) / Math.max(1, ref)) * 100);
  return (
    <figure className="space-y-1">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        role="img"
        aria-label={c.label(props.names.resource(resource), d(BigInt(last)), vsRef)}
        className="block cut bg-night-3 ring-1 ring-inset ring-line"
      >
        <line
          x1="4"
          x2={W - 4}
          y1={y(ref)}
          y2={y(ref)}
          stroke="rgb(var(--cream-dim))"
          strokeOpacity="0.5"
          strokeDasharray="4 4"
        />
        <text x={W - 6} y={y(ref) - 4} textAnchor="end" fontSize="10" fill="rgb(var(--cream-dim))">
          {c.reference}
        </text>
        <path
          d={path}
          fill="none"
          stroke={last >= ref ? "rgb(var(--lagoon))" : "rgb(var(--vermilion))"}
          strokeWidth="2"
          strokeLinejoin="round"
        />
        <circle cx={x(raw.at(-1)?.t ?? t1)} cy={y(last)} r="3.5" fill="rgb(var(--gold))" />
      </svg>
      <figcaption className="flex justify-between font-sans text-xs text-cream-dim">
        <span>{c.since(props.priceDays)}</span>
        <span>
          {c.low} {d(BigInt(Math.min(...values)))} · {c.high} {d(BigInt(Math.max(...values)))}
        </span>
        <span className={vsRef >= 0 ? "text-lagoon" : "text-vermilion"}>
          {vsRef >= 0 ? "+" : ""}
          {vsRef} %
        </span>
      </figcaption>
    </figure>
  );
}
