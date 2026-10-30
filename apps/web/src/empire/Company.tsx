import { useEffect, useState } from "react";
import { ApiError } from "../api.js";
import { GoodsMark } from "../art/goods.js";
import { Thread } from "../game/Famille.js";
import { COMPANY_THREAD, NoCompany, type Run } from "../game/MyCompany.js";
import { merchantLabel } from "../game/Name.js";
import { gameApi } from "../game/api.js";
import { d, hourOf } from "../game/format.js";
import type { CompanyView, CondottaStatus } from "../game/types.js";
import { fr } from "../i18n.js";
import { inviteUrl } from "../origin.js";
import { Label, Slab } from "../ui.js";
import { Choice } from "./World.js";
import { affordable } from "./logic.js";
import type { EmpireAction, EmpirePayload } from "./types.js";

type Act = (a: EmpireAction) => Promise<void>;
const t = fr.empire.company;
const goodName = (p: EmpirePayload, code: string) =>
  fr.themeNames.resource[code] ?? p.goods[code] ?? code;
const errorOf = (e: unknown) =>
  fr.game.myCompany.errors[e instanceof ApiError ? e.code : ""] ??
  fr.game.myCompany.errors.other ??
  "";

/** Requests the merchant may supply now: its company's, not its own, with the goods in store. */
export function suppliable(p: EmpirePayload, me: string | null): number {
  const aid = p.view?.aid;
  if (!aid) return 0;
  return aid.requests.filter((r) => r.house !== me && (p.stock[r.good] ?? 0) >= r.qty).length;
}

/**
 * The company in the empire (CADRAGE-v3 § 7): its partners and their vocations, the entraide's
 * requests (supplied in one gesture at the reference price), a lot to ask, the Condotta's tier,
 * the thread. Without one: an invitation waiting, or founding one.
 */
export function CompanySection({
  p,
  now,
  busy,
  act,
}: {
  p: EmpirePayload;
  now: number;
  busy: boolean;
  act: Act;
}) {
  const [view, setView] = useState<CompanyView | null>(null);
  const [condotta, setCondotta] = useState<CondottaStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [working, setWorking] = useState(false);
  useEffect(() => {
    gameApi
      .company()
      .then(setView)
      .catch(() => setView(null));
    gameApi
      .condotta()
      .then(setCondotta)
      .catch(() => setCondotta(null));
  }, []);
  const run: Run = async (action) => {
    setWorking(true);
    setError(null);
    try {
      setView(await action());
    } catch (e) {
      setError(errorOf(e));
    } finally {
      setWorking(false);
    }
  };
  if (!view) return null;
  const c = view.company;
  return (
    <section className="mt-5" data-company>
      <div className="flex items-baseline justify-between">
        <Label>{t.title}</Label>
        {c && <span className="text-xs text-cream-dim">{t.members(c.members.length, c.max)}</span>}
      </div>
      {!c ? (
        <NoCompany view={view} busy={working} run={run} />
      ) : (
        <>
          <p className="mt-1 font-display text-lg font-extrabold text-cream">{c.name}</p>
          <Members c={c} busy={working} run={run} />
          <Aid p={p} c={c} now={now} busy={busy} act={act} />
          <Condotta status={condotta} />
          <div className="mt-3 flex flex-wrap gap-2">
            <Slab
              size="sm"
              tone="ghost"
              onClick={() => {
                const me = c.members.find((m) => m.me)?.pseudo ?? null;
                const url = inviteUrl(window.location.origin, me, c.code);
                void navigator.clipboard?.writeText(url).catch(() => undefined);
                void gameApi.inviteShared().catch(() => undefined);
              }}
            >
              {t.invite}
            </Slab>
            <Slab
              size="sm"
              tone="ghost"
              busy={working}
              onClick={() => void run(() => gameApi.leaveCompany())}
            >
              {t.leave}
            </Slab>
          </div>
          <div className="mt-5">
            <Thread source={COMPANY_THREAD} />
          </div>
        </>
      )}
      {error && <p className="mt-2 text-sm text-vermilion">{error}</p>}
    </section>
  );
}

function Members({
  c,
  busy,
  run,
}: {
  c: NonNullable<CompanyView["company"]>;
  busy: boolean;
  run: Run;
}) {
  const capo = c.myRole === "capo";
  return (
    <ul className="mt-2 space-y-2">
      {c.members.map((m) => (
        <li
          key={m.id ?? m.pseudo ?? ""}
          className="flex items-center gap-2 border-b border-line/60 pb-2 text-sm"
        >
          <span className="min-w-0 flex-1 truncate text-cream">
            {merchantLabel(m.pseudo, false)}
            {m.me && <span className="text-cream-dim"> · {t.me}</span>}
            {m.role && <span className="block text-xs text-gold">{t.roles[m.role] ?? m.role}</span>}
          </span>
          {capo && !m.me && m.id && (
            <div className="w-36">
              <Choice
                label={t.vocation}
                value={m.role ?? ""}
                onChange={(role) => {
                  const id = m.id;
                  if (id) void run(() => gameApi.setCompanyRole(id, role === "" ? null : role));
                }}
                options={[
                  ["", t.noRole],
                  ["consigliere", t.roles.consigliere ?? ""],
                  ["cassiere", t.roles.cassiere ?? ""],
                  ["capo", t.roles.capo ?? ""],
                ]}
              />
            </div>
          )}
        </li>
      ))}
      {busy && <li className="sr-only">…</li>}
    </ul>
  );
}

