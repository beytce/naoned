import { useEffect, useState } from "react";
import { Crest } from "../art/crest.js";
import { ResourceIcon } from "../art/resources.js";
import { fr } from "../i18n.js";
import { Badge, Big, Label, Panel, Qty, Sheet, Slab, Sparkline, Tabs, clock } from "../ui.js";
import { have } from "./Comptoir.js";
import { DecreeBanner } from "./Famille.js";
import type { GameProps } from "./Game.js";
import { d } from "./format.js";
import {
  Chip,
  Chips,
  Drawer,
  HelpButton,
  Hud,
  HudBar,
  HudStat,
  Stage,
  Tray,
  useDrawer,
} from "./stage.js";
import type { BookLine, MarketLine, OrderView } from "./types.js";
import { useWide } from "./useWide.js";

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
      className={`flex w-full items-center gap-3 border-b border-line/70 py-3 text-left transition lg:rounded-xl lg:border-transparent lg:px-3 lg:hover:bg-night-3 ${selected ? "lg:bg-night-3 lg:ring-1 lg:ring-gold/60" : ""}`}
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
  // In the computer's side panel the sheet stays open on the same resource.
  const done = () => (inline ? undefined : props.setSheet(null));
  const quota = book?.quota;
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
      {quota && quota.buy !== null && (
        <p className="text-xs text-cream-dim">
          {t.quota(String(quota.buy), String(quota.sell ?? "—"))}
        </p>
      )}

      <Tabs<"now" | "price">
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
            tone="lagoon"
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

type MarketDrawer = "negoce" | "offres" | "villes" | "decrets";

/**
 * The Rialto's board as the market's scene: one line per good, its trend and its two prices,
 * scrolling under the head bar; a touched line opens its trade.
 */
function PriceBoard({
  lines,
  props,
  selected,
}: { lines: MarketLine[]; props: GameProps; selected?: string }) {
  return (
    <div className="h-full overflow-y-auto overscroll-contain bg-night-2 px-3 pb-24 pt-[6.5rem]">
      {/* The two prices of each row: what buying costs now, what selling brings now. */}
      <div className="flex items-end justify-between gap-3 border-b border-line/70 pb-2">
        <p className="label">{fr.game.market.goods}</p>
        <div className="w-20 text-right">
          <p className="label">{fr.game.buyAt}</p>
          <p className="label text-lagoon">{fr.game.sellAt}</p>
        </div>
      </div>
      {lines.map((l) => (
        <Row key={l.resource} line={l} props={props} selected={selected === l.resource} />
      ))}
    </div>
  );
}

