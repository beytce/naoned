import { useEffect } from "react";
import { GoodsMark } from "../art/goods.js";
import { Lorenzo } from "../art/scenes.js";
import { fr } from "../i18n.js";
import { Rules, Sheet, Slab } from "../ui.js";
import { atoutMomentDue } from "./Atouts.js";
import type { GameProps } from "./Game.js";
import { whole } from "./format.js";
import { store } from "./store.js";
import type { PlayerView } from "./types.js";

const t = () => fr.game.letters;

type Letter = NonNullable<PlayerView["letter"]>;
type Choice = Letter["choices"][number];

/** Today's letter still to answer (the HUD's round shows it). */
export function letterWaiting(view: PlayerView): boolean {
  return !!view.letter && !view.letter.answered;
}

/** What an answer pays and gives, in one line: ducats, then goods by their mark. */
function Terms({ choice, props }: { choice: Choice; props: GameProps }) {
  const paid = BigInt(choice.pay.ducats);
  const given = BigInt(choice.gain.ducats);
  const goods = (g: Record<string, number>, sign: string, tone: string) =>
    Object.entries(g)
      .filter(([, n]) => n > 0)
      .map(([code, n]) => (
        <span key={`${sign}${code}`} className={`inline-flex items-center gap-1 ${tone}`}>
          {sign}
          {n}
          <GoodsMark code={code} size={18} title={props.names.resource(code)} />
        </span>
      ));
  const parts = [
    paid > 0n && (
      <span key="paid" className="text-vermilion">
        −{whole(paid)}
      </span>
    ),
    ...goods(choice.pay.goods, "−", "text-vermilion"),
    given > 0n && (
      <span key="given" className="text-lagoon">
        +{whole(given)}
      </span>
    ),
    ...goods(choice.gain.goods, "+", "text-lagoon"),
  ].filter(Boolean);
  if (parts.length === 0 && !choice.later) return null;
  return (
    <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
      {parts}
      {choice.later && <span className="text-cream-dim">{t().later}</span>}
      {!choice.can && <span className="text-vermilion">{t().cannot}</span>}
    </p>
  );
}

/**
 * The Letter of the day (R10): the letter on its paper with its seal, who wrote it, and two
 * answers — the first in gold, the other a ghost — each with what it pays and gives. Answered,
 * what came of it, and the next letter tomorrow.
 */
export function LetterSheet(props: GameProps) {
  const open = props.sheet === "letter";
  const letter = props.view.letter ?? null;
  const words = letter ? t().episodes[letter.id] : undefined;
  const [name, title] = letter ? (t().senders[letter.sender] ?? [letter.sender, ""]) : ["", ""];
  const answered = letter?.answered ? words?.choices[letter.answered] : undefined;
  return (
    <Sheet
      open={open && !!letter && !!words}
      onClose={() => props.setSheet(null)}
      kicker={t().kicker}
      title={name}
      summary={title}
    >
      {letter && words && (
        <div className="space-y-4">
          <article className="relative rounded-2xl bg-night-3 px-4 pb-4 pt-5 ring-1 ring-inset ring-gold/30">
            {/* The seal, in the sender's wax. */}
            <span
              aria-hidden
              className="absolute -top-3 right-4 grid h-9 w-9 place-items-center rounded-full bg-vermilion font-place text-sm font-bold text-cream shadow"
            >
              {name.replace(/^(La |Le |The |Un |A )/, "").charAt(0)}
            </span>
            <p className="text-base italic leading-relaxed text-cream">{words.text}</p>
          </article>
          {answered ? (
            <section className="space-y-1">
              <p className="label">{t().answered}</p>
              <p className="text-sm text-cream">{answered[0]}</p>
              <p className="text-sm italic text-cream-dim">{answered[1]}</p>
              <p className="meta pt-2">
                {letter.tomorrow
                  ? fr.game.dynasty.tomorrow(t().senders[letter.tomorrow]?.[0] ?? letter.tomorrow)
                  : t().tomorrow}
              </p>
            </section>
          ) : (
            <section className="space-y-3">
              {letter.choices.map((c, i) => (
                <div key={c.id}>
                  <Slab
                    size={i === 0 ? "lg" : "md"}
                    tone={i === 0 ? "gold" : "ghost"}
                    className="w-full"
                    disabled={props.busy || !c.can}
                    onClick={() => void props.act({ type: "answerLetter", choice: c.id })}
                  >
                    {words.choices[c.id]?.[0] ?? c.id}
                  </Slab>
                  <Terms choice={c} props={props} />
                </div>
              ))}
            </section>
          )}
          <Rules id="letters">{t().help}</Rules>
        </div>
      )}
    </Sheet>
  );
}

/**
 * The letter of the day under the bell, Lorenzo at the door: who wrote, and whether it waits for
 * an answer; a tap opens it.
 */
export function LetterLine(props: GameProps) {
  const letter = props.view.letter;
  if (!letter) return null;
  const [name] = t().senders[letter.sender] ?? [letter.sender];
  const waiting = !letter.answered;
  return (
    <button
      type="button"
      onClick={() => props.setSheet("letter")}
      className={`flex w-full items-center gap-3 rounded-2xl bg-night-3 px-3 py-2 text-left ${waiting ? "ring-1 ring-inset ring-gold/60" : ""}`}
    >
      <Lorenzo size={40} />
      <span className="min-w-0 flex-1">
        <span className="label block text-gold">{t().kicker}</span>
        <span className="block text-sm">{waiting ? t().waiting(name) : t().read(name)}</span>
      </span>
    </button>
  );
}

/**
 * The letter opens by itself at the first visit of the day, once the guide is done, no other
 * sheet up and the week's Atouts seen first: remembered on the device by the day's letter.
 */
export function useLetterMoment(props: GameProps): void {
  const letter = props.view.letter;
  const ready = props.view.tutorial.includes("mission") && !atoutMomentDue(props.view);
  // A key per calendar day: the month's script starts over each month.
  const today = new Date(props.now).toDateString();
  const key = letter && !letter.answered ? `letter:${today}:${letter.id}` : null;
  const { sheet, setSheet } = props;
  useEffect(() => {
    if (!key || !ready || sheet) return;
    if (store.get(key) === "seen") return;
    store.set(key, "seen");
    setSheet("letter");
  }, [key, ready, sheet, setSheet]);
}