/** The entraide: the company's requests, and a lot to ask. */
function Aid({
  p,
  c,
  now,
  busy,
  act,
}: {
  p: EmpirePayload;
  c: NonNullable<CompanyView["company"]>;
  now: number;
  busy: boolean;
  act: Act;
}) {
  const aid = p.view?.aid;
  const goods = [...new Set(p.market.filter((q) => q.region === "veneto").map((q) => q.good))];
  const [good, setGood] = useState(goods[0] ?? "");
  const [qty, setQty] = useState(1);
  if (!aid) return null;
  const me = c.members.find((m) => m.me)?.id ?? null;
  const name = (house: string) =>
    merchantLabel(c.members.find((m) => m.id === house)?.pseudo ?? null, false);
  const tooNew = aid.seniorFrom !== null && aid.seniorFrom > now;
  return (
    <div className="mt-4">
      <p className="text-xs text-cream-dim">
        {t.aid.rule} · {t.aid.merit(aid.merit)} · {t.aid.supplyLeft(d(aid.supplyLeft))}
      </p>
      {tooNew && aid.seniorFrom && (
        <p className="mt-1 text-xs text-cream-dim">{t.aid.tooNew(hourOf(aid.seniorFrom))}</p>
      )}
      <ul className="mt-2 space-y-2">
        {aid.requests.length === 0 && <li className="text-sm text-cream-dim">{t.aid.none}</li>}
        {aid.requests.map((r) => (
          <li
            key={r.id}
            data-aid={r.id}
            className="flex items-center gap-2 border-b border-line/60 pb-2 text-sm text-cream"
          >
            <GoodsMark code={r.good} size={24} />
            <span className="flex-1">
              {r.qty} {goodName(p, r.good)}
              <span className="block text-xs text-cream-dim">
                {t.aid.by(name(r.house))} · {d(r.value)}
              </span>
            </span>
            {r.house !== me && (
              <Slab
                size="sm"
                tone="ghost"
                busy={busy}
                disabled={tooNew || (p.stock[r.good] ?? 0) < r.qty}
                onClick={() => void act({ type: "empireSupply", requestId: r.id })}
              >
                {t.aid.supply}
              </Slab>
            )}
          </li>
        ))}
      </ul>
      <div className="mt-3 grid grid-cols-[1fr_5rem] items-end gap-2">
        <Choice
          label={t.aid.good}
          value={good}
          onChange={setGood}
          options={goods.map((g): [string, string] => [g, goodName(p, g)])}
        />
        <label className="block text-sm text-cream">
          <span className="text-xs text-cream-dim">{t.aid.qty(aid.lotMax)}</span>
          <input
            type="number"
            min={1}
            max={aid.lotMax}
            value={qty}
            onChange={(e) => setQty(Math.max(1, Math.min(aid.lotMax, Number(e.target.value) || 1)))}
            className="mt-1 min-h-11 w-full bg-night-2 px-3 text-cream ring-1 ring-inset ring-line slab"
          />
        </label>
      </div>
      <Slab
        size="sm"
        className="mt-2 w-full"
        busy={busy}
        disabled={
          tooNew ||
          !good ||
          (aid.nextAskAt !== null && aid.nextAskAt > now) ||
          !affordable(
            p.cash,
            String(
              BigInt(p.market.find((q) => q.region === "veneto" && q.good === good)?.ref ?? "0") *
                BigInt(qty),
            ),
          )
        }
        onClick={() => void act({ type: "empireAsk", good, qty })}
      >
        {aid.nextAskAt !== null && aid.nextAskAt > now
          ? t.aid.nextAsk(hourOf(aid.nextAskAt))
          : t.aid.ask}
      </Slab>
    </div>
  );
}

/** The Condotta of the empire: the tier the Casa opens; a won match a day pays Seals. */
function Condotta({ status }: { status: CondottaStatus | null }) {
  if (!status || status.phase === "off") return null;
  return (
    <div className="mt-4" data-condotta>
      <p className="font-display text-sm font-bold text-cream">{t.condotta.title}</p>
      <p className="text-xs text-cream-dim">
        {t.condotta.tier(status.level, status.tierCap ?? status.levels)} · {t.condotta.seals}
      </p>
      <p className="text-xs text-cream-dim">{t.condotta.where}</p>
    </div>
  );
}
