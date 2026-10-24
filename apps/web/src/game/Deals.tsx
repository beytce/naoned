import { useState } from "react";
import { ResourceIcon } from "../art/resources.js";
import { fr } from "../i18n.js";
import { Qty, Rules, Segmented, Sheet, Slab, clock } from "../ui.js";
import type { GameProps } from "./Game.js";
import { merchantLabel } from "./Name.js";
import { d } from "./format.js";
import { have } from "./workshops.js";

const t = fr.game.deals;

type Tab = "commissions" | "colleganze" | "bank";

const who = (props: GameProps, id: string) =>
  merchantLabel(props.people[id] ?? null, props.bots.has(id), t.someone);

/** On the Comptoir: the deals between merchants, and a door to them. */
export function DealsTile(props: GameProps) {
  const deals = props.view.deals;
  if (!deals) return null;
  const open =
    deals.commissions.filter((c) => !c.mine && c.status === "open").length +
    deals.colleganze.filter((g) => g.role === "offer").length;
  return (
    <button
      type="button"
      onClick={() => props.setSheet("deals")}
      className="flex w-full items-center gap-3 cut border border-line bg-night-3 px-3 py-2 text-left text-sm text-cream-dim transition active:scale-[0.99]"
    >
      <span className="min-w-0 flex-1">
        <span className="block font-semibold text-cream">{t.title}</span>
        <span className="meta block">{t.tile(open)}</span>
      </span>
      <span aria-hidden="true">→</span>
    </button>
  );
}

export function DealsSheet(props: GameProps) {
  const [tab, setTab] = useState<Tab>("commissions");
  const deals = props.view.deals;
  return (
    <Sheet
      open={props.sheet === "deals" && !!deals}
      onClose={() => props.setSheet(null)}
      title={t.title}
    >
      {deals && (
        <div className="space-y-4">
          <Segmented
            value={tab}
            onChange={setTab}
            options={[
              { value: "commissions", label: t.tabs.commissions },
              { value: "colleganze", label: t.tabs.colleganze },
              ...(deals.bank ? [{ value: "bank" as const, label: t.tabs.bank }] : []),
            ]}
          />
          {tab === "commissions" ? (
            <Commissions {...props} />
          ) : tab === "colleganze" ? (
            <Colleganze {...props} />
          ) : (
            <Bank {...props} />
          )}
        </div>
      )}
    </Sheet>
  );
}

