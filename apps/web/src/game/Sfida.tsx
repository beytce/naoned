import { useEffect, useState } from "react";
import { Crest, defaultCrest } from "../art/crest.js";
import { fr } from "../i18n.js";
import { Rules, Sheet, Slab } from "../ui.js";
import type { GameProps } from "./Game.js";
import { MerchantName, merchantLabel } from "./Name.js";
import { gameApi } from "./api.js";
import { whole } from "./format.js";
import type { SfidaView, SupplierPerson } from "./types.js";

const t = () => fr.game.lustre;

const crestOf = (p: SupplierPerson) => p.crest ?? defaultCrest(p.id);

/** A curve up to the hour now, its last point the value now (the server keeps one an hour). */
function withNow(curve: string[], hour: number, now: string): string[] {
  const out = curve.slice(0, hour + 1);
  while (out.length < hour) out.push(out.at(-1) ?? "0");
  out[hour] = now;
  return out;
}

/** The hours of a week: the curves' width. */
const WEEK_HOURS = 168;

/**
 * Two curves of the week, hour by hour: the merchant's in lapis, the opponent's (or its ghost's,
 * up to the same hour) in cream, on the same scale.
 */
function Curves({ mine, theirs, hour }: { mine: string[]; theirs: string[]; hour: number }) {
  const a = mine.map((g) => Number(BigInt(g) / 100n));
  // A ghost's whole week is known: drawn up to the merchant's hour, as if it played now.
  const b = theirs.slice(0, hour + 1).map((g) => Number(BigInt(g) / 100n));
  // From the lowest to the highest point: a week in loss stays above the axis.
  const lo = Math.min(0, ...a, ...b);
  const span = Math.max(1, ...a, ...b) - lo;
  const y = (v: number) => (40 - ((v - lo) / span) * 36).toFixed(2);
  const path = (series: number[]) =>
    series.map((v, i) => `${((i / WEEK_HOURS) * 100).toFixed(2)},${y(v)}`).join(" ");
  return (
    <svg viewBox="0 0 100 42" className="h-28 w-full" aria-hidden="true">
      <line x1="0" y1="40" x2="100" y2="40" stroke="rgb(var(--line))" strokeWidth="0.4" />
      {[1, 2, 3, 4, 5, 6].map((d) => (
        <line
          key={d}
          x1={(d * 24 * 100) / WEEK_HOURS}
          y1="4"
          x2={(d * 24 * 100) / WEEK_HOURS}
          y2="40"
          stroke="rgb(var(--line))"
          strokeWidth="0.2"
          strokeDasharray="0.6 1.2"
        />
      ))}
      {b.length > 1 && (
        <polyline
          points={path(b)}
          fill="none"
          stroke="rgb(var(--cream) / 0.6)"
          strokeWidth="0.9"
          strokeLinejoin="round"
        />
      )}
      {a.length === 1 && <circle cx="0" cy={y(a[0] ?? 0)} r="1.2" fill="rgb(var(--info))" />}
      {a.length > 1 && (
        <polyline
          points={path(a)}
          fill="none"
          stroke="rgb(var(--info))"
          strokeWidth="1.2"
          strokeLinejoin="round"
        />
      )}
    </svg>
  );
}

/**
 * A tier as its league (refonte UX, 28 October 2026): the tiers run from the newcomers' up, so the
 * highest is League 1 and the first one League 6. `count` is the world's number of tiers, the
 * dictionary's when unknown (its keys are in the engine's order).
 */
export function leagueOf(code: string, count = Object.keys(fr.game.lustre.tiers).length): string {
  const index = Object.keys(fr.game.lustre.tiers).indexOf(code);
  return index < 0 ? (fr.game.lustre.tiers[code] ?? code) : fr.game.lustre.league(count - index);
}

