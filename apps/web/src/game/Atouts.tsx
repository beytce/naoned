import { useEffect, useState } from "react";
import { fr } from "../i18n.js";
import { Rules, Sheet, Slab } from "../ui.js";
import type { GameProps } from "./Game.js";
import { Icon } from "./map/icons.js";
import { store } from "./store.js";
import type { PlayerView } from "./types.js";

const t = () => fr.game.atouts;

/** The Atouts' state in the view (null: off). */
export function atoutsOf(view: PlayerView) {
  return view.atouts ?? null;
}

/** An Atout's name and its line. */
export function nameOf(code: string): [string, string] {
  return t().names[code] ?? [code, ""];
}

/** An Atout's effects in words, gains first: each with its sign, a gain or a loss. */
function effectLines(effects: Record<string, number>): { text: string; gain: boolean }[] {
  return Object.entries(effects)
    .map(([key, v]) => ({
      text: t().effects[key]?.(v) ?? key,
      // A floor the Dogana keeps is a gain; otherwise the sign says it.
      gain: v > 0,
    }))
    .sort((a, b) => Number(b.gain) - Number(a.gain));
}

/** One Atout as a card: its name, its line, what it gives in lagoon and takes in vermilion. */
function Card({
  code,
  effects,
  picked,
  onPick,
}: {
  code: string;
  effects: Record<string, number>;
  picked?: boolean;
  onPick?: () => void;
}) {
  const [name, line] = nameOf(code);
  const body = (
    <>
      <p className="font-place text-sm font-bold uppercase tracking-[0.12em]">{name}</p>
      <p className="mt-1 text-xs text-cream-dim">{line}</p>
      <ul className="mt-2 space-y-0.5 text-sm">
        {effectLines(effects).map((e) => (
          <li key={e.text} className={e.gain ? "text-lagoon" : "text-vermilion"}>
            {e.gain ? "▲" : "▼"} {e.text}
          </li>
        ))}
      </ul>
    </>
  );
  if (!onPick) return <div className="rounded-2xl bg-night-3 px-3 py-2.5">{body}</div>;
  return (
    <button
      type="button"
      onClick={onPick}
      aria-pressed={picked}
      className={`w-full rounded-2xl bg-night-3 px-3 py-2.5 text-left transition ${picked ? "ring-[1.5px] ring-inset ring-info" : "ring-1 ring-inset ring-line"}`}
    >
      {body}
    </button>
  );
}

/**
 * The Atout of the week (R3): three figures of Venice as cards, the one picked ringed in lapis,
 * and the one gold button to take it; below, those held this season and those still locked.
 */
export function AtoutsSheet(props: GameProps) {
  const open = props.sheet === "atouts";
  const a = atoutsOf(props.view);
  const [picked, setPicked] = useState<string | null>(null);
  const offer = a?.open ? a.offer : [];
  const choice = picked && offer.includes(picked) ? picked : (offer[0] ?? null);
  return (
    <Sheet
      open={open && !!a}
      onClose={() => props.setSheet(null)}
      kicker={t().kicker}
      title={offer.length > 0 ? t().title : t().held}
      summary={offer.length > 0 ? t().summary : a?.held.length ? null : t().none}
    >
      {a && (
        <div className="space-y-4">
          {offer.length > 0 && (
            <section className="space-y-2">
              {offer.map((code) => (
                <Card
                  key={code}
                  code={code}
                  effects={a.effects[code] ?? {}}
                  picked={choice === code}
                  onPick={() => setPicked(code)}
                />
              ))}
              {choice && (
                <Slab
                  size="lg"
                  tone="gold"
                  className="w-full"
                  disabled={props.busy}
                  onClick={() => void props.act({ type: "chooseAtout", code: choice })}
                >
                  {t().take(nameOf(choice)[0])}
                </Slab>
              )}
            </section>
          )}
          {!a.open && <p className="meta">{t().taken}</p>}
          {a.held.length > 0 && (
            <section className="space-y-2">
              {offer.length > 0 && <p className="label">{t().held}</p>}
              {a.held.map((code) => (
                <Card key={code} code={code} effects={a.effects[code] ?? {}} />
              ))}
            </section>
          )}
          {a.locked.length > 0 && (
            <section className="space-y-1">
              <p className="label">{t().locked}</p>
              {a.locked.map((l) => (
                <p key={l.code} className="text-sm text-cream-dim">
                  <span className="text-cream">{nameOf(l.code)[0]}</span>
                  {l.unlock ? ` · ${t().unlocks[l.unlock] ?? l.unlock}` : ""}
                </p>
              ))}
            </section>
          )}
          <Rules id="atouts">{t().help}</Rules>
        </div>
      )}
    </Sheet>
  );
}

/**
 * The Atouts under the bell: this week's still to take (ringed in gold), or those held; a tap
 * opens them.
 */
export function AtoutsLine(props: GameProps) {
  const a = atoutsOf(props.view);
  if (!a || (!a.open && a.held.length === 0)) return null;
  const waiting = a.open && a.offer.length > 0;
  return (
    <button
      type="button"
      onClick={() => props.setSheet("atouts")}
      className={`flex w-full items-center gap-3 rounded-2xl bg-night-3 px-3 py-2.5 text-left ${waiting ? "ring-1 ring-inset ring-gold/60" : ""}`}
    >
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-night-4 text-gold">
        {Icon.decree()}
      </span>
      <span className="min-w-0 flex-1">
        <span className="label block text-gold">{t().kicker}</span>
        <span className="block text-sm">{waiting ? t().waiting : t().held}</span>
      </span>
    </button>
  );
}

/** The week's offer still to take (the bell counts it). */
export function atoutWaiting(view: PlayerView): boolean {
  const a = atoutsOf(view);
  return !!a?.open && a.offer.length > 0;
}

/** The key of this week's offer on the device (null: nothing to offer). */
function atoutMomentKey(view: PlayerView): string | null {
  const a = atoutsOf(view);
  return a?.open && a.offer.length > 0 ? `atouts:${a.offer.join(",")}` : null;
}

/** Whether the week's offer has still to open by itself (the other moments wait for it). */
export function atoutMomentDue(view: PlayerView): boolean {
  const key = atoutMomentKey(view);
  return !!key && store.get(key) !== "seen";
}

/**
 * The week's offer opens by itself once a week, the guide done and no other sheet up (a moment,
 * like the welcome back): remembered on the device by the offer's cards.
 */
export function useAtoutMoment(props: GameProps): void {
  const ready = props.view.tutorial.includes("mission");
  const key = atoutMomentKey(props.view);
  const { sheet, setSheet } = props;
  useEffect(() => {
    if (!key || !ready || sheet) return;
    if (store.get(key) === "seen") return;
    store.set(key, "seen");
    setSheet("atouts");
  }, [key, ready, sheet, setSheet]);
}
