import { useEffect, useState } from "react";
import { ApiError } from "../api.js";
import { Portrait } from "../art/portrait.js";
import { fr } from "../i18n.js";
import { Label, Rules, Slab, clock } from "../ui.js";
import type { GameProps } from "./Game.js";
import { MerchantName, merchantLabel } from "./Name.js";
import { gameApi } from "./api.js";
import type { DogeDecree, ElectionView } from "./types.js";

const t = () => fr.game.doge;

/** A mutator's short name: the words before its dash. */
export function mutatorName(code: string | null | undefined): string {
  if (!code) return "";
  return (fr.game.mutators.codes[code] ?? code).split(" — ")[0] ?? code;
}

/** A decree of the Republic in words, its strength from the world's rules. */
export function decreeText(
  decree: DogeDecree,
  effects: ElectionView["effects"] | null,
  names: GameProps["names"],
): string {
  const target = decree.target
    ? decree.code === "faveur"
      ? names.city(decree.target)
      : names.resource(decree.target).toLowerCase()
    : "";
  const n =
    decree.code === "faveur"
      ? (effects?.faveur.premiumBps ?? 0) / 100
      : decree.code === "franchigia"
        ? (effects?.franchigia.taxCutBps ?? 0) / 100
        : decree.code === "levante"
          ? (effects?.levante.quotaBps ?? 0) / 100
          : (effects?.calmiere.capBps ?? 0) / 100;
  return t().decrees[decree.code]?.(target, n) ?? decree.code;
}

/** The election under the bell while it runs: a line that opens the Senate. */
export function SenateLine(props: GameProps) {
  const e = props.view.election;
  if (!e?.open) return null;
  return (
    <button
      type="button"
      onClick={() => props.setSheet("senate")}
      className={`flex w-full items-center gap-3 rounded-2xl bg-night-3 px-3 py-2.5 text-left ${e.voted ? "" : "ring-1 ring-inset ring-gold/60"}`}
    >
      <Portrait given="Doge" crest={null} size={40} doge />
      <span className="min-w-0 flex-1">
        <span className="label block text-gold">{t().kicker}</span>
        <span className="block text-sm">{e.voted ? t().lineVoted : t().line}</span>
      </span>
    </button>
  );
}

/** Whether the election waits for the merchant (the bell counts it). */
export function senateWaiting(props: GameProps): boolean {
  const e = props.view.election;
  return !!e?.open && (!e.voted || (e.candidate && !e.stood));
}

/**
 * The election, Politics' second tab (R7, refonte UX lot 6): the candidates as medallions with
 * their programme and voices, one picked in lapis; the one gold action is the voice (or, for a
 * candidate without one, its programme).
 */