function Ladder({ data }: { data: SfidaView }) {
  return (
    // A column, League 1 at the top, the merchant's own marked (maquette `Classement`).
    <ol className="flex flex-col-reverse gap-1">
      {data.tiers.map((tier, i) => {
        const here = i === data.tier.index;
        return (
          <li
            key={tier.code}
            aria-current={here ? "true" : undefined}
            className={`rounded-xl px-3 py-1.5 text-sm ${here ? "bg-info/20 text-info ring-1 ring-inset ring-info" : i < data.tier.index ? "text-cream-dim" : "text-muted"}`}
          >
            {t().league(data.tiers.length - i)}
            <span className="ml-1 text-muted">{t().tiers[tier.code] ?? ""}</span>
            {here && <span className="ml-1 font-display tabular-nums">{data.lustre}</span>}
          </li>
        );
      })}
    </ol>
  );
}

/** The six leagues of Venice, the merchant's lit, how far the next. */
/**
 * The duel of the week, the ranking's third tab (R6, refonte UX lot 7): the merchant and its
 * opponent face to face (or its ghost), both net sales of the week and their curves, what winning
 * brings; the way to the opponent's sheet; the leagues; the challenges received and sent.
 */
export function SfidaBody(props: GameProps) {
  const [data, setData] = useState<SfidaView | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let live = true;
    gameApi
      .sfida()
      .then((r) => live && setData(r))
      .catch(() => live && setData(null));
    return () => {
      live = false;
    };
  }, []);
  const s = data?.sfida ?? null;
  const other = s?.opponent ?? s?.ghost ?? null;
  const gap = s ? BigInt(s.mine) - BigInt(s.theirs) : 0n;
  const me = props.account.crest ?? defaultCrest(props.account.id);
  const accept = async (id: string) => {
    setBusy(true);
    try {
      setData(await gameApi.acceptChallenge(id));
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="space-y-4">
      {data && (
        <p className="meta">
          {t().league(data.tiers.length - data.tier.index)} ({t().tiers[data.tier.code] ?? ""}) ·{" "}
          {t().lustre(data.lustre)}
        </p>
      )}
      {data && !s && <p className="meta">{t().none}</p>}
      {s && other && (
        <section className="space-y-3">
          {/* One line a side: the merchant, then its opponent, each with its week so far. */}
          <div className="flex items-center gap-3 rounded-2xl bg-night-3 px-3 py-2 ring-1 ring-inset ring-info/60">
            <Crest crest={me} size={32} />
            <span className="min-w-0 flex-1 font-semibold text-info">{t().you}</span>
            <span className="font-display text-lg font-extrabold tabular-nums text-info">
              {whole(BigInt(s.mine))}
            </span>
          </div>
          <div className="flex items-center gap-3 rounded-2xl bg-night-3 px-3 py-2">
            <span className={s.ghost ? "opacity-50" : ""}>
              <Crest crest={crestOf(other)} size={32} />
            </span>
            <span className="flex min-w-0 flex-1 font-semibold">
              {s.ghost ? (
                <span className="truncate">
                  {t().ghostOf(merchantLabel(other.pseudo, other.bot, "—"))}
                </span>
              ) : (
                <MerchantName pseudo={other.pseudo} bot={other.bot} fallback="—" />
              )}
            </span>
            <span className="font-display text-lg font-extrabold tabular-nums text-cream">
              {whole(BigInt(s.theirs))}
            </span>
          </div>
          <p
            className={`text-center text-sm ${gap > 0n ? "text-lagoon" : gap < 0n ? "text-vermilion" : "text-cream-dim"}`}
          >
            {gap > 0n ? t().ahead(whole(gap)) : gap < 0n ? t().behind(whole(-gap)) : t().even}
          </p>
          <Curves
            mine={withNow(s.curves.mine, s.hour, s.mine)}
            theirs={s.ghost ? s.curves.theirs : withNow(s.curves.theirs, s.hour, s.theirs)}
            hour={s.hour}
          />
          {s.ghost && (
            <p className="meta">
              {t().ghostLine(merchantLabel(s.ghost.pseudo, s.ghost.bot, "—"), s.ghost.week)}
            </p>
          )}
          {s.stake > 0 && <p className="text-sm text-gold">{t().stake(s.stake)}</p>}
          <p className="text-xs text-cream-dim">{t().stakes(data?.win ?? 0, data?.loss ?? 0)}</p>
          {s.opponent && (
            // The opponent's sheet over the ranking (refonte UX, lot 7).
            <Slab
              tone="ghost"
              className="w-full"
              onClick={() => props.setSheet(`player:${s.opponent?.id ?? ""}:ranking`)}
            >
              {t().see(merchantLabel(s.opponent.pseudo, s.opponent.bot, "—"))}
            </Slab>
          )}
        </section>
      )}
      {data && (
        <section className="space-y-2">
          <p className="label">{t().ladder}</p>
          <Ladder data={data} />
        </section>
      )}
      {data && data.challenges.in.length > 0 && (
        <section className="space-y-2">
          <p className="label">{t().challengesIn}</p>
          {data.challenges.in.map((c) => (
            <div key={c.id} className="flex items-center gap-2 rounded-2xl bg-night-3 px-3 py-2">
              <Crest crest={crestOf(c.from)} size={22} />
              <span className="min-w-0 flex-1 truncate text-sm">
                <MerchantName pseudo={c.from.pseudo} bot={c.from.bot} fallback="—" />
                {c.stake > 0 && <span className="text-gold"> · {t().lustre(c.stake)}</span>}
              </span>
              {c.accepted ? (
                <span className="label">{t().accepted}</span>
              ) : (
                <Slab size="sm" tone="gold" disabled={busy} onClick={() => accept(c.id)}>
                  {t().accept}
                </Slab>
              )}
            </div>
          ))}
        </section>
      )}
      {data && data.challenges.out.length > 0 && (
        <section className="space-y-2">
          <p className="label">{t().challengesOut}</p>
          {data.challenges.out.map((c) => (
            <div key={c.id} className="flex items-center gap-2 rounded-2xl bg-night-3 px-3 py-2">
              <Crest crest={crestOf(c.to)} size={22} />
              <span className="min-w-0 flex-1 truncate text-sm">
                <MerchantName pseudo={c.to.pseudo} bot={c.to.bot} fallback="—" />
              </span>
              <span className="label">{c.accepted ? t().accepted : t().waiting}</span>
            </div>
          ))}
        </section>
      )}
      <Rules id="lustre">{t().help}</Rules>
    </div>
  );
}

