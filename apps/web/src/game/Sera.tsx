import { useState } from "react";
import { GoodsMark } from "../art/goods.js";
import { fr } from "../i18n.js";
import { Rules, Sheet, Slab, clock } from "../ui.js";
import type { GameProps } from "./Game.js";
import { d, hourOf } from "./format.js";
import type { PlayerView } from "./types.js";

const t = () => fr.game.sera;

type Lot = NonNullable<NonNullable<PlayerView["sera"]>["lots"]>[number];

/** The maxima offered on a lot: its minimum, then a little, more and much more above it. */
function steps(minimum: bigint): bigint[] {
  return [10_000n, 11_000n, 12_500n, 15_000n].map((bps) => (minimum * bps) / 10_000n);
}

/** Lots open now, or settled today. */
export function seraLots(view: PlayerView): Lot[] {
  return view.sera?.lots ?? [];
}

/** Lots of the Sera still open (the HUD's round shows them). */
export function openSeraLots(view: PlayerView): number {
  return seraLots(view).filter((l) => !l.done).length;
}

/**
 * The Sera (R11): the incanto's lots, each with its goods by their mark, the price now, when it
 * closes and where the merchant stands; one lot chosen, its maximum picked from four steps, and
 * the one gold button to bid. The day's Podestà below.
 */
export function SeraSheet(props: GameProps) {
  const open = props.sheet === "sera";
  const lots = seraLots(props.view);
  const live = lots.filter((l) => !l.done);
  const [chosen, setChosen] = useState<string | null>(null);
  const [step, setStep] = useState(0);
  const lot = live.find((l) => l.id === chosen) ?? live.find((l) => !l.leading) ?? live[0] ?? null;
  const offers = lot ? steps(BigInt(lot.minimum)) : [];
  const max = offers[Math.min(step, offers.length - 1)] ?? 0n;
  const now = props.now;
  const day = new Date(now).toDateString();
  const podesta = props.view.signoria
    ? Object.keys(props.view.signoria.podesta).filter(
        (city) => props.view.signoria?.held.includes(city) ?? false,
      )
    : [];
  return (
    <Sheet
      open={open}
      onClose={() => props.setSheet(null)}
      kicker={t().kicker}
      title={t().title}
      summary={t().line(live.length)}
    >
      <div className="space-y-4">
        <ul className="space-y-2">
          {lots.map((l, i) => {
            const picked = lot?.id === l.id;
            const left = l.closesAt - now;
            return (
              <li key={l.id}>
                <button
                  type="button"
                  disabled={!!l.done}
                  onClick={() => {
                    setChosen(l.id);
                    setStep(0);
                  }}
                  className={`flex w-full items-center gap-3 rounded-2xl bg-night-3 px-3 py-2.5 text-left ${picked && !l.done ? "ring-[1.5px] ring-inset ring-info" : ""} ${l.done ? "opacity-70" : ""}`}
                >
                  <span className="w-12 shrink-0 text-xs text-cream-dim">{t().lot(i + 1)}</span>
                  <span className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-1">
                    {Object.entries(l.goods).map(([code, n]) => (
                      <span
                        key={code}
                        className="flex items-center gap-0.5 font-display text-sm tabular-nums"
                      >
                        <GoodsMark code={code} size={22} title={props.names.resource(code)} />
                        {n}
                      </span>
                    ))}
                  </span>
                  <span className="flex max-w-[40%] shrink-0 flex-col items-end text-right">
                    <span className="font-display text-sm font-extrabold text-gold">
                      {d(l.price)}
                    </span>
                    <span
                      className={`text-xs ${l.done ? "text-cream-dim" : l.leading ? "text-lagoon" : l.mine ? "text-vermilion" : "text-cream-dim"}`}
                    >
                      {l.done
                        ? l.done.won
                          ? t().won
                          : l.done.sold
                            ? t().sold
                            : t().unsold
                        : l.leading
                          ? t().leading
                          : l.mine
                            ? t().passed
                            : left > 3_600_000
                              ? t().closes(hourOf(l.closesAt))
                              : t().closesIn(clock(left))}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
        {lot && (
          <section className="space-y-3">
            <p className="label">{t().max}</p>
            <div className="grid grid-cols-4 gap-1.5 pb-1">
              {offers.map((o, i) => (
                <button
                  key={o.toString()}
                  type="button"
                  onClick={() => setStep(i)}
                  className={`min-h-11 rounded-full font-display text-sm tabular-nums ${step === i ? "bg-info/20 text-info ring-1 ring-inset ring-info" : "text-cream ring-1 ring-inset ring-line"}`}
                >
                  {d(o)}
                </button>
              ))}
            </div>
            <Slab
              size="lg"
              tone="gold"
              className="w-full"
              disabled={props.busy}
              onClick={() =>
                void props.act({ type: "incantoBid", lotId: lot.id, max: max.toString() })
              }
            >
              {lot.leading ? t().raise : t().bid} · {d(max)}
            </Slab>
            <p className="meta">{t().oneLot}</p>
          </section>
        )}
        {props.view.signoria && (
          <section className="space-y-1">
            <p className="label">{t().results}</p>
            {podesta.length === 0 ? (
              <p className="text-sm text-cream-dim">{t().noResults}</p>
            ) : (
              podesta.map((city) => (
                <p key={`${city}-${day}`} className="text-sm text-gold">
                  {t().podesta(props.names.city(city))}
                </p>
              ))
            )}
          </section>
        )}
        <Rules id="sera">{t().help}</Rules>
      </div>
    </Sheet>
  );
}