export function SenateBody(props: GameProps) {
  const [e, setE] = useState<ElectionView | null>(null);
  const [picked, setPicked] = useState<string | null>(null);
  const [boost, setBoost] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    gameApi
      .election()
      .then(setE)
      .catch(() => setE(null));
  }, []);
  const standing = e?.open && e.candidate;
  const mine = e?.candidates.find((c) => c.id === props.account.id);
  const choice = picked ?? e?.mine?.candidate ?? e?.candidates.find((c) => c.programme)?.id ?? null;
  const chosen = e?.candidates.find((c) => c.id === choice);
  const most = Math.max(1, ...(e?.candidates.map((c) => c.votes) ?? [1]));
  const kept = e?.mine?.boost ?? 0;
  const vote = async () => {
    if (!chosen) return;
    setBusy(true);
    setError(null);
    try {
      setE(await gameApi.vote(chosen.id, Math.max(boost, kept)));
    } catch (err) {
      const code = err instanceof ApiError ? err.code : "unknown";
      setError(fr.game.errors[code] ?? fr.errors.unknown ?? null);
    }
    setBusy(false);
  };
  if (!e) return null;
  return (
    <div className="space-y-4">
      {e.open && <p className="text-sm">{t().closesIn(clock(e.closesAt - props.now))}</p>}
      <p className="text-sm text-cream-dim">{t().summary}</p>
      <ul className="space-y-2">
        {e.candidates.map((c) => {
          const on = c.id === choice;
          return (
            <li key={c.id}>
              <button
                type="button"
                disabled={!c.programme}
                aria-pressed={on}
                onClick={() => setPicked(c.id)}
                className={`flex w-full items-start gap-3 rounded-2xl bg-night-3 px-3 py-2.5 text-left ${on ? "ring-[1.5px] ring-inset ring-info" : "ring-1 ring-inset ring-line"} ${c.programme ? "" : "opacity-60"}`}
              >
                <Portrait given={merchantLabel(c.pseudo, false)} crest={c.crest} size={44} />
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline justify-between gap-2">
                    <MerchantName pseudo={c.pseudo} bot={false} className="font-semibold" />
                    <span className="meta shrink-0 text-gold">{t().votes(c.votes)}</span>
                  </span>
                  {c.programme ? (
                    <>
                      <span className="block text-sm text-info">
                        {mutatorName(c.programme.mutator)}
                      </span>
                      <span className="block text-sm text-cream-dim">
                        {decreeText(c.programme.decree, e.effects, props.names)}
                      </span>
                    </>
                  ) : (
                    <span className="meta block">{t().noProgramme}</span>
                  )}
                  <span className="mt-1.5 block h-1 overflow-hidden rounded-full bg-night-4">
                    <span
                      className="block h-full rounded-full bg-gold"
                      style={{ width: `${(c.votes / most) * 100}%` }}
                    />
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      {standing && (
        <Programme
          props={props}
          e={e}
          gold={!mine?.programme}
          onDone={async () => setE(await gameApi.election())}
        />
      )}

      {e.open && chosen && (
        <section className="space-y-2">
          <p className="text-sm text-cream-dim">{t().weight(e.weight)}</p>
          {e.maxBoost > 0 && (
            <>
              <Label>{t().boost}</Label>
              <div className="flex flex-wrap gap-2">
                {Array.from({ length: e.maxBoost + 1 }, (_, n) => n).map((n) => (
                  <button
                    key={n}
                    type="button"
                    disabled={n < kept}
                    aria-pressed={Math.max(boost, kept) === n}
                    onClick={() => setBoost(n)}
                    className={`min-h-12 rounded-full px-4 text-sm ${Math.max(boost, kept) === n ? "bg-info/15 ring-[1.5px] ring-inset ring-info" : "text-cream-dim ring-1 ring-inset ring-line"} ${n < kept ? "opacity-40" : ""}`}
                  >
                    {t().boostLabel(n, Math.max(0, n - kept) * e.influencePerVoice)}
                  </button>
                ))}
              </div>
            </>
          )}
          {e.mine && (
            <p className="meta">
              {t().voted(
                merchantLabel(
                  e.candidates.find((c) => c.id === e.mine?.candidate)?.pseudo ?? null,
                  false,
                ),
              )}
            </p>
          )}
          <Slab
            size="lg"
            tone={standing && !mine?.programme ? "ghost" : "gold"}
            className="w-full"
            disabled={busy || props.busy}
            onClick={() => void vote()}
          >
            {t().vote(merchantLabel(chosen.pseudo, false))}
          </Slab>
          {error && <p className="text-sm text-vermilion">{error}</p>}
        </section>
      )}
      <Rules id="doge">{t().help}</Rules>
    </div>
  );
}

/** A candidate's programme: the season among the mutators, the decree and its target. */
function Programme({
  props,
  e,
  gold,
  onDone,
}: {
  props: GameProps;
  e: ElectionView;
  gold: boolean;
  onDone: () => Promise<void>;
}) {
  const own = e.candidates.find((c) => c.id === props.account.id)?.programme ?? null;
  const [mutator, setMutator] = useState<string | null>(own?.mutator ?? e.mutators[0] ?? null);
  const [code, setCode] = useState<string>(own?.decree.code ?? e.decrees[0] ?? "");
  const targets =
    code === "faveur"
      ? props.catalog.cities.map((c) => ({ value: c.code, label: props.names.city(c.code) }))
      : code === "calmiere"
        ? props.catalog.resources.map((r) => ({
            value: r.code,
            label: props.names.resource(r.code),
          }))
        : [];
  const [target, setTarget] = useState<string>(own?.decree.target ?? "");
  const aim = targets.some((x) => x.value === target) ? target : (targets[0]?.value ?? "");
  const decree = targets.length > 0 ? { code, target: aim } : { code };
  const pill = (on: boolean) =>
    `min-h-12 rounded-full px-4 text-sm ${on ? "bg-info/15 ring-[1.5px] ring-inset ring-info" : "text-cream-dim ring-1 ring-inset ring-line"}`;
  return (
    <section className="space-y-3 rounded-2xl p-3 ring-1 ring-inset ring-gold/50">
      <Label className="text-gold">{t().stand}</Label>
      <p className="text-sm text-cream-dim">{own ? t().announced : t().standHelp}</p>
      {e.mutators.length > 0 && (
        <div className="space-y-1.5">
          <p className="label">{t().season}</p>
          <div className="flex flex-wrap gap-2">
            {e.mutators.map((m) => (
              <button
                key={m}
                type="button"
                aria-pressed={mutator === m}
                onClick={() => setMutator(m)}
                className={pill(mutator === m)}
              >
                {mutatorName(m)}
              </button>
            ))}
          </div>
        </div>
      )}
      <div className="space-y-1.5">
        <p className="label">{t().decree}</p>
        <div className="flex flex-wrap gap-2">
          {e.decrees.map((c) => (
            <button
              key={c}
              type="button"
              aria-pressed={code === c}
              onClick={() => setCode(c)}
              className={pill(code === c)}
            >
              {fr.game.doge.decreeNames[c] ?? c}
            </button>
          ))}
        </div>
        {targets.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-1">
            {targets.map((x) => (
              <button
                key={x.value}
                type="button"
                aria-pressed={aim === x.value}
                onClick={() => setTarget(x.value)}
                className={pill(aim === x.value)}
              >
                {x.label}
              </button>
            ))}
          </div>
        )}
        <p className="text-sm text-cream-dim">{decreeText(decree, e.effects, props.names)}</p>
      </div>
      <Slab
        size={gold ? "lg" : "md"}
        tone={gold ? "gold" : "ghost"}
        className="w-full"
        disabled={props.busy}
        onClick={async () => {
          if (await props.act({ type: "standForDoge", mutator, decree })) await onDone();
        }}
      >
        {t().announce}
      </Slab>
    </section>
  );
}