export function Marche(props: GameProps) {
  const lines = props.view.market;
  const wide = useWide();
  const drawer = useDrawer<MarketDrawer>(
    wide ? "negoce" : props.marketTab === "villes" ? "villes" : "offres",
    props.marketTab === "villes",
  );
  const [help, setHelp] = useState(false);
  const featured = [...lines].sort(
    (a, b) => change(series(props, b.resource)) - change(series(props, a.resource)),
  )[0];
  // Only a real rise earns the spotlight.
  const rising = featured && change(series(props, featured.resource)) > 0 ? featured : undefined;
  const cityGoods = [...new Set(props.view.cityQuotes.map((q) => q.resource))];
  const sheetResource = props.sheet?.startsWith("trade:") ? props.sheet.slice(6) : null;
  const sheetLine = lines.find((l) => l.resource === sheetResource);
  // Computer: the trade stays open in the side column, on the chosen (or featured) resource.
  const sideLine = wide ? (sheetLine ?? featured) : undefined;
  const offers = props.view.openOrders.length;
  const stock = props.view.inventory.reduce((n, i) => n + i.available, 0);
  const decrees = props.view.families?.decrees;
  const ours = decrees && props.view.families?.mine === decrees.family;
  // The guide reads which market is on screen: the cities' when their tab is open.
  const villes = drawer.open && drawer.tab === "villes";
  const { setMarketTab } = props;
  useEffect(() => {
    setMarketTab(villes ? "villes" : "joueurs");
  }, [villes, setMarketTab]);
  const m = fr.game.market;
  return (
    <Stage
      label={fr.game.tabs.marche}
      scene={<PriceBoard lines={lines} props={props} selected={sideLine?.resource} />}
      top={
        <Hud>
          <HudBar>
            <HudStat
              icon={
                <span aria-hidden="true" className="text-lg leading-none">
                  ⚖
                </span>
              }
              value={lines.length}
              caption={fr.game.marketTabs.joueurs}
              coach="mtab-joueurs"
              onClick={() => drawer.setOpen(false)}
              label={fr.game.marketTabs.joueurs}
            />
            <HudStat
              value={offers}
              caption={m.offers}
              onClick={() => drawer.show("offres")}
              label={fr.game.book.myOffers}
            />
            <HudStat value={stock} caption={m.stock} />
            <HelpButton onClick={() => setHelp(true)} label={fr.game.stage.help} />
          </HudBar>
          <Chips>
            <Chip>{m.tax(props.catalog.rules.marketTaxBps / 100)}</Chip>
            {decrees && decrees.items.length > 0 && (
              <Chip tone={ours ? "lagoon" : "vermilion"} onClick={() => drawer.show("decrets")}>
                ⚑ {m.decrees(decrees.items.length)}
              </Chip>
            )}
          </Chips>
        </Hud>
      }
      bottom={
        rising && !wide ? (
          <Tray>
            <span className="flex min-w-0 flex-1 items-center gap-2 pl-1">
              <ResourceIcon code={rising.resource} size={30} />
              <span className="min-w-0 leading-tight">
                <span className="block truncate font-display text-sm font-extrabold uppercase">
                  {props.names.resource(rising.resource)}
                </span>
                <ChangeTag value={change(series(props, rising.resource))} />
              </span>
            </span>
            <Slab
              size="sm"
              className="shrink-0 whitespace-nowrap !px-3"
              onClick={() => props.setSheet(`trade:${rising.resource}`)}
            >
              {m.trade(d(rising.bestAsk))}
            </Slab>
          </Tray>
        ) : undefined
      }
      drawer={
        <Drawer<MarketDrawer>
          {...drawer.props}
          tabs={[
            ...(wide ? [{ key: "negoce" as const, label: m.tabs.negoce }] : []),
            { key: "offres", label: m.tabs.offres, dot: offers > 0 && drawer.tab !== "offres" },
            { key: "villes", label: fr.game.marketTabs.villes, coach: "mtab-villes" },
            { key: "decrets", label: m.tabs.decrets },
          ]}
        >
          {drawer.tab === "negoce" && sideLine && (
            <TradeSheet key={sideLine.resource} line={sideLine} props={props} inline />
          )}
          {drawer.tab === "offres" &&
            (offers > 0 ? (
              <MyOffers orders={props.view.openOrders} props={props} />
            ) : (
              <p className="text-sm text-cream-dim">{m.noOffers}</p>
            ))}
          {drawer.tab === "villes" && (
            <div className="space-y-4">
              <div>
                <h2 className="font-display text-xl font-extrabold uppercase leading-tight">
                  {fr.game.cityTitle}
                </h2>
                <p className="mt-2 text-sm text-cream-dim">
                  {props.view.road ? fr.game.road.cityClosed : fr.game.cityHelp}
                </p>
              </div>
              {props.view.road ? (
                <Slab onClick={() => props.goTo("routes")}>{fr.game.road.seeRoutes}</Slab>
              ) : (
                <div className="grid gap-4">
                  {cityGoods.map((r) => (
                    <CityCard key={r} resource={r} props={props} />
                  ))}
                </div>
              )}
            </div>
          )}
          {drawer.tab === "decrets" &&
            (decrees ? (
              <DecreeBanner props={props} />
            ) : (
              <p className="text-sm text-cream-dim">{fr.game.families.decrees.none}</p>
            ))}
        </Drawer>
      }
    >
      <Sheet open={!!sheetLine && !wide} onClose={() => props.setSheet(null)}>
        {sheetLine && <TradeSheet key={sheetLine.resource} line={sheetLine} props={props} />}
      </Sheet>
      <Sheet open={help} onClose={() => setHelp(false)}>
        <div className="space-y-3 pt-4">
          <h3 className="font-display text-2xl font-extrabold uppercase">{fr.game.tabs.marche}</h3>
          <p className="text-sm text-cream-dim">
            {fr.game.marketHelp(
              props.catalog.rules.instantOrderSlippageBps / 100,
              props.catalog.rules.marketTaxBps / 100,
            )}{" "}
            {fr.game.book.fondacoHelp}
          </p>
        </div>
      </Sheet>
    </Stage>
  );
}
