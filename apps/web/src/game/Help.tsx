import { CHAIN_COLOUR, CHAIN_ORDER, TIER_SHAPE } from "../art/goods.js";
import { NavIcon } from "../art/icons.js";
import { fr } from "../i18n.js";
import { locale } from "../lang.js";
import { CloseButton, Slab, useOverlay } from "../ui.js";
import { BankSection } from "./Bank.js";
import { decreeText } from "./Doge.js";
import type { GameProps } from "./Game.js";
import { merchantLabel } from "./Name.js";
import { ACTION_ICONS } from "./map/actions.js";
import { useWide } from "./useWide.js";

/**
 * The loop of the game as one orbit (Lagune): the counter a gold sun, produce, deliver and
 * reinvest the three stars that turn around it.
 */
function LoopOrbit() {
  const [produce, deliver, reinvest] = fr.misc.loop;
  const stars: [number, number, string, string | undefined][] = [
    [160, 26, "rgb(var(--info))", produce],
    [247, 150, "rgb(var(--lagoon))", deliver],
    [73, 150, "rgb(var(--gold))", reinvest],
  ];
  return (
    <svg
      viewBox="0 0 320 210"
      className="mx-auto w-full max-w-xs"
      role="img"
      aria-label={fr.misc.loop.join(" → ")}
    >
      <circle
        cx="160"
        cy="108"
        r="86"
        fill="none"
        stroke="rgb(var(--info))"
        strokeOpacity="0.35"
        strokeWidth="2"
        strokeDasharray="4 6"
        className="orbit-flow"
      />
      <circle cx="160" cy="108" r="40" fill="rgb(var(--gold))" fillOpacity="0.12" />
      <circle cx="160" cy="108" r="26" fill="rgb(var(--gold))" />
      {stars.map(([x, y, colour, word]) => (
        <g key={word}>
          <circle
            cx={x}
            cy={y}
            r="18"
            fill="rgb(var(--night-2))"
            stroke={colour}
            strokeWidth="2.5"
          />
          <text
            x={x}
            y={y + 36}
            textAnchor="middle"
            fontSize="13"
            fontWeight="700"
            fill="rgb(var(--cream))"
          >
            {word}
          </text>
        </g>
      ))}
    </svg>
  );
}

