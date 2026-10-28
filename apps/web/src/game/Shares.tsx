import { useEffect, useState } from "react";
import { ApiError } from "../api.js";
import { fr } from "../i18n.js";
import { Label, Qty, Rules, Slab } from "../ui.js";
import type { GameProps } from "./Game.js";
import { MerchantName } from "./Name.js";
import { gameApi } from "./api.js";
import { d } from "./format.js";
import type { Action, HouseSharesView, SharesView } from "./types.js";

const t = () => fr.game.shares;

/** A part's price to start from: the last one, else ten ducats. */
const startPrice = (v: HouseSharesView) =>
  Math.max(1, Math.round(Number(BigInt(v.lastPrice ?? "1000")) / 100));

/** The price field, in whole ducats (sent in deniers). */
function PriceField(props: { value: number; onChange: (v: number) => void }) {
  return (
    <label className="flex items-center justify-between gap-3 text-sm">
      <span>{t().price}</span>
      <input
        type="number"
        inputMode="numeric"
        min={1}
        max={1_000_000}
        value={props.value}
        onChange={(e) => props.onChange(Math.max(1, Math.floor(Number(e.target.value) || 1)))}
        className="min-h-12 w-28 cut bg-night-3 px-3 text-right ring-1 ring-inset ring-line"
      />
    </label>
  );
}

const deniers = (ducats: number) => String(Math.round(ducats * 100));

/** The register: each holder's parts as a gauge, the founder first. */
function Register({ v, me }: { v: HouseSharesView; me: string }) {
  return (
    <ul className="space-y-1.5">
      {v.holders.map((h) => (
        <li key={h.id} className="text-sm">
          <span className="flex items-baseline justify-between gap-2">
            <span className="flex min-w-0">
              {h.id === me ? t().you : <MerchantName pseudo={h.pseudo} bot={h.bot} />}
            </span>
            <span className="shrink-0 whitespace-nowrap text-cream-dim">
              {t().shares(h.shares)}
            </span>
          </span>
          <span className="mt-1 block h-1.5 overflow-hidden rounded-full bg-night-3">
            <span
              className={`block h-full rounded-full ${h.id === v.house ? "bg-gold" : "bg-info"}`}
              style={{ width: `${h.shares}%` }}
            />
          </span>
        </li>
      ))}
    </ul>
  );
}

/** The merchant's open orders on a book, each withdrawn with a ghost. */
function OpenOrders(props: {
  v: HouseSharesView;
  busy: boolean;
  act: (a: Action) => Promise<void>;
}) {
  const mine = [...props.v.bids, ...props.v.asks].filter((o) => o.mine);
  if (mine.length === 0) return null;
  return (
    <section className="space-y-1">
      <Label>{t().orders}</Label>
      <ul className="space-y-1">
        {mine.map((o) => (
          <li key={o.id} className="flex items-center justify-between gap-2 text-sm">
            <span className="min-w-0 text-cream-dim">
              {t().order(props.v.bids.includes(o) ? "buy" : "sell", o.quantity, d(o.price))}
            </span>
            <Slab
              size="sm"
              tone="ghost"
              disabled={props.busy}
              onClick={() => void props.act({ type: "cancelShareOrder", orderId: o.id })}
            >
              {t().cancel}
            </Slab>
          </li>
        ))}
      </ul>
    </section>
  );
}

/**
 * The « Parts » tab of the Comptoir (R9): list the house, then its register in gauges, parts
 * issued or bought back, the dividends paid; the merchant's parts in other houses.
 */