/** A challenge for next week, from a line of the ranking: the stake, then one gold button. */
export function ChallengeSheet(props: GameProps) {
  const [kind, id, ...name] = (props.sheet ?? "").split(":");
  const open = kind === "challenge" && !!id;
  const [stake, setStake] = useState(10);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const who = name.join(":");
  useEffect(() => {
    if (open) setMsg(null);
  }, [open]);
  const send = async () => {
    setBusy(true);
    try {
      await gameApi.challenge(id ?? "", stake);
      setMsg(t().sent);
    } catch (e) {
      const code = e instanceof Error ? e.message : "";
      setMsg(t().errors[code] ?? fr.errors.unknown ?? null);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Sheet
      open={open}
      onClose={() => props.setSheet(null)}
      kicker={t().kicker}
      title={t().challengeTitle(who)}
      summary={t().challengeLine}
    >
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <span className="label">{t().stakeLabel}</span>
          <span className="flex items-center gap-2">
            {[0, 10, 25, 50].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setStake(n)}
                className={`min-h-11 min-w-11 rounded-full px-3 font-display tabular-nums ${stake === n ? "bg-info/20 text-info ring-1 ring-inset ring-info" : "text-cream ring-1 ring-inset ring-line"}`}
              >
                {n}
              </button>
            ))}
          </span>
        </div>
        {msg && <p className="text-sm text-cream-dim">{msg}</p>}
        <Slab size="lg" tone="gold" disabled={busy} onClick={send} className="w-full">
          {t().send}
        </Slab>
      </div>
    </Sheet>
  );
}