function Commissions(props: GameProps) {
  const deals = props.view.deals;
  const goods = props.catalog.resources.filter((r) => props.catalog.referencePrices[r.code]);
  const [resource, setResource] = useState(goods[0]?.code ?? "bread");
  const ref = Number(BigInt(props.catalog.referencePrices[resource] ?? "100"));
  const [pct, setPct] = useState(100);
  const [quantity, setQuantity] = useState(20);
  const [days, setDays] = useState(1);
  if (!deals) return null;
  const price = Math.max(1, Math.round((ref * pct) / 100));
  return (
    <div className="space-y-4">
      <ul className="space-y-2">
        {deals.commissions.length === 0 && <li className="meta">{t.noCommission}</li>}
        {deals.commissions.map((c) => (
          <li key={c.id} className="flex items-center gap-2 cut bg-night-3 px-3 py-2 text-sm">
            <ResourceIcon code={c.resource} size={28} />
            <span className="min-w-0 flex-1">
              <span className="block">
                {t.asks(
                  c.mine ? t.you : who(props, c.buyer),
                  c.quantity,
                  props.names.resource(c.resource).toLowerCase(),
                  d(c.unitPrice),
                )}
              </span>
              <span className="meta block">
                {c.status === "open"
                  ? t.left(clock(c.expiresAt - props.now))
                  : c.status === "filled"
                    ? t.filled
                    : t.closed}
              </span>
            </span>
            {c.status === "open" &&
              (c.mine ? (
                <Slab
                  size="sm"
                  tone="ghost"
                  disabled={props.busy}
                  onClick={() => props.act({ type: "cancelCommission", commissionId: c.id })}
                >
                  {t.cancel}
                </Slab>
              ) : (
                <Slab
                  size="sm"
                  disabled={props.busy || have(props.view, c.resource) < c.quantity}
                  onClick={() => props.act({ type: "fillCommission", commissionId: c.id })}
                >
                  {t.deliver}
                </Slab>
              ))}
          </li>
        ))}
      </ul>
      <section className="space-y-2 border-t border-line pt-3">
        <p className="label">{t.newCommission}</p>
        <select
          value={resource}
          onChange={(e) => setResource(e.target.value)}
          className="w-full cut bg-night-3 px-3 py-2 text-sm ring-1 ring-inset ring-line"
        >
          {goods.map((r) => (
            <option key={r.code} value={r.code}>
              {r.name}
            </option>
          ))}
        </select>
        <div className="flex items-center justify-between text-sm">
          <span>{t.quantity}</span>
          <Qty value={quantity} max={500} onChange={setQuantity} />
        </div>
        <label className="block text-sm">
          <span className="flex justify-between">
            <span>{t.price}</span>
            <span className="font-mono">
              {d(BigInt(price))} · {pct} %
            </span>
          </span>
          <input
            type="range"
            min={50}
            max={200}
            value={pct}
            onChange={(e) => setPct(Number(e.target.value))}
            className="mt-1 w-full accent-[rgb(var(--gold))]"
          />
        </label>
        <div className="flex items-center justify-between text-sm">
          <span>{t.days}</span>
          <Qty value={days} max={deals.commissionDays} onChange={setDays} />
        </div>
        <p className="meta">{t.locks(d(BigInt(price * quantity)))}</p>
        <Slab
          className="w-full"
          disabled={props.busy}
          onClick={() =>
            props.act({
              type: "postCommission",
              resource,
              quantity,
              unitPrice: String(price),
              days,
            })
          }
        >
          {t.post}
        </Slab>
      </section>
      <Rules id="deals-commissions">{t.commissionHelp}</Rules>
    </div>
  );
}

function Colleganze(props: GameProps) {
  const deals = props.view.deals;
  const cash = Number(BigInt(props.view.cash));
  const [amount, setAmount] = useState(Math.min(20_000, Math.max(1_000, Math.floor(cash / 4))));
  const [days, setDays] = useState(3);
  const [share, setShare] = useState(50);
  if (!deals) return null;
  const maxShare = Math.floor(deals.maxShareBps / 100);
  return (
    <div className="space-y-4">
      <ul className="space-y-2">
        {deals.colleganze.length === 0 && <li className="meta">{t.noColleganza}</li>}
        {deals.colleganze.map((g) => (
          <li key={g.id} className="flex items-center gap-2 cut bg-night-3 px-3 py-2 text-sm">
            <span className="min-w-0 flex-1">
              <span className="block">
                {g.role === "offer"
                  ? t.offer(who(props, g.investor), d(g.amount), g.days, g.shareBps / 100)
                  : g.role === "investor"
                    ? t.invested(
                        d(g.amount),
                        g.merchant ? who(props, g.merchant) : null,
                        g.shareBps / 100,
                      )
                    : t.funded(who(props, g.investor), d(g.amount), g.shareBps / 100)}
              </span>
              <span className="meta block">
                {g.settled
                  ? g.paid !== null
                    ? t.settled(d(g.paid))
                    : t.closed
                  : g.endsAt
                    ? t.term(clock(g.endsAt - props.now))
                    : t.waiting}
              </span>
            </span>
            {g.role === "offer" && (
              <Slab
                size="sm"
                disabled={props.busy}
                onClick={() => props.act({ type: "acceptColleganza", colleganzaId: g.id })}
              >
                {t.accept}
              </Slab>
            )}
            {g.role === "investor" && !g.merchant && !g.settled && (
              <Slab
                size="sm"
                tone="ghost"
                disabled={props.busy}
                onClick={() => props.act({ type: "cancelColleganza", colleganzaId: g.id })}
              >
                {t.cancel}
              </Slab>
            )}
          </li>
        ))}
      </ul>
      <section className="space-y-2 border-t border-line pt-3">
        <p className="label">{t.newColleganza}</p>
        <label className="block text-sm">
          <span className="flex justify-between">
            <span>{t.amount}</span>
            <span className="font-mono">{d(BigInt(amount))}</span>
          </span>
          <input
            type="range"
            min={1_000}
            max={Math.max(1_000, cash)}
            step={500}
            value={amount}
            onChange={(e) => setAmount(Number(e.target.value))}
            className="mt-1 w-full accent-[rgb(var(--gold))]"
          />
        </label>
        <div className="flex items-center justify-between text-sm">
          <span>{t.days}</span>
          <Qty value={days} max={deals.colleganzaDays} onChange={setDays} />
        </div>
        <label className="block text-sm">
          <span className="flex justify-between">
            <span>{t.share}</span>
            <span className="font-mono">{share} %</span>
          </span>
          <input
            type="range"
            min={10}
            max={maxShare}
            step={5}
            value={Math.min(share, maxShare)}
            onChange={(e) => setShare(Number(e.target.value))}
            className="mt-1 w-full accent-[rgb(var(--gold))]"
          />
        </label>
        <Slab
          className="w-full"
          disabled={props.busy || cash < amount}
          onClick={() =>
            props.act({
              type: "offerColleganza",
              amount: String(amount),
              days,
              shareBps: Math.min(share, maxShare) * 100,
            })
          }
        >
          {t.offerGo}
        </Slab>
      </section>
      <Rules id="deals-colleganze">{t.colleganzaHelp(maxShare)}</Rules>
    </div>
  );
}

