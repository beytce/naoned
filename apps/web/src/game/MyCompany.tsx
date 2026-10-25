import { useEffect, useMemo, useState } from "react";
import { ApiError } from "../api.js";
import { fr } from "../i18n.js";
import { locale } from "../lang.js";
import { dropInvite, inviteUrl, pendingInvite } from "../origin.js";
import { Label, Panel, Slab } from "../ui.js";
import { Thread, type ThreadSource } from "./Famille.js";
import type { GameProps } from "./Game.js";
import { merchantLabel } from "./Name.js";
import { gameApi } from "./api.js";
import { duration, hourOf } from "./format.js";
import type { CompanyInvitation, CompanyView } from "./types.js";

const t = () => fr.game.myCompany;
const job = (region: string) => fr.region.jobs[region]?.name ?? region;
const errorOf = (e: unknown) =>
  t().errors[e instanceof ApiError ? e.code : ""] ?? t().errors.other ?? "";

const localStore = (): Storage | null => {
  try {
    return localStorage;
  } catch {
    return null;
  }
};

const COMPANY_THREAD: ThreadSource = {
  load: () => gameApi.companyThread(),
  say: (body) => gameApi.sayToCompany(body),
  report: (id) => gameApi.reportCompanyMessage(id),
  words: t().thread,
  seenKey: "companySeen",
};

/**
 * The merchant's company in the profile (E2-8 of the experts): its associates, the trade it
 * lacks, an invitation link, a call to skirmish together, the shared record and the thread.
 * Without one: an invitation waiting, or founding one.
 */
export function CompanyPanel({ props }: { props: GameProps }) {
  const [view, setView] = useState<CompanyView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    gameApi
      .company()
      .then(setView)
      .catch(() => setView(null));
  }, []);
  const run = async (action: () => Promise<CompanyView>) => {
    setBusy(true);
    setError(null);
    try {
      setView(await action());
    } catch (e) {
      setError(errorOf(e));
    } finally {
      setBusy(false);
    }
  };
  if (!view) return null;
  const c = view.company;
  return (
    <Panel>
      <Label>{t().title}</Label>
      {c && <h2 className="mt-1 font-display text-xl font-extrabold">{c.name}</h2>}
      {c ? (
        <Members c={c} props={props} busy={busy} run={run} />
      ) : (
        <NoCompany view={view} busy={busy} run={run} />
      )}
      {error && <p className="mt-2 text-sm text-vermilion">{error}</p>}
      {c && (
        <div className="mt-5">
          <Thread source={COMPANY_THREAD} />
        </div>
      )}
    </Panel>
  );
}

type Run = (action: () => Promise<CompanyView>) => Promise<void>;

function NoCompany({ view, busy, run }: { view: CompanyView; busy: boolean; run: Run }) {
  const code = useMemo(() => {
    const s = localStore();
    return s ? pendingInvite(s) : null;
  }, []);
  const [invitation, setInvitation] = useState<CompanyInvitation | null>(null);
  const [answered, setAnswered] = useState(false);
  const [name, setName] = useState("");
  useEffect(() => {
    if (!code) return;
    gameApi
      .invitation(code)
      .then(setInvitation)
      .catch(() => {
        const s = localStore();
        if (s) dropInvite(s);
      });
  }, [code]);
  const forget = () => {
    const s = localStore();
    if (s) dropInvite(s);
    setAnswered(true);
  };
  if (view.mayJoinAt) {
    const date = new Date(view.mayJoinAt).toLocaleDateString(locale, {
      day: "numeric",
      month: "long",
      timeZone: "Europe/Paris",
    });
    return <p className="mt-2 text-sm text-cream-dim">{t().waitUntil(date)}</p>;
  }
  if (invitation && code && !answered) {
    const i = t().invitation;
    return (
      <div className="mt-2 space-y-3" data-company-invitation>
        <h3 className="font-display text-lg font-extrabold">{i.title(invitation.name)}</h3>
        <p className="text-sm text-cream-dim">
          {invitation.full ? i.full : i.line(invitation.members)}
        </p>
        <p className="text-sm text-cream-dim">{t().pitch}</p>
        <div className="flex flex-wrap gap-2">
          {!invitation.full && (
            <Slab
              disabled={busy}
              onClick={() =>
                run(async () => {
                  const next = await gameApi.joinCompany(code);
                  forget();
                  return next;
                })
              }
            >
              {i.join}
            </Slab>
          )}
          <Slab tone="ghost" onClick={forget}>
            {i.decline}
          </Slab>
        </div>
      </div>
    );
  }
  return (
    <form
      className="mt-2 space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        if (name.trim()) void run(() => gameApi.foundCompany(name));
      }}
    >
      <p className="text-sm text-cream-dim">{t().pitch}</p>
      <input
        value={name}
        maxLength={24}
        onChange={(e) => setName(e.target.value)}
        placeholder={t().namePlaceholder}
        aria-label={t().namePlaceholder}
        className="w-full cut border border-line bg-night-2 px-3 py-2.5 text-base"
      />
      <Slab type="submit" size="sm" className="w-full" disabled={busy || name.trim().length < 3}>
        {t().found}
      </Slab>
    </form>
  );
}

