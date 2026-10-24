import { type CSSProperties, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { BaleArt, CardBack, FarajMark, rarityOf } from "../art/bale.js";
import { ResourceIcon } from "../art/resources.js";
import { haptic } from "../haptics.js";
import { fr } from "../i18n.js";
import { CloseButton, Label, Slab, clock, useOverlay } from "../ui.js";
import type { GameProps } from "./Game.js";
import type { BaleCard, BalesView } from "./types.js";

const t = fr.game.bales;
/** Precious cards glow before they are turned over. */
const TEASED = new Set(["rare", "epic", "legendary"]);

const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

function reducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

function status(b: BalesView, now: number): string {
  if (b.available > 0) return t.waiting(b.available);
  if (b.nextAt === null) return t.none;
  return b.nextAt > now ? t.next(clock(b.nextAt - now)) : t.arriving;
}

/** On the Comptoir, once the first steps are done: the bales waiting, or the next one. */
export function BaleTile(props: GameProps) {
  const b = props.view.bales;
  if (!b || !props.view.tutorial.includes("mission")) return null;
  const ready = b.available > 0;
  return (
    <button
      type="button"
      onClick={() => props.setSheet("bales")}
      className={`flex w-full items-center gap-3 cut border px-3 py-2 text-left text-sm transition active:scale-[0.99] ${ready ? "border-gold/60 bg-gold/10 text-gold" : "border-line bg-night-3 text-cream-dim"}`}
    >
      <BaleArt size={44} className={ready ? "bale-float shrink-0" : "shrink-0 opacity-70"} />
      <span className="min-w-0 flex-1">
        <span className="block font-semibold">{t.title}</span>
        <span className="meta block">{status(b, props.now)}</span>
      </span>
      {ready ? (
        <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-gold px-1.5 text-xs font-bold text-ink">
          {b.available}
        </span>
      ) : (
        <span aria-hidden="true">→</span>
      )}
    </button>
  );
}

type Phase = "idle" | "shaking" | "burst" | "dealt";

/** Shards of the seal and the canvas: direction, distance, turn and colour, fixed. */
const SHARDS = Array.from({ length: 14 }, (_, i) => {
  const angle = (i / 14) * Math.PI * 2 + (i % 3) * 0.3;
  const dist = 130 + ((i * 37) % 70);
  return {
    dx: `${Math.round(Math.cos(angle) * dist)}px`,
    dy: `${Math.round(Math.sin(angle) * dist)}px`,
    r: `${((i * 73) % 300) - 150}deg`,
    wax: i % 3 !== 0,
    w: 10 + ((i * 7) % 12),
  };
});

/**
 * Opening a bale, full screen: the bale floats on the quay; touched, it shakes and glows, the rope
 * snaps and the seal bursts into shards; three bills of lading come out face down, to be turned
 * over one by one (or all at once), then the goods go to the warehouse.
 */
export function BaleScreen(props: GameProps) {
  const close = () => props.setSheet(null);
  useOverlay(true, close);
  const b = props.view.bales;
  const [phase, setPhase] = useState<Phase>("idle");
  const [seq, setSeq] = useState<number | null>(null);
  const [flipped, setFlipped] = useState<boolean[]>([]);
  const [flash, setFlash] = useState(0);
  const [odds, setOdds] = useState(false);
  const [story, setStory] = useState(false);
  const fast = useMemo(reducedMotion, []);
  if (!b) return null;
  const cards = seq !== null && b.last?.seq === seq ? b.last.cards : null;
  const slots = (cards ?? []).map((card, i) => ({ id: `${seq}:${i}`, card, i }));
  const allTurned = cards !== null && flipped.length > 0 && flipped.every(Boolean);

  async function open() {
    if (!b || phase !== "idle" || b.available <= 0 || props.busy) return;
    haptic("tap");
    setSeq(b.opened);
    setPhase("shaking");
    const shaken = wait(fast ? 0 : 750);
    const ok = await props.act({ type: "openBale" });
    await shaken;
    if (!ok) {
      setPhase("idle");
      setSeq(null);
      return;
    }
    haptic("success");
    setPhase("burst");
    await wait(fast ? 0 : 650);
    setFlipped([false, false, false]);
    setPhase("dealt");
  }

  function turn(i: number, card: BaleCard | undefined) {
    setFlipped((f) => {
      if (f[i]) return f;
      const next = [...f];
      next[i] = true;
      return next;
    });
    if (!card) return;
    if (card.rarity === "legendary" || card.rarity === "epic") {
      haptic("success");
      setFlash((n) => n + 1);
    } else haptic(TEASED.has(card.rarity) ? "success" : "tap");
  }

  async function turnAll() {
    if (!cards) return;
    for (const [i, card] of cards.entries()) {
      if (flipped[i]) continue;
      turn(i, card);
      await wait(fast ? 0 : 260);
    }
  }

  function again() {
    setPhase("idle");
    setSeq(null);
    setFlipped([]);
  }

  return createPortal(
    // Opened in place (not showModal), like the sheets.
    <dialog
      open
      aria-modal="true"
      aria-label={t.title}
      className="fixed inset-0 z-50 m-0 flex h-full max-h-none w-full max-w-none animate-fade flex-col overflow-y-auto border-0 bg-night p-0 text-cream"
      style={{
        backgroundImage:
          "radial-gradient(ellipse at 50% 38%, rgb(var(--lagoon) / 0.16), transparent 60%)",
      }}
    >
      <header className="flex items-start justify-between gap-3 px-4 pb-2 pt-[max(1rem,env(safe-area-inset-top))]">
        <div>
          <Label className="text-cream-dim">{t.kicker}</Label>
          <h2 className="font-display text-xl font-extrabold uppercase">{t.title}</h2>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-night-3 px-3 py-1 font-sans text-xs text-cream-dim ring-1 ring-inset ring-line">
            {t.count(b.available, b.max)}
          </span>
          <CloseButton onClick={close} />
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-6 px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        {phase !== "dealt" && (
          <div className="relative flex h-72 w-full items-center justify-center">
            <div className="bale-halo pointer-events-none absolute h-72 w-72 rounded-full" />
            {phase === "burst" && (
              <>
                <div className="bale-ring pointer-events-none absolute h-40 w-40 rounded-full border-2 border-gold-soft/70" />
                {SHARDS.map((s) => (
                  <span
                    key={`${s.dx}${s.dy}`}
                    className="bale-shard pointer-events-none absolute left-1/2 top-1/2"
                    style={
                      {
                        "--dx": s.dx,
                        "--dy": s.dy,
                        "--r": s.r,
                        width: s.w,
                        height: s.w * 0.8,
                        background: s.wax ? "#B23A2A" : "#D9C29A",
                        clipPath: "polygon(50% 0, 100% 40%, 75% 100%, 10% 85%, 0 30%)",
                      } as CSSProperties
                    }
                  />
                ))}
              </>
            )}
            <button
              type="button"
              onClick={open}
              disabled={b.available <= 0 || phase !== "idle"}
              aria-label={t.open}
              className="relative rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold disabled:cursor-default"
            >
              <BaleArt
                size={210}
                open={phase === "burst"}
                className={
                  phase === "shaking"
                    ? "bale-shake"
                    : phase === "burst"
                      ? "bale-burst"
                      : b.available > 0
                        ? "bale-float"
                        : "opacity-50 grayscale-[40%]"
                }
              />
            </button>
          </div>
        )}

        {phase === "idle" && (
          <div className="w-full space-y-4 text-center">
            <p className="meta">{status(b, props.now)}</p>
            {b.available > 0 && (
              <>
                <p className="text-sm italic text-cream-dim">{t.lorenzo}</p>
                <Slab size="lg" className="w-full" disabled={props.busy} onClick={open}>
                  {t.open}
                </Slab>
                <p className="label">{t.tapToOpen}</p>
              </>
            )}
            <div className="flex justify-center gap-4 text-xs">
              <button
                type="button"
                className="text-lagoon underline"
                onClick={() => setOdds((o) => !o)}
              >
                {t.odds}
              </button>
              <button
                type="button"
                className="text-lagoon underline"
                onClick={() => setStory((s) => !s)}
              >
                {t.storyTitle}
              </button>
            </div>
            {story && (
              <div className="flex gap-3 cut border border-line bg-night-3 p-4 text-left text-sm text-cream-dim">
                <span className="shrink-0">
                  <FarajMark color="rgb(var(--gold))" size={32} />
                </span>
                <p>{t.story}</p>
              </div>
            )}
            {odds && <Odds bales={b} props={props} />}
          </div>
        )}

        {phase === "dealt" && cards && (
          <>
            <div className="grid w-full grid-cols-3 gap-3">
              {slots.map(({ id, card, i }) => (
                <Card
                  // Each bale's cards are new elements: they are dealt again.
                  key={id}
                  card={card}
                  index={i}
                  turned={flipped[i] ?? false}
                  onTurn={() => turn(i, card)}
                  name={props.names.resource(card.resource)}
                />
              ))}
            </div>
            {!allTurned ? (
              <div className="w-full space-y-3 text-center">
                <p className="label">{t.tapCard}</p>
                <Slab tone="ghost" className="w-full" onClick={turnAll}>
                  {t.revealAll}
                </Slab>
              </div>
            ) : (
              <Summary
                cards={cards}
                names={props.names.resource}
                left={b.available}
                onNext={again}
                onBack={close}
              />
            )}
          </>
        )}
      </main>
      {flash > 0 && (
        <div
          key={flash}
          className="bale-flash pointer-events-none fixed inset-0 z-50"
          style={{
            background: "radial-gradient(circle, rgb(var(--gold) / 0.55), transparent 70%)",
          }}
        />
      )}
    </dialog>,
    document.body,
  );
}

function Card(props: {
  card: BaleCard;
  index: number;
  turned: boolean;
  onTurn: () => void;
  name: string;
}) {
  const { card, turned } = props;
  const look = rarityOf(card.rarity);
  const tease = !turned && TEASED.has(card.rarity);
  const fromX = ["calc(100% + 0.75rem)", "0px", "calc(-100% - 0.75rem)"][props.index] ?? "0px";
  const label = fr.game.bales.rarity[card.rarity] ?? card.rarity;
  return (
    <button
      type="button"
      onClick={props.onTurn}
      aria-label={turned ? `${label} : ${props.name} ${t.units(card.quantity)}` : t.tapCard}
      className={`bale-deal flip aspect-[5/7] w-full cut ${turned ? "is-flipped" : ""}`}
      style={
        {
          animationDelay: `${props.index * 130}ms`,
          "--from-x": fromX,
          "--from-r": `${(props.index - 1) * -8}deg`,
        } as CSSProperties
      }
    >
      <div className="flip-inner">
        <div
          className={`flip-face overflow-hidden cut ${tease ? "bale-tease" : "shadow-lg shadow-black/40"}`}
          style={{ "--glow": look.glow } as CSSProperties}
        >
          <CardBack />
        </div>
        <div
          className="flip-face flip-front flex flex-col items-center justify-between overflow-hidden cut border-[3px] p-1.5 text-center"
          style={{
            borderColor: look.frame,
            background: `linear-gradient(170deg, ${look.glow}, rgb(var(--night-3)) 55%)`,
            boxShadow: `0 0 18px 2px ${look.glow}`,
          }}
        >
          <span
            className="w-full rounded-md py-0.5 font-mono text-xs font-bold uppercase tracking-wider text-night"
            style={{ background: look.frame }}
          >
            {label}
          </span>
          <span className="relative">
            <ResourceIcon code={card.resource} size={52} />
            {card.rarity === "legendary" && turned && <Sparks />}
          </span>
          <span className="w-full">
            <span className="block truncate font-display text-xs font-extrabold uppercase leading-tight">
              {props.name}
            </span>
            <span
              className="font-display text-lg font-extrabold tabular-nums"
              style={{ color: look.frame }}
            >
              {t.units(card.quantity)}
            </span>
          </span>
          {card.rarity === "legendary" && (
            <span className="bale-shimmer pointer-events-none absolute inset-0" />
          )}
        </div>
      </div>
    </button>
  );
}

function Sparks() {
  return (
    <>
      {[-18, -6, 8, 20].map((x, i) => (
        <span
          key={x}
          className="bale-spark pointer-events-none absolute bottom-2 h-1.5 w-1.5 rounded-full bg-gold-soft"
          style={{ left: `calc(50% + ${x}px)`, animationDelay: `${i * 0.35}s` }}
        />
      ))}
    </>
  );
}

function Summary(props: {
  cards: BaleCard[];
  names: (code: string) => string;
  left: number;
  onNext: () => void;
  onBack: () => void;
}) {
  const goods = new Map<string, number>();
  for (const c of props.cards) goods.set(c.resource, (goods.get(c.resource) ?? 0) + c.quantity);
  return (
    <div className="w-full animate-rise space-y-4">
      <div className="cut border border-line bg-night-3 p-4">
        <Label className="text-lagoon">{t.stored}</Label>
        <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-2 text-sm">
          {[...goods].map(([r, q]) => (
            <li key={r} className="inline-flex items-center gap-1.5">
              <ResourceIcon code={r} size={20} />
              <span className="font-semibold tabular-nums text-lagoon">+{q}</span>
              <span className="text-cream-dim">{props.names(r)}</span>
            </li>
          ))}
        </ul>
      </div>
      {props.left > 0 ? (
        <Slab size="lg" className="w-full" onClick={props.onNext}>
          {t.nextBale(props.left)}
        </Slab>
      ) : null}
      <Slab tone="ghost" className="w-full" onClick={props.onBack}>
        {t.back}
      </Slab>
    </div>
  );
}

const pct = (bps: number) =>
  `${(bps / 100).toLocaleString("fr-FR", { maximumFractionDigits: 2 })} %`;

/** The odds, exactly those of the world's settings. */
function Odds({ bales, props }: { bales: BalesView; props: GameProps }) {
  return (
    <div className="space-y-3 cut border border-line bg-night-3 p-4 text-left">
      <Label>{t.oddsTitle}</Label>
      <p className="text-xs text-cream-dim">
        {t.oddsIntro(bales.cardsPerBale, bales.intervalHours, bales.max)} {t.oddsOwn}
      </p>
      <ul className="space-y-2">
        {bales.odds.map((o) => {
          const look = rarityOf(o.rarity);
          return (
            <li key={o.rarity} className="cut bg-night-2 p-2.5 ring-1 ring-inset ring-line/70">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-semibold" style={{ color: look.frame }}>
                  {t.rarity[o.rarity] ?? o.rarity}
                </span>
                <span className="font-sans text-xs text-cream">
                  {pct(o.chanceBps)} <span className="text-muted">{t.perCard}</span>
                </span>
              </div>
              <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-xs text-cream-dim">
                {o.goods.map((g) => (
                  <span key={g.resource} className="inline-flex items-center gap-1">
                    <ResourceIcon code={g.resource} size={16} />
                    {props.names.resource(g.resource)} {pct(g.chanceBps)}
                  </span>
                ))}
              </div>
              <p className="mt-1 font-sans text-xs text-muted">
                {o.quantities
                  .filter((q) => q.chanceBps > 0)
                  .map((q) => `${t.units(q.quantity)} ${pct(q.chanceBps)}`)
                  .join(" · ")}
              </p>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