/** The Bank's loan: the merchant's own, or a new one within its limit. */
function Bank(props: GameProps) {
  const bank = props.view.deals?.bank;
  const limit = Number(BigInt(bank?.limit ?? "0"));
  const [amount, setAmount] = useState(Math.min(limit, 10_000));
  const [days, setDays] = useState(3);
  if (!bank) return null;
  const b = t.bank;
  const loan = bank.loan;
  const interest = Math.ceil((amount * bank.interestBpsPerDay * days) / 10_000);
  return (
    <div className="space-y-4">
      {loan ? (
        <div className="space-y-2 cut bg-night-3 px-3 py-3 ring-1 ring-inset ring-line">
          <p className={`text-sm ${loan.late ? "text-vermilion" : ""}`}>
            {loan.late
              ? b.late(d(loan.owed))
              : b.current(d(loan.owed), clock(loan.dueAt - props.now))}
          </p>
          {!loan.late && (
            <Slab
              className="w-full"
              disabled={props.busy}
              onClick={() => props.act({ type: "repayLoan" })}
            >
              {b.repay}
            </Slab>
          )}
        </div>
      ) : limit <= 0 ? (
        <p className="meta">{b.none}</p>
      ) : (
        <section className="space-y-2">
          <label className="block text-sm">
            <span className="flex justify-between">
              <span>{b.amount}</span>
              <span className="font-mono">{d(BigInt(Math.min(amount, limit)))}</span>
            </span>
            <input
              type="range"
              min={Math.min(1_000, limit)}
              max={limit}
              step={100}
              value={Math.min(amount, limit)}
              onChange={(e) => setAmount(Number(e.target.value))}
              className="mt-1 w-full accent-[rgb(var(--gold))]"
            />
          </label>
          <div className="flex items-center justify-between text-sm">
            <span>{t.days}</span>
            <Qty value={days} max={bank.maxDays} onChange={setDays} />
          </div>
          <p className="meta">
            {b.cost(d(BigInt(interest)), d(BigInt(Math.min(amount, limit) + interest)))}
          </p>
          <Slab
            className="w-full"
            disabled={props.busy}
            onClick={() =>
              props.act({ type: "borrow", amount: String(Math.min(amount, limit)), days })
            }
          >
            {b.borrow}
          </Slab>
        </section>
      )}
      <Rules id="deals-bank">
        {b.help(
          Math.round(bank.maxShareBps / 100),
          bank.interestBpsPerDay / 100,
          bank.maxDays,
          Math.round(bank.lateBps / 100),
        )}
      </Rules>
    </div>
  );
}