function Members({
  c,
  props,
  busy,
  run,
}: {
  c: NonNullable<CompanyView["company"]>;
  props: GameProps;
  busy: boolean;
  run: Run;
}) {
  const [copied, setCopied] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const has = c.members.map((m) => m.region).find((r): r is string => !!r);
  const invite = async () => {
    const url = inviteUrl(window.location.origin, props.account.pseudo, c.code);
    await gameApi.inviteShared().catch(() => undefined);
    if (typeof navigator.share === "function") {
      await navigator.share({ text: t().inviteText(c.name), url }).catch(() => undefined);
      return;
    }
    await navigator.clipboard?.writeText(url).catch(() => undefined);
    setCopied(true);
  };
  return (
    <div className="mt-2 space-y-4">
      <p className="meta">{t().members(c.members.length, c.max)}</p>
      <ul className="space-y-1.5">
        {c.members.map((m) => (
          <li
            key={merchantLabel(m.pseudo, false)}
            className="flex flex-wrap items-baseline gap-x-2 text-sm"
          >
            <span className="font-semibold">✦ {merchantLabel(m.pseudo, false)}</span>
            {m.me && <span className="label text-cream-dim">{t().me}</span>}
            <span className="text-cream-dim">{m.region ? job(m.region) : t().notHere}</span>
            {!m.me && m.lastSeenAt !== null && (
              <span className="text-xs text-muted">
                {t().seen(`il y a ${duration(props.now - m.lastSeenAt)}`)}
              </span>
            )}
          </li>
        ))}
      </ul>
      {c.members.length < c.max && (
        <div className="space-y-2">
          {c.missingRegion && (
            <p className="text-sm text-cream-dim">
              {has
                ? t().lacks(job(has), job(c.missingRegion))
                : t().lacksAlone(job(c.missingRegion))}
            </p>
          )}
          <Slab size="sm" className="w-full" onClick={() => void invite()}>
            {t().invite}
          </Slab>
          {copied && <p className="text-sm text-lagoon">{t().copied}</p>}
        </div>
      )}
      {c.call ? (
        <p className="text-sm">
          {t().called(hourOf(c.call.at), c.call.by ?? "—")}{" "}
          <span className="text-cream-dim">{t().calledHelp}</span>
        </p>
      ) : (
        c.nextCall !== null && (
          <Slab
            size="sm"
            tone="ghost"
            className="w-full"
            disabled={busy}
            onClick={() => run(() => gameApi.callCompany())}
          >
            {t().call(hourOf(c.nextCall))}
          </Slab>
        )
      )}
      <section className="space-y-2">
        <h3 className="label text-cream-dim">{t().record}</h3>
        {c.record.length === 0 ? (
          <p className="text-sm text-cream-dim">{t().recordEmpty}</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {c.record.map((r) => (
              <li key={`${r.season}-${r.endsAt}`}>
                <p className="font-semibold">{r.season}</p>
                <p className="text-cream-dim">
                  {r.members
                    .map((m) =>
                      [
                        `${merchantLabel(m.pseudo, false)} ${t().rank(m.rank)}`,
                        m.award,
                        ...m.titles,
                      ].join(" · "),
                    )
                    .join(" — ")}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
      {leaving ? (
        <div className="space-y-2">
          <p className="text-sm text-cream-dim">{t().leaveConfirm}</p>
          <div className="flex gap-2">
            <Slab
              size="sm"
              tone="ghost"
              disabled={busy}
              onClick={() => run(() => gameApi.leaveCompany())}
            >
              {t().leaveYes}
            </Slab>
            <Slab size="sm" tone="text" onClick={() => setLeaving(false)}>
              {t().cancel}
            </Slab>
          </div>
        </div>
      ) : (
        <button
          type="button"
          className="label min-h-11 text-cream-dim"
          onClick={() => setLeaving(true)}
        >
          {t().leave}
        </button>
      )}
    </div>
  );
}