/** The goods' code: the four shapes of the stages, then the six colours of the chains. */
function GoodsCode() {
  const t = fr.game.goodsCode;
  const tiers = Object.values(TIER_SHAPE);
  return (
    <section className="space-y-3 rounded-3xl bg-night-3 p-4 ring-1 ring-inset ring-line">
      <h2 className="font-place text-sm font-bold uppercase tracking-[0.15em]">{t.title}</h2>
      <p className="text-sm text-cream-dim">{t.text}</p>
      <ul className="grid grid-cols-4 gap-2 text-center text-xs text-cream-dim">
        {tiers.map((d, i) => (
          <li key={d} className="flex flex-col items-center gap-1">
            <svg viewBox="-16 -16 32 32" className="h-7 w-7" aria-hidden="true">
              <path d={d} fill="rgb(var(--cream) / 0.85)" />
            </svg>
            {t.tiers[i]}
          </li>
        ))}
      </ul>
      <ul className="grid grid-cols-3 gap-2 text-xs">
        {CHAIN_ORDER.map((c) => (
          <li
            key={c}
            className="flex items-center gap-2 rounded-full bg-night-2 py-1 pl-1.5 pr-2.5"
          >
            <span
              className="h-4 w-4 shrink-0 rounded-full"
              style={{ background: CHAIN_COLOUR[c] }}
            />
            <span className="truncate">{fr.game.chains[c]}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function Help(props: GameProps & { onClose: () => void }) {
  useOverlay(true, props.onClose);
  const wide = useWide();
  return (
    // biome-ignore lint/a11y/useSemanticElements: a full-screen layer, like the sheets.
    <div
      role="dialog"
      aria-modal="true"
      aria-label={fr.game.help}
      className="fixed inset-0 z-50 animate-fade overflow-y-auto overscroll-contain bg-night"
    >
      <div className="mx-auto max-w-md space-y-6 px-5 pb-12 pt-[max(1.5rem,env(safe-area-inset-top))]">
        <div className="grid grid-cols-[2.75rem_1fr_2.75rem] items-center">
          <span />
          <div className="text-center">
            <h1 className="font-place text-lg font-bold uppercase tracking-[0.2em]">
              {fr.game.help}
            </h1>
            <p className="text-xs text-cream-dim">{fr.seasonOf(new Date(props.now))}</p>
          </div>
          <CloseButton onClick={props.onClose} />
        </div>
        <LoopOrbit />
        <button
          type="button"
          onClick={() => {
            props.onClose();
            props.openTerraGuide();
          }}
          className="flex w-full items-center gap-3 rounded-2xl border border-info/60 bg-info/10 px-4 py-3 text-left transition active:scale-[0.99]"
        >
          <span className="min-w-0 flex-1">
            <span className="block font-display font-extrabold text-info">
              {fr.game.terraGuide.open}
            </span>
            <span className="block text-sm text-cream-dim">{fr.game.terraGuide.cardText}</span>
          </span>
          <span aria-hidden="true" className="text-info">
            →
          </span>
        </button>
        {fr.game.howTo
          .filter((s) => wide || !("wideOnly" in s && s.wideOnly))
          .map((s) => {
            const Icon = NavIcon[s.icon as keyof typeof NavIcon];
            return (
              <section key={s.title} className="flex gap-4 rounded-3xl bg-night-3 p-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-night-2 text-gold ring-2 ring-info/50">
                  <span>{Icon ? <Icon /> : null}</span>
                </div>
                <div>
                  <h2 className="font-display text-base font-extrabold">{s.title}</h2>
                  <p className="mt-1 text-cream-dim">{s.text}</p>
                </div>
              </section>
            );
          })}
        <GoodsCode />
        <section className="space-y-3">
          <h2 className="font-place text-sm font-bold uppercase tracking-[0.15em]">
            {fr.game.iconsTitle}
          </h2>
          <ul className="grid grid-cols-2 gap-x-4 gap-y-2">
            {Object.entries(ACTION_ICONS).map(([key, a]) => (
              <li key={key} className="flex items-center gap-3 text-sm text-cream-dim">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-night-3 text-gold">
                  {a.icon()}
                </span>
                {a.label}
              </li>
            ))}
          </ul>
        </section>
        <section className="space-y-2 rounded-3xl p-4 ring-1 ring-inset ring-info/50">
          <h2 className="font-place text-sm font-bold uppercase tracking-[0.15em] text-info">
            {fr.game.seasonNotes.title}
          </h2>
          {/* The Doge of the month and the decree of the Republic it rules with (R7). */}
          {props.catalog.previousDoge?.decree && (
            <p className="text-sm text-gold">
              {fr.game.doge.ruling(merchantLabel(props.catalog.previousDoge.pseudo, false))} ·{" "}
              {decreeText(props.catalog.previousDoge.decree, null, props.names)}
            </p>
          )}
          {/* The month's mutator first, and from the 24th the next one's (E2-9). */}
          {props.catalog.mutator?.current && (
            <p className="text-sm text-gold">
              {fr.game.mutators.now(fr.game.mutators.codes[props.catalog.mutator.current] ?? "")}
            </p>
          )}
          {props.catalog.mutator?.next && (
            <p className="text-sm text-info">
              {fr.game.mutators.next(fr.game.mutators.codes[props.catalog.mutator.next] ?? "")}
            </p>
          )}
          <ul className="list-disc space-y-1 pl-5 text-cream-dim">
            {fr.game.seasonNotes.items.map((n) => (
              <li key={n}>{n}</li>
            ))}
          </ul>
        </section>
        <BankSection />
        <div className="grid grid-cols-2 gap-3 pt-4">
          <Slab
            tone="ghost"
            size="sm"
            onClick={() => {
              props.onClose();
              props.replayIntro();
            }}
          >
            {fr.game.replayIntro}
          </Slab>
          <Slab
            tone="ghost"
            size="sm"
            onClick={() => {
              props.onClose();
              props.replayGuide();
            }}
          >
            {fr.game.replayGuide}
          </Slab>
        </div>
        <p className="text-center font-sans text-xs text-muted">
          {fr.game.version(
            __BUILD__,
            new Date(__BUILT_AT__).toLocaleString(locale, {
              timeZone: "Europe/Paris",
              dateStyle: "short",
              timeStyle: "short",
            }),
          )}
        </p>
      </div>
    </div>
  );
}
