import type React from "react";
import { useEffect, useState } from "react";
import { ApiError } from "../api.js";
import { fr } from "../i18n.js";
import { Label, Rules, Sheet, Slab } from "../ui.js";
import type { GameProps } from "./Game.js";
import { merchantLabel } from "./Name.js";
import { gameApi } from "./api.js";
import { d } from "./format.js";
import type { BroglioView, RankingRow, RumourSubject, RumourView } from "./types.js";

const t = () => fr.game.broglio;

/** The Broglio fetched afresh into the sheet. */
function load(set: (b: BroglioView | null) => void) {
  return gameApi
    .broglio()
    .then(set)
    .catch(() => set(null));
}

/** The price of a rumour put on sale: five ducats. */
const SALE_PRICE = "500";

/** A rumour in words: what it says, and when. */
export function rumourText(
  subject: RumourSubject,
  props: GameProps,
  events: { code: string; city: string | null }[] = [],
): string {
  if (subject.kind === "muda") return t().muda(subject.big);
  const title = (fr.game.gazette.events[subject.code] ?? [subject.code])[0] ?? subject.code;
  const today = Math.floor((props.now - props.catalog.world.startsAt) / 86_400_000);
  // The event's title names its city; another city is said only when the rumour moves it.
  const own = events.find((e) => e.code === subject.code)?.city ?? null;
  const city = subject.city && subject.city !== own ? props.names.city(subject.city) : null;
  return t().event(title, city, t().when(subject.day - today));
}

/** Its source and how far to trust it, as a gauge. */
function Source({ source, reliabilityBps }: { source: string; reliabilityBps: number }) {
  const pct = Math.round(reliabilityBps / 100);
  return (
    <span className="mt-1 block">
      <span className="block text-xs text-cream-dim">
        {t().said(t().sources[source] ?? source, pct)}
      </span>
      <span className="mt-1 block h-1 overflow-hidden rounded-full bg-night-4">
        <span
          className={`block h-full rounded-full ${pct >= 75 ? "bg-lagoon" : pct >= 50 ? "bg-gold" : "bg-vermilion"}`}
          style={{ width: `${pct}%` }}
        />
      </span>
    </span>
  );
}

/** The Broglio under the bell: the morning's rumours, or the spy at the door. */
export function BroglioLine(props: GameProps) {
  const b = props.view.broglio;
  if (!b || (b.today === 0 && !b.spied)) return null;
  return (
    <button
      type="button"
      onClick={() => props.setSheet("broglio")}
      className={`flex w-full items-center gap-3 rounded-2xl bg-night-3 px-3 py-2.5 text-left ${b.spied ? "ring-1 ring-inset ring-vermilion/60" : ""}`}
    >
      <span
        aria-hidden
        className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-night-4 font-place text-lg text-info"
      >
        ?
      </span>
      <span className="min-w-0 flex-1">
        <span className="label block text-info">{t().kicker}</span>
        <span className="block text-sm">{b.spied ? t().spiedLine : t().line(b.today)}</span>
      </span>
    </button>
  );
}

/**
 * The Broglio (R8): the morning's rumours as cards, each with its source's gauge and a ghost
 * « Sell »; the Rialto's offers (a seller never named, a rumour's words hidden until bought) with
 * the one gold « Buy » on the offer chosen; the spy; the forge; the past days' rumours, true or
 * false once known.
 */