export function SharesTab(props: GameProps) {
  const [s, setS] = useState<SharesView | null>(null);
  const [quantity, setQuantity] = useState(10);
  const [price, setPrice] = useState<number | null>(null);
  const [side, setSide] = useState<"sell" | "buy">("sell");
  const reload = () =>
    gameApi
      .shares()
      .then(setS)
      .catch(() => setS(null));
  // biome-ignore lint/correctness/useExhaustiveDependencies: fetched once, when the tab opens.
  useEffect(() => {
    void reload();
  }, []);
  const act = async (a: Action) => {
    if (await props.act(a)) await reload();
  };
  if (!s) return null;
  const v = s.mine;
  const p = price ?? startPrice(v);
  const max = side === "sell" ? v.mine.free : Math.max(1, 100 - v.mine.shares);
  return (
    <div className="space-y-5">
      {!v.listed ? (
        <section className="space-y-3">
          <p className="text-sm">{t().notListed}</p>
          {v.refusal && (
            <p className="meta">{t().refusal(v.refusal, v.rules.fromDay, v.rules.minDays)}</p>
          )}
          <Slab
            className="w-full"
            disabled={props.busy || v.refusal !== null}
            onClick={() => void act({ type: "listHouse" })}
          >
            {t().list}
          </Slab>
        </section>
      ) : (
        <section className="space-y-3">
          <p className="text-sm">
            {t().lastPrice(v.lastPrice ? d(v.lastPrice) : null)}
            <span className="block text-xs text-cream-dim">
              {t().float(v.float, v.rules.float)}
            </span>
          </p>
          <Register v={v} me={v.house} />
          <div className="flex gap-2">
            {(["sell", "buy"] as const).map((x) => (
              <button
                key={x}
                type="button"
                aria-pressed={side === x}
                onClick={() => setSide(x)}
                className={`min-h-12 flex-1 rounded-full px-3 text-sm ring-inset ${side === x ? "ring-[1.5px] ring-info" : "ring-1 ring-line text-cream-dim"}`}
              >
                {x === "sell" ? t().issue : t().buyBack}
              </button>
            ))}
          </div>
          <div className="flex items-center justify-between text-sm">
            <span>{t().quantity}</span>
            <Qty value={Math.min(quantity, Math.max(1, max))} max={max} onChange={setQuantity} />
          </div>
          <PriceField value={p} onChange={setPrice} />
          <Slab
            className="w-full"
            disabled={props.busy || (side === "sell" && v.mine.free === 0)}
            onClick={() =>
              void act({
                type: "placeShareOrder",
                house: v.house,
                side,
                price: deniers(p),
                quantity: Math.min(quantity, Math.max(1, max)),
              })
            }
          >
            {(side === "sell" ? t().issueGo : t().buyBackGo)(
              Math.min(quantity, Math.max(1, max)),
              d(deniers(p)),
            )}
          </Slab>
          <OpenOrders v={v} busy={props.busy} act={act} />
          {BigInt(v.paid) > 0n && <p className="meta">{t().paid(d(v.paid))}</p>}
        </section>
      )}
      <section className="space-y-2 border-t border-line pt-3">
        <Label>{t().held}</Label>
        {s.held.length === 0 ? (
          <p className="text-sm text-cream-dim">{t().noneHeld}</p>
        ) : (
          <ul className="space-y-1.5">
            {s.held.map((h) => (
              <li key={h.house} className="text-sm">
                <span className="flex">
                  <MerchantName pseudo={h.pseudo} bot={h.bot} />
                </span>
                <span className="block text-xs text-cream-dim">
                  {t().heldLine(h.shares, d(h.dividends))}
                  {h.council ? ` · ${t().council}` : ""}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
      <Rules id="deals-shares">{t().help(v.rules.dividendBps / 100, v.rules.councilShares)}</Rules>
    </div>
  );
}

/**
 * « Ses parts » on another merchant's card (R9): the last price, the parts for sale, a buy (or a
 * sale of the parts held), and the house's accounts to its council.
 */
export function TheirShares({ accountId }: { accountId: string }) {
  const [v, setV] = useState<HouseSharesView | null>(null);
  const [quantity, setQuantity] = useState(5);
  const [price, setPrice] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const reload = () =>
    gameApi
      .houseShares(accountId)
      .then(setV)
      .catch(() => setV(null));
  // biome-ignore lint/correctness/useExhaustiveDependencies: fetched again for each merchant.
  useEffect(() => {
    setV(null);
    setPrice(null);
    void reload();
  }, [accountId]);
  if (!v) return null;
  const act = async (a: Action) => {
    setBusy(true);
    setNote(null);
    try {
      await gameApi.act(a);
      await reload();
    } catch (err) {
      const code = err instanceof ApiError ? err.code : "unknown";
      setNote(fr.game.errors[code] ?? fr.errors.unknown ?? null);
    } finally {
      setBusy(false);
    }
  };
  const best = v.asks.find((o) => !o.mine);
  const p =
    price ?? (best ? Math.max(1, Math.ceil(Number(BigInt(best.price)) / 100)) : startPrice(v));
  const n = Math.max(1, quantity);
  return (
    <section className="space-y-3 border-t border-line pt-3">
      <Label>{t().theirs}</Label>
      {!v.listed ? (
        <p className="text-sm text-cream-dim">{t().notTheirs}</p>
      ) : (
        <>
          <p className="text-sm">
            {t().lastPrice(v.lastPrice ? d(v.lastPrice) : null)}
            {v.mine.shares > 0 && (
              <span className="block text-xs text-cream-dim">
                {t().mine(v.mine.shares, d(v.mine.dividends))}
              </span>
            )}
          </p>
          <Register v={v} me="" />
          <div className="space-y-1">
            <Label>{t().book}</Label>
            {v.asks.length === 0 ? (
              <p className="text-sm text-cream-dim">{t().noAsk}</p>
            ) : (
              <ul className="space-y-0.5 text-sm">
                {v.asks.slice(0, 4).map((o) => (
                  <li key={o.id}>{t().ask(o.quantity, d(o.price))}</li>
                ))}
              </ul>
            )}
            {v.bids.slice(0, 2).map((o) => (
              <p key={o.id} className="text-xs text-cream-dim">
                {t().bid(o.quantity, d(o.price))}
              </p>
            ))}
          </div>
          <div className="flex items-center justify-between text-sm">
            <span>{t().quantity}</span>
            <Qty value={n} max={v.rules.float} onChange={setQuantity} />
          </div>
          <PriceField value={p} onChange={setPrice} />
          <div className="flex gap-2">
            <Slab
              tone="ghost"
              className="flex-1"
              disabled={busy}
              onClick={() =>
                void act({
                  type: "placeShareOrder",
                  house: v.house,
                  side: "buy",
                  price: deniers(p),
                  quantity: n,
                })
              }
            >
              {t().buy(n, d(deniers(p)))}
            </Slab>
            {v.mine.free > 0 && (
              <Slab
                tone="ghost"
                className="flex-1"
                disabled={busy}
                onClick={() =>
                  void act({
                    type: "placeShareOrder",
                    house: v.house,
                    side: "sell",
                    price: deniers(p),
                    quantity: Math.min(n, v.mine.free),
                  })
                }
              >
                {t().sell(Math.min(n, v.mine.free), d(deniers(p)))}
              </Slab>
            )}
          </div>
          {note && <p className="text-sm text-vermilion">{note}</p>}
          <OpenOrders v={v} busy={busy} act={act} />
          {v.council && v.accounts && (
            <p className="rounded-2xl bg-night-3 px-3 py-2 text-sm ring-1 ring-inset ring-gold/50">
              {t().council}
              <span className="block text-xs text-cream-dim">
                {t().accounts(d(v.accounts.cash), d(v.accounts.week))}
              </span>
            </p>
          )}
        </>
      )}
    </section>
  );
}