export function BroglioSheet(props: GameProps) {
  const open = props.sheet === "broglio";
  const [b, setB] = useState<BroglioView | null>(null);
  const [picked, setPicked] = useState<string | null>(null);
  const [rivals, setRivals] = useState<RankingRow[]>([]);
  const [target, setTarget] = useState<string | null>(null);
  const [forge, setForge] = useState<{ code: string; city: string | null; day: number } | null>(
    null,
  );
  const [note, setNote] = useState<string | null>(null);
  const reload = () => load(setB);
  useEffect(() => {
    if (!open) return;
    setNote(null);
    load(setB);
    gameApi
      .ranking()
      .then((r) => setRivals(r.rows.filter((x) => !x.me).slice(0, 8)))
      .catch(() => setRivals([]));
  }, [open]);
  const act = async (a: Parameters<GameProps["act"]>[0]) => {
    if (await props.act(a)) await reload();
  };
  const market = b?.offers.filter((o) => !o.mine) ?? [];
  const mine = b?.offers.filter((o) => o.mine) ?? [];
  const chosen = market.find((o) => o.id === picked && !o.bought) ?? null;
  const subject = forge ?? (b ? firstSubject(b) : null);
  return (
    <Sheet
      open={open && !!b}
      onClose={() => props.setSheet(null)}
      kicker={t().kicker}
      title={t().title}
      summary={t().summary}
    >
      {b && (
        <div className="space-y-5">
          {b.spied && (
            <section className="space-y-2 rounded-2xl p-3 ring-1 ring-inset ring-vermilion/60">
              <p className="text-sm text-vermilion">{t().spied}</p>
              <Slab
                size="md"
                tone="ghost"
                className="w-full"
                disabled={props.busy}
                onClick={() => void act({ type: "chaseSpy" })}
              >
                {t().chase(d(b.rules.spyCost))}
              </Slab>
            </section>
          )}

          <ul className="space-y-2">
            {b.today.map((r) => (
              <RumourCard key={r.id} r={r} props={props} events={b.subjects.events}>
                {!b.offers.some((o) => o.mine && o.subject && same(o.subject, r.subject)) &&
                  mine.length < b.rules.maxOffers && (
                    <Slab
                      size="sm"
                      tone="ghost"
                      className="mt-2"
                      disabled={props.busy}
                      onClick={() =>
                        void act({ type: "offerRumour", rumourId: r.id, price: SALE_PRICE })
                      }
                    >
                      {t().sell(d(SALE_PRICE))}
                    </Slab>
                  )}
              </RumourCard>
            ))}
          </ul>

          {mine.length > 0 && (
            <ul className="space-y-1">
              {mine.map((o) => (
                <li key={o.id} className="flex items-center justify-between gap-2 text-sm">
                  <span className="min-w-0 truncate text-cream-dim">
                    {o.subject ? rumourText(o.subject, props, b.subjects.events) : ""} ·{" "}
                    {t().offered(o.buyers ?? 0)}
                  </span>
                  <Slab
                    size="sm"
                    tone="ghost"
                    disabled={props.busy}
                    onClick={() => void act({ type: "cancelRumourOffer", offerId: o.id })}
                  >
                    {t().cancel}
                  </Slab>
                </li>
              ))}
            </ul>
          )}

          <section className="space-y-2">
            <Label>{t().market}</Label>
            {market.length === 0 ? (
              <p className="text-sm text-cream-dim">{t().marketEmpty}</p>
            ) : (
              <ul className="space-y-2">
                {market.map((o) => (
                  <li key={o.id}>
                    <button
                      type="button"
                      disabled={o.bought}
                      aria-pressed={o.id === chosen?.id}
                      onClick={() => setPicked(o.id)}
                      className={`w-full rounded-2xl bg-night-3 px-3 py-2.5 text-left ${o.id === chosen?.id ? "ring-[1.5px] ring-inset ring-info" : "ring-1 ring-inset ring-line"}`}
                    >
                      <span className="flex items-baseline justify-between gap-2 text-sm">
                        <span>
                          {o.subject
                            ? rumourText(o.subject, props, b.subjects.events)
                            : o.kind === "event"
                              ? t().kindEvent
                              : t().kindMuda}
                          {o.forMe ? ` · ${t().forYou}` : ""}
                        </span>
                        <span className="shrink-0 text-gold">
                          {o.bought ? t().bought : d(o.price)}
                        </span>
                      </span>
                      <Source source={o.source} reliabilityBps={o.reliabilityBps} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {chosen && (
              <Slab
                size="lg"
                className="w-full"
                disabled={props.busy}
                onClick={() => void act({ type: "buyRumour", offerId: chosen.id })}
              >
                {t().buy(d(chosen.price))}
              </Slab>
            )}
          </section>

          <section className="space-y-2">
            <Label>{t().spy}</Label>
            {b.spy ? (
              <div className="text-sm">
                <p className="font-semibold">{t().spyAt(merchantLabel(b.spy.pseudo, false))}</p>
                <p className="text-cream-dim">
                  {b.spy.offer
                    ? t().spyOffer(
                        b.spy.offer.side,
                        b.spy.offer.quantity,
                        props.names.resource(b.spy.offer.resource).toLowerCase(),
                        d(b.spy.offer.price),
                      )
                    : t().spyEmpty}
                </p>
              </div>
            ) : (
              <>
                <p className="text-sm text-cream-dim">{t().spyNone}</p>
                {rivals.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {rivals.map((r) => (
                      <button
                        key={r.id}
                        type="button"
                        aria-pressed={target === r.id}
                        onClick={() => setTarget(r.id)}
                        className={`min-h-12 rounded-full px-4 text-sm ${target === r.id ? "bg-info/15 ring-[1.5px] ring-inset ring-info" : "text-cream-dim ring-1 ring-inset ring-line"}`}
                      >
                        {merchantLabel(r.pseudo, r.bot)}
                      </button>
                    ))}
                  </div>
                )}
                {target && (
                  <Slab
                    size="md"
                    tone={chosen ? "ghost" : "gold"}
                    className="w-full"
                    disabled={props.busy}
                    onClick={() => void act({ type: "hireSpy", target })}
                  >
                    {t().spyHire(d(b.rules.spyCost))}
                  </Slab>
                )}
              </>
            )}
          </section>

          {b.forgedToday < b.rules.forgePerDay && subject && (
            <details className="space-y-2 rounded-2xl p-3 ring-1 ring-inset ring-line">
              <summary className="label cursor-pointer text-info">{t().forge}</summary>
              <p className="mt-2 text-sm text-cream-dim">{t().forgeHelp(b.rules.forgeInfluence)}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {b.subjects.events.map((e) => (
                  <button
                    key={`${e.code}:${e.city}`}
                    type="button"
                    aria-pressed={subject.code === e.code && subject.city === e.city}
                    onClick={() => setForge({ ...subject, code: e.code, city: e.city })}
                    className={pill(subject.code === e.code && subject.city === e.city)}
                  >
                    {(fr.game.gazette.events[e.code] ?? [e.code])[0]}
                  </button>
                ))}
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {b.subjects.days.map((day) => (
                  <button
                    key={day}
                    type="button"
                    aria-pressed={subject.day === day}
                    onClick={() => setForge({ ...subject, day })}
                    className={pill(subject.day === day)}
                  >
                    {t().when(
                      day - Math.floor((props.now - props.catalog.world.startsAt) / 86_400_000),
                    )}
                  </button>
                ))}
              </div>
              <p className="mt-2 text-sm italic text-cream-dim">
                « {rumourText({ kind: "event", ...subject }, props, b.subjects.events)} »
              </p>
              <Slab
                size="md"
                tone="ghost"
                className="mt-2 w-full"
                disabled={props.busy}
                onClick={async () => {
                  try {
                    setB(await gameApi.forge({ kind: "event", ...subject }));
                    setNote(t().forgeDone);
                  } catch (err) {
                    const code = err instanceof ApiError ? err.code : "unknown";
                    setNote(fr.game.errors[code] ?? fr.errors.unknown ?? null);
                  }
                }}
              >
                {t().forgeButton(b.rules.forgeInfluence)}
              </Slab>
              {note && <p className="mt-2 text-sm text-gold">{note}</p>}
            </details>
          )}

          {b.past.length > 0 && (
            <section className="space-y-1">
              <Label>{t().past}</Label>
              {b.past.map((r) => (
                <p key={r.id} className="text-sm text-cream-dim">
                  <span
                    className={r.truth === null ? "" : r.truth ? "text-lagoon" : "text-vermilion"}
                  >
                    {r.truth === null ? "·" : r.truth ? "✓" : "✗"}
                  </span>{" "}
                  {rumourText(r.subject, props, b.subjects.events)} — {t().truth(r.truth)}
                  {r.unmasked ? ` · ${t().unmasked}` : ""}
                </p>
              ))}
            </section>
          )}
          <Rules id="broglio">{t().help}</Rules>
        </div>
      )}
    </Sheet>
  );
}

function RumourCard({
  r,
  props,
  events,
  children,
}: {
  r: RumourView;
  props: GameProps;
  events: { code: string; city: string | null }[];
  children?: React.ReactNode;
}) {
  return (
    <li className="rounded-2xl bg-night-3 px-3 py-2.5">
      <p className="text-base italic leading-snug">« {rumourText(r.subject, props, events)} »</p>
      <Source source={r.source} reliabilityBps={r.reliabilityBps} />
      {children}
    </li>
  );
}

const pill = (on: boolean) =>
  `min-h-12 rounded-full px-4 text-sm ${on ? "bg-info/15 ring-[1.5px] ring-inset ring-info" : "text-cream-dim ring-1 ring-inset ring-line"}`;

function same(a: RumourSubject, b: RumourSubject): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

/** The first subject a forgery is offered: the catalog's first event, tomorrow. */
function firstSubject(b: BroglioView) {
  const e = b.subjects.events[0];
  const day = b.subjects.days[0];
  return e && day !== undefined ? { code: e.code, city: e.city, day } : null;
}
